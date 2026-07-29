"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { SlidersHorizontal, SearchX } from "lucide-react"
import type { Course, Requirement } from "@/lib/mock-data"
import { searchCourses, type FieldMatchGroup } from "@/lib/api/search"
import { CourseCard } from "@/components/course-card"

type SortKey = "relevance" | "rating" | "reviews"

const sortOptions: { key: SortKey; label: string }[] = [
  { key: "relevance", label: "관련도순" },
  { key: "rating", label: "평점순" },
  { key: "reviews", label: "리뷰많은순" },
]

const creditOptions = ["전체", "1", "2", "3"]
// 학년(1~4학년) 필터는 PRD 8.2가 요구하는 필터 항목이지만, courses 테이블(lib/db/schema.ts)과
// mock-data.ts/curriculum-data.ts 어디에도 학년을 나타내는 원본 데이터가 없다(전 카탈로그
// 공통의 알려진 데이터 공백 — docs/DEVELOPMENT_PLAN.md Sprint 2 메모 참고). 데이터가 없는데
// 필터가 동작하는 것처럼 보이면 사용자를 오도하므로, 선택지는 노출하되 비활성화해 정직하게
// "아직 지원하지 않음"을 표시한다.
const gradeOptions = ["전체", "1학년", "2학년", "3학년", "4학년"]
const requirementOptions: ("전체" | Requirement)[] = ["전체", "전공필수", "전공선택", "교양"]
const ratingOptions = ["전체", "4.5", "4.0", "3.5"]

type Filters = {
  credit: string
  requirement: "전체" | Requirement
  department: string
  minRating: string
}

function applyFilters(list: Course[], filters: Filters): Course[] {
  return list.filter((c) => {
    if (filters.credit !== "전체" && c.credits !== Number(filters.credit)) return false
    if (filters.requirement !== "전체" && c.requirement !== filters.requirement) return false
    if (filters.department !== "전체" && c.department !== filters.department) return false
    if (filters.minRating !== "전체" && c.rating < Number(filters.minRating)) return false
    return true
  })
}

function sortCourses(list: Course[], sort: SortKey): Course[] {
  const copy = [...list]
  if (sort === "rating") copy.sort((a, b) => b.rating - a.rating)
  if (sort === "reviews") copy.sort((a, b) => b.reviewCount - a.reviewCount)
  return copy
}

