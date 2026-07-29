import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

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

    let record;
    if (existing) {
      const passwordOk = await verifyPassword(password, existing.passwordHash);
      if (!passwordOk) {
        return NextResponse.json(
          { success: false, message: "학번 또는 비밀번호가 올바르지 않습니다." },
          { status: 401 }
        );
      }
      record = existing;
    } else {
      // 첫 로그인 시 계정을 자동 생성한다(가입 절차 없음 — 기존 데모 동작과 동일한 UX 유지).
      const passwordHash = await hashPassword(password);
      const isSeedDemoUser = studentId === "202012345";
      const [created] = await db
        .insert(users)
        .values({
          studentId,
          passwordHash,
          name: isSeedDemoUser ? "김수강" : `${studentId} 학우`,
          department: isSeedDemoUser ? "컴퓨터공학과" : "인공지능학과",
        })
        .returning();
      record = created;
    }

    const user = {
      id: record.id,
      name: record.name,
      studentId: record.studentId,
      department: record.department,
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
    console.error("Login API Error:", err);
    return NextResponse.json(
      { success: false, message: "로그인 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
