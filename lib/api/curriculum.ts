// lib/api/curriculum.ts
// F4(AI 맞춤 커리큘럼 설계) 파사드. 지금은 app/api/curriculum/recommend가 더미 데이터
// 기반 결정론적 엔진(lib/curriculum-engine.ts)을 호출합니다.
// TODO(IDE 단계): 학과 졸업요건/과목 데이터를 Neon으로, 관심분야 매칭을 LLM/임베딩으로 교체.

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
