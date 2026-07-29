// Sprint 3(F3) — 과목 → 산업/진로 태그 연관도 1차 스코어링 스크립트.
//
// PRD 8.3 #3: "AI가 스코어링하고 담당자가 검수해 확정한다." 이 스크립트는 "AI/폴백
// 스코어링"만 담당한다 — 여기서 만든 course_industry_tags 행은 항상 reviewed=false로
// 삽입되고, 검색 API(app/api/industry-search)는 reviewed=true인 행만 노출한다. reviewed를
// true로 바꾸는 것은 이 스크립트가 아니라 app/api/industry-tags/review(담당자 검수
// 워크플로우)의 책임이다.
//
// 연관도 스코어 산출 방식은 lib/search/industry-relevance.ts 상단 주석에 자세히 적어뒀다 —
// 요약하면: 임베딩 코사인 유사도(PRD 10.3 원안)는 Vercel AI Gateway가 임베딩 호출을
// 지원하지 않고 별도 프로바이더 키도 없어 이번 스프린트에는 실제로 검증할 수 없다.
// 대신 (1) AI Gateway 텍스트 생성(F1/F2와 동일 경로, ai.ts의 AI_MODELS)으로 0~1 점수를
// 직접 요청하고, (2) 그 호출이 실패하면(예: 결제수단 미등록 403) 키워드 중첩 휴리스틱으로
// 폴백한다. 두 경로 모두 결과는 동일하게 reviewed=false로 들어가므로 "검수 없이 노출"되는
// 일은 없다 — 다만 폴백 결과는 실제 LLM 판단이 아니므로 담당자가 더 꼼꼼히 봐야 한다.
//
// MIN_RELEVANCE_SCORE 미만인 태그는 애초에 행을 만들지 않는다(관련 없는 태그까지 전부
// 0점으로 쌓아 검수 대기열을 오염시키지 않기 위함).
//
// 실행: `npm run db:classify-industry-tags` (db:seed, db:seed-industry-tags를 먼저 실행해둘 것).

import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/neon-http";
import { generateText } from "ai";
import * as schema from "./schema";
import { mockCourses } from "../mock-data";
import { industryTagTaxonomy, industryTagNames } from "../search/industry-tag-taxonomy";
import { scoreIndustryRelevanceHeuristic, MIN_RELEVANCE_SCORE } from "../search/industry-relevance";
import { AI_MODELS } from "../ai";

const db = drizzle(neon(process.env.DATABASE_URL!), { schema });

function courseText(name: string, department: string, syllabus: string | null): string {
  return [name, department, syllabus ?? ""].join(" ");
}

function classifyHeuristically(name: string, department: string, syllabus: string | null): Record<string, number> {
  const text = courseText(name, department, syllabus);
  const scores: Record<string, number> = {};
  for (const tag of industryTagTaxonomy) {
    scores[tag.name] = scoreIndustryRelevanceHeuristic(text, tag);
  }
  return scores;
}

async function classifyWithAI(
  name: string,
  department: string,
  syllabus: string | null,
): Promise<Record<string, number> | null> {
  try {
    const tagDescriptions = industryTagTaxonomy
      .map((t) => `- ${t.name}: ${t.description}`)
      .join("\n");

    const { text } = await generateText({
      model: AI_MODELS.fast,
      system:
        `당신은 대학 과목이 어떤 산업/진로 분야와 얼마나 관련 있는지 0~1 사이 점수로 평가하는 ` +
        `도우미입니다. 아래 산업/진로 분야 목록에 대해서만 점수를 매기세요(목록 밖 분야를 ` +
        `새로 만들면 안 됩니다):\n${tagDescriptions}\n\n` +
        `점수 기준: 0 = 전혀 무관, 0.5 = 간접적으로 도움됨, 1 = 해당 분야 취업/진로에 직접 ` +
        `필요한 핵심 과목. 다른 설명 없이 모든 분야 이름을 키로 갖는 JSON 객체로만 응답하세요. ` +
        `예: {"반도체": 0.9, "AI·데이터사이언스": 0.3, "바이오·헬스케어": 0, "금융·핀테크": 0, ` +
        `"콘텐츠·미디어": 0, "에너지·환경": 0.1}`,
      prompt: `과목명: ${name}\n개설학과: ${department}\n강의계획서: ${syllabus ?? "(없음)"}`,
    });

    const match = text.match(/\{[\s\S]*\}/);
    const parsed: unknown = JSON.parse(match ? match[0] : text);
    if (typeof parsed !== "object" || parsed === null) return null;

    const validNames = new Set(industryTagNames);
    const scores: Record<string, number> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!validNames.has(key) || typeof value !== "number" || Number.isNaN(value)) continue;
      scores[key] = Math.max(0, Math.min(1, value));
    }
    return Object.keys(scores).length > 0 ? scores : null;
  } catch (err) {
    console.warn(
      `AI 스코어링 실패(${name}) — 휴리스틱 폴백 사용: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

async function main() {
  const tagRows = await db.select().from(schema.industryTags);
  const tagIdByName = new Map(tagRows.map((t) => [t.name, t.id]));

  // courses 테이블에는 syllabus가 아직 전부 null이다(Sprint 1 stopgap과 동일한 한계 —
  // lib/db/classify-field-tags.ts 주석 참고). 한 번에 조회해 맵으로 들고 있는다 —
  // 실제 강의계획서가 채워지면 이 스크립트를 재실행하는 것만으로 자동 반영된다.
  const courseRows = await db
    .select({ id: schema.courses.id, syllabus: schema.courses.syllabus })
    .from(schema.courses);
  const syllabusById = new Map(courseRows.map((c) => [c.id, c.syllabus]));

  let inserted = 0;
  let aiSucceeded = 0;
  let fellBack = 0;

  for (const course of mockCourses) {
    const syllabus = syllabusById.get(course.id) ?? null;
    const aiScores = await classifyWithAI(course.name, course.department, syllabus);
    const usedFallback = aiScores === null;
    const scores = usedFallback ? classifyHeuristically(course.name, course.department, syllabus) : aiScores;

    if (usedFallback) fellBack += 1;
    else aiSucceeded += 1;

    const kept = Object.entries(scores).filter(([, score]) => score >= MIN_RELEVANCE_SCORE);

    for (const [tagName, score] of kept) {
      const industryTagId = tagIdByName.get(tagName);
      if (!industryTagId) {
        console.warn(`알 수 없는 태그 "${tagName}" (과목: ${course.name}) — 건너뜀`);
        continue;
      }

      const result = await db
        .insert(schema.courseIndustryTags)
        .values({ courseId: course.id, industryTagId, relevanceScore: score, reviewed: false })
        .onConflictDoNothing({
          target: [schema.courseIndustryTags.courseId, schema.courseIndustryTags.industryTagId],
        })
        .returning();

      if (result.length > 0) inserted += 1;
    }

    const summary = kept.map(([n, s]) => `${n}=${s.toFixed(2)}`).join(", ") || "없음";
    console.log(`${course.name} (${course.department}) → [${summary}]${usedFallback ? " (폴백)" : ""}`);
  }

  console.log(
    `\n분류 완료: course_industry_tags ${inserted}개 삽입 (미검수 상태) — AI 성공 ${aiSucceeded}개 과목, 폴백 ${fellBack}개 과목.`,
  );
  console.log(`검수 전이라 검색 결과에는 아직 노출되지 않습니다. app/api/industry-tags/review로 검수해야 합니다.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("분류 실패:", err);
    process.exit(1);
  });
