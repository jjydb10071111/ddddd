// lib/api/reviews.ts
// F1(수강평 해시태그 & AI 요약) 파사드. 컴포넌트는 이 함수들만 호출하고, 실제 저장/조회는
// app/api/reviews/** Route Handler → Neon(reviews/summaries 테이블)에서 이루어진다.

import type { HashtagStat, Review } from "@/lib/mock-data";

export type ReviewListResult = {
  success: boolean;
  reviews: Review[];
  hashtagStats: HashtagStat[];
  totalCount: number;
  message?: string;
};

export async function listReviews(courseId: string): Promise<ReviewListResult> {
  try {
    const res = await fetch(`/api/reviews?courseId=${encodeURIComponent(courseId)}`, {
      cache: "no-store",
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("List reviews request failed:", err);
    return {
      success: false,
      reviews: [],
      hashtagStats: [],
      totalCount: 0,
      message: "서버와의 통신에 실패했습니다.",
    };
  }
}

export type SubmitReviewInput = {
  courseId: string;
  rating: number;
  body: string;
  hashtags: string[];
  semester?: string;
};

export type SubmitReviewResult = {
  success: boolean;
  message?: string;
  review?: Review;
};

export async function submitReview(input: SubmitReviewInput): Promise<SubmitReviewResult> {
  try {
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Submit review request failed:", err);
    return { success: false, message: "서버와의 통신에 실패했습니다." };
  }
}

export type SuggestHashtagsResult = {
  success: boolean;
  tags: string[];
  message?: string;
};

export async function suggestHashtags(text: string): Promise<SuggestHashtagsResult> {
  try {
    const res = await fetch("/api/reviews/suggest-tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Suggest hashtags request failed:", err);
    return { success: false, tags: [] };
  }
}

export type SummaryStatusResult =
  | { success: true; status: "empty" }
  | { success: true; status: "insufficient"; reviewCount: number }
  | { success: true; status: "pending"; reviewCount: number; polarized: boolean }
  | {
      success: true;
      status: "ready";
      body: string;
      basedReviewCount: number;
      generatedAt: string;
      currentReviewCount: number;
      polarized: boolean;
    }
  | { success: false; message: string };

export async function getCourseSummary(courseId: string): Promise<SummaryStatusResult> {
  try {
    const res = await fetch(`/api/reviews/summary/${encodeURIComponent(courseId)}`, {
      cache: "no-store",
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Get course summary request failed:", err);
    return { success: false, message: "서버와의 통신에 실패했습니다." };
  }
}
