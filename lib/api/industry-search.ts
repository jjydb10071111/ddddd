// lib/api/industry-search.ts
// F3(산업/진로 분야 키워드 검색) 파사드. 컴포넌트는 이 함수들만 호출하고, 실제 조회는
// app/api/industry-tags·app/api/industry-search Route Handler → Neon(industry_tags/
// course_industry_tags/courses/reviews)에서 이루어진다.

import type { Course } from "@/lib/mock-data";

export type IndustryTagListItem = {
  id: string;
  name: string;
  description: string;
  icon: string;
  courseCount: number;
};

export type IndustryCourseResult = Course & { relevanceScore: number };

export type IndustrySearchResult = {
  success: boolean;
  tagName: string;
  myMajorCourses: IndustryCourseResult[];
  otherMajorCourses: IndustryCourseResult[];
  otherMajorCaveat: string;
  message?: string;
};

export async function listIndustryTags(): Promise<{ success: boolean; tags: IndustryTagListItem[]; message?: string }> {
  try {
    const res = await fetch("/api/industry-tags", { cache: "no-store" });
    return await res.json();
  } catch (err) {
    console.error("Industry tag list request failed:", err);
    return { success: false, tags: [], message: "서버와의 통신에 실패했습니다." };
  }
}

/**
 * @param tagName 산업/진로 태그 이름 (예: "반도체")
 * @param department 현재 사용자의 소속 학과 — "내 전공 과목"/"타 전공 과목" 구분에 쓰인다
 *   (PRD 8.3 #5). 미지정 시(비로그인 등) 전부 otherMajorCourses로 반환된다.
 */
export async function searchByIndustryTag(tagName: string, department?: string): Promise<IndustrySearchResult> {
  try {
    const params = new URLSearchParams({ tag: tagName });
    if (department) params.set("department", department);
    const res = await fetch(`/api/industry-search?${params.toString()}`, { cache: "no-store" });
    return await res.json();
  } catch (err) {
    console.error("Industry search request failed:", err);
    return {
      success: false,
      tagName,
      myMajorCourses: [],
      otherMajorCourses: [],
      otherMajorCaveat: "",
      message: "서버와의 통신에 실패했습니다.",
    };
  }
}
