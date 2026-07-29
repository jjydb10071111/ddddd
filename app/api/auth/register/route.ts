import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";

const STUDENT_ID_RE = /^\d{6,10}$/;
const SCHOOL_EMAIL_RE = /^[^\s@]+@[^\s@]+\.ac\.kr$/i;
const PHONE_RE = /^01[016789]-?\d{3,4}-?\d{4}$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentId, password, schoolEmail, phoneNumber, privacyConsent } = body ?? {};

    if (!studentId || typeof studentId !== "string" || !STUDENT_ID_RE.test(studentId)) {
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

    if (!schoolEmail || typeof schoolEmail !== "string" || !SCHOOL_EMAIL_RE.test(schoolEmail)) {
      return NextResponse.json(
        { success: false, message: "학교 이메일(.ac.kr)을 올바르게 입력해주세요." },
        { status: 400 }
      );
    }

    if (!phoneNumber || typeof phoneNumber !== "string" || !PHONE_RE.test(phoneNumber)) {
      return NextResponse.json(
        { success: false, message: "휴대폰 번호를 올바르게 입력해주세요. (예: 010-1234-5678)" },
        { status: 400 }
      );
    }

    if (privacyConsent !== true) {
      return NextResponse.json(
        { success: false, message: "개인정보 수집·이용에 동의해야 가입할 수 있습니다." },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select({ studentId: users.studentId, email: users.email, phoneNumber: users.phoneNumber })
      .from(users)
      .where(
        or(
          eq(users.studentId, studentId),
          eq(users.email, schoolEmail),
          eq(users.phoneNumber, phoneNumber)
        )
      )
      .limit(1);

    if (existing) {
      const reason =
        existing.studentId === studentId
          ? "이미 가입된 학번입니다."
          : existing.email === schoolEmail
            ? "이미 다른 계정에 등록된 학교 이메일입니다."
            : "이미 다른 계정에 등록된 휴대폰 번호입니다.";
      return NextResponse.json({ success: false, message: reason }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const isSeedDemoUser = studentId === "202012345";
    const [created] = await db
      .insert(users)
      .values({
        studentId,
        passwordHash,
        email: schoolEmail,
        phoneNumber,
        privacyConsentedAt: new Date(),
        name: isSeedDemoUser ? "김수강" : `${studentId} 학우`,
        department: isSeedDemoUser ? "컴퓨터공학과" : "인공지능학과",
      })
      .returning();

    const user = {
      id: created.id,
      name: created.name,
      studentId: created.studentId,
      department: created.department,
      email: created.email ?? undefined,
    };

    // 가입 즉시 로그인 상태로 전환(별도 로그인 절차 없이 바로 서비스 이용).
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
      message: "회원가입이 완료되었습니다.",
    });
  } catch (err) {
    console.error("Register API Error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { success: false, message: "회원가입 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
