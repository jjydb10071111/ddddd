// F4 커리큘럼 데이터(lib/curriculum-data.ts)의 academicField/industry를 채우는 학과명·과목명
// 키워드 휴리스틱 — Sprint 3(F3) 산출물로 lib/curriculum-engine.ts의 관심분야 랭킹이 항상
// 0점이던 문제(docs/DEVELOPMENT_PLAN.md Sprint 3 체크리스트 #7)를 해소한다.
//
// === 왜 AI 분류 대신 학과명 키워드 휴리스틱인가 (판단 근거) ===
// F2/F3의 DB 파이프라인(lib/db/classify-field-tags.ts, lib/db/classify-industry-tags.ts)은
// "AI 1차 분류 + 담당자 검수" 워크플로우를 courses 테이블의 5개 데모 과목에만 적용한다.
// lib/curriculum-data.ts는 완전히 별개의 정적 JSON 세계(2,695개 실제 개설강좌, 146개 학과)라
// courses 테이블에 없다 — 이 세션에서 2,695개 과목을 전부 LLM으로 1차 분류하고, 그 결과를
// "검수 없이" 커리큘럼 엔진 입력으로 흘려보내는 것은 F2/F3가 지금까지 지켜온 "AI 태그는
// 검수 전엔 노출 안 함" 원칙과 정면으로 어긋난다 — 이 데이터는 애초에 검수 워크플로우를
// 거칠 예정도 없다(courses 테이블에 있지도 않음).
//
// 그래서 택한 절충안: 검수를 거치는 courses 테이블 태그와는 별도로, curriculum-data.ts
// 전용으로 "학과명에 이 키워드가 있으면 이 분야"라는 투명하고 결정론적인 규칙을 적용한다.
// AI 판단인 척 하지 않고, 정확히 무슨 규칙으로 분류됐는지 이 파일만 보면 알 수 있다는 점이
// 장점이다. 단점은 재현율(recall)이 낮다는 것 — 규칙에 없는 학과명은 academicField/industry가
// 그냥 undefined로 남는다(허위로 아무 분야나 채워 넣지 않는다). 이 트레이드오프와 실제 커버리지
// 수치는 docs/DEVELOPMENT_PLAN.md Sprint 3 메모에 기록한다.
//
// industry 판정은 lib/search/industry-tag-taxonomy.ts(F3와 동일 태그셋 — 이름이 갈리면
// curriculum-engine.ts의 `course.industry === field` 비교가 조용히 깨진다)를 그대로 재사용해
// F2/F3/F4가 최소한 "같은 산업 태그 이름"이라는 축은 공유하게 한다.

import { industryTagTaxonomy } from "./search/industry-tag-taxonomy"

export type CurriculumClassification = {
  industry?: string
  academicField?: string
}

/** 산업/진로 태그 판정 — department+name 텍스트에 departmentKeywords/keywords가 몇 개
 * 겹치는지로 점수를 매기고, 가장 높은 태그 하나를 고른다(동점이면 taxonomy 순서상 먼저
 * 나오는 태그). 한 과목이 여러 산업에 걸칠 수 있다는 PRD 8.3 취지와 달리 여기서는 단일
 * 문자열만 담을 수 있다 — lib/curriculum-data.ts의 CurriculumCourse.industry 필드 자체가
 * string(복수 아님)이기 때문이다(curriculum-engine.ts를 건드리지 않는 범위에서의 제약). */
function classifyIndustry(department: string, name: string): string | undefined {
  const text = `${department} ${name}`.toLowerCase()
  let best: { name: string; score: number } | undefined

  for (const tag of industryTagTaxonomy) {
    const allKeywords = [...tag.departmentKeywords, ...tag.keywords]
    let score = 0
    for (const kw of allKeywords) {
      if (text.includes(kw.toLowerCase())) score += 1
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { name: tag.name, score }
    }
  }

  return best?.name
}

// F2 학문분야 태그(lib/search/field-tag-taxonomy.ts) 중 소분류로만 판정한다 — 대분류는
// 태그 자체가 아니라 소분류의 상위 그룹핑용이라 courses에도 붙지 않는다(F2와 동일 규칙).
// 더 구체적인 패턴을 먼저 검사해야 한다 — 예: "화학공학"을 "화학"보다 먼저 검사하지 않으면
// 화학공학과가 전부 "화학"으로 오분류된다.
const academicFieldRules: { pattern: RegExp; field: string }[] = [
  { pattern: /화학공학|화공/, field: "화학공학" },
  { pattern: /신소재|재료공학/, field: "신소재공학" },
  { pattern: /기계공학|기계/, field: "기계공학" },
  { pattern: /전자공학|전자|전기/, field: "전자공학" },
  { pattern: /컴퓨터|소프트웨어|정보통신|전산|인공지능/, field: "컴퓨터공학" },
  { pattern: /수학|수리/, field: "수학" },
  { pattern: /물리/, field: "물리학" },
  { pattern: /화학/, field: "화학" },
  { pattern: /생명|생물/, field: "생명과학" },
  { pattern: /국어국문|영어영문|불어불문|독어독문|중어중문|일어일문|문예창작|언어/, field: "문학" },
  { pattern: /철학/, field: "철학" },
  { pattern: /사학|역사/, field: "역사학" },
  { pattern: /경제/, field: "경제학" },
  { pattern: /경영|무역|회계/, field: "경영학" },
  { pattern: /심리/, field: "심리학" },
  { pattern: /음악|국악/, field: "음악" },
  { pattern: /미술|조소|회화/, field: "미술" },
  { pattern: /디자인/, field: "디자인" },
]

function classifyAcademicField(department: string): string | undefined {
  for (const rule of academicFieldRules) {
    if (rule.pattern.test(department)) return rule.field
  }
  return undefined
}

/** 학과명(+과목명)만으로 industry/academicField를 결정론적으로 추정한다. 매칭되는 규칙이
 * 없으면 undefined로 남긴다(허위 태깅 방지) — lib/curriculum-data.ts 모듈 로드 시 한 번만
 * 호출되고, 결과가 curriculumCourses 배열에 캐싱되어 curriculum-engine.ts 호출마다
 * 재계산되지 않는다. */
export function classifyCurriculumCourse(department: string, name: string): CurriculumClassification {
  return {
    industry: classifyIndustry(department, name),
    academicField: classifyAcademicField(department),
  }
}
