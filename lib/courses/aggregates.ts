// 여러 과목의 평점/리뷰수/해시태그 빈도를 한 번에 집계한다.
//
// F1(reviews 테이블) 데이터를 기반으로 하며, flagged(어뷰징 판정)된 리뷰는 제외한다
// (app/api/reviews/route.ts GET과 동일한 규칙). F2(app/api/search) 검색 결과의
// 평점/리뷰수 표시·필터·정렬이 이 집계를 사용한다.
//
// 서버 전용. Route Handler 등 서버 코드에서만 import할 것.

import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { computeHashtagStats } from "@/lib/reviews/summary";
import type { HashtagStat } from "@/lib/mock-data";

export type CourseAggregate = {
  rating: number;
  reviewCount: number;
  hashtags: HashtagStat[];
};

export async function getCourseAggregates(courseIds: string[]): Promise<Map<string, CourseAggregate>> {
  const result = new Map<string, CourseAggregate>();
  if (courseIds.length === 0) return result;

  const { reviews } = schema;
  const rows = await db
    .select({ courseId: reviews.courseId, rating: reviews.rating, hashtags: reviews.hashtags })
    .from(reviews)
    .where(and(inArray(reviews.courseId, courseIds), eq(reviews.flagged, false)));

  const byCourse = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byCourse.get(row.courseId) ?? [];
    list.push(row);
    byCourse.set(row.courseId, list);
  }

  for (const courseId of courseIds) {
    const courseRows = byCourse.get(courseId) ?? [];
    if (courseRows.length === 0) {
      result.set(courseId, { rating: 0, reviewCount: 0, hashtags: [] });
      continue;
    }
    const avgRating = courseRows.reduce((sum, r) => sum + r.rating, 0) / courseRows.length;
    result.set(courseId, {
      rating: Math.round(avgRating * 10) / 10,
      reviewCount: courseRows.length,
      hashtags: computeHashtagStats(
        courseRows.map((r) => ({ rating: r.rating, body: "", hashtags: r.hashtags })),
      ),
    });
  }

  return result;
}
