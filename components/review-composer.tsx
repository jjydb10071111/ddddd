"use client"

import { useEffect, useRef, useState } from "react"
import { PenLine, Sparkles, Star, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { predefinedReviewTags } from "@/lib/mock-data"
import { submitReview, suggestHashtags } from "@/lib/api/reviews"
import { useAuth } from "@/components/auth-provider"

// 자유 텍스트가 이보다 짧으면 AI 태그 추천을 시도하지 않는다.
const AI_SUGGEST_MIN_LENGTH = 10
const AI_SUGGEST_DEBOUNCE_MS = 900

export function ReviewComposer({
  courseId,
  onSubmitted,
}: {
  courseId: string
  onSubmitted?: () => void
}) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [body, setBody] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [aiTags, setAiTags] = useState<string[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 모달 열림 시 배경 스크롤 방지 + ESC 닫기
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open])

  // 자유 텍스트 → AI 해시태그 "후보" 추천 (디바운스). 사용자가 채택/수정하는 후보일 뿐,
  // 자동으로 선택되지 않는다 — 클릭해야 selectedTags에 반영된다.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (body.trim().length < AI_SUGGEST_MIN_LENGTH) {
      setAiTags([])
      setAiLoading(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setAiLoading(true)
      const result = await suggestHashtags(body)
      setAiTags(result.success ? result.tags : [])
      setAiLoading(false)
    }, AI_SUGGEST_DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [body])

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  function resetForm() {
    setRating(0)
    setHoverRating(0)
    setBody("")
    setSelectedTags([])
    setAiTags([])
    setError(null)
  }

  async function handleSubmit() {
    if (!user) {
      setError("로그인 후 이용할 수 있습니다.")
      return
    }
    if (rating === 0) {
      setError("별점을 선택해주세요.")
      return
    }
    if (body.trim().length < 5) {
      setError("수강평을 5자 이상 입력해주세요.")
      return
    }

    setSubmitting(true)
    setError(null)

    const result = await submitReview({
      courseId,
      rating,
      body: body.trim(),
      hashtags: selectedTags,
    })

    setSubmitting(false)

    if (!result.success) {
      setError(result.message ?? "수강평 등록에 실패했습니다.")
      return
    }

    setOpen(false)
    resetForm()
    onSubmitted?.()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
      >
        <PenLine className="size-4" aria-hidden="true" />
        수강평 작성하기
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="수강평 작성"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90svh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-6 shadow-xl sm:rounded-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-foreground">
                수강평 작성하기
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* 별점 */}
            <div className="mt-5">
              <p className="text-sm font-semibold text-foreground">별점</p>
              <div
                className="mt-2 flex items-center gap-1"
                onMouseLeave={() => setHoverRating(0)}
              >
                {Array.from({ length: 5 }).map((_, i) => {
                  const value = i + 1
                  const active = (hoverRating || rating) >= value
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-label={`${value}점`}
                      onClick={() => setRating(value)}
                      onMouseEnter={() => setHoverRating(value)}
                      className="p-0.5"
                    >
                      <Star
                        className={cn(
                          "size-8 transition-colors",
                          active
                            ? "fill-chart-5 text-chart-5"
                            : "fill-muted text-muted-foreground/30",
                        )}
                      />
                    </button>
                  )
                })}
                {rating > 0 && (
                  <span className="ml-2 text-sm font-semibold text-foreground">
                    {rating}.0
                  </span>
                )}
              </div>
            </div>

            {/* 본문 */}
            <div className="mt-5">
              <label
                htmlFor="review-body"
                className="text-sm font-semibold text-foreground"
              >
                수강평
              </label>
              <textarea
                id="review-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                placeholder="강의 난이도, 과제량, 시험 방식 등 후배들에게 도움이 될 이야기를 남겨주세요."
                className="mt-2 w-full resize-none rounded-xl border border-input bg-background p-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25"
              />
            </div>

            {/* 사전 정의 해시태그 */}
            <div className="mt-5">
              <p className="text-sm font-semibold text-foreground">해시태그</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {predefinedReviewTags.map((tag) => {
                  const selected = selectedTags.includes(tag)
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent",
                      )}
                    >
                      #{tag}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* AI 추천 태그 (후보 제안 — 클릭해야 채택됨) */}
            <div className="mt-4">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                <Sparkles className="size-3.5" aria-hidden="true" />
                AI 추천 태그
                {aiLoading && <span className="text-xs font-normal">분석 중...</span>}
              </p>
              {aiTags.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {aiTags.map((tag) => {
                    const selected = selectedTags.includes(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          "rounded-full border border-dashed px-3 py-1.5 text-sm font-medium transition",
                          selected
                            ? "border-muted-foreground bg-muted-foreground text-background"
                            : "border-border bg-muted text-muted-foreground hover:bg-secondary",
                        )}
                      >
                        #{tag}
                      </button>
                    )
                  })}
                </div>
              ) : (
                !aiLoading && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    수강평을 {AI_SUGGEST_MIN_LENGTH}자 이상 작성하면 AI가 어울리는 태그를 추천해드려요.
                  </p>
                )
              )}
            </div>

            {error && (
              <p className="mt-4 text-sm font-medium text-destructive">{error}</p>
            )}

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-full border border-border bg-card py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "등록 중..." : "등록"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
