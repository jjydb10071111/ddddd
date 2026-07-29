// 어뷰징(도배성 리뷰/평점 테러) 탐지 — PRD 8.1 요구사항 7.
//
// MVP 범위이므로 ML 파이프라인 없이 단순 휴리스틱만 쓴다:
//   1) 짧은 시간 내 다건 작성(도배) — 같은 사용자가 N분 내 여러 개 작성
//   2) 거의 동일한 본문 재사용(스팸 텍스트 복붙) — 최근 리뷰들과의 문자 단위 유사도
//   3) 평점 테러 — 짧은 기간 내 같은 극단 평점(1점 또는 5점)을 반복
//
// 여기서 "flagged"는 즉시 차단이 아니라 "공개 집계(해시태그 빈도/AI 요약)에서 제외"를
// 의미한다 — 리뷰 자체는 저장되어 추후 검수 가능. 동일 과목 중복 작성 방지는 이 파일이
// 아니라 Route Handler에서 별도로 처리한다(리뷰 자체를 거부).

import "server-only";

export type RecentReviewForAbuseCheck = {
  rating: number;
  body: string;
  createdAt: Date;
};

export type AbuseCheckInput = {
  newRating: number;
  newBody: string;
  /** 같은 작성자의 최근 리뷰들(과목 무관, 최신순). 넉넉하게 최근 20건 정도면 충분하다. */
  recentReviews: RecentReviewForAbuseCheck[];
};

export type AbuseCheckResult = {
  flagged: boolean;
  reasons: string[];
};

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10분
const RATE_LIMIT_MAX_REVIEWS = 3; // 10분 내 (신규 포함) 3건 이상 → 도배로 간주

const BOMBING_WINDOW_MS = 24 * 60 * 60 * 1000; // 24시간
const BOMBING_MIN_COUNT = 4; // 24시간 내 같은 극단 평점이 (신규 포함) 4건 이상 → 평점 테러

const DUPLICATE_BODY_SIMILARITY = 0.85; // 문자 자카드 유사도 임계치

function normalizeBody(text: string): string {
  return text.replace(/\s+/g, "").toLowerCase();
}

/** 문자 집합 기반 자카드 유사도 — 형태소 분석 없이도 복붙성 텍스트를 잡아내기 위한 단순 근사치. */
function charJaccardSimilarity(a: string, b: string): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const ch of setA) {
    if (setB.has(ch)) intersection++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

export function detectAbuse({ newRating, newBody, recentReviews }: AbuseCheckInput): AbuseCheckResult {
  const reasons: string[] = [];
  const now = Date.now();

  // 1) 도배(짧은 시간 내 다건 작성)
  const withinRateWindow = recentReviews.filter(
    (r) => now - r.createdAt.getTime() <= RATE_LIMIT_WINDOW_MS,
  );
  if (withinRateWindow.length + 1 >= RATE_LIMIT_MAX_REVIEWS) {
    reasons.push("rate_limit");
  }

  // 2) 거의 동일한 본문 재사용
  const normalizedNew = normalizeBody(newBody);
  const hasNearDuplicateBody = recentReviews.some(
    (r) => charJaccardSimilarity(normalizedNew, normalizeBody(r.body)) >= DUPLICATE_BODY_SIMILARITY,
  );
  if (hasNearDuplicateBody) {
    reasons.push("duplicate_body");
  }

  // 3) 평점 테러 — 짧은 기간 동안 같은 극단 평점 반복
  if (newRating === 1 || newRating === 5) {
    const withinBombingWindow = recentReviews.filter(
      (r) => now - r.createdAt.getTime() <= BOMBING_WINDOW_MS && r.rating === newRating,
    );
    if (withinBombingWindow.length + 1 >= BOMBING_MIN_COUNT) {
      reasons.push("rating_bombing");
    }
  }

  return { flagged: reasons.length > 0, reasons };
}
