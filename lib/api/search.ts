// lib/api/search.ts
// F2(분야 통합 검색) 파사드. 컴포넌트는 이 함수만 호출하고, 실제 조회는
// app/api/search Route Handler → Neon(courses/field_tags/course_field_tags/reviews)에서
// 이루어진다.

import type { Course } from "@/lib/mock-data";

export type FieldMatchGroup = {
  fieldTagId: string;
  fieldTagName: string;
  parentCategory: string | null;
  courses: Course[];
};

export type SearchResult = {
  success: boolean;
  query: string;
  nameMatches: Course[];
  fieldGroups: FieldMatchGroup[];
  message?: string;
};

export async function searchCourses(query: string): Promise<SearchResult> {
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
      cache: "no-store",
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Search request failed:", err);
    return {
      success: false,
      query,
      nameMatches: [],
      fieldGroups: [],
      message: "서버와의 통신에 실패했습니다.",
    };
  }
}
