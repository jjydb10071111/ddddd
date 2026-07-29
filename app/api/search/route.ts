import { NextResponse } from "next/server";
import { and, eq, ilike, inArray, or } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { mockCourses, type Course, type Requirement } from "@/lib/mock-data";
import { expandSynonyms } from "@/lib/search/synonyms";
import { getCourseAggregates } from "@/lib/courses/aggregates";

export type FieldMatchGroup = {
  fieldTagId: string;
  fieldTagName: string;
  parentCategory: string | null;
  courses: Course[];
};

export type SearchResponseBody = {
  success: boolean;
  query: string;
  nameMatches: Course[];
  fieldGroups: FieldMatchGroup[];
  message?: string;
};

function termMatches(value: string, terms: string[]): boolean {
  const lower = value.toLowerCase();
  return terms.some((term) => lower.includes(term) || term.includes(lower));
}

// GET /api/search?q=수학
// PRD 8.2 #4: (a) 과목명·설명에 검색어가 포함된 결과("과목명 일치")와 (b) 검색어와
// 일치·유사한 분야에 속한 과목 결과("분야: X")를 분리해서 반환한다 — 하나의 랭킹으로
// 합치지 않는다. (b)는 동의어 사전(lib/search/synonyms.ts)을 검색어에 적용하고, 검수
// 완료(reviewed=true)된 과목-분야 태그만 대상으로 한다(PRD 8.2 #3 "검수 전 태그는 노출 안 함").
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") ?? "").trim();

    if (!query) {
      return NextResponse.json<SearchResponseBody>({
        success: true,
        query,
        nameMatches: [],
        fieldGroups: [],
      });
    }

    const { courses, fieldTags, courseFieldTags } = schema;

    // (a) 과목명·강의계획서(설명) 일치 — Postgres 텍스트 검색(ILIKE) (PRD 10.3).
    const likeTerm = `%${query}%`;
    const nameRows = await db
      .select()
      .from(courses)
      .where(or(ilike(courses.name, likeTerm), ilike(courses.syllabus, likeTerm)));

    // (b) 분야 일치 — 동의어 확장 후, 대분류/소분류 이름과 양방향 부분일치.
    // "자연과학" 검색은 parentCategory가 "자연과학"인 모든 소분류(수학/물리학/...)를 포함시키고,
    // "수학" 검색은 소분류 자체 이름 일치로 잡힌다. 실제 과목 태깅은 소분류에만 붙으므로
    // 매칭 대상도 소분류(parentCategory != null)로 한정한다.
    const synonymTerms = expandSynonyms(query);
    const allTags = await db.select().from(fieldTags);
    const matchedLeafTags = allTags.filter(
      (tag) =>
        tag.parentCategory !== null &&
        (termMatches(tag.name, synonymTerms) || termMatches(tag.parentCategory, synonymTerms)),
    );
    const matchedLeafTagIds = matchedLeafTags.map((t) => t.id);

    const fieldRows =
      matchedLeafTagIds.length === 0
        ? []
        : await db
            .select({ course: courses, fieldTagId: courseFieldTags.fieldTagId })
            .from(courseFieldTags)
            .innerJoin(courses, eq(courseFieldTags.courseId, courses.id))
            .where(
              and(
                eq(courseFieldTags.reviewed, true),
                inArray(courseFieldTags.fieldTagId, matchedLeafTagIds),
              ),
            );

    const nameMatchIds = new Set(nameRows.map((r) => r.id));

    const courseIdsNeeded = new Set<string>([
      ...nameRows.map((r) => r.id),
      ...fieldRows.map((r) => r.course.id),
    ]);
    const aggregates = await getCourseAggregates([...courseIdsNeeded]);
    const mockById = new Map(mockCourses.map((c) => [c.id, c]));

    type CourseRow = (typeof nameRows)[number];

    function toDisplayCourse(row: CourseRow): Course {
      const agg = aggregates.get(row.id);
      const mock = mockById.get(row.id);
      return {
        id: row.id,
        name: row.name,
        department: row.department,
        // courses 테이블에는 교수 컬럼이 없다(Sprint 2 범위 밖) — 데모 5과목은 mock-data.ts에서
        // 채우고, 그 외 과목(향후 실제 카탈로그 이관 후)은 미등록으로 표시한다.
        professor: mock?.professor ?? "미등록",
        credits: row.credits,
        requirement: row.requirement as Requirement,
        rating: agg?.rating ?? 0,
        reviewCount: agg?.reviewCount ?? 0,
        hashtags: agg?.hashtags ?? [],
        summary: mock?.summary ?? "",
      };
    }

    const nameMatches = nameRows.map(toDisplayCourse);

    const tagById = new Map(allTags.map((t) => [t.id, t]));
    const groupedByTag = new Map<string, CourseRow[]>();
    for (const row of fieldRows) {
      if (nameMatchIds.has(row.course.id)) continue; // 과목명 일치 그룹과 중복 노출 방지
      const list = groupedByTag.get(row.fieldTagId) ?? [];
      list.push(row.course);
      groupedByTag.set(row.fieldTagId, list);
    }

    const fieldGroups: FieldMatchGroup[] = [...groupedByTag.entries()]
      .map(([fieldTagId, rows]) => {
        const tag = tagById.get(fieldTagId);
        return {
          fieldTagId,
          fieldTagName: tag?.name ?? "",
          parentCategory: tag?.parentCategory ?? null,
          courses: rows.map(toDisplayCourse),
        };
      })
      .filter((g) => g.courses.length > 0)
      .sort((a, b) => a.fieldTagName.localeCompare(b.fieldTagName, "ko"));

    return NextResponse.json<SearchResponseBody>({ success: true, query, nameMatches, fieldGroups });
  } catch (err) {
    console.error("Search API error:", err);
    return NextResponse.json<SearchResponseBody>(
      { success: false, query: "", nameMatches: [], fieldGroups: [], message: "검색 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
