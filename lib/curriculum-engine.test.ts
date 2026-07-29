import { describe, expect, it } from "vitest"
import { recommendCurriculum } from "./curriculum-engine"
import { curriculumCourses, departmentCurricula } from "./curriculum-data"

const CREDITS_PER_SEMESTER_MAX = 18

describe("recommendCurriculum", () => {
  it("커리큘럼 데이터가 없는 학과는 hasCurriculumData=false와 안내 문구를 반환한다", () => {
    const result = recommendCurriculum({
      department: "존재하지-않는-학과",
      completedCourseIds: [],
      interestFields: [],
      remainingSemesters: 4,
    })

    expect(result.hasCurriculumData).toBe(false)
    expect(result.semesters).toHaveLength(0)
    expect(result.disclaimer).toContain("참고용")
  })

  it("전공필수가 있는 실제 학과는 전공필수를 우선 배치하고 학기당 학점 상한을 지킨다", () => {
    const withRequired = departmentCurricula.find((d) => d.requiredCourseIds.length > 0)
    expect(withRequired).toBeDefined()
    if (!withRequired) return

    const result = recommendCurriculum({
      department: withRequired.department,
      completedCourseIds: [],
      interestFields: [],
      remainingSemesters: 4,
    })

    expect(result.hasCurriculumData).toBe(true)
    expect(result.disclaimer).toContain("참고용")

    const placedIds = result.semesters.flatMap((s) => s.items.map((i) => i.courseId))
    for (const requiredId of withRequired.requiredCourseIds) {
      expect(placedIds).toContain(requiredId)
    }

    for (const semester of result.semesters) {
      expect(semester.totalCredits).toBeLessThanOrEqual(CREDITS_PER_SEMESTER_MAX)
    }
  })

  it("manualCourseIds로 추가한 과목은 항상 추천 결과에 포함된다", () => {
    const withRequired = departmentCurricula.find((d) => d.requiredCourseIds.length > 0)
    expect(withRequired).toBeDefined()
    if (!withRequired) return

    const requiredSet = new Set(withRequired.requiredCourseIds)
    const manualCandidate = curriculumCourses.find((c) => !requiredSet.has(c.id))
    expect(manualCandidate).toBeDefined()
    if (!manualCandidate) return

    const result = recommendCurriculum({
      department: withRequired.department,
      completedCourseIds: [],
      interestFields: [],
      remainingSemesters: 4,
      manualCourseIds: [manualCandidate.id],
    })

    const placedIds = result.semesters.flatMap((s) => s.items.map((i) => i.courseId))
    expect(placedIds).toContain(manualCandidate.id)
  })
})
