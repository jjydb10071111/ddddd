// lib/api/cart.ts
// 장바구니(담기/제거/조회) 파사드 — 컴포넌트는 이 함수들만 호출한다.

export type CartItem = {
  courseId: string
  name: string
  department: string
  credits: number
  requirement: string
  schedule: string | null
  room: string | null
  addedAt: string
}

export type CartListResult =
  | { success: true; items: CartItem[] }
  | { success: false; message: string }

export type CartActionResult = { success: boolean; message?: string }

export async function listCart(): Promise<CartListResult> {
  try {
    const res = await fetch("/api/cart", { cache: "no-store" })
    return await res.json()
  } catch (err) {
    console.error("Cart list request failed:", err instanceof Error ? err.message : String(err))
    return { success: false, message: "서버와의 통신에 실패했습니다." }
  }
}

export async function addToCart(courseId: string): Promise<CartActionResult> {
  try {
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId }),
    })
    return await res.json()
  } catch (err) {
    console.error("Add to cart request failed:", err instanceof Error ? err.message : String(err))
    return { success: false, message: "서버와의 통신에 실패했습니다." }
  }
}

export async function removeFromCart(courseId: string): Promise<CartActionResult> {
  try {
    const res = await fetch(`/api/cart/${encodeURIComponent(courseId)}`, { method: "DELETE" })
    return await res.json()
  } catch (err) {
    console.error("Remove from cart request failed:", err instanceof Error ? err.message : String(err))
    return { success: false, message: "서버와의 통신에 실패했습니다." }
  }
}
