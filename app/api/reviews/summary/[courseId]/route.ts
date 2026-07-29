import { NextResponse } from "next/server";
import { getSummaryStatus } from "@/lib/reviews/summary";

// GET /api/reviews/summary/:courseId — 캐시된 요약 상태 조회.
// 여기서는 절대 LLM을 호출하지 않는다(재생성은 리뷰 작성 시 비동기로만 트리거됨).
export async function GET(_request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    const { courseId } = await params;
    const status = await getSummaryStatus(courseId);
    return NextResponse.json({ success: true, ...status });
  } catch (err) {
    console.error("Summary status API error:", err);
    return NextResponse.json(
      { success: false, message: "요약 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
