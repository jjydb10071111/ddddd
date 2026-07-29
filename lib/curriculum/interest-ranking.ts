// F4(AI 맞춤 커리큘럼 설계) — 관심분야 연관도 랭킹의 LLM 기반 스코어러.
//
// lib/curriculum-engine.ts의 기본 interestScore는 `course.industry === field` 정확 문자열
// 일치(+ academicField 부분일치)만 본다 — 학과명 키워드 휴리스틱(lib/curriculum-classify.ts)
// 으로 채워진 태그라 재현율이 낮다(2,293개 중 46%만 industry가 채워짐, Sprint 3 메모 참고).
// 이 모듈은 후보 과목들을 배치로 묶어 AI Gateway(generateText, F1/F2/F3와 동일 경로)에
// "이 과목이 사용자의 관심분야와 얼마나 관련 있는가"를 한 번에 묻고, 과목명만으로도
// industry/academicField가 비어 있는 과목까지 점수를 매길 수 있게 한다.
//
// 호출 실패(예: 결제수단 미등록으로 403 — Sprint 1~3에서 반복된 제약) 시에는 예외를 던지지
// 않고 heuristicScore로 조용히 폴백한다. 반환하는 Map은 lib/curriculum-engine.ts의
// RecommendCurriculumDeps.scoreInterest에 주입할 수 있는 동기 함수로 감싸서 쓴다
// (엔진 자체는 여전히 100% 동기/결정론적 — LLM 호출은 엔진 밖, Route Handler에서 미리 끝낸다,
// PRD 10.3 "학점/선수과목 계산은 결정론적 로직, 관심분야 매칭만 LLM" 원칙).
//
// 비용/지연 관리: 과목 하나당 1회 호출하면 관심분야 후보가 많을 때(수백 개) 매우 느리고
// 비싸진다. 대신 (1) 스코어링 후보를 "본인 학과 과목 + 휴리스틱상 이미 점수가 있는 타 학과
// 과목"으로 먼저 좁히고, (2) 그래도 MAX_CANDIDATES를 넘으면 휴리스틱 점수 상위 순으로 자른
// 뒤, (3) BATCH_SIZE개씩 나눠 병렬로 한 번씩만 호출한다(과목별 반복 호출 없음).

import { generateText } from "ai"
import { AI_MODELS } from "../ai"
import type { CurriculumCourse } from "../curriculum-data"

const BATCH_SIZE = 30
const MAX_CANDIDATES = 120

/** 기존 엔진의 문자열 일치 스코어와 동일한 가중치 규칙 — LLM 실패 시 폴백 및 후보 선별(사전
 * 필터링)에 재사용한다. lib/curriculum-engine.ts의 interestScore와 로직을 맞춰야 하지만,
 * 그 함수는 export되어 있지 않아(엔진 내부 전용) 여기서 동일한 규칙을 다시 구현한다 —
 * 두 곳 모두 "정확 일치 + 가중치(우선순위가 높을수록 큰 가중치)" 규칙이라는 점을 지킬 것.
 */
export function heuristicInterestScore(course: CurriculumCourse, interestFields: string[]): number {
  let score = 0
  interestFields.forEach((field, index) => {
    const weight = interestFields.length - index
    if (course.industry === field || course.academicField?.includes(field)) {
      score += weight
    }
  })
  return score
}

export type InterestRankingResult = {
  /** courseId -> 0~10 사이 가중 관심도 점수 (heuristicInterestScore와 같은 스케일로 맞춤) */
  scores: Map<string, number>
  source: "llm" | "heuristic-fallback"
}

function buildPrompt(courses: CurriculumCourse[], interestFields: string[]): string {
  const list = courses
    .map((c, i) => `${i + 1}. [${c.id}] ${c.name} (${c.department}, ${c.credits}학점)`)
    .join("\n")
  return (
    `학생의 관심 분야(우선순위 순): ${interestFields.join(" > ")}\n\n` +
    `아래 과목 목록 각각이 이 관심 분야와 얼마나 관련 있는지 0(전혀 무관)~1(매우 관련) 사이 ` +
    `점수로 평가하세요. 과목명과 학과명만 보고 판단하면 됩니다.\n\n${list}`
  )
}

