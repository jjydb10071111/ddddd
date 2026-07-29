import type { HashtagStat } from "@/lib/mock-data"

// 과목 상세 페이지의 해시태그별 언급 빈도(%) — AI 요약 여부와 무관하게 리뷰가 하나라도
// 있으면 표시한다(PRD 8.1 완료조건: "해시태그별 언급 빈도가 과목 상세 페이지에 표시된다").
export function HashtagFrequencyList({ hashtags }: { hashtags: HashtagStat[] }) {
  if (hashtags.length === 0) return null

  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-foreground">
        수강생들이 이렇게 언급했어요
      </p>
      <div className="space-y-3">
        {hashtags.map((h) => (
          <div key={h.tag} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-sm font-medium text-foreground">
              #{h.tag}
            </span>
            <div className="relative h-6 flex-1 overflow-hidden rounded-full bg-card">
              <div
                className="flex h-full items-center justify-end rounded-full bg-primary px-2 transition-all"
                style={{ width: `${h.percent}%` }}
              >
                <span className="text-xs font-semibold text-primary-foreground">
                  {h.percent}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
