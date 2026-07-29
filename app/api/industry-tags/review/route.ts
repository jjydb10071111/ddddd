import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

// F3(산업/진로 분야 키워드 검색) 담당자 검수 워크플로우 — PRD 8.3 #3 "AI가 스코어링하고
// 담당자가 검수해 확정한다". F2의 app/api/field-tags/review와 동일한 게이트 패턴을 그대로
// 따른다 — 검수 전(reviewed=false) 태그는 산업 분야 검색 결과에 노출되지 않는다.
//
// GET  /api/industry-tags/review — 아직 검수되지 않은 과목-산업태그(+연관도 스코어) 목록.
// POST /api/industry-tags/review — 검수 처리. { courseId, industryTagId, action: "approve" | "reject" }
//   approve: reviewed=true로 전환해 검색 결과에 노출.
//   reject : AI/폴백 스코어가 틀렸다고 판단해 태그 행 자체를 삭제.

export async function GET() {
  try {
    const { courseIndustryTags, courses, industryTags } = schema;

    const pending = await db
      .select({
        courseId: courseIndustryTags.courseId,
        courseName: courses.name,
        industryTagId: courseIndustryTags.industryTagId,
        industryTagName: industryTags.name,
        relevanceScore: courseIndustryTags.relevanceScore,
      })
      .from(courseIndustryTags)
      .innerJoin(courses, eq(courseIndustryTags.courseId, courses.id))
      .innerJoin(industryTags, eq(courseIndustryTags.industryTagId, industryTags.id))
      .where(eq(courseIndustryTags.reviewed, false));

    return NextResponse.json({ success: true, pending });
  } catch (err) {
    console.error("Industry tag review GET API error:", err);
    return NextResponse.json(
      { success: false, pending: [], message: "검수 대기 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { courseId, industryTagId, action } = body ?? {};

    if (typeof courseId !== "string" || typeof industryTagId !== "string") {
      return NextResponse.json(
        { success: false, message: "courseId, industryTagId가 필요합니다." },
        { status: 400 },
      );
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { success: false, message: 'action은 "approve" 또는 "reject"여야 합니다.' },
        { status: 400 },
      );
    }

    const { courseIndustryTags } = schema;
    const whereClause = and(
      eq(courseIndustryTags.courseId, courseId),
      eq(courseIndustryTags.industryTagId, industryTagId),
    );

    if (action === "approve") {
      const updated = await db
        .update(courseIndustryTags)
        .set({ reviewed: true })
        .where(whereClause)
        .returning();

      if (updated.length === 0) {
        return NextResponse.json(
          { success: false, message: "해당 과목-산업태그를 찾을 수 없습니다." },
          { status: 404 },
        );
      }

      return NextResponse.json({ success: true, action: "approve", tag: updated[0] });
    }

    const deleted = await db.delete(courseIndustryTags).where(whereClause).returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { success: false, message: "해당 과목-산업태그를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, action: "reject", tag: deleted[0] });
  } catch (err) {
    console.error("Industry tag review POST API error:", err);
    return NextResponse.json(
      { success: false, message: "검수 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
