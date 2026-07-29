"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { AlertCircle, CalendarDays, Loader2, ShoppingCart, X } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { useAuth } from "@/components/auth-provider"
import { listCart, removeFromCart, type CartItem } from "@/lib/api/cart"

export default function CartPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [items, setItems] = useState<CartItem[]>([])
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [removingId, setRemovingId] = useState<string | null>(null)

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

  async function handleRemove(courseId: string) {
    setRemovingId(courseId)
    const result = await removeFromCart(courseId)
    if (result.success) {
      setItems((prev) => prev.filter((i) => i.courseId !== courseId))
    }
    setRemovingId(null)
  }

  const totalCredits = items.reduce((sum, i) => sum + i.credits, 0)

  return (
    <div className="min-h-svh">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        <div className="flex items-center gap-2">
          <ShoppingCart className="size-6 text-primary" aria-hidden="true" />
          <h1 className="font-display text-2xl font-bold text-foreground">장바구니</h1>
        </div>

        {!authLoading && !user ? (
          <EmptyState
            icon={ShoppingCart}
            title="로그인이 필요해요"
            description="장바구니는 로그인 후 이용할 수 있어요."
            action={{ href: "/login", label: "로그인하러 가기" }}
          />
        ) : status === "loading" || authLoading ? (
          <div className="mt-16 flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" aria-hidden="true" />
            <p className="text-sm">불러오는 중...</p>
          </div>
        ) : status === "error" ? (
          <EmptyState
            icon={AlertCircle}
            title="장바구니를 불러오지 못했어요"
            description="잠시 후 다시 시도해주세요."
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="장바구니가 비어 있어요"
            description="관심 있는 과목을 검색해서 담아보세요."
            action={{ href: "/search", label: "과목 검색하러 가기" }}
          />
        ) : (
          <>
            <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
              <span>담은 과목 {items.length}개 · 총 {totalCredits}학점</span>
              <Link
                href="/timetable"
                className="flex items-center gap-1.5 font-semibold text-primary hover:underline"
              >
                <CalendarDays className="size-4" aria-hidden="true" />
                나의 시간표 보기
              </Link>
            </div>

            <ul className="mt-4 space-y-3">
              {items.map((item) => (
                <li
                  key={item.courseId}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/courses/${item.courseId}`}
                      className="font-display text-base font-semibold text-foreground hover:text-primary"
                    >
                      {item.name}
                    </Link>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {item.department} · {item.credits}학점
                      {item.schedule ? ` · ${item.schedule.split(",")[0]}` : " · 시간 정보 없음"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.courseId)}
                    disabled={removingId === item.courseId}
                    aria-label={`${item.name} 장바구니에서 제거`}
                    className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  >
                    {removingId === item.courseId ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <X className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </div>
  )
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof ShoppingCart
  title: string
  description: string
  action?: { href: string; label: string }
}) {
  return (
    <div className="mt-16 flex flex-col items-center gap-3 text-center">
      <Icon className="size-10 text-muted-foreground/50" aria-hidden="true" />
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
