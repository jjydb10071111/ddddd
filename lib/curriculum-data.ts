// F4(AI 맞춤 커리큘럼 설계)용 과목/졸업요건 데이터.
//
// 과목 데이터(lib/data/courses.json)는 실제 2학기 개설강좌 원본(전북대, 2,695개 강좌·146개 학과)을
// 변환한 것입니다 — 이수구분/학수번호/학과/학점/교수 등은 실제 값입니다.
// 다만 원본 파일에는 없는 값들은 아직 비어 있습니다:
//   - 선수과목(prerequisites): 전혀 없음 — 실제 선수과목 데이터가 확보되면 채웁니다.
//   - 학문분야/산업 태그(academicField/industry): F2/F3 AI 태깅 파이프라인(담당자 검수 포함) 결과로 채워질 예정.
//   - 평점/리뷰/해시태그/요약(rating/reviewCount/hashtags/summary): F1 리뷰가 쌓이면 채워짐.
// 졸업요건(전공선택 최소학점, 총 졸업학점)은 학교 공식 데이터가 없어 더미 값입니다(PRD 12장 리스크).
// 이 파일의 타입은 lib/mock-data.ts의 Course/Requirement와 별개입니다 — 실제 이수구분에는
// mock-data가 가정하는 "교양" 외에 "계열공통"/"기초필수"가 있어 값 집합이 다릅니다.
//
// 원본 데이터는 "강좌"(분반) 단위 — 같은 과목이 여러 분반(교수별)으로 개설되면 학수번호가 같은
// 여러 행이 생깁니다. 커리큘럼 엔진은 "이 과목을 들었는가"를 과목 단위로 따져야 하므로,
// 여기서 학수번호 기준으로 분반을 합쳐 과목 단위 목록(curriculumCourses)을 만듭니다.

import rawSections from "./data/courses.json"

export type CurriculumRequirement = "전공필수" | "전공선택" | "계열공통" | "기초필수"

type RawSection = {
  id: string
  code: string
  name: string
  department: string
  professor: string
  credits: number
  requirement: string
  section: number
  language: string
  room: string
  schedule: string
  openType: string
}

export type CurriculumCourse = {
  /** 학수번호를 소문자화한 값 — 분반과 무관하게 과목 단위로 유일 */
  id: string
  code: string
  name: string
  department: string
  /** 이번 학기 이 과목을 담당하는 교수 목록 (분반별) */
  professors: string[]
  sectionCount: number
  credits: number
  requirement: CurriculumRequirement
  /** 선수과목 course id 목록 — 원본 데이터에 없어 현재는 항상 비어 있음 */
  prerequisites?: string[]
  /** F2 학문분야 태그 — 아직 미태깅 */
  academicField?: string
  /** F3 산업/진로 태그 — 아직 미태깅 */
  industry?: string
  rating?: number
  reviewCount?: number
  summary?: string
}

function dedupeByCode(sections: RawSection[]): CurriculumCourse[] {
  const byCode = new Map<string, RawSection[]>()
  for (const s of sections) {
    const key = s.code.toLowerCase()
    const list = byCode.get(key)
    if (list) list.push(s)
    else byCode.set(key, [s])
  }

  const courses: CurriculumCourse[] = []
  for (const [id, group] of byCode) {
    const first = group[0]
    courses.push({
      id,
      code: first.code,
      name: first.name,
      department: first.department,
      professors: Array.from(new Set(group.map((s) => s.professor).filter(Boolean))),
      sectionCount: group.length,
      credits: first.credits,
      requirement: first.requirement as CurriculumRequirement,
    })
  }
  return courses
}

export const curriculumCourses: CurriculumCourse[] = dedupeByCode(rawSections as RawSection[])

export function getCurriculumCourseById(id: string): CurriculumCourse | undefined {
  return curriculumCourses.find((c) => c.id === id)
}

export type DepartmentCurriculum = {
  department: string
  admissionYear: number
  requiredCourseIds: string[]
  electiveMinCredits: number
  graduationMinCredits: number
}

const DUMMY_ELECTIVE_MIN_CREDITS = 21
const DUMMY_GRADUATION_MIN_CREDITS = 130

// 학과 목록과 "이번 학기 개설된 전공필수/기초필수 과목"은 실데이터 기반입니다.
// 전공선택 최소학점·총 졸업학점은 학교 공식 졸업요건 데이터가 없어 임시로 동일한 더미 값을 씁니다.
// (PRD 12장: 커리큘럼 데이터 확보 전까지는 학과 협의 또는 사용자 입력 병행 필요)
const departmentNames = Array.from(new Set(curriculumCourses.map((c) => c.department))).sort(
  (a, b) => a.localeCompare(b, "ko"),
)

export const departmentCurricula: DepartmentCurriculum[] = departmentNames.map((department) => ({
  department,
  admissionYear: 2024,
  requiredCourseIds: curriculumCourses
    .filter(
      (c) =>
        c.department === department &&
        (c.requirement === "전공필수" || c.requirement === "기초필수"),
    )
    .map((c) => c.id),
  electiveMinCredits: DUMMY_ELECTIVE_MIN_CREDITS,
  graduationMinCredits: DUMMY_GRADUATION_MIN_CREDITS,
}))

export function getDepartmentCurriculum(department: string): DepartmentCurriculum | undefined {
  return departmentCurricula.find((d) => d.department === department)
}
