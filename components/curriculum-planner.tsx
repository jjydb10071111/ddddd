"use client"

import type React from "react"
import { useMemo, useState } from "react"
import { ChevronDown, Info, Loader2, RotateCcw, Sparkles, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { interestFields } from "@/lib/mock-data"
import {
  departmentCurricula,
  getDepartmentCurriculum,
  getCurriculumCourseById,
} from "@/lib/curriculum-data"
import { getCurriculumRecommendation } from "@/lib/api/curriculum"
import type {
  CurriculumBucket,
  CurriculumRecommendation,
} from "@/lib/curriculum-engine"

type Status = "idle" | "loading" | "done" | "error"

const typeStyles: Record<CurriculumBucket, string> = {
  전공필수: "bg-primary/10 text-primary",
  전공선택: "bg-chart-2/15 text-chart-2",
  관심분야: "bg-chart-4/15 text-chart-4",
}

const departmentNames = departmentCurricula.map((d) => d.department)
const DEFAULT_DEPARTMENT = departmentNames.includes("컴퓨터인공지능학부")
  ? "컴퓨터인공지능학부"
  : departmentNames[0]

export function CurriculumPlanner() {
  const [department, setDepartment] = useState(DEFAULT_DEPARTMENT)
  const [grade, setGrade] = useState("2학년 1학기")
  const [earnedCredits, setEarnedCredits] = useState(45)
  const [completedCourseIds, setCompletedCourseIds] = useState<string[]>([])
  const [fields, setFields] = useState<string[]>(["반도체"])
  const [remainingSemesters, setRemainingSemesters] = useState(5)
  const [excluded, setExcluded] = useState<string[]>([])

  const [status, setStatus] = useState<Status>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [recommendation, setRecommendation] = useState<CurriculumRecommendation | null>(null)
  const [activeTab, setActiveTab] = useState(0)
  const [openItem, setOpenItem] = useState<string | null>(null)

  const departmentCurriculum = useMemo(() => getDepartmentCurriculum(department), [department])

  function handleDepartmentChange(next: string) {
    setDepartment(next)
    setCompletedCourseIds([])
  }

  function toggleField(field: string) {
    setFields((prev) => (prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]))
  }

  function toggleCompleted(courseId: string) {
    setCompletedCourseIds((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId],
    )
  }

  async function runRecommendation(nextExcluded: string[]) {
    setStatus("loading")
    setErrorMessage(null)
    const result = await getCurriculumRecommendation({
      department,
      completedCourseIds,
      interestFields: fields,
      remainingSemesters,
      excludedCourseIds: nextExcluded,
    })

    if (!result.success) {
      setStatus("error")
      setErrorMessage(result.message)
      return
    }

    setRecommendation(result.recommendation)
    setExcluded(nextExcluded)
    setActiveTab(0)
    setStatus("done")
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    void runRecommendation([])
  }

  function handleExclude(courseId: string) {
    void runRecommendation([...excluded, courseId])
  }

  function handleReinclude(courseId: string) {
    void runRecommendation(excluded.filter((id) => id !== courseId))
  }

  const semesters = recommendation?.semesters ?? []
  const activeSemester = semesters[activeTab]

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
      {/* 입력 폼 */}
      <form
        onSubmit={handleSubmit}
        className="h-fit rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-24"
      >
        <h2 className="font-display text-base font-bold text-foreground">내 정보 입력</h2>

        <div className="mt-4 space-y-4">
          <Field label="학과">
            <select
              value={department}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              className="input"
            >
              {departmentNames.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Field>

          <Field label="현재 학년/학기">
            <select value={grade} onChange={(e) => setGrade(e.target.value)} className="input">
              {["1학년 1학기", "1학년 2학기", "2학년 1학기", "2학년 2학기", "3학년 1학기", "3학년 2학기"].map(
                (g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ),
              )}
            </select>
          </Field>

          <Field label="기이수 학점">
            <input
              type="number"
              min={0}
              value={earnedCredits}
              onChange={(e) => setEarnedCredits(Number(e.target.value))}
              className="input"
            />
          </Field>

          {departmentCurriculum && (
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">기이수 전공필수 과목</p>
              <div className="flex flex-wrap gap-2">
                {departmentCurriculum.requiredCourseIds.map((id) => {
                  const course = getCurriculumCourseById(id)
                  const checked = completedCourseIds.includes(id)
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleCompleted(id)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent",
                      )}
                    >
                      {course?.name ?? id}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <Field label="졸업까지 남은 학기 수">
            <input
              type="number"
              min={1}
              value={remainingSemesters}
              onChange={(e) => setRemainingSemesters(Number(e.target.value))}
              className="input"
            />
          </Field>

          <div>
            <p className="mb-2 text-sm font-medium text-foreground">
              관심 분야 <span className="font-normal text-muted-foreground">(선택한 순서가 우선순위입니다)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {interestFields.map((field) => {
                const selected = fields.includes(field)
                const priority = fields.indexOf(field)
                return (
                  <button
                    key={field}
                    type="button"
                    onClick={() => toggleField(field)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent",
                    )}
                  >
                    {selected ? `${priority + 1}. ${field}` : field}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={status === "loading" || fields.length === 0}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-70"
        >
          {status === "loading" ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              추천 생성 중...
            </>
          ) : (
            <>
              <Sparkles className="size-4" aria-hidden="true" />
              커리큘럼 추천받기
            </>
          )}
        </button>
      </form>

      {/* 결과 영역 */}
      <div>
        {status === "idle" && <EmptyResult />}
        {status === "loading" && <LoadingResult />}
        {status === "error" && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm font-medium text-destructive">
            {errorMessage ?? "추천을 생성하지 못했습니다."}
          </div>
        )}
        {status === "done" && recommendation && !recommendation.hasCurriculumData && (
          <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            {recommendation.notes[0]}
          </div>
        )}
        {status === "done" && recommendation && recommendation.hasCurriculumData && (
          <div>
            <div className="flex items-start gap-2 rounded-xl border border-border bg-accent/50 p-3.5 text-sm text-accent-foreground">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p>{recommendation.disclaimer}</p>
            </div>

            {recommendation.notes.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {recommendation.notes.map((note, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-border bg-card px-3 py-2 text-xs leading-relaxed text-muted-foreground"
                  >
                    {note}
                  </li>
                ))}
              </ul>
            )}

            {excluded.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">제외한 과목:</span>
                {excluded.map((id) => {
                  const course = getCurriculumCourseById(id)
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleReinclude(id)}
                      className="flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                    >
                      <RotateCcw className="size-3" aria-hidden="true" />
                      {course?.name ?? id}
                    </button>
                  )
                })}
              </div>
            )}

            {/* 학기 탭 */}
            <div className="mt-5 flex flex-wrap gap-2">
              {semesters.map((sem, i) => (
                <button
                  key={sem.label}
                  type="button"
                  onClick={() => setActiveTab(i)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-semibold transition",
                    activeTab === i
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:bg-secondary",
                  )}
                >
                  {sem.label} · {sem.totalCredits}학점
                </button>
              ))}
            </div>

            {/* 추천 과목 아코디언 */}
            {activeSemester && (
              <div className="mt-4 space-y-2.5">
                <p className="text-sm text-muted-foreground">
                  {activeSemester.label} 추천 과목 · 총 {activeSemester.totalCredits}학점
                </p>
                {activeSemester.items.map((item) => {
                  const key = item.courseId
                  const isOpen = openItem === key
                  return (
                    <div key={key} className="rounded-xl border border-border bg-card">
                      <div className="flex items-center gap-3 p-4">
                        <button
                          type="button"
                          onClick={() => setOpenItem(isOpen ? null : key)}
                          aria-expanded={isOpen}
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        >
                          <span
                            className={cn(
                              "shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold",
                              typeStyles[item.bucket],
                            )}
                          >
                            {item.bucket}
                          </span>
                          <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                            {item.name}
                          </span>
                          <span className="shrink-0 text-sm text-muted-foreground">
                            {item.credits}학점
                          </span>
                          <ChevronDown
                            className={cn(
                              "size-4 shrink-0 text-muted-foreground transition-transform",
                              isOpen && "rotate-180 text-primary",
                            )}
                            aria-hidden="true"
                          />
                        </button>
                        <button
                          type="button"
                          aria-label={`${item.name} 제외`}
                          onClick={() => handleExclude(item.courseId)}
                          className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                      {isOpen && (
                        <p className="border-t border-border px-4 py-3 text-sm leading-relaxed text-muted-foreground">
                          {item.reason}
                        </p>
                      )}
                    </div>
                  )
                })}

                {activeSemester.items.length === 0 && (
                  <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
                    이 학기의 추천 과목을 모두 제외했어요.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  )
}

function EmptyResult() {
  return (
    <div className="flex h-full min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Sparkles className="size-6" aria-hidden="true" />
      </span>
      <p className="mt-4 font-display font-semibold text-foreground">
        정보를 입력하고 추천을 받아보세요
      </p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        학과와 관심 분야를 바탕으로 학기별 추천 커리큘럼을 설계해드려요.
      </p>
    </div>
  )
}

function LoadingResult() {
  return (
    <div className="flex h-full min-h-72 flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center">
      <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
      <p className="mt-4 font-medium text-foreground">AI가 맞춤 커리큘럼을 설계하고 있어요...</p>
      <p className="mt-1 text-sm text-muted-foreground">잠시만 기다려주세요.</p>
    </div>
  )
}
