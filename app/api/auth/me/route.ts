import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("auth_session");

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({
        authenticated: false,
        user: null,
      });
    }

    const payload = Buffer.from(sessionCookie.value, "base64").toString("utf-8");
    const user = JSON.parse(payload);

    return NextResponse.json({
      authenticated: true,
      user,
    });
  } catch (err) {
    console.error("Auth Me API Error:", err);
    return NextResponse.json({
      authenticated: false,
      user: null,
    });
  }
}
