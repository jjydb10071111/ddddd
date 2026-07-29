"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { AlertCircle, CalendarDays, Loader2, ShoppingCart } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { useAuth } from "@/components/auth-provider"
import { TimetableGrid } from "@/components/timetable-grid"
import { listCart, type CartItem } from "@/lib/api/cart"

export default function TimetablePage() {
  const { user, isLoading: authLoading } = useAuth()
  const [items, setItems] = useState<CartItem[]>([])
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setStatus("ready")
      return
    }
    let cancelled = false
    setStatus("loading")
    listCart().then((result) => {
      if (cancelled) return
      if (result.success) {
        setItems(result.items)
        setStatus("ready")
      } else {
        setStatus("error")
      }
    })
    return () => {
      cancelled = true
    }
  }, [user, authLoading])

  return (
    <div className="min-h-svh">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-6 text-primary" aria-hidden="true" />
            <h1 className="font-display text-2xl font-bold text-foreground">나의 시간표</h1>
          </div>
          <Link
            href="/cart"
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ShoppingCart className="size-4" aria-hidden="true" />
            장바구니 관리
          </Link>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          장바구니에 담은 과목의 시간표예요. 같은 과목이 여러 분반으로 열리는 경우 그 중
          한 분반의 시간만 표시돼요 — 실제 수강신청 전에는 학교 시스템에서 정확한 분반
          시간을 다시 확인해주세요.
        </p>

        <div className="mt-6">
          {!authLoading && !user ? (
            <EmptyState
              title="로그인이 필요해요"
              description="나의 시간표는 로그인 후 이용할 수 있어요."
              action={{ href: "/login", label: "로그인하러 가기" }}
            />
          ) : status === "loading" || authLoading ? (
            <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" aria-hidden="true" />
              <p className="text-sm">불러오는 중...</p>
            </div>
          ) : status === "error" ? (
            <EmptyState title="시간표를 불러오지 못했어요" description="잠시 후 다시 시도해주세요." />
          ) : items.length === 0 ? (
            <EmptyState
              title="장바구니가 비어 있어요"
              description="과목을 담으면 여기에 시간표가 그려져요."
              action={{ href: "/search", label: "과목 검색하러 가기" }}
            />
          ) : (
            <TimetableGrid items={items} />
          )}
        </div>
      </main>
    </div>
  )
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: { href: string; label: string }
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <AlertCircle className="size-10 text-muted-foreground/50" aria-hidden="true" />
      <p className="font-medium text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
      {action ? (
        <Link
          href={action.href}
          className="mt-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  )
}
