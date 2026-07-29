import { NextResponse, after } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { predefinedReviewTags } from "@/lib/mock-data";
import { getSessionUser } from "@/lib/auth/session";
import { detectAbuse } from "@/lib/reviews/abuse";
import { getCurrentSemesterLabel } from "@/lib/reviews/semester";
import { computeHashtagStats, maybeRegenerateSummary } from "@/lib/reviews/summary";

const MIN_BODY_LENGTH = 5;
const RECENT_REVIEWS_FOR_ABUSE_CHECK = 20;

// GET /api/reviews?courseId=xxx — 과목의 리뷰 목록 + 해시태그 언급 빈도.
// 어뷰징으로 flagged된 리뷰는 응답에서 제외한다(집계뿐 아니라 노출도 제외).
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    if (!courseId) {
      return NextResponse.json(
        { success: false, message: "courseId가 필요합니다." },
        { status: 400 },
      );
    }

    const { reviews } = schema;
    const rows = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        body: reviews.body,
        hashtags: reviews.hashtags,
        semester: reviews.semester,
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .where(and(eq(reviews.courseId, courseId), eq(reviews.flagged, false)))
      .orderBy(desc(reviews.createdAt));

    const hashtagStats = computeHashtagStats(rows);

    return NextResponse.json({
      success: true,
      reviews: rows.map((r) => ({
        id: r.id,
        rating: r.rating,
        semester: r.semester,
        body: r.body,
        hashtags: r.hashtags,
      })),
      hashtagStats,
      totalCount: rows.length,
    });
  } catch (err) {
    console.error("Reviews GET API error:", err);
    return NextResponse.json(
      { success: false, message: "수강평을 불러오는 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}

// POST /api/reviews — 수강평 작성. 로그인 필요.
export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { success: false, message: "로그인 후 이용해주세요." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { courseId, rating, body: reviewBody, hashtags, semester } = body ?? {};

    if (!courseId || typeof courseId !== "string") {
      return NextResponse.json(
        { success: false, message: "courseId가 필요합니다." },
        { status: 400 },
      );
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, message: "별점은 1~5 사이의 정수여야 합니다." },
        { status: 400 },
      );
    }

    if (typeof reviewBody !== "string" || reviewBody.trim().length < MIN_BODY_LENGTH) {
      return NextResponse.json(
        { success: false, message: `수강평은 ${MIN_BODY_LENGTH}자 이상 입력해주세요.` },
        { status: 400 },
      );
    }

    // 고정된 9종 해시태그 세트 밖의 값은 조용히 걸러낸다 (PRD 8.1 — 임의 태그 생성 금지).
    const validHashtags = Array.isArray(hashtags)
      ? [...new Set(hashtags.filter((tag): tag is string => predefinedReviewTags.includes(tag)))]
      : [];

    const { courses, reviews } = schema;

    const [course] = await db.select({ id: courses.id }).from(courses).where(eq(courses.id, courseId)).limit(1);
    if (!course) {
      return NextResponse.json(
        { success: false, message: "존재하지 않는 과목입니다." },
        { status: 404 },
      );
    }

    // 동일 사용자가 같은 과목에 이미 작성한 경우 — 도배 방지를 위해 과목당 1개로 제한한다.
    const [existingReview] = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(and(eq(reviews.courseId, courseId), eq(reviews.userId, sessionUser.id)))
      .limit(1);

    if (existingReview) {
      return NextResponse.json(
        { success: false, message: "이미 이 과목에 수강평을 작성했습니다." },
        { status: 409 },
      );
    }

    const recentReviews = await db
      .select({ rating: reviews.rating, body: reviews.body, createdAt: reviews.createdAt })
      .from(reviews)
      .where(eq(reviews.userId, sessionUser.id))
      .orderBy(desc(reviews.createdAt))
      .limit(RECENT_REVIEWS_FOR_ABUSE_CHECK);

    const abuseResult = detectAbuse({ newRating: rating, newBody: reviewBody, recentReviews });

    const semesterLabel =
      typeof semester === "string" && semester.trim() ? semester.trim() : getCurrentSemesterLabel();

    const [created] = await db
      .insert(reviews)
      .values({
        courseId,
        userId: sessionUser.id,
        rating,
        body: reviewBody.trim(),
        hashtags: validHashtags,
        semester: semesterLabel,
        flagged: abuseResult.flagged,
      })
      .returning();

    // 요약 재생성은 리뷰 등록 응답을 막지 않는 비동기 작업으로 처리한다 (PRD 10.3).
    after(async () => {
      try {
        await maybeRegenerateSummary(courseId);
      } catch (err) {
        console.error("Summary regeneration failed:", err);
      }
    });

    return NextResponse.json({
      success: true,
      review: {
        id: created.id,
        rating: created.rating,
        semester: created.semester,
        body: created.body,
        hashtags: created.hashtags,
      },
    });
  } catch (err) {
    console.error("Reviews POST API error:", err);
    return NextResponse.json(
      { success: false, message: "수강평 등록 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
