// Sprint 2(F2) — 과목명·개설학과 기반 AI 1차 학문분야 분류 스크립트.
//
// PRD 8.2 #3: "초기 분야 태깅은 과목명·강의계획서를 기반으로 AI가 1차 분류하고,
// 담당자가 검수해 확정한다." 이 스크립트는 그 중 "AI 1차 분류"만 담당한다 —
// 여기서 만든 course_field_tags 행은 항상 reviewed=false로 삽입되며, 검색 API는
// reviewed=true인 행만 노출한다(app/api/search/route.ts). reviewed를 true로 바꾸는 것은
// 이 스크립트의 책임이 아니라 app/api/field-tags/review(담당자 검수 워크플로우)의 책임이다
// — AI 스크립트가 자기 출력을 스스로 검수 처리하지 않도록 의도적으로 분리했다.
//
// 현재 courses 테이블에는 Sprint 1 stopgap대로 lib/mock-data.ts의 데모 5과목만 있다
// (lib/db/seed.ts 참고). 강의계획서(syllabus)가 전부 null이라 과목명+개설학과만으로 분류한다.
//
// AI Gateway 호출이 실패하면(예: 결제수단 미등록으로 인한 403 — CLAUDE.md/Sprint 2 지시사항
// 참고) 개설학과 기반의 단순 규칙 폴백으로 대체한다. 폴백도 동일하게 reviewed=false로
// 삽입되므로 "검수 없이 노출"되는 일은 없다 — 다만 실제 LLM 응답이 아니므로 담당자 검수 시
// 더 꼼꼼히 봐야 한다는 차이가 있을 뿐이다.
//
// 실행: `npm run db:classify-field-tags` (db:seed, db:seed-field-tags를 먼저 실행해둘 것).

import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/neon-http";
import { generateText } from "ai";
import * as schema from "./schema";
import { mockCourses } from "../mock-data";
import { leafFieldTagNames } from "../search/field-tag-taxonomy";
import { AI_MODELS } from "../ai";

const db = drizzle(neon(process.env.DATABASE_URL!), { schema });

// 개설학과 → 소분류 태그 폴백 매핑. AI 호출이 불가능할 때만 쓰인다.
const departmentFallback: Record<string, string[]> = {
  수학과: ["수학"],
  화학공학과: ["화학공학"],
  전자공학과: ["전자공학"],
  컴퓨터공학과: ["컴퓨터공학"],
};

// 과목명에 특정 키워드가 있으면 개설학과 매핑에 태그를 추가한다 — PRD 8.2 예시(#7)인
// "데이터구조는 [컴퓨터공학]이자 [수학]적 성격도 태깅 가능"을 폴백 경로에서도 재현하기 위함.
// AI 호출이 정상 동작하면 이 규칙 없이도 모델이 스스로 판단해야 한다.
const nameKeywordFallback: { pattern: RegExp; extraTags: string[] }[] = [
  { pattern: /데이터|자료구조|알고리즘/, extraTags: ["수학"] },
];

function classifyHeuristically(courseName: string, department: string): string[] {
  const tags = new Set(departmentFallback[department] ?? []);
  for (const rule of nameKeywordFallback) {
    if (rule.pattern.test(courseName)) {
      for (const tag of rule.extraTags) tags.add(tag);
    }
  }
  return [...tags];
}

async function classifyWithAI(courseName: string, department: string): Promise<string[] | null> {
  try {
    const { text } = await generateText({
      model: AI_MODELS.fast,
      system:
        `당신은 대학 과목을 학문분야 태그로 분류하는 도우미입니다. ` +
        `아래 소분류 태그 중에서만 골라야 하며, 목록에 없는 새 태그를 만들면 안 됩니다: ` +
        `${leafFieldTagNames.join(", ")}. ` +
        `과목의 성격상 여러 분야에 걸쳐 있으면 1~2개까지 복수로 고를 수 있습니다(예: "데이터구조"는 ` +
        `[컴퓨터공학]이자 [수학]적 성격도 있음). 다른 설명 없이 JSON 배열로만 응답하세요. ` +
        `예: ["컴퓨터공학", "수학"]. 해당하는 태그가 전혀 없으면 빈 배열 []을 반환하세요.`,
      prompt: `과목명: ${courseName}\n개설학과: ${department}`,
    });

    const match = text.match(/\[[\s\S]*\]/);
    const parsed: unknown = JSON.parse(match ? match[0] : text);
    if (!Array.isArray(parsed)) return null;

    const validTagNames = new Set(leafFieldTagNames);
    return parsed.filter((t): t is string => typeof t === "string" && validTagNames.has(t));
  } catch (err) {
    console.warn(
      `AI 분류 실패(${courseName}) — 폴백 규칙 사용: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

async function main() {
  const tagRows = await db.select().from(schema.fieldTags);
  const tagIdByName = new Map(tagRows.map((t) => [t.name, t.id]));

  let inserted = 0;
  let aiSucceeded = 0;
  let fellBack = 0;

  for (const course of mockCourses) {
    const aiTags = await classifyWithAI(course.name, course.department);
    const usedFallback = aiTags === null || aiTags.length === 0;
    const tagNames = usedFallback ? classifyHeuristically(course.name, course.department) : aiTags;

    if (usedFallback) fellBack += 1;
    else aiSucceeded += 1;

    for (const tagName of tagNames) {
      const fieldTagId = tagIdByName.get(tagName);
      if (!fieldTagId) {
        console.warn(`알 수 없는 태그 "${tagName}" (과목: ${course.name}) — 건너뜀`);
        continue;
      }

      const result = await db
        .insert(schema.courseFieldTags)
        .values({ courseId: course.id, fieldTagId, reviewed: false })
        .onConflictDoNothing({
          target: [schema.courseFieldTags.courseId, schema.courseFieldTags.fieldTagId],
        })
        .returning();

      if (result.length > 0) inserted += 1;
    }

    console.log(`${course.name} (${course.department}) → [${tagNames.join(", ") || "없음"}]${usedFallback ? " (폴백)" : ""}`);
  }

  console.log(
    `\n분류 완료: course_field_tags ${inserted}개 삽입 (미검수 상태) — AI 성공 ${aiSucceeded}개 과목, 폴백 ${fellBack}개 과목.`,
  );
  console.log(`검수 전이라 검색 결과에는 아직 노출되지 않습니다. app/api/field-tags/review로 검수해야 합니다.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("분류 실패:", err);
    process.exit(1);
  });
