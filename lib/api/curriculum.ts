// lib/api/curriculum.ts
// F4(AI 맞춤 커리큘럼 설계) 파사드. app/api/curriculum/recommend가 Neon(courses/curricula)
// 조회 결과를 lib/curriculum-engine.ts에 주입해 계산하고, 관심분야 랭킹은 AI Gateway 시도 후
// 실패 시 문자열 일치 휴리스틱으로 폴백합니다(Sprint 4, lib/curriculum/ 참고).

import type { CurriculumInput, CurriculumRecommendation } from "@/lib/curriculum-engine"

export type CurriculumRecommendResult =
  | { success: true; recommendation: CurriculumRecommendation }
  | { success: false; message: string }

export async function getCurriculumRecommendation(
  input: CurriculumInput,
): Promise<CurriculumRecommendResult> {
  try {
    const res = await fetch("/api/curriculum/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    const data = await res.json()
    return data
  } catch (err) {
    console.error("Curriculum recommend request failed:", err)
    return { success: false, message: "서버와의 통신에 실패했습니다." }
  }
}
