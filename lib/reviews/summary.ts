// F1 AI 요약 파이프라인 — 생성/캐싱/재생성 조건, 해시태그 빈도 계산, 호불호 판정.
//
// 서버 전용. Route Handler(app/api/reviews/**)에서만 호출한다.

import "server-only";
import { and, count, desc, eq } from "drizzle-orm";
import { generateText } from "ai";
import { db, schema } from "@/lib/db";
import { AI_MODELS } from "@/lib/ai";
import type { HashtagStat } from "@/lib/mock-data";

// PRD 8.1 완료조건 "리뷰 5개 이상" 그대로.
export const MIN_REVIEWS_FOR_SUMMARY = 5;

// 신규 리뷰가 이만큼 더 쌓이면 요약을 재생성한다. PRD 8.1은 "신규 리뷰가 일정 수 누적되면"
// 이라고만 되어 있어 정확한 수치가 명시되어 있지 않다 — 매 리뷰마다 재생성(비용/속도 문제)과
// 너무 드물게 재생성(최신성 저하) 사이에서 MVP 기준으로 3을 택함. 튜닝 필요 시 이 값만 조정.
export const REGENERATION_THRESHOLD = 3;

// 평점 표준편차가 이 값 이상이고, 낮은 평점(1~2)과 높은 평점(4~5)이 각각 최소 비율 이상
// 섞여 있으면 "호불호가 갈리는 강의"로 판단한다 (PRD 8.1 Edge Case).
const POLARIZATION_STD_DEV = 1.3;
const POLARIZATION_MIN_SHARE = 0.2;

// 프롬프트 길이 보호 — 리뷰가 아주 많은 과목이라도 최신 N개까지만 요약에 반영한다.
const MAX_REVIEWS_IN_PROMPT = 50;

export type ReviewForSummary = {
  rating: number;
  body: string;
  hashtags: string[];
};

/** 해시태그별 언급 빈도(%) — 비율은 항상 (해당 태그 언급 리뷰 수) / (전체 비-플래그 리뷰 수). */
export function computeHashtagStats(reviews: ReviewForSummary[]): HashtagStat[] {
  if (reviews.length === 0) return [];
  const counts = new Map<string, number>();
  for (const review of reviews) {
    for (const tag of review.hashtags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, tagCount]) => ({ tag, percent: Math.round((tagCount / reviews.length) * 100) }))
    .sort((a, b) => b.percent - a.percent);
}

export function isPolarized(reviews: ReviewForSummary[]): boolean {
  if (reviews.length < MIN_REVIEWS_FOR_SUMMARY) return false;
  const ratings = reviews.map((r) => r.rating);
  const mean = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
  const variance = ratings.reduce((sum, r) => sum + (r - mean) ** 2, 0) / ratings.length;
  const stdDev = Math.sqrt(variance);
  const lowShare = ratings.filter((r) => r <= 2).length / ratings.length;
  const highShare = ratings.filter((r) => r >= 4).length / ratings.length;
  return stdDev >= POLARIZATION_STD_DEV && lowShare >= POLARIZATION_MIN_SHARE && highShare >= POLARIZATION_MIN_SHARE;
}

async function generateSummaryText(courseName: string, reviews: ReviewForSummary[]): Promise<string> {
  const hashtagStats = computeHashtagStats(reviews);
  const polarized = isPolarized(reviews);

  const reviewLines = reviews
    .slice(0, MAX_REVIEWS_IN_PROMPT)
    .map((r, i) => `${i + 1}. (평점 ${r.rating}/5) ${r.body}`)
    .join("\n");

  const hashtagLine = hashtagStats
    .slice(0, 5)
    .map((h) => `#${h.tag} ${h.percent}%`)
    .join(", ");

  const polarizationNote = polarized
    ? `\n주의: 이 과목은 평점이 낮은 리뷰와 높은 리뷰가 함께 많이 존재해 의견이 크게 갈립니다. 요약 문장에 "호불호가 갈리는 강의"라는 표현을 반드시 그대로 포함하세요.`
    : "";

  const { text } = await generateText({
    model: AI_MODELS.default,
    system:
      "당신은 대학 수강평을 종합해 과목 요약을 작성하는 도우미입니다. 반드시 한국어 3~5문장으로만 답하고, 마케팅 문구나 과장된 표현 없이 담백하고 구체적으로 작성하세요. " +
      "요약에는 (1) 전반적인 평가 경향, (2) 대표적인 장점과 단점, (3) 이 과목이 어떤 학생에게 어울리는지를 모두 포함해야 합니다. " +
      "리뷰에 없는 내용을 지어내지 마세요.",
    prompt:
      `과목명: ${courseName}\n` +
      `해시태그 언급 빈도: ${hashtagLine || "없음"}${polarizationNote}\n\n` +
      `아래는 수강생들이 남긴 개별 수강평입니다 (평점/본문):\n${reviewLines}\n\n` +
      `위 수강평들을 종합해 3~5문장의 과목 요약을 작성하세요.`,
  });

  return text.trim();
}