export function SearchResults() {
  const searchParams = useSearchParams()
  const query = searchParams.get("q") ?? ""

  const [sort, setSort] = useState<SortKey>("relevance")
  const [credit, setCredit] = useState("전체")
  const [grade, setGrade] = useState("전체")
  const [requirement, setRequirement] = useState<"전체" | Requirement>("전체")
  const [department, setDepartment] = useState("전체")
  const [minRating, setMinRating] = useState("전체")

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nameMatches, setNameMatches] = useState<Course[]>([])
  const [fieldGroups, setFieldGroups] = useState<FieldMatchGroup[]>([])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    // 필터는 검색어가 바뀌어도 그대로 유지하되, 새 검색 결과 집합에 없는 개설학과를 고를
    // 수 없으므로 학과 선택만 초기화한다.
    setDepartment("전체")

    searchCourses(query).then((result) => {
      if (cancelled) return
      if (!result.success) {
        setError(result.message ?? "검색 중 오류가 발생했습니다.")
        setNameMatches([])
        setFieldGroups([])
      } else {
        setNameMatches(result.nameMatches)
        setFieldGroups(result.fieldGroups)
      }
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [query])

  const departmentOptions = useMemo(() => {
    const all = [...nameMatches, ...fieldGroups.flatMap((g) => g.courses)]
    return ["전체", ...new Set(all.map((c) => c.department))].sort((a, b) =>
      a === "전체" ? -1 : b === "전체" ? 1 : a.localeCompare(b, "ko"),
    )
  }, [nameMatches, fieldGroups])

  const filters: Filters = { credit, requirement, department, minRating }

  const filteredSortedName = sortCourses(applyFilters(nameMatches, filters), sort)
  const filteredFieldGroups = fieldGroups
    .map((g) => ({ ...g, courses: sortCourses(applyFilters(g.courses, filters), sort) }))
    .filter((g) => g.courses.length > 0)

  const totalCount =
    filteredSortedName.length + filteredFieldGroups.reduce((sum, g) => sum + g.courses.length, 0)
  const hasAnyRawResults = nameMatches.length > 0 || fieldGroups.length > 0

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">검색 결과</p>
        <h1 className="font-display text-2xl font-bold text-foreground">
          &quot;{query}&quot;
          {!loading && (
            <span className="ml-2 text-base font-normal text-muted-foreground">
              총 {totalCount}개 과목
            </span>
          )}
        </h1>
      </div>

      {/* 필터 & 정렬 */}
      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <SlidersHorizontal className="size-4 text-primary" aria-hidden="true" />
          필터
        </span>
        <FilterSelect
          label="학점"
          value={credit}
          onChange={setCredit}
          options={creditOptions}
          formatOption={(o) => (o === "전체" ? o : `${o}학점`)}
        />
        <FilterSelect
          label="학년"
          value={grade}
          onChange={setGrade}
          options={gradeOptions}
          disabled
          title="학년 정보가 있는 과목 데이터가 아직 없어 지원하지 않습니다"
        />
        <FilterSelect
          label="이수구분"
          value={requirement}
          onChange={(v) => setRequirement(v as "전체" | Requirement)}
          options={requirementOptions}
        />
        <FilterSelect label="개설학과" value={department} onChange={setDepartment} options={departmentOptions} />
        <FilterSelect
          label="평점"
          value={minRating}
          onChange={setMinRating}
          options={ratingOptions}
          formatOption={(o) => (o === "전체" ? o : `${o} 이상`)}
        />

        <div className="ml-auto flex items-center gap-1 rounded-full bg-secondary p-1">
          {sortOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSort(opt.key)}
              className={
                sort === opt.key
                  ? "rounded-full bg-card px-3 py-1.5 text-sm font-semibold text-primary shadow-sm"
                  : "rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="mt-16 text-center text-sm text-muted-foreground">검색 중...</p>
      ) : error ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <SearchX className="size-10 text-muted-foreground/50" aria-hidden="true" />
          <p className="font-medium text-foreground">{error}</p>
        </div>
      ) : !hasAnyRawResults ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <SearchX className="size-10 text-muted-foreground/50" aria-hidden="true" />
          <p className="font-medium text-foreground">검색 결과가 없어요</p>
          <p className="text-sm text-muted-foreground">
            다른 과목명이나 분야 키워드로 검색해보세요.
          </p>
        </div>
      ) : totalCount === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <SearchX className="size-10 text-muted-foreground/50" aria-hidden="true" />
          <p className="font-medium text-foreground">필터 조건에 맞는 과목이 없어요</p>
          <p className="text-sm text-muted-foreground">필터를 조정해보세요.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {filteredSortedName.length > 0 && (
            <ResultSection
              title="과목명 일치"
              count={filteredSortedName.length}
              courses={filteredSortedName}
            />
          )}
          {filteredFieldGroups.map((g) => (
            <ResultSection
              key={g.fieldTagId}
              title={`분야: ${g.fieldTagName}`}
              count={g.courses.length}
              courses={g.courses}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ResultSection({
  title,
  count,
  courses,
}: {
  title: string
  count: number
  courses: Course[]
}) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
          {count}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>
    </section>
  )
}

function FilterSelect<T extends string>({
  label,
  value,
  onChange,
  options,
  formatOption,
  disabled,
  title,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: readonly T[]
  formatOption?: (v: T) => string
  disabled?: boolean
  title?: string
}) {
  return (
    <label className="flex items-center gap-1.5 text-sm" title={title}>
      <span className="text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        disabled={disabled}
        className="rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm font-medium text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {formatOption ? formatOption(opt) : opt}
          </option>
        ))}
      </select>
    </label>
  )
}
