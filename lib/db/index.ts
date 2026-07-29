// Neon 서버리스 드라이버 기반 DB 커넥션.
//
// PRD 10.4 "DB 커넥션 관리" — 서버리스 함수는 요청마다 새 연결을 맺는 경우가 많으므로,
// TCP 커넥션 풀 대신 Neon의 HTTP 기반 서버리스 드라이버(@neondatabase/serverless)를 쓴다.
// 이 드라이버는 요청마다 HTTP fetch로 쿼리를 보내 콜드스타트/커넥션 오버헤드가 없다 —
// Vercel Fluid Compute의 함수 인스턴스 재사용과도 궁합이 좋다.
//
// db 인스턴스는 모듈 스코프에서 한 번만 생성해 함수 인스턴스가 재사용되는 동안(Fluid Compute)
// 재활용되도록 한다. Route Handler 등 서버 전용 코드에서만 import할 것 — 클라이언트 번들에
// 섞이면 안 되므로 "server-only"로 막는다.

import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL이 설정되지 않았습니다. Neon 프로젝트를 연결한 뒤 `vercel env pull`로 .env.local을 채워주세요.",
  );
}

const sql = neon(databaseUrl);

export const db = drizzle(sql, { schema });
export * as schema from "./schema";
