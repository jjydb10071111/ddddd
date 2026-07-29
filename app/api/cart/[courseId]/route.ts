import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { getSessionUser } from "@/lib/auth/session"

// DELETE /api/cart/[courseId] — 장바구니에서 과목 제거.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ success: false, message: "로그인이 필요합니다." }, { status: 401 })
    }

    const { courseId } = await params
    const { cartItems } = schema

    await db
      .delete(cartItems)
      .where(and(eq(cartItems.userId, sessionUser.id), eq(cartItems.courseId, courseId)))

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Cart DELETE Error:", err instanceof Error ? err.message : String(err))
    return NextResponse.json(
      { success: false, message: "장바구니에서 제거하지 못했습니다." },
      { status: 500 },
    )
  }
}
