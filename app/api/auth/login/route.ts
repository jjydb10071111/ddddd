import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentId, password, schoolEmail } = body ?? {};

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
      // 첫 로그인 시 계정을 자동 생성한다(별도 가입 페이지 없이 로그인 폼에서 바로 가입).
      // 재학생 확인 용도로 학교 메일(.ac.kr)만 필수로 받는다 — 기존 계정에는 없어도 된다.
      if (
        !schoolEmail ||
        typeof schoolEmail !== "string" ||
        !/^[^\s@]+@[^\s@]+\.ac\.kr$/i.test(schoolEmail)
      ) {
        return NextResponse.json(
          { success: false, message: "처음 로그인하시는 경우, 학교 이메일(.ac.kr)을 입력해주세요." },
          { status: 400 }
        );
      }

      const [emailTaken] = await db.select().from(users).where(eq(users.email, schoolEmail)).limit(1);
      if (emailTaken) {
        return NextResponse.json(
          { success: false, message: "이미 다른 학번으로 등록된 학교 이메일입니다." },
          { status: 409 }
        );
      }

      const passwordHash = await hashPassword(password);
      const isSeedDemoUser = studentId === "202012345";
      const [created] = await db
        .insert(users)
        .values({
          studentId,
          passwordHash,
          email: schoolEmail,
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
      email: record.email ?? undefined,
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