/**
 * 과목의 요약을 필요 시(리뷰 5개 이상 & 마지막 생성 이후 REGENERATION_THRESHOLD개 이상
 * 누적) 재생성해 summaries 테이블에 캐싱한다. 조건 미충족이면 아무 것도 하지 않는다.
 *
 * 리뷰 작성 응답을 막지 않도록 Route Handler에서 `after()`로 감싸 비동기 호출할 것
 * (PRD 10.3 — 리뷰어를 기다리게 하지 않는다).
 */
export async function maybeRegenerateSummary(courseId: string): Promise<void> {
  const { courses, reviews, summaries } = schema;

  const [course] = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  if (!course) return;

  const nonFlagged = await db
    .select({ rating: reviews.rating, body: reviews.body, hashtags: reviews.hashtags })
    .from(reviews)
    .where(and(eq(reviews.courseId, courseId), eq(reviews.flagged, false)))
    .orderBy(desc(reviews.createdAt));

  if (nonFlagged.length < MIN_REVIEWS_FOR_SUMMARY) return;

  const [existing] = await db.select().from(summaries).where(eq(summaries.courseId, courseId)).limit(1);

  if (existing && nonFlagged.length - existing.basedReviewCount < REGENERATION_THRESHOLD) {
    return; // 아직 재생성 임계치만큼 리뷰가 쌓이지 않음 — 매 조회/작성마다 재생성하지 않는다.
  }

  const body = await generateSummaryText(course.name, nonFlagged);

  if (existing) {
    await db
      .update(summaries)
      .set({ body, basedReviewCount: nonFlagged.length, generatedAt: new Date() })
      .where(eq(summaries.courseId, courseId));
  } else {
    await db.insert(summaries).values({ courseId, body, basedReviewCount: nonFlagged.length });
  }
}

export type SummaryStatus =
  | { status: "empty" }
  | { status: "insufficient"; reviewCount: number }
  | { status: "pending"; reviewCount: number; polarized: boolean }
  | {
      status: "ready";
      body: string;
      basedReviewCount: number;
      generatedAt: string;
      currentReviewCount: number;
      polarized: boolean;
    };

/** 과목 상세 페이지 조회용 — 절대 여기서 LLM을 호출하지 않는다(캐시만 읽음, 매 조회마다 재생성 금지). */
export async function getSummaryStatus(courseId: string): Promise<SummaryStatus> {
  const { reviews, summaries } = schema;

  const [{ value: reviewCount }] = await db
    .select({ value: count() })
    .from(reviews)
    .where(and(eq(reviews.courseId, courseId), eq(reviews.flagged, false)));

  if (reviewCount === 0) return { status: "empty" };
  if (reviewCount < MIN_REVIEWS_FOR_SUMMARY) return { status: "insufficient", reviewCount };

  const nonFlagged = await db
    .select({ rating: reviews.rating, body: reviews.body, hashtags: reviews.hashtags })
    .from(reviews)
    .where(and(eq(reviews.courseId, courseId), eq(reviews.flagged, false)));

  const polarized = isPolarized(nonFlagged);

  const [existing] = await db.select().from(summaries).where(eq(summaries.courseId, courseId)).limit(1);

  if (!existing) {
    // 리뷰는 5개 이상이지만 아직 요약이 생성되지 않은 상태(비동기 생성이 진행 중이거나 실패).
    return { status: "pending", reviewCount, polarized };
  }

  return {
    status: "ready",
    body: existing.body,
    basedReviewCount: existing.basedReviewCount,
    generatedAt: existing.generatedAt.toISOString(),
    currentReviewCount: reviewCount,
    polarized,
  };
}
