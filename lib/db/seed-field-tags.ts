// Sprint 2(F2) — 학문분야 태그 대분류-소분류 체계 시드 스크립트.
//
// lib/search/field-tag-taxonomy.ts에 정의된 태그 목록을 field_tags 테이블에 삽입한다.
// 소분류(parentCategory != null)는 대분류가 먼저 존재해야 하는 것은 아니다 —
// parentCategory는 FK가 아니라 대분류 이름을 그대로 담는 text 컬럼이기 때문이다
// (lib/db/schema.ts 참고). 여러 번 실행해도 안전하다(name unique, onConflictDoNothing).
//
// 실행: `npm run db:seed-field-tags` (Neon 프로젝트 연결 + .env.local에 DATABASE_URL 필요).

import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { fieldTagTaxonomy } from "../search/field-tag-taxonomy";

const db = drizzle(neon(process.env.DATABASE_URL!), { schema });

async function main() {
  let inserted = 0;

  for (const tag of fieldTagTaxonomy) {
    const result = await db
      .insert(schema.fieldTags)
      .values({ name: tag.name, parentCategory: tag.parentCategory })
      .onConflictDoNothing({ target: schema.fieldTags.name })
      .returning({ id: schema.fieldTags.id });

    if (result.length > 0) inserted += 1;
  }

  console.log(
    `시드 완료: field_tags ${inserted}개 삽입 (전체 대상 ${fieldTagTaxonomy.length}개, 이미 존재하는 건 건너뜀)`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("시드 실패:", err);
    process.exit(1);
  });
