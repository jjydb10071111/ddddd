// "나의 시간표" 기능용 — Sprint 4가 courses 테이블로 이관할 때 빠뜨린 요일/교시(schedule)·
// 강의실(room)을 원본 강좌(분반) 데이터에서 채워 넣는 1회성 백필 스크립트.
//
// lib/curriculum-data.ts의 curriculumCourses는 학수번호 기준으로 분반을 합친 "과목 단위"
// 레코드라 시간표를 들고 있지 않다(여러 분반이 서로 다른 시간에 열릴 수 있어서 하나로
// 합치기 애매하기 때문). 이 스크립트는 원본 lib/data/courses.json(분반 단위)을 직접 읽어,
// 같은 학수번호의 여러 분반 중 **첫 번째 분반의 시간표만** 대표값으로 쓴다 — 다른 분반이
// 다른 시간에 열리는 과목은 시간표가 실제와 다를 수 있다는 한계를 그대로 남긴다(정확한
// 해결은 분반 단위로 별도 선택 UI가 필요해 이번 범위 밖).
//
// 실행: `npm run db:backfill-course-schedule` (Neon 연결 필요). 반복 실행해도 안전
// (매번 동일한 값으로 덮어씀).

import { config } from "dotenv"
import { neon } from "@neondatabase/serverless"

config({ path: ".env.local" })
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/neon-http"
import * as schema from "./schema"
import rawSections from "../data/courses.json"

type RawSection = {
  id: string
  code: string
  name: string
  schedule: string
  room: string
}

const db = drizzle(neon(process.env.DATABASE_URL!), { schema })

function firstSectionByCode(sections: RawSection[]): Map<string, RawSection> {
  const byCode = new Map<string, RawSection>()
  for (const s of sections) {
    const key = s.code.toLowerCase()
    if (!byCode.has(key)) byCode.set(key, s)
  }
  return byCode
}

async function main() {
  const byCode = firstSectionByCode(rawSections as RawSection[])
  const entries = Array.from(byCode.entries()).filter(([, s]) => s.schedule && s.schedule !== "0")

  let updated = 0
  const CONCURRENCY = 25
  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const chunk = entries.slice(i, i + CONCURRENCY)
    const results = await Promise.all(
      chunk.map(([id, section]) =>
        db
          .update(schema.courses)
          .set({ schedule: section.schedule, room: section.room || null })
          .where(eq(schema.courses.id, id))
          .returning({ id: schema.courses.id }),
      ),
    )
    updated += results.filter((r) => r.length > 0).length
    console.log(`  ${Math.min(i + CONCURRENCY, entries.length)}/${entries.length} 처리...`)
  }

  console.log(
    `백필 완료: 시간표 있는 과목 ${entries.length}개 중 ${updated}개 갱신됨(courses 테이블에 없는 id는 건너뜀).`,
  )
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("백필 실패:", err)
    process.exit(1)
  })
