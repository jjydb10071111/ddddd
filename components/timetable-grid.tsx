import Link from "next/link"
import { TIMETABLE_DAYS, parseSchedule } from "@/lib/timetable/parse-schedule"
import type { CartItem } from "@/lib/api/cart"

const COLOR_CLASSES = [
  "border-chart-1/30 bg-chart-1/15 text-chart-1",
  "border-chart-2/30 bg-chart-2/15 text-chart-2",
  "border-chart-3/30 bg-chart-3/15 text-chart-3",
  "border-chart-4/30 bg-chart-4/15 text-chart-4",
  "border-chart-5/30 bg-chart-5/15 text-chart-5",
]

type PlacedCourse = {
  item: CartItem
  colorClass: string
}

export function TimetableGrid({ items }: { items: CartItem[] }) {
  const withSchedule = items.filter((i) => parseSchedule(i.schedule).length > 0)
  const withoutSchedule = items.filter((i) => parseSchedule(i.schedule).length === 0)

  const colored: PlacedCourse[] = withSchedule.map((item, i) => ({
    item,
    colorClass: COLOR_CLASSES[i % COLOR_CLASSES.length],
  }))

  const maxPeriod = Math.max(
    9, // 최소 9교시까지는 항상 보여준다(대부분의 정규 시간표 커버)
    ...colored.flatMap(({ item }) => parseSchedule(item.schedule).map((s) => s.period)),
  )
  const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1)

  // (요일, 교시) → 그 시간에 배치된 과목들
  const cellMap = new Map<string, PlacedCourse[]>()
  for (const placed of colored) {
    for (const slot of parseSchedule(placed.item.schedule)) {
      const key = `${slot.day}-${slot.period}`
      const list = cellMap.get(key) ?? []
      list.push(placed)
      cellMap.set(key, list)
    }
  }

  if (items.length === 0) return null

  return (
    <div>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-12 border-b border-r border-border bg-secondary/40 p-2 text-xs font-medium text-muted-foreground">
                교시
              </th>
              {TIMETABLE_DAYS.map((day) => (
                <th
                  key={day}
                  className="border-b border-border bg-secondary/40 p-2 text-xs font-semibold text-foreground"
                >
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((period) => (
              <tr key={period}>
                <td className="border-r border-b border-border p-1.5 text-center text-xs text-muted-foreground">
                  {period}
                </td>
                {TIMETABLE_DAYS.map((day) => {
                  const placedHere = cellMap.get(`${day}-${period}`) ?? []
                  return (
                    <td key={day} className="border-b border-border p-1 align-top">
                      {placedHere.map(({ item, colorClass }) => (
                        <Link
                          key={item.courseId}
                          href={`/courses/${item.courseId}`}
                          title={`${item.name}${item.room ? ` · ${item.room}` : ""}`}
                          className={`block truncate rounded-md border px-1.5 py-1 text-[11px] font-medium ${colorClass}`}
                        >
                          {item.name}
                        </Link>
                      ))}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {withoutSchedule.length > 0 && (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/40 p-3">
          <p className="text-xs font-semibold text-muted-foreground">시간 정보 없는 과목</p>
          <p className="mt-1 text-xs text-muted-foreground">
            아래 과목은 원본 데이터에 요일/교시 정보가 없어(온라인·미정 강좌 등) 그리드에
            표시할 수 없어요.
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {withoutSchedule.map((item) => (
              <li key={item.courseId}>
                <Link
                  href={`/courses/${item.courseId}`}
                  className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-foreground hover:border-primary/40"
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
