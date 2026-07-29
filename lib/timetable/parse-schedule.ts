// "나의 시간표" 그리드용 요일/교시 파서.
//
// 원본 형식 예: "월 1-A,월 1-B,월 2-A,월 2-B,수 1-A" — 요일+교시+세부구분(A/B, 50분 단위
// 하위 슬롯으로 추정)이 콤마로 나열된다. 그리드에는 세부구분 없이 (요일, 교시) 쌍만
// 있으면 되므로 A/B는 무시하고 중복 제거한다. "0"이거나 빈 문자열이면 시간표 없음(온라인·
// 미정 등)으로 취급한다.

export const TIMETABLE_DAYS = ["월", "화", "수", "목", "금", "토"] as const
export type TimetableDay = (typeof TIMETABLE_DAYS)[number]

export type TimetableSlot = {
  day: TimetableDay
  period: number
}

export function parseSchedule(schedule: string | null | undefined): TimetableSlot[] {
  if (!schedule || schedule === "0") return []

  const seen = new Set<string>()
  const slots: TimetableSlot[] = []

  for (const token of schedule.split(",")) {
    const match = token.trim().match(/^([월화수목금토일])\s*(\d+)/)
    if (!match) continue
    const [, day, periodStr] = match
    if (!TIMETABLE_DAYS.includes(day as TimetableDay)) continue // 일요일 등은 그리드에 없음

    const period = parseInt(periodStr, 10)
    const key = `${day}-${period}`
    if (seen.has(key)) continue
    seen.add(key)
    slots.push({ day: day as TimetableDay, period })
  }

  return slots
}
