"use client"

import { useEffect, useState } from "react"
import {
  BrainCircuit,
  ChevronDown,
  Clapperboard,
  Cpu,
  HeartPulse,
  Leaf,
  LineChart,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth-provider"
import {
  listIndustryTags,
  searchByIndustryTag,
  type IndustryTagListItem,
  type IndustrySearchResult,
} from "@/lib/api/industry-search"
import { CourseCard } from "@/components/course-card"

const iconMap: Record<string, LucideIcon> = {
  Cpu,
  BrainCircuit,
  HeartPulse,
  LineChart,
  Clapperboard,
  Leaf,
}

export function FieldsExplorer() {
  const { user } = useAuth()
  const [tags, setTags] = useState<IndustryTagListItem[]>([])
  const [tagsLoading, setTagsLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, IndustrySearchResult | undefined>>({})
  const [resultsLoading, setResultsLoading] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listIndustryTags().then((res) => {
      if (cancelled) return
      setTags(res.tags)
      setTagsLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleToggle(tag: IndustryTagListItem) {
    const nextOpen = openId === tag.id ? null : tag.id
    setOpenId(nextOpen)
    if (nextOpen && !results[tag.name]) {
      setResultsLoading(tag.name)
      const res = await searchByIndustryTag(tag.name, user?.department)
      setResults((prev) => ({ ...prev, [tag.name]: res }))
      setResultsLoading(null)
    }
  }

  if (tagsLoading) {
    return <p className="text-sm text-muted-foreground">산업/진로 분야를 불러오는 중입니다...</p>
  }

  if (tags.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        아직 등록된 산업/진로 분야 태그가 없습니다.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tags.map((field) => {
        const Icon = iconMap[field.icon] ?? Cpu
        const isOpen = openId === field.id
        const result = results[field.name]
        const isLoadingResults = resultsLoading === field.name

        return (
          <div
            key={field.id}
            className={cn(
              "flex flex-col rounded-2xl border bg-card transition-all",
              isOpen
                ? "border-primary/40 shadow-lg shadow-primary/5 sm:col-span-2 lg:col-span-3"
                : "border-border hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5",
            )}
          >
            <button
              type="button"
              onClick={() => handleToggle(field)}
              aria-expanded={isOpen}
              className="flex items-center gap-4 p-5 text-left"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-6" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="font-display text-base font-bold text-foreground">
                    {field.name}
                  </span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                    {field.courseCount}개 과목
                  </span>
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {field.description}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "size-5 shrink-0 text-muted-foreground transition-transform",
                  isOpen && "rotate-180 text-primary",
                )}
                aria-hidden="true"
              />
            </button>

            {isOpen && (
              <div className="border-t border-border px-5 pb-5 pt-4">
                {isLoadingResults || !result ? (
                  <p className="text-sm text-muted-foreground">과목을 불러오는 중입니다...</p>
                ) : (
                  <FieldResultSections field={field} result={result} hasDepartment={Boolean(user?.department)} />
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function FieldResultSections({
  field,
  result,
  hasDepartment,
}: {
  field: IndustryTagListItem
  result: IndustrySearchResult
  hasDepartment: boolean
}) {
  if (result.myMajorCourses.length === 0 && result.otherMajorCourses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        아직 검수를 마친 &quot;{field.name}&quot; 연관 과목이 없습니다.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {hasDepartment && result.myMajorCourses.length > 0 && (
        <section>
          <h4 className="mb-3 text-sm font-semibold text-foreground">
            내 전공에서 바로 들을 수 있는 과목
            <span className="ml-2 text-xs font-normal text-muted-foreground">연관도순 정렬</span>
          </h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.myMajorCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                ownMajorLabel="내 전공 과목"
                relevanceScore={course.relevanceScore}
              />
            ))}
          </div>
        </section>
      )}

      {result.otherMajorCourses.length > 0 && (
        <section>
          <h4 className="mb-1 text-sm font-semibold text-foreground">
            타 전공 과목
            <span className="ml-2 text-xs font-normal text-muted-foreground">연관도순 정렬</span>
          </h4>
          <p className="mb-3 text-xs text-muted-foreground">{result.otherMajorCaveat}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.otherMajorCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                ownMajorLabel={hasDepartment ? "타 전공 과목" : undefined}
                relevanceScore={course.relevanceScore}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
