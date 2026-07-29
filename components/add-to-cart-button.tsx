"use client"

import type React from "react"
import { useState } from "react"
import { Check, Loader2, ShoppingCart } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { addToCart } from "@/lib/api/cart"

// CourseCard(Link)에 얹어 쓰는 담기 버튼 — 클릭이 부모 <Link> 이동으로 번지지 않게 막는다.
// 로그인하지 않은 경우 렌더링하지 않는다(장바구니는 로그인 사용자 기능).
export function AddToCartButton({ courseId }: { courseId: string }) {
  const { user } = useAuth()
  const [status, setStatus] = useState<"idle" | "loading" | "added" | "error">("idle")

  if (!user) return null

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (status === "loading" || status === "added") return

    setStatus("loading")
    const result = await addToCart(courseId)
    setStatus(result.success ? "added" : "error")
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status === "loading" || status === "added"}
      aria-pressed={status === "added"}
      title={status === "added" ? "장바구니에 담았어요" : "장바구니에 담기"}
      className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-primary disabled:opacity-100"
    >
      {status === "loading" ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
      ) : status === "added" ? (
        <Check className="size-3.5 text-primary" aria-hidden="true" />
      ) : (
        <ShoppingCart className="size-3.5" aria-hidden="true" />
      )}
      <span>{status === "added" ? "담음" : status === "error" ? "다시 시도" : "담기"}</span>
    </button>
  )
}
