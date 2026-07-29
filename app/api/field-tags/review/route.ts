import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

// F2(분야 통합 검색) 담당자 검수 워크플로우 — PRD 8.2 #3 "담당자가 검수해 확정한다".
// 전체 관리자 화면은 이번 스프린트 범위 밖(계획 문서 참고)이지만, "검수 전 태그는 노출되지
// 않는다"는 게이트 자체는 실재해야 하므로 최소한의 Route Handler로 그 개념을 구현한다.
//
// GET  /api/field-tags/review — 아직 검수되지 않은 과목-분야 태그 목록.
// POST /api/field-tags/review — 검수 처리. { courseId, fieldTagId, action: "approve" | "reject" }
//   approve: reviewed=true로 전환해 검색 결과에 노출.
//   reject : AI/폴백 제안이 틀렸다고 판단해 태그 행 자체를 삭제.

export async function GET() {
  try {
    const { courseFieldTags, courses, fieldTags } = schema;

    const pending = await db
      .select({
        courseId: courseFieldTags.courseId,
        courseName: courses.name,
        fieldTagId: courseFieldTags.fieldTagId,
        fieldTagName: fieldTags.name,
        parentCategory: fieldTags.parentCategory,
      })
      .from(courseFieldTags)
      .innerJoin(courses, eq(courseFieldTags.courseId, courses.id))
      .innerJoin(fieldTags, eq(courseFieldTags.fieldTagId, fieldTags.id))
      .where(eq(courseFieldTags.reviewed, false));

    return NextResponse.json({ success: true, pending });
  } catch (err) {
    console.error("Field tag review GET API error:", err);
    return NextResponse.json(
      { success: false, pending: [], message: "검수 대기 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { courseId, fieldTagId, action } = body ?? {};

    if (typeof courseId !== "string" || typeof fieldTagId !== "string") {
      return NextResponse.json(
        { success: false, message: "courseId, fieldTagId가 필요합니다." },
        { status: 400 },
      );
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { success: false, message: 'action은 "approve" 또는 "reject"여야 합니다.' },
        { status: 400 },
      );
    }

    const { courseFieldTags } = schema;
    const whereClause = and(
      eq(courseFieldTags.courseId, courseId),
      eq(courseFieldTags.fieldTagId, fieldTagId),
    );

    if (action === "approve") {
      const updated = await db
        .update(courseFieldTags)
        .set({ reviewed: true })
        .where(whereClause)
        .returning();

      if (updated.length === 0) {
        return NextResponse.json(
          { success: false, message: "해당 과목-분야 태그를 찾을 수 없습니다." },
          { status: 404 },
        );
      }

      return NextResponse.json({ success: true, action: "approve", tag: updated[0] });
    }

    const deleted = await db.delete(courseFieldTags).where(whereClause).returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { success: false, message: "해당 과목-분야 태그를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, action: "reject", tag: deleted[0] });
  } catch (err) {
    console.error("Field tag review POST API error:", err);
    return NextResponse.json(
      { success: false, message: "검수 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
