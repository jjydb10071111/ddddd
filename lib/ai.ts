// LLM API 벤더: Vercel AI Gateway. "ai" 패키지에 provider/model 문자열을 그대로 넘기면
// 게이트웨이를 통해 라우팅된다 — 프로바이더별 SDK(@ai-sdk/anthropic 등)를 직접 설치하지 않는다.
// 인증은 OIDC 기본값을 쓴다: `vercel link` 후 `vercel env pull --yes`로 VERCEL_OIDC_TOKEN이
// .env.local에 채워지면 별도 API 키 없이 동작한다.
//
// 주의: 임베딩(F3 산업/진로 태그 유사도 검색)은 게이트웨이가 아직 지원하지 않아 direct provider
// SDK가 필요하다 — Sprint 3에서 벤더를 다시 정하고 별도 클라이언트를 추가한다.
//
// 모델 슬러그는 자주 바뀌므로 하드코딩 전 `gateway.getAvailableModels()`로 실제 사용 가능한
// ID를 확인할 것 (vercel:ai-gateway 스킬 참고).

export const AI_MODELS = {
  /** F1 리뷰 요약, F4 추천 사유 생성처럼 품질이 중요한 생성 작업 */
  default: "anthropic/claude-sonnet-4.6",
  /** F1 해시태그 추천, F4 관심분야 랭킹처럼 짧고 빈번한 호출 */
  fast: "anthropic/claude-haiku-4.5",
} as const;
