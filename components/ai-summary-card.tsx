import { Sparkles } from "lucide-react"
import type { HashtagStat } from "@/lib/mock-data"
import { HashtagFrequencyList } from "@/components/hashtag-frequency"

export function AiSummaryCard({
  summary,
  hashtags,
  polarized = false,
}: {
  summary: string
  hashtags: HashtagStat[]
  polarized?: boolean
}) {
  return (
    <section className="rounded-2xl border border-primary/20 bg-primary/[0.06] p-6 md:p-7">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="size-4" aria-hidden="true" />
        </span>
        <h2 className="font-display text-lg font-bold text-foreground">
          AI가 이 강의를 이렇게 요약했어요
        </h2>
      </div>

      {polarized && (
        <p className="mt-3 inline-flex items-center rounded-full bg-chart-5/15 px-3 py-1 text-xs font-semibold text-chart-5">
          호불호가 갈리는 강의예요 — 개별 수강평도 함께 확인해보세요
        </p>
      )}

      <p className="mt-4 text-pretty leading-relaxed text-foreground/90">
        {summary}
      </p>

      <div className="mt-6">
        <HashtagFrequencyList hashtags={hashtags} />
      </div>
    </section>
  )
}
