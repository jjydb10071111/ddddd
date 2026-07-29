// F4(AI 맞춤 커리큘럼 설계) 추천 엔진. PRD 8.4의 mermaid 플로우차트 순서를 그대로 따릅니다.
// 학점/선수과목 계산은 결정론적 로직으로 처리하고(PRD 10.3), 관심분야 매칭만 향후 LLM/임베딩으로
// 고도화할 지점입니다(지금은 industry/academicField 문자열 매칭으로 대체).

import {
  curriculumCourses,
  getDepartmentCurriculum,
  type CurriculumCourse,
  type DepartmentCurriculum,
} from "./curriculum-data"

const CREDITS_PER_SEMESTER_MAX = 18

export type CurriculumBucket = "전공필수" | "전공선택" | "관심분야"

export type CurriculumInput = {
  department: string
  completedCourseIds: string[]
  /** 우선순위 순으로 정렬된 관심 분야 (index 0 = 최우선) */
  interestFields: string[]
  remainingSemesters: number
  /** 사용자가 추천에서 제외한 과목 (인터랙티브 재계산용) */
  excludedCourseIds?: string[]
  /**
   * 사용자가 검색해서 직접 추가한 과목(과목 검색-추가 UI, Sprint 4). 관심분야 점수와
   * 무관하게 항상 포함되며, 전공선택 잔여 학점 계산(2단계)에 반영된 뒤 자동 채우기(3단계)가
   * 이어진다 — PRD 8.4 플로우차트의 "추가 시 전공선택 잔여 학점 계산으로 되돌아가는" 루프를
   * 그대로 구현한 것이다.
   */
  manualCourseIds?: string[]
}

/** 과목 카탈로그에서 id로 과목을 찾는 함수 시그니처 — 정적 데이터/DB 조회 어느 쪽이든
 * 동일한 형태로 엔진에 주입할 수 있게 한다. */
export type CourseLookup = (id: string) => CurriculumCourse | undefined

export type RecommendCurriculumDeps = {
  /**
   * 과목 카탈로그. 기본값은 정적 curriculum-data.ts(curriculumCourses) — 로컬 개발/DB
   * 미연결 환경의 폴백이다. Route Handler(app/api/curriculum/recommend)는 Neon에서 조회한
   * 배열을 여기 주입해 실제 요청 경로에서는 정적 파일을 전혀 읽지 않는다.
   */
  courses?: CurriculumCourse[]
  /**
   * 학과 커리큘럼(전공필수 목록/졸업요건). 기본값은 정적 curriculum-data.ts에서 조회.
   * 명시적으로 undefined가 아닌 null을 주입하면 "해당 학과 커리큘럼 없음" 경로로 이어진다
   * (DB에 그 학과의 curricula 행이 없는 경우).
   */
  curriculum?: DepartmentCurriculum | null
  /**
   * 관심분야 연관도 스코어링 함수. 기본값은 문자열 일치 기반 interestScore. LLM 기반
   * 랭킹(lib/curriculum/interest-ranking.ts)으로 교체하려면 이 함수만 주입하면 되고,
   * 엔진의 5단계 순서/로직 자체는 전혀 바뀌지 않는다 — PRD 10.3 "관심분야 매칭만 LLM으로
   * 고도화" 원칙을 이 주입 지점 하나로 만족시킨다.
   */
  scoreInterest?: (course: CurriculumCourse, interestFields: string[]) => number
}

export type CurriculumRecommendedItem = {
  courseId: string
  name: string
  credits: number
  bucket: CurriculumBucket
  reason: string
}

export type CurriculumSemesterPlan = {
  label: string
  items: CurriculumRecommendedItem[]
  totalCredits: number
}

export type CurriculumRecommendation = {
  department: string
  hasCurriculumData: boolean
  semesters: CurriculumSemesterPlan[]
  /** PRD 8.4 완료조건: "참고용" 및 최종 확인 안내 문구는 항상 포함 */
  disclaimer: string
  notes: string[]
}

const DISCLAIMER = "본 추천은 참고용이며, 최종 확인은 학과 사무실을 통해주세요."

function makeCourseById(courses: CurriculumCourse[]): CourseLookup {
  const byId = new Map(courses.map((c) => [c.id, c]))
  return (id: string) => byId.get(id)
}

