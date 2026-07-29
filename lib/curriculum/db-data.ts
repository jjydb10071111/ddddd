// F4(AI 맞춤 커리큘럼 설계) — Neon에서 커리큘럼 엔진 입력을 조회하는 어댑터.
//
// lib/curriculum-data.ts(정적 curriculumCourses/departmentCurricula)와 정확히 같은 모양
// (CurriculumCourse[]/DepartmentCurriculum)을 반환한다 — lib/curriculum-engine.ts의
// RecommendCurriculumDeps에 그대로 주입할 수 있게 하기 위함이다. app/api/curriculum/recommend
// Route Handler(요청 경로)는 이 모듈만 쓰고, 정적 파일은 더 이상 읽지 않는다 — 정적
// curriculum-data.ts는 (1) 이 마이그레이션 스크립트들의 원본 소스, (2) DB 연결이 없는 로컬
// 개발 폴백(엔진의 기본 파라미터), (3) 클라이언트 UI의 학과 드롭다운/과목명 표시용 정적
// 레이블 소스로만 남는다(요청 경로가 아니라 별개 용도).
//
// professors/sectionCount는 courses 스키마에 없고(원본 스프레드시트의 분반 단위 정보라
// 이관 시 버렸다) 커리큘럼 엔진도 두 필드를 전혀 읽지 않으므로 빈 값으로 채운다.

import "server-only"
import { and, eq } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import type { CurriculumCourse, CurriculumRequirement, DepartmentCurriculum } from "@/lib/curriculum-data"

// 실제 입학년도별 버전 데이터가 없어(PRD 12장 리스크, docs/DEVELOPMENT_PLAN.md Sprint 4 메모)
// curriculum-data.ts와 동일하게 2024 고정값만 조회한다 — UI에 입학년도 선택지를 만들지 않는다.
const DEFAULT_ADMISSION_YEAR = 2024

export async function fetchCurriculumCourses(): Promise<CurriculumCourse[]> {
  const rows = await db.select().from(schema.courses)
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    department: r.department,
    professors: [],
    sectionCount: 1,
    credits: r.credits,
    requirement: r.requirement as CurriculumRequirement,
    prerequisites: r.prerequisites ?? [],
    industry: r.curriculumIndustry ?? undefined,
    academicField: r.curriculumAcademicField ?? undefined,
  }))
}

export async function fetchDepartmentCurriculum(
  department: string,
  admissionYear: number = DEFAULT_ADMISSION_YEAR,
): Promise<DepartmentCurriculum | null> {
  const rows = await db
    .select()
    .from(schema.curricula)
    .where(and(eq(schema.curricula.department, department), eq(schema.curricula.admissionYear, admissionYear)))
    .limit(1)

  const row = rows[0]
  if (!row) return null

  return {
    department: row.department,
    admissionYear: row.admissionYear,
    requiredCourseIds: row.requiredCourseIds,
    electiveMinCredits: row.electiveMinCredits,
    graduationMinCredits: row.graduationMinCredits,
  }
}
