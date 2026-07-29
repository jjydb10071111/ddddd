// 서버 전용 세션 조회 헬퍼.
//
// app/api/auth/login/route.ts가 발급하는 auth_session 쿠키는 base64(JSON) 값이다
// (서명/암호화 없는 데모 수준 인증 — CLAUDE.md 참고). 이 파일은 그 쿠키를 읽어 현재
// 로그인한 사용자를 반환하는 로직을 한 곳에 모은 것으로, app/api/auth/me/route.ts의
// 파싱 로직과 동일한 규칙을 따른다. Route Handler에서 요청자를 식별해야 하는 곳
// (F1 리뷰 작성 등)은 이 헬퍼를 쓴다.

import "server-only";
import { cookies } from "next/headers";

export type SessionUser = {
  id: string;
  name: string;
  studentId: string;
  department?: string;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("auth_session");
    if (!sessionCookie || !sessionCookie.value) return null;

    const payload = Buffer.from(sessionCookie.value, "base64").toString("utf-8");
    const user = JSON.parse(payload);

    if (!user || typeof user.id !== "string") return null;
    return user as SessionUser;
  } catch {
    return null;
  }
}
