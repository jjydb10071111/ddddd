import { NextResponse } from "next/server"
import { desc, eq } from "drizzle-orm"
import { db, schema } from "@/lib/db"
import { getSessionUser } from "@/lib/auth/session"

// GET /api/cart — 로그인한 사용자의 장바구니 목록(과목 정보 포함, 담은 최신순).
export async function GET() {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ success: false, message: "로그인이 필요합니다." }, { status: 401 })
    }

    const { cartItems, courses } = schema
    const rows = await db
      .select({
        courseId: courses.id,
        name: courses.name,
        department: courses.department,
        credits: courses.credits,
        requirement: courses.requirement,
        schedule: courses.schedule,
        room: courses.room,
        addedAt: cartItems.createdAt,
      })
      .from(cartItems)
      .innerJoin(courses, eq(cartItems.courseId, courses.id))
      .where(eq(cartItems.userId, sessionUser.id))
      .orderBy(desc(cartItems.createdAt))

    return NextResponse.json({ success: true, items: rows })
  } catch (err) {
    console.error("Cart GET Error:", err instanceof Error ? err.message : String(err))
    return NextResponse.json(
      { success: false, message: "장바구니를 불러오지 못했습니다." },
      { status: 500 },
    )
  }
}

// POST /api/cart { courseId } — 장바구니에 과목 담기. 이미 담겨 있으면 그대로 성공 처리.
export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ success: false, message: "로그인이 필요합니다." }, { status: 401 })
    }

    const body = await request.json()
    const { courseId } = body ?? {}
    if (!courseId || typeof courseId !== "string") {
      return NextResponse.json({ success: false, message: "courseId가 필요합니다." }, { status: 400 })
    }

    const { cartItems, courses } = schema
    const [course] = await db.select({ id: courses.id }).from(courses).where(eq(courses.id, courseId)).limit(1)
    if (!course) {
      return NextResponse.json({ success: false, message: "존재하지 않는 과목입니다." }, { status: 404 })
    }

    await db
      .insert(cartItems)
      .values({ userId: sessionUser.id, courseId })
      .onConflictDoNothing({ target: [cartItems.userId, cartItems.courseId] })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Cart POST Error:", err instanceof Error ? err.message : String(err))
    return NextResponse.json(
      { success: false, message: "장바구니에 담지 못했습니다." },
      { status: 500 },
    )
  }
}
