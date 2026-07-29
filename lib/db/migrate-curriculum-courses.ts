// Sprint 4(F4) — 실제 2학기 개설강좌 카탈로그(lib/curriculum-data.ts, 2,293개 과목 단위
// 레코드)를 Postgres courses 테이블로 옮기는 1회성 이관 스크립트.
//
// F1/F2/F3 시드 스크립트(lib/db/seed.ts 등)와 달리 이 카탈로그는 lib/mock-data.ts의 데모
// 5과목과는 완전히 다른 id 체계(학수번호 소문자)를 쓰므로 충돌 없이 같은 courses 테이블에
// 공존한다 — onConflictDoNothing으로 재실행해도 안전하다.
//
// industry/academicField(lib/curriculum-classify.ts의 학과명 키워드 휴리스틱, Sprint 3 산출물)는
// F2/F3의 "AI 1차 분류 + 담당자 검수" 조인 테이블(course_field_tags/course_industry_tags)로
// 보내지 않고, courses.curriculumIndustry/curriculumAcademicField 전용 컬럼에 그대로 옮긴다 —
// 이유는 lib/db/schema.ts의 해당 컬럼 주석 참고(검수 큐 오염 방지).
//
// 실행: `npm run db:migrate-curriculum-courses` (Neon 연결 + .env.local에 DATABASE_URL 필요).
// 반복 실행 가능(이미 존재하는 id는 건너뜀). curriculum-data.ts의 원본 JSON이 바뀌지 않는 한
// 매번 실행할 필요는 없다.

import { config } from "dotenv"
import { neon } from "@neondatabase/serverless"

config({ path: ".env.local" })
import { drizzle } from "drizzle-orm/neon-http"
import * as schema from "./schema"
import { curriculumCourses } from "../curriculum-data"

const db = drizzle(neon(process.env.DATABASE_URL!), { schema })

const SEMESTER = "2026-2"

async function main() {
  let inserted = 0
  let skipped = 0

  // 2,293개를 하나씩 insert하면 라운드트립이 많아 느리다 — 배치로 묶어서 삽입한다.
  const BATCH_SIZE = 200
  for (let i = 0; i < curriculumCourses.length; i += BATCH_SIZE) {
    const batch = curriculumCourses.slice(i, i + BATCH_SIZE)
    const result = await db
      .insert(schema.courses)
      .values(
        batch.map((c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          department: c.department,
          credits: c.credits,
          requirement: c.requirement,
          semester: SEMESTER,
          prerequisites: c.prerequisites ?? [],
          curriculumIndustry: c.industry ?? null,
          curriculumAcademicField: c.academicField ?? null,
        })),
      )
      .onConflictDoNothing({ target: schema.courses.id })
      .returning({ id: schema.courses.id })

    inserted += result.length
    skipped += batch.length - result.length
    console.log(`  ${Math.min(i + BATCH_SIZE, curriculumCourses.length)}/${curriculumCourses.length} 처리...`)
  }

  console.log(
    `이관 완료: courses ${inserted}개 삽입, ${skipped}개는 이미 존재해 건너뜀 (전체 대상 ${curriculumCourses.length}개).`,
  )
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("이관 실패:", err)
    process.exit(1)
  })
