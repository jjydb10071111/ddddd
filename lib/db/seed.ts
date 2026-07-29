// Sprint 1(F1) 데모용 1회성 시드 스크립트.
//
// F1(수강평/AI 요약)은 courses 테이블에 FK(reviews.courseId, summaries.courseId)로
// 붙는데, 실제 2,695개 강좌 카탈로그(lib/curriculum-data.ts)는 F2/F3 검수를 거치기 전이라
// 이번 스프린트 범위 밖이고, 브라우징 UI(홈/검색/분야/과목상세)가 실제로 참조하는 과목은
// 여전히 lib/mock-data.ts의 데모 5과목뿐이다. 그래서 이 스크립트는 그 5과목만 동일한 id로
// courses 테이블에 시드해 F1이 진짜 FK를 가질 수 있게 하는 임시 다리 역할을 한다.
// Sprint 2에서 과목 카탈로그가 통합되면 이 스크립트는 폐기 대상이다.
//
// 실행: `npm run db:seed` (Neon 프로젝트 연결 + .env.local에 DATABASE_URL 필요).

// 이 스크립트는 tsx로 Next.js 바깥에서 직접 실행되므로 lib/db/index.ts를 재사용하지 않는다 —
// 그 모듈은 "server-only"를 import하는데, 이 가드는 Next.js 번들러가 서버 컴포넌트 빌드에서만
// 무력화해주는 조건부 트릭이라 일반 node/tsx 실행에서는 항상 throw한다.
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { mockCourses } from "../mock-data";

const db = drizzle(neon(process.env.DATABASE_URL!), { schema });

async function main() {
  let inserted = 0;

  for (const course of mockCourses) {
    const result = await db
      .insert(schema.courses)
      .values({
        id: course.id,
        // 데모 데이터에는 실제 학수번호가 없어 id를 그대로 code로도 사용한다.
        code: course.id,
        name: course.name,
        department: course.department,
        credits: course.credits,
        requirement: course.requirement,
        semester: "2026-2",
      })
      .onConflictDoNothing({ target: schema.courses.id })
      .returning({ id: schema.courses.id });

    if (result.length > 0) inserted += 1;
  }

  console.log(`시드 완료: courses ${inserted}개 삽입 (전체 대상 ${mockCourses.length}개, 이미 존재하는 건 건너뜀)`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("시드 실패:", err);
    process.exit(1);
  });
