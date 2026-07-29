// Sprint 3(F3) — 산업/진로 태그셋 시드 스크립트.
//
// lib/search/industry-tag-taxonomy.ts에 정의된 태그 목록을 industry_tags 테이블에
// 삽입한다. embedding은 아직 채우지 않는다(lib/search/industry-relevance.ts 상단 주석의
// 임베딩 프로바이더 미설정 사유 참고) — name만 있으면 course_industry_tags 조인/검색은
// 전부 동작한다. 여러 번 실행해도 안전하다(name unique, onConflictDoNothing).
//
// 실행: `npm run db:seed-industry-tags` (Neon 프로젝트 연결 + .env.local에 DATABASE_URL 필요).

import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { industryTagTaxonomy } from "../search/industry-tag-taxonomy";

const db = drizzle(neon(process.env.DATABASE_URL!), { schema });

async function main() {
  let inserted = 0;

  for (const tag of industryTagTaxonomy) {
    const result = await db
      .insert(schema.industryTags)
      .values({ name: tag.name })
      .onConflictDoNothing({ target: schema.industryTags.name })
      .returning({ id: schema.industryTags.id });

    if (result.length > 0) inserted += 1;
  }

  console.log(
    `시드 완료: industry_tags ${inserted}개 삽입 (전체 대상 ${industryTagTaxonomy.length}개, 이미 존재하는 건 건너뜀)`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("시드 실패:", err);
    process.exit(1);
  });
