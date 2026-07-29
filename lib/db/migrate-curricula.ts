// Sprint 4(F4) — lib/curriculum-data.ts의 departmentCurricula(146개 학과, 이번 학기 개설
// 전공필수/기초필수 목록 + 더미 졸업요건)를 Postgres curricula 테이블로 옮기는 1회성
// 이관 스크립트.
//
// admissionYear는 실제 입학년도별 버전 데이터가 없어 기존 curriculum-data.ts와 동일하게
// 2024 고정값을 쓴다(docs/DEVELOPMENT_PLAN.md Sprint 4 메모에 명시된 gap — 지어내지 않음).
// electiveMinCredits(21)/graduationMinCredits(130)도 학교 공식 졸업요건 데이터가 없어
// 기존 더미값을 그대로 옮긴다.
//
// 실행: `npm run db:migrate-curricula` (Neon 연결 + .env.local에 DATABASE_URL 필요).
// 반복 실행 가능 — (department, admissionYear) unique index로 onConflictDoNothing.

import { config } from "dotenv"
import { neon } from "@neondatabase/serverless"

config({ path: ".env.local" })
import { drizzle } from "drizzle-orm/neon-http"
import * as schema from "./schema"
import { departmentCurricula } from "../curriculum-data"

const db = drizzle(neon(process.env.DATABASE_URL!), { schema })

async function main() {
  let inserted = 0

  for (const curriculum of departmentCurricula) {
    const result = await db
      .insert(schema.curricula)
      .values({
        department: curriculum.department,
        admissionYear: curriculum.admissionYear,
        requiredCourseIds: curriculum.requiredCourseIds,
        electiveMinCredits: curriculum.electiveMinCredits,
        graduationMinCredits: curriculum.graduationMinCredits,
      })
      .onConflictDoNothing({ target: [schema.curricula.department, schema.curricula.admissionYear] })
      .returning({ id: schema.curricula.id })

    if (result.length > 0) inserted += 1
  }

  console.log(
    `이관 완료: curricula ${inserted}개 삽입 (전체 대상 ${departmentCurricula.length}개, 이미 존재하는 건 건너뜀).`,
  )
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("이관 실패:", err)
    process.exit(1)
  })