async function scoreBatchWithAI(
  courses: CurriculumCourse[],
  interestFields: string[],
): Promise<Map<string, number> | null> {
  try {
    const { text } = await generateText({
      model: AI_MODELS.fast,
      system:
        `당신은 대학생의 관심 분야와 과목의 연관도를 평가하는 도우미입니다. ` +
        `다른 설명 없이, 입력받은 과목의 학수번호(대괄호 안 문자열)를 키로, 0~1 사이 숫자를 ` +
        `값으로 갖는 JSON 객체 하나만 응답하세요. 목록에 없는 과목을 만들어내면 안 됩니다. ` +
        `예: {"cse1001": 0.9, "mat2003": 0.2}`,
      prompt: buildPrompt(courses, interestFields),
    })

    const match = text.match(/\{[\s\S]*\}/)
    const parsed: unknown = JSON.parse(match ? match[0] : text)
    if (typeof parsed !== "object" || parsed === null) return null

    const validIds = new Set(courses.map((c) => c.id))
    const scores = new Map<string, number>()
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!validIds.has(key) || typeof value !== "number" || Number.isNaN(value)) continue
      scores.set(key, Math.max(0, Math.min(1, value)))
    }
    return scores.size > 0 ? scores : null
  } catch (err) {
    console.warn(
      `F4 관심분야 LLM 랭킹 실패(배치 ${courses.length}개) — 휴리스틱 폴백: ${
        err instanceof Error ? err.message : String(err)
      }`,
    )
    return null
  }
}

/**
 * courses 전체(수천 개)를 그대로 LLM에 보내지 않는다 — 후보를 본인 학과 과목 + 휴리스틱
 * 점수가 이미 0보다 큰 과목으로 좁히고, 그래도 많으면 상위 MAX_CANDIDATES개만 스코어링한다.
 * 나머지 과목은 이 함수가 반환하는 Map에 없으므로, 엔진에 주입하는 scoreInterest 함수가
 * heuristicInterestScore로 자동 폴백한다(아래 buildScoreInterest 참고).
 */
export async function rankInterestBatch(
  courses: CurriculumCourse[],
  department: string,
  interestFields: string[],
): Promise<InterestRankingResult> {
  if (interestFields.length === 0) {
    return { scores: new Map(), source: "heuristic-fallback" }
  }

  const prefiltered = courses
    .filter((c) => c.department === department || heuristicInterestScore(c, interestFields) > 0)
    .sort((a, b) => heuristicInterestScore(b, interestFields) - heuristicInterestScore(a, interestFields))
    .slice(0, MAX_CANDIDATES)

  if (prefiltered.length === 0) {
    return { scores: new Map(), source: "heuristic-fallback" }
  }

  const batches: CurriculumCourse[][] = []
  for (let i = 0; i < prefiltered.length; i += BATCH_SIZE) {
    batches.push(prefiltered.slice(i, i + BATCH_SIZE))
  }

  const batchResults = await Promise.all(batches.map((batch) => scoreBatchWithAI(batch, interestFields)))

  const scores = new Map<string, number>()
  let anySucceeded = false
  batchResults.forEach((result, i) => {
    const batch = batches[i]
    if (result) {
      anySucceeded = true
      // 0~1 LLM 점수를 heuristicInterestScore와 같은 스케일(가중치 합)로 변환 —
      // interestFields[0]의 가중치를 기준 스케일로 써서 엔진의 score>0 분기/정렬이
      // 기존 휴리스틱과 동일한 의미를 갖도록 맞춘다.
      const maxWeight = interestFields.length
      for (const course of batch) {
        const raw = result.get(course.id)
        if (raw !== undefined) scores.set(course.id, raw * maxWeight)
      }
    } else {
      // 이 배치만 폴백 — 다른 배치가 성공했더라도 실패한 배치는 휴리스틱 점수를 그대로 채운다.
      for (const course of batch) {
        scores.set(course.id, heuristicInterestScore(course, interestFields))
      }
    }
  })

  return { scores, source: anySucceeded ? "llm" : "heuristic-fallback" }
}

/** rankInterestBatch 결과를 lib/curriculum-engine.ts의 scoreInterest 주입 지점에 맞는
 * 동기 함수로 감싼다. Map에 없는 과목(스코어링 후보에서 걸러진 과목)은 heuristicInterestScore로
 * 폴백한다 — 즉 "LLM이 실패해도, 애초에 LLM에 보내지 않은 과목이어도" 항상 안전하게 동작한다. */
export function buildScoreInterest(scores: Map<string, number>) {
  return (course: CurriculumCourse, interestFields: string[]): number => {
    const llmScore = scores.get(course.id)
    if (llmScore !== undefined) return llmScore
    return heuristicInterestScore(course, interestFields)
  }
}
