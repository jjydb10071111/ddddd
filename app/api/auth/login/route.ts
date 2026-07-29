import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifyPassword } from "@/lib/auth/password";

// 계정 생성은 /api/auth/register가 전담한다(회원가입 폼 도입 이후) — 이 라우트는
// 존재하는 계정의 인증만 담당하고, 학번을 찾지 못하면 가입을 안내한다.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentId, password } = body ?? {};

    if (!studentId || typeof studentId !== "string" || !/^\d{6,10}$/.test(studentId)) {
      return NextResponse.json(
        { success: false, message: "학번 형식을 확인해주세요. (숫자만 입력)" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 4) {
      return NextResponse.json(
        { success: false, message: "비밀번호는 최소 4자리 이상이어야 합니다." },
        { status: 400 }
      );
    }

    const [existing] = await db.select().from(users).where(eq(users.studentId, studentId)).limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "가입되지 않은 학번입니다. 아래에서 회원가입을 진행해주세요." },
        { status: 401 }
      );
    }

    const passwordOk = await verifyPassword(password, existing.passwordHash);
    if (!passwordOk) {
      return NextResponse.json(
        { success: false, message: "학번 또는 비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
    }

    const user = {
      id: existing.id,
      name: existing.name,
      studentId: existing.studentId,
      department: existing.department,
      email: existing.email ?? undefined,
    };

    const sessionPayload = JSON.stringify(user);
    const encodedToken = Buffer.from(sessionPayload).toString("base64");

    const cookieStore = await cookies();
    cookieStore.set("auth_session", encodedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({
      success: true,
      user,
      message: "성공적으로 로그인되었습니다.",
    });
  } catch (err) {
    console.error("Login API Error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { success: false, message: "로그인 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