/** 필수과목 집합 내에서 선수과목을 고려한 위상 정렬. 순환/외부 의존은 원래 순서를 유지합니다. */
function topologicalSortRequired(
  requiredIds: string[],
  completed: Set<string>,
  courseById: CourseLookup,
): string[] {
  const remaining = new Set(requiredIds)
  const sorted: string[] = []
  const visited = new Set<string>()

  function isReady(id: string): boolean {
    const course = courseById(id)
    const prereqs = course?.prerequisites ?? []
    return prereqs.every((p) => completed.has(p) || sorted.includes(p) || !remaining.has(p))
  }

  let guard = requiredIds.length * requiredIds.length + 1
  while (remaining.size > 0 && guard > 0) {
    guard -= 1
    let progressed = false
    for (const id of Array.from(remaining)) {
      if (visited.has(id)) continue
      if (isReady(id)) {
        sorted.push(id)
        remaining.delete(id)
        visited.add(id)
        progressed = true
      }
    }
    if (!progressed) {
      // 순환 의존 등 예외 상황 — 남은 항목을 원래 순서대로 덧붙이고 종료
      sorted.push(...Array.from(remaining))
      break
    }
  }
  return sorted
}

function interestScore(course: CurriculumCourse, interestFields: string[]): number {
  let score = 0
  interestFields.forEach((field, index) => {
    const weight = interestFields.length - index
    if (course.industry === field || course.academicField?.includes(field)) {
      score += weight
    }
  })
  return score
}

// 실데이터의 이수구분은 전공필수/전공선택/계열공통/기초필수 4종입니다.
// 기초필수는 전공필수와 마찬가지로 반드시 이수해야 하는 과목이라 "필수"로 묶고,
// 계열공통은 아직 별도 취급할 근거가 없어 전공선택과 같은 "선택" 쪽으로 분류합니다.
function isRequiredType(requirement: string): boolean {
  return requirement === "전공필수" || requirement === "기초필수"
}

function classifyCompletedCredits(completedCourseIds: string[], courseById: CourseLookup) {
  let requiredCredits = 0
  let electiveCredits = 0
  for (const id of completedCourseIds) {
    const course = courseById(id)
    if (!course) continue
    if (isRequiredType(course.requirement)) requiredCredits += course.credits
    else electiveCredits += course.credits
  }
  return { requiredCredits, electiveCredits }
}

