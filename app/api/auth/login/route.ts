import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body ?? {};

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { success: false, message: "유효한 학교 이메일을 입력해 주세요." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 4) {
      return NextResponse.json(
        { success: false, message: "비밀번호는 최소 4자리 이상이어야 합니다." },
        { status: 400 }
      );
    }

    // 데모 사용자 또는 동적 사용자 정보 생성
    let user;
    if (email.toLowerCase() === "student@university.ac.kr") {
      user = {
        id: "usr_101",
        name: "김수강",
        email: "student@university.ac.kr",
        department: "컴퓨터공학과",
      };
    } else {
      const nameFromEmail = email.split("@")[0];
      user = {
        id: `usr_${Date.now()}`,
        name: `${nameFromEmail} 학우`,
        email: email,
        department: "인공지능학과",
      };
    }

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
