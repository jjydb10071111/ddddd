"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertCircle, MessageSquareText } from "lucide-react"
import { AiSummaryCard } from "@/components/ai-summary-card"
import { HashtagFrequencyList } from "@/components/hashtag-frequency"
import { ReviewList } from "@/components/review-list"
import { ReviewComposer } from "@/components/review-composer"
import { RatingStars } from "@/components/course-badges"
import { getCourseSummary, listReviews, type SummaryStatusResult } from "@/lib/api/reviews"
import type { HashtagStat, Review } from "@/lib/mock-data"

// 과목 상세 페이지의 리뷰/AI 요약 섹션 전체.
//
// lib/db/schema.ts 기반 실제 리뷰 데이터를 다루므로 클라이언트에서 fetch로 조회한다
// (서버 컴포넌트에서 상대경로 fetch를 쓰면 배포 환경의 base URL 문제가 생길 수 있어
// 피했다 — app/courses/[id]/page.tsx의 데이터 소스 결정 메모 참고). 리뷰 등록 후에는
// onSubmitted 콜백으로 목록/요약을 다시 불러온다.
export function CourseReviewsSection({ courseId }: { courseId: string }) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [hashtagStats, setHashtagStats] = useState<HashtagStat[]>([])
  const [summary, setSummary] = useState<SummaryStatusResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [reviewsError, setReviewsError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const [reviewResult, summaryResult] = await Promise.all([
      listReviews(courseId),
      getCourseSummary(courseId),
    ])
    if (reviewResult.success) {
      setReviews(reviewResult.reviews)
      setHashtagStats(reviewResult.hashtagStats)
      setReviewsError(null)
    } else {
      // 실패를 "리뷰 0개"로 조용히 표시하면 사용자가 실제로는 리뷰가 없는 과목이라고
      // 오해할 수 있다 — 통신 실패는 별도 에러 상태로 구분해서 보여준다.
      setReviewsError(reviewResult.message ?? "수강평을 불러오지 못했습니다.")
    }
    setSummary(summaryResult)
    setLoading(false)
  }, [courseId])

  useEffect(() => {
    refresh()
  }, [refresh])

  const avgRating =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0

  return (
    <>
      {!loading && reviews.length > 0 && (
        <div className="mt-3">
          <RatingStars rating={avgRating} reviewCount={reviews.length} />
        </div>
      )}

      {/* AI 요약 / 리뷰 부족 / 리뷰 없음 안내 */}
      <div className="mt-6">
        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            불러오는 중...
          </div>
        ) : reviewsError ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
            <AlertCircle className="size-6 text-destructive" aria-hidden="true" />
            <p className="text-sm font-medium text-destructive">{reviewsError}</p>
            <button
              type="button"
              onClick={refresh}
              className="rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-foreground transition hover:bg-secondary"
            >
              다시 시도
            </button>
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            아직 등록된 수강평이 없습니다. 첫 수강평을 남겨보세요!
          </div>
        ) : summary?.success && summary.status === "ready" ? (
          <AiSummaryCard
            summary={summary.body}
            hashtags={hashtagStats}
            polarized={summary.polarized}
          />
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">
              {summary?.success && summary.status === "pending"
                ? "AI 요약을 준비하고 있어요. 잠시 후 다시 확인해주세요."
                : `리뷰가 아직 충분하지 않습니다. AI 요약은 리뷰 5개 이상부터 제공돼요. (현재 ${reviews.length}개)`}
            </p>
            {summary?.success && summary.status === "pending" && summary.polarized && (
              <p className="mt-2 inline-flex items-center rounded-full bg-chart-5/15 px-3 py-1 text-xs font-semibold text-chart-5">
                호불호가 갈리는 강의예요 — 개별 수강평도 함께 확인해보세요
              </p>
            )}
            {hashtagStats.length > 0 && (
              <div className="mt-5">
                <HashtagFrequencyList hashtags={hashtagStats} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 개별 수강평 — 목록 조회에 실패한 상태에서는 위 에러 안내만 보여주고 이 섹션은 숨긴다
          (0개로 보이면 "리뷰가 없는 과목"과 "불러오기 실패"가 헷갈릴 수 있다). */}
      {!reviewsError && (
        <section className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MessageSquareText className="size-5 text-primary" aria-hidden="true" />
              <h2 className="font-display text-lg font-bold text-foreground">
                수강평
                <span className="ml-1.5 text-base font-normal text-muted-foreground">
                  {reviews.length}
                </span>
              </h2>
              <span className="text-xs text-muted-foreground">· 최신순</span>
            </div>
            <ReviewComposer courseId={courseId} onSubmitted={refresh} />
          </div>

          <div className="mt-4">
            <ReviewList reviews={reviews} />
          </div>
        </section>
      )}
    </>
  )
}
