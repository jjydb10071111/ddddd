import { NextResponse } from "next/server"
import { recommendCurriculum, type CurriculumInput } from "@/lib/curriculum-engine"
import { fetchCurriculumCourses, fetchDepartmentCurriculum } from "@/lib/curriculum/db-data"
import { buildScoreInterest, rankInterestBatch } from "@/lib/curriculum/interest-ranking"

// F4(AI 맞춤 커리큘럼 설계) 추천 API — Sprint 4부터 정적 lib/curriculum-data.ts 대신 Neon
// (courses/curricula 테이블)에서 조회한 데이터를 lib/curriculum-engine.ts에 주입해서 쓴다.
// 엔진 자체(전공필수 배치 → 전공선택 잔여 학점 → 관심분야 채우기 → 로드맵 패킹 순서)는
// 그대로이고, 데이터 소스와 관심분야 스코어링 함수만 요청마다 갈아 끼운다
// (lib/curriculum-engine.ts의 RecommendCurriculumDeps 참고).
//
// 관심분야 랭킹은 AI Gateway(lib/curriculum/interest-ranking.ts)로 먼저 시도하고, 실패하면
// (결제수단 미등록 403 등 — Sprint 1~3과 동일한 제약) 문자열 일치 휴리스틱으로 조용히
// 폴백한다 — 두 경로 모두 예외를 밖으로 던지지 않는다.
//
// 실행시간 참고(로컬 벤치마크, docs/DEVELOPMENT_PLAN.md Sprint 4 메모에 상세 기록): 전체
// 과목 카탈로그(2,298행) Neon HTTP 조회가 약 1~1.8초로 지배적이고, 엔진 자체 계산은 2~5ms로
// 무시할 수준이다. LLM 랭킹이 실패 없이 성공하는 경우에도 배치 호출은 몇 초 내로 끝나
// Vercel 서버리스 기본 실행시간 제한 안에 여유 있게 들어온다 — 이번 스프린트에서는
// 스트리밍/폴링 구조가 필요하지 않다고 판단했다(더 자세한 근거는 개발 계획 문서 참고).
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      department,
      completedCourseIds,
      interestFields,
      remainingSemesters,
      excludedCourseIds,
      manualCourseIds,
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
      manualCourseIds: Array.isArray(manualCourseIds) ? manualCourseIds : [],
    }

    const [courses, curriculum] = await Promise.all([
      fetchCurriculumCourses(),
      fetchDepartmentCurriculum(department),
    ])

    // curriculum이 없으면(학과 데이터 미준비) 엔진이 바로 빈 결과를 반환하므로, LLM 랭킹
    // 호출 자체를 생략한다 — 어차피 버려질 결과에 배치 호출 지연/비용을 쓸 이유가 없다.
    const { scores, source } = curriculum
      ? await rankInterestBatch(courses, department, input.interestFields)
      : { scores: new Map<string, number>(), source: "heuristic-fallback" as const }
    const scoreInterest = buildScoreInterest(scores)

    const recommendation = recommendCurriculum(input, { courses, curriculum, scoreInterest })

    if (curriculum && source === "heuristic-fallback" && input.interestFields.length > 0) {
      recommendation.notes.push(
        "AI 기반 관심분야 랭킹을 사용할 수 없어 키워드 일치 기준으로 대체했습니다.",
      )
    }

    return NextResponse.json({ success: true, recommendation })
  } catch (err) {
    console.error("Curriculum recommend API error:", err)
    return NextResponse.json(
      { success: false, message: "커리큘럼 추천 처리 중 오류가 발생했습니다." },
      { status: 500 },
    )
  }
}