export function recommendCurriculum(
  input: CurriculumInput,
  deps: RecommendCurriculumDeps = {},
): CurriculumRecommendation {
  // 데이터 소스 주입 지점 — 기본값은 정적 curriculum-data.ts(로컬 개발/폴백용). Route
  // Handler는 Neon에서 조회한 courses/curriculum을 여기에 넘긴다. 엔진의 5단계 순서·로직은
  // 아래에서 전혀 바뀌지 않는다 — 어떤 배열/함수를 읽어오는지만 바뀐다.
  const courses = deps.courses ?? curriculumCourses
  const courseById = makeCourseById(courses)
  const curriculum = deps.curriculum !== undefined ? deps.curriculum : getDepartmentCurriculum(input.department)
  const scoreInterest = deps.scoreInterest ?? interestScore

  if (!curriculum) {
    return {
      department: input.department,
      hasCurriculumData: false,
      semesters: [],
      disclaimer: DISCLAIMER,
      notes: [
        `${input.department}은(는) 아직 커리큘럼 데이터가 준비되지 않았습니다. 학과 사무실에 확인해주세요.`,
      ],
    }
  }

  const completed = new Set(input.completedCourseIds)
  const excluded = new Set(input.excludedCourseIds ?? [])
  const notes: string[] = []

  // 1단계: 미이수 전공필수, 선수과목 순서 고려
  const requiredUnfinished = curriculum.requiredCourseIds.filter(
    (id) => !completed.has(id) && !excluded.has(id),
  )
  const requiredExcluded = curriculum.requiredCourseIds.filter((id) => excluded.has(id))
  if (requiredExcluded.length > 0) {
    notes.push(
      `제외한 과목 중 전공필수가 포함되어 있습니다 (${requiredExcluded
        .map((id) => courseById(id)?.name ?? id)
        .join(", ")}). 졸업 요건 충족 여부를 반드시 학과 사무실에서 확인하세요.`,
    )
  }
  const requiredOrdered = topologicalSortRequired(requiredUnfinished, completed, courseById)

  // 2단계: 전공선택 잔여 학점 계산
  const { electiveCredits: completedElectiveCredits } = classifyCompletedCredits(
    input.completedCourseIds,
    courseById,
  )
  let electiveCreditsRemaining = Math.max(
    0,
    curriculum.electiveMinCredits - completedElectiveCredits,
  )

  // 2.5단계(인터랙티브 추가): 사용자가 검색해서 직접 추가한 과목은 관심분야 점수와 무관하게
  // 항상 포함하고, 전공선택 잔여 학점에서 먼저 차감한다 — "추가 시 전공선택 잔여 학점
  // 계산으로 되돌아가는" 재계산 루프를 여기서 구현한다. 이미 전공필수로 배치됐거나
  // 기이수/제외 처리된 과목은 중복 추가하지 않는다.
  const requiredOrderedSet = new Set(requiredOrdered)
  const manualIds = [...new Set(input.manualCourseIds ?? [])].filter(
    (id) => !completed.has(id) && !excluded.has(id) && !requiredOrderedSet.has(id) && courseById(id),
  )
  const manualItems: CurriculumRecommendedItem[] = manualIds.map((id) => {
    const course = courseById(id)!
    const ownDepartment = course.department === input.department
    electiveCreditsRemaining = Math.max(0, electiveCreditsRemaining - course.credits)
    return {
      courseId: id,
      name: course.name,
      credits: course.credits,
      bucket: "전공선택",
      reason: `직접 추가한 과목입니다. 전공선택 학점으로 반영됩니다.${
        ownDepartment ? "" : " (타 전공 과목 — 수강 가능 여부·정원을 확인하세요)"
      }`,
    }
  })

  // 3단계: 관심분야 연관도 높은 과목으로 잔여 슬롯 채우기 (본인 전공 우선)
  const usedIds = new Set([...completed, ...excluded, ...requiredOrdered, ...manualIds])
  const candidatePool = courses
    .filter((c) => !usedIds.has(c.id))
    .filter((c) => !isRequiredType(c.requirement) || c.department !== input.department)
    .map((c) => ({
      course: c,
      score: scoreInterest(c, input.interestFields),
      ownDepartment: c.department === input.department,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      if (a.ownDepartment !== b.ownDepartment) return a.ownDepartment ? -1 : 1
      return 0
    })

  const electiveItems: CurriculumRecommendedItem[] = []
  const interestItems: CurriculumRecommendedItem[] = []

  for (const { course, score, ownDepartment } of candidatePool) {
    const crossDeptNote = ownDepartment ? "" : " (타 전공 과목 — 수강 가능 여부·정원을 확인하세요)"
    if (electiveCreditsRemaining > 0) {
      electiveCreditsRemaining -= course.credits
      electiveItems.push({
        courseId: course.id,
        name: course.name,
        credits: course.credits,
        bucket: "전공선택",
        reason: `전공선택 학점으로 인정되며${
          score > 0 ? " 관심 분야 연관도도 높습니다" : ""
        }.${crossDeptNote}`,
      })
    } else if (score > 0) {
      interestItems.push({
        courseId: course.id,
        name: course.name,
        credits: course.credits,
        bucket: "관심분야",
        reason: `'${input.interestFields[0] ?? ""}' 분야 연관도가 높아 추천합니다.${crossDeptNote}`,
      })
    }
    if (electiveItems.length + interestItems.length >= requiredOrdered.length + 20) break
  }

  const requiredItems: CurriculumRecommendedItem[] = requiredOrdered.map((id) => {
    const course = courseById(id)
    const prereqs = course?.prerequisites?.filter((p) => !completed.has(p)) ?? []
    return {
      courseId: id,
      name: course?.name ?? id,
      credits: course?.credits ?? 0,
      bucket: "전공필수",
      reason:
        prereqs.length > 0
          ? `${prereqs
              .map((p) => courseById(p)?.name ?? p)
              .join(", ")} 이수 후 듣는 전공필수 과목입니다.`
          : "졸업을 위해 반드시 이수해야 하는 전공필수 과목입니다.",
    }
  })

  // 4단계: 학기별 로드맵 패킹
  // 선수과목이 있는 과목은, 그 선수과목이 배치된 학기보다 나중 학기에만 배치합니다
  // (같은 학기에 나란히 넣으면 "선수과목을 먼저 들어야 한다"는 요구사항을 어기게 됩니다).
  const semesterCount = Math.max(1, input.remainingSemesters)
  const semesters: CurriculumSemesterPlan[] = Array.from({ length: semesterCount }, (_, i) => ({
    label: `${i + 1}학기`,
    items: [],
    totalCredits: 0,
  }))

  const placedSemesterOf = new Map<string, number>()
  const unplaced: CurriculumRecommendedItem[] = []

  function earliestAllowedSemester(courseId: string): number {
    const prereqs = courseById(courseId)?.prerequisites ?? []
    let earliest = 0
    for (const p of prereqs) {
      if (completed.has(p)) continue
      const prereqSemester = placedSemesterOf.get(p)
      if (prereqSemester !== undefined) {
        earliest = Math.max(earliest, prereqSemester + 1)
      }
      // 선수과목이 완료되지도, 이번 추천에 배치되지도 않은 경우는 더미 데이터 범위상 무시합니다.
    }
    return earliest
  }

  function place(item: CurriculumRecommendedItem) {
    const earliest = earliestAllowedSemester(item.courseId)
    for (let s = earliest; s < semesterCount; s++) {
      if (semesters[s].totalCredits + item.credits <= CREDITS_PER_SEMESTER_MAX) {
        semesters[s].items.push(item)
        semesters[s].totalCredits += item.credits
        placedSemesterOf.set(item.courseId, s)
        return
      }
    }
    unplaced.push(item)
  }

  // electiveItems/interestItems는 관심분야 점수순이라 자기 선수과목보다 먼저 나올 수 있습니다.
  // earliestAllowedSemester는 "아직 배치 안 된 선수과목"을 만족된 것으로 착각하지 않도록,
  // 패킹 전에 전체 후보를 선수과목 기준으로 한 번 더 정렬합니다 (원래 우선순위는 최대한 보존).
  const combined = [...requiredItems, ...manualItems, ...electiveItems, ...interestItems]
  const combinedIds = new Set(combined.map((i) => i.courseId))
  const placedForSort = new Set<string>()
  const orderedForPacking: CurriculumRecommendedItem[] = []
  const pending = [...combined]
  let sortGuard = combined.length * combined.length + 1
  while (pending.length > 0 && sortGuard-- > 0) {
    const readyIndex = pending.findIndex((item) => {
      const prereqs = courseById(item.courseId)?.prerequisites ?? []
      return prereqs.every((p) => completed.has(p) || placedForSort.has(p) || !combinedIds.has(p))
    })
    if (readyIndex === -1) {
      orderedForPacking.push(...pending)
      break
    }
    const [item] = pending.splice(readyIndex, 1)
    placedForSort.add(item.courseId)
    orderedForPacking.push(item)
  }

  for (const item of orderedForPacking) {
    place(item)
  }

  if (unplaced.length > 0) {
    notes.push(
      `입력하신 ${semesterCount}개 학기 안에는 다 배치하지 못했습니다: ${unplaced
        .map((i) => i.name)
        .join(", ")}. 남은 학기 수를 늘리거나 관심 분야를 조정해보세요.`,
    )
  }

  if (requiredOrdered.length === 0 && electiveCreditsRemaining <= 0 && interestItems.length === 0) {
    notes.push("이미 대부분의 학점을 이수하셨네요. 졸업 요건을 거의 충족한 상태로 보입니다.")
  }
  if (candidatePool.every((c) => c.score === 0) && input.interestFields.length > 0) {
    notes.push(
      "관심 분야와 직접 연관된 과목이 본인 전공 내에 부족해 계절학기·교양 과목까지 확인해보시는 것을 권장합니다.",
    )
  }

  return {
    department: input.department,
    hasCurriculumData: true,
    semesters: semesters.filter((s) => s.items.length > 0),
    disclaimer: DISCLAIMER,
    notes,
  }
}
