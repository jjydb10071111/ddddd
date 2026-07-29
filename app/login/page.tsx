"use client"

import type React from "react"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Compass, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-provider"
import { loginWithProvider } from "@/lib/api/auth"

export default function LoginPage() {
  const router = useRouter()
  const { login: authLogin, register: authRegister } = useAuth()

  // 로그인
  const [studentId, setStudentId] = useState("")
  const [password, setPassword] = useState("")
  const [loginError, setLoginError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false)

  // 회원가입
  const [regStudentId, setRegStudentId] = useState("")
  const [regPassword, setRegPassword] = useState("")
  const [regPasswordConfirm, setRegPasswordConfirm] = useState("")
  const [regSchoolEmail, setRegSchoolEmail] = useState("")
  const [regPhoneNumber, setRegPhoneNumber] = useState("")
  const [regPrivacyConsent, setRegPrivacyConsent] = useState(false)
  const [regError, setRegError] = useState<string | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoginError(null)
    setIsSubmitting(true)

    const result = await authLogin({ studentId, password })

    setIsSubmitting(false)

    if (!result.success) {
      setLoginError(result.message ?? "로그인에 실패했습니다.")
      return
    }

    router.push("/")
    router.refresh()
  }

  async function handleGoogleLogin() {
    setLoginError(null)
    setIsGoogleSubmitting(true)

    const result = await loginWithProvider("google")

    setIsGoogleSubmitting(false)

    if (!result.success) {
      setLoginError(result.message ?? "로그인에 실패했습니다.")
      return
    }

    router.push("/")
    router.refresh()
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setRegError(null)

    if (regPassword !== regPasswordConfirm) {
      setRegError("비밀번호가 일치하지 않습니다.")
      return
    }
    if (!regPrivacyConsent) {
      setRegError("개인정보 수집·이용에 동의해야 가입할 수 있습니다.")
      return
    }

    setIsRegistering(true)
    const result = await authRegister({
      studentId: regStudentId,
      password: regPassword,
      schoolEmail: regSchoolEmail,
      phoneNumber: regPhoneNumber,
      privacyConsent: regPrivacyConsent,
    })
    setIsRegistering(false)

    if (!result.success) {
      setRegError(result.message ?? "회원가입에 실패했습니다.")
      return
    }

    router.push("/")
    router.refresh()
  }

  return (
    <div className="flex min-h-svh flex-col items-center bg-background px-4 py-12">
      <Link href="/" className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Compass className="size-5" aria-hidden="true" />
        </span>
        <span className="font-display text-lg font-bold tracking-tight text-foreground">
          수강길잡이
        </span>
      </Link>

      <div className="mt-8 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="text-center">
          <h1 className="font-display text-xl font-bold text-foreground">로그인</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            학번으로 로그인하고 맞춤 추천을 받아보세요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="studentId" className="text-sm font-medium text-foreground">
              학번
            </label>
            <input
              id="studentId"
              type="text"
              inputMode="numeric"
              autoComplete="username"
              required
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="예: 202012345"
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25"
            />
          </div>

          {loginError ? (
            <p className="text-sm font-medium text-destructive" role="alert">
              {loginError}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={isSubmitting || isGoogleSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            로그인
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">또는</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          disabled={isSubmitting || isGoogleSubmitting}
          onClick={handleGoogleLogin}
        >
          {isGoogleSubmitting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : null}
          Google로 로그인
        </Button>
      </div>

      <div className="mt-6 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="text-center">
          <h2 className="font-display text-lg font-bold text-foreground">회원가입</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            아직 계정이 없다면 아래 정보로 가입해주세요
          </p>
        </div>

        <form onSubmit={handleRegister} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="regStudentId" className="text-sm font-medium text-foreground">
              학번
            </label>
            <input
              id="regStudentId"
              type="text"
              inputMode="numeric"
              autoComplete="username"
              required
              value={regStudentId}
              onChange={(e) => setRegStudentId(e.target.value)}
              placeholder="예: 202012345"
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="regPassword" className="text-sm font-medium text-foreground">
              비밀번호
            </label>
            <input
              id="regPassword"
              type="password"
              autoComplete="new-password"
              required
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              placeholder="4자리 이상 입력하세요"
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="regPasswordConfirm" className="text-sm font-medium text-foreground">
              비밀번호 확인
            </label>
            <input
              id="regPasswordConfirm"
              type="password"
              autoComplete="new-password"
              required
              value={regPasswordConfirm}
              onChange={(e) => setRegPasswordConfirm(e.target.value)}
              placeholder="비밀번호를 한 번 더 입력하세요"
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="regSchoolEmail" className="text-sm font-medium text-foreground">
              학교 이메일
            </label>
            <input
              id="regSchoolEmail"
              type="email"
              autoComplete="email"
              required
              value={regSchoolEmail}
              onChange={(e) => setRegSchoolEmail(e.target.value)}
              placeholder="예: student@jbnu.ac.kr"
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="regPhoneNumber" className="text-sm font-medium text-foreground">
              휴대폰 번호
            </label>
            <input
              id="regPhoneNumber"
              type="tel"
              autoComplete="tel"
              required
              value={regPhoneNumber}
              onChange={(e) => setRegPhoneNumber(e.target.value)}
              placeholder="예: 010-1234-5678"
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/25"
            />
          </div>

          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={regPrivacyConsent}
              onChange={(e) => setRegPrivacyConsent(e.target.checked)}
              className="mt-0.5 size-4 shrink-0 rounded border-input"
            />
            <span>
              [필수] 회원가입 및 서비스 이용을 위해 학번, 학교 이메일, 휴대폰 번호를
              수집·이용하는 것에 동의합니다. 수집된 정보는 본인 확인 및 서비스 제공
              목적으로만 사용됩니다.
            </span>
          </label>

          {regError ? (
            <p className="text-sm font-medium text-destructive" role="alert">
              {regError}
            </p>
          ) : null}

          <Button type="submit" disabled={isRegistering} className="w-full" size="lg">
            {isRegistering ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            회원가입
          </Button>
        </form>
      </div>
    </div>
  )
}
