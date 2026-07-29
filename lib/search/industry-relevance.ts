// F3(산업/진로 분야 키워드 검색) 연관도 스코어러 — PRD 8.3 #2/10.3의 "임베딩 유사도 기반
// 연관도 스코어" 요구를 현재 이 저장소가 실제로 낼 수 있는 방법으로 구현한 것이다.
//
// === 임베딩 vs 휴리스틱 트레이드오프 (Sprint 3에서 내린 결정, 반드시 읽을 것) ===
// PRD 10.3은 "과목 설명/키워드를 임베딩하고 pgvector로 산업 태그 기준 텍스트와 코사인
// 유사도를 계산"하도록 되어 있고, lib/db/schema.ts에는 courses.embedding /
// industryTags.embedding vector(1536) 컬럼이 이미 존재한다(pgvector 확장도 활성화됨,
// drizzle/0000_strange_steel_serpent.sql 참고) — 스키마 자체는 실제 임베딩을 받을 준비가
// 되어 있다.
//
// 다만 lib/ai.ts가 이미 문서화하듯 Vercel AI Gateway는 임베딩 호출을 라우팅하지 않는다
// (vercel:ai-gateway 스킬: "For embeddings, use a direct provider SDK"). 별도 프로바이더
// SDK(@ai-sdk/openai 등)를 추가하려면 그 프로바이더 전용 API 키 환경변수가 필요한데,
// 이 세션 시점에 그런 키가 설정되어 있지 않다 — 추가해도 이번 세션에서 실제로 호출을
// 검증할 방법이 없다. 검증 불가능한 프로바이더 연동 코드를 추가하는 대신, 이 파일은
// "당장 정확히 동작하고 검증 가능한" 키워드 중첩 휴리스틱을 1차 스코어러로 쓰고,
// lib/db/classify-industry-tags.ts에서는 먼저 AI Gateway 텍스트 생성(F1/F2와 동일한
// generateText 경로, 새 프로바이더 불필요)으로 관계 점수를 받아보고, 그것도 실패하면
// (결제수단 미등록 403 등) 이 휴리스틱으로 최종 폴백한다.
//
// 실제 임베딩 벡터 유사도로 전환하려면: (1) 임베딩 프로바이더 키를 설정하고, (2) 과목/
// 산업태그 텍스트를 임베딩해 courses.embedding / industryTags.embedding에 채운 뒤,
// (3) 이 파일의 scoreIndustryRelevanceHeuristic 호출부를 pgvector의 코사인 거리 연산자
// (`<=>`)를 쓰는 SQL 쿼리로 바꾸면 된다 — courseIndustryTags 테이블 구조(relevanceScore,
// reviewed)는 이미 그 결과를 그대로 받을 수 있게 설계되어 있어 바꿀 필요가 없다.

import type { IndustryTagSeed } from "./industry-tag-taxonomy"

/**
 * 과목 텍스트(과목명 + 개설학과 + 강의계획서)와 산업 태그의 키워드 목록이 얼마나
 * 겹치는지로 0~1 사이 연관도를 추정한다. 코사인 유사도의 정밀한 대체재는 아니지만,
 * "이진 태그가 아니라 스코어"라는 F3의 핵심 요구(PRD 8.3 #2)는 충족한다.
 *
 * 키워드 3개 이상 일치하면 만점(1.0)으로 saturate시킨다 — 데모 규모(과목명 몇 단어 +
 * 학과명)에서 4개 이상 겹치는 경우가 사실상 없어, 분모를 더 크게 잡으면 항상 낮은 점수만
 * 나오는 문제를 피하기 위함이다.
 */
export function scoreIndustryRelevanceHeuristic(courseText: string, tag: IndustryTagSeed): number {
  const text = courseText.toLowerCase()
  let hits = 0
  for (const keyword of tag.keywords) {
    if (text.includes(keyword.toLowerCase())) hits += 1
  }
  if (hits === 0) return 0
  return Math.min(1, hits / 3)
}

/** 노이즈 제거용 최소 연관도 — 이 미만이면 애초에 courseIndustryTags 행을 만들지 않는다. */
export const MIN_RELEVANCE_SCORE = 0.2
