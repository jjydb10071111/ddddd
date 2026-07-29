// lib/api/auth.ts

export type User = {
  id: string;
  name: string;
  studentId: string;
  department?: string;
  email?: string;
};

export type LoginInput = {
  studentId: string;
  password: string;
  /** 신규 가입(첫 로그인)에만 필요 — 기존 계정 로그인 시에는 무시된다. */
  schoolEmail?: string;
};

export type LoginResult = {
  success: boolean;
  message?: string;
  user?: User;
};

export async function login(input: LoginInput): Promise<LoginResult> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Login request failed:", err);
    return { success: false, message: "서버와의 통신에 실패했습니다." };
  }
}

export async function logout(): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch("/api/auth/logout", {
      method: "POST",
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Logout request failed:", err);
    return { success: false, message: "로그아웃 실패" };
  }
}

export async function getCurrentUser(): Promise<{ authenticated: boolean; user: User | null }> {
  try {
    const res = await fetch("/api/auth/me", {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) return { authenticated: false, user: null };
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Get current user request failed:", err);
    return { authenticated: false, user: null };
  }
}

export async function loginWithProvider(
  provider: "google"
): Promise<LoginResult> {
  // TODO(IDE 단계): OAuth 연동 (NextAuth 등)으로 교체
  // 학번 기반 계정과 소셜 로그인을 어떻게 연결할지는 별도 확인 필요.
  console.warn(`[auth.loginWithProvider] ${provider} 로그인 미연결`);
  return { success: false, message: "준비 중인 기능입니다." };
}
