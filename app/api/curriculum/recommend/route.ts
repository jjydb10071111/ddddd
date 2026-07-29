import { NextResponse } from "next/server"
import { recommendCurriculum, type CurriculumInput } from "@/lib/curriculum-engine"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      department,
      completedCourseIds,
      interestFields,
      remainingSemesters,
      excludedCourseIds,
    } = body ?? {}

    if (!department || typeof department !== "string") {
      return NextResponse.json(
        { success: false, message: "학과를 선택해주세요." },
        { status: 400 },
      )
    }

    if (!Array.isArray(interestFields) || interestFields.length === 0) {
      return NextResponse.json(
        { success: false, message: "관심 분야를 1개 이상 선택해주세요." },
        { status: 400 },
      )
    }

    const semesters = Number(remainingSemesters)
    if (!Number.isFinite(semesters) || semesters < 1) {
      return NextResponse.json(
        { success: false, message: "졸업까지 남은 학기 수를 확인해주세요." },
        { status: 400 },
      )
    }

    const input: CurriculumInput = {
      department,
      completedCourseIds: Array.isArray(completedCourseIds) ? completedCourseIds : [],
      interestFields,
      remainingSemesters: semesters,
      excludedCourseIds: Array.isArray(excludedCourseIds) ? excludedCourseIds : [],
    }

    const recommendation = recommendCurriculum(input)

    return NextResponse.json({ success: true, recommendation })
  } catch (err) {
    console.error("Curriculum recommend API error:", err)
    return NextResponse.json(
      { success: false, message: "커리큘럼 추천 처리 중 오류가 발생했습니다." },
      { status: 500 },
    )
  }
}
