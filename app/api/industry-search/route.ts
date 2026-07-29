import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { mockCourses, type Course, type Requirement } from "@/lib/mock-data";
import { getCourseAggregates } from "@/lib/courses/aggregates";

export type IndustryCourseResult = Course & { relevanceScore: number };

export type IndustrySearchResponseBody = {
  success: boolean;
  tagName: string;
  /** 검색한 사용자의 소속 학과와 개설학과가 같은 과목 — PRD 8.3 #5 "내 전공 과목". */
  myMajorCourses: IndustryCourseResult[];
  /** 그 외 전공 과목. */
  otherMajorCourses: IndustryCourseResult[];
  /**
   * PRD 8.3 #5: "타 전공 과목은 정원/선수과목/학년 제한이 있을 수 있음을 안내한다."
   * 이 저장소에는 실제 정원/선수과목/수강가능학년 데이터가 없다(F4의 known gap과 동일 —
   * CLAUDE.md 참고) — 안내 문구를 만들어내는 대신 "그런 제한이 있을 수 있다"는 사실만
   * 정직하게 고지하고, 구체적 제한 여부는 학과 사무실 확인이 필요하다고 안내한다.
   */
  otherMajorCaveat: string;
  message?: string;
};

const OTHER_MAJOR_CAVEAT =
  "타 전공 과목은 정원, 선수과목, 수강 가능 학년 등의 제한이 있을 수 있습니다. 실제 수강 가능 여부는 해당 학과 사무실 또는 수강신청 시스템에서 다시 확인해주세요.";

// GET /api/industry-search?tag=반도체&department=컴퓨터공학과
// PRD 8.3 완료조건: (1) 여러 학과에 걸친 관련 과목이 연관도 순으로 노출, (2) 개설학과·학점·
// 이수구분 표시, (3) 내 전공/타 전공 구분 표시. (2)는 Course 타입 자체가 이미 department/
// credits/requirement를 담고 있어 응답에 항상 포함된다.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tagName = (searchParams.get("tag") ?? "").trim();
    const myDepartment = (searchParams.get("department") ?? "").trim();

    if (!tagName) {
      return NextResponse.json<IndustrySearchResponseBody>({
        success: true,
        tagName,
        myMajorCourses: [],
        otherMajorCourses: [],
        otherMajorCaveat: OTHER_MAJOR_CAVEAT,
      });
    }

    const { courses, industryTags, courseIndustryTags } = schema;

    const [tag] = await db.select().from(industryTags).where(eq(industryTags.name, tagName)).limit(1);

    if (!tag) {
      return NextResponse.json<IndustrySearchResponseBody>({
        success: true,
        tagName,
        myMajorCourses: [],
        otherMajorCourses: [],
        otherMajorCaveat: OTHER_MAJOR_CAVEAT,
        message: `"${tagName}" 산업/진로 태그를 찾을 수 없습니다.`,
      });
    }

    // 검수 완료(reviewed=true)된 태그만 노출 — PRD 8.3 #3 "담당자가 검수해 확정" 게이트.
    const rows = await db
      .select({ course: courses, relevanceScore: courseIndustryTags.relevanceScore })
      .from(courseIndustryTags)
      .innerJoin(courses, eq(courseIndustryTags.courseId, courses.id))
      .where(and(eq(courseIndustryTags.industryTagId, tag.id), eq(courseIndustryTags.reviewed, true)));

    const aggregates = await getCourseAggregates(rows.map((r) => r.course.id));
    const mockById = new Map(mockCourses.map((c) => [c.id, c]));

    function toDisplayCourse(row: (typeof rows)[number]): IndustryCourseResult {
      const { course, relevanceScore } = row;
      const agg = aggregates.get(course.id);
      const mock = mockById.get(course.id);
      return {
        id: course.id,
        name: course.name,
        department: course.department,
        professor: mock?.professor ?? "미등록",
        credits: course.credits,
        requirement: course.requirement as Requirement,
        rating: agg?.rating ?? 0,
        reviewCount: agg?.reviewCount ?? 0,
        hashtags: agg?.hashtags ?? [],
        summary: mock?.summary ?? "",
        relevanceScore,
      };
    }

    const results = rows.map(toDisplayCourse).sort((a, b) => b.relevanceScore - a.relevanceScore);

    const myMajorCourses = myDepartment ? results.filter((c) => c.department === myDepartment) : [];
    const otherMajorCourses = myDepartment
      ? results.filter((c) => c.department !== myDepartment)
      : results; // 로그인하지 않은 경우(학과 미상) 전부 "타 전공" 취급하지 않고 미분류로 전체를 otherMajorCourses에 둔다.

    return NextResponse.json<IndustrySearchResponseBody>({
      success: true,
      tagName,
      myMajorCourses,
      otherMajorCourses,
      otherMajorCaveat: OTHER_MAJOR_CAVEAT,
    });
  } catch (err) {
    console.error("Industry search API error:", err);
    return NextResponse.json<IndustrySearchResponseBody>(
      {
        success: false,
        tagName: "",
        myMajorCourses: [],
        otherMajorCourses: [],
        otherMajorCaveat: OTHER_MAJOR_CAVEAT,
        message: "산업 분야 검색 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
