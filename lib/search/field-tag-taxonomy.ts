// F2(분야 통합 검색) 학문분야 태그 체계 — PRD 8.2 #2 "분야 분류 체계(대분류-소분류)를
// 정의한다. (예: 자연과학 > 수학 > 해석학/대수학/통계학 등)".
//
// 스키마(lib/db/schema.ts의 fieldTags)는 2단계(대분류/소분류)만 표현한다 — PRD 예시의
// 3단계째(해석학/대수학/통계학 등 소분류 하위 세부 분야)는 이번 스프린트 범위 밖이다.
// 5과목 데모 데이터셋 규모에 비례하게, 그러나 구조적으로는 확장 가능하게 구성했다.
//
// 이 파일은 순수 데이터라 lib/db/seed-field-tags.ts(tsx로 직접 실행되는 시드 스크립트)와
// lib/db/classify-field-tags.ts(AI 1차 분류 스크립트) 양쪽에서 공유한다.

export type FieldTagSeed = {
  name: string;
  /** null이면 대분류(최상위). 소분류는 대분류 name을 그대로 참조한다. */
  parentCategory: string | null;
};

export const fieldTagTaxonomy: FieldTagSeed[] = [
  // 대분류
  { name: "자연과학", parentCategory: null },
  { name: "공학", parentCategory: null },
  { name: "인문학", parentCategory: null },
  { name: "사회과학", parentCategory: null },
  { name: "예술", parentCategory: null },

  // 자연과학 > 소분류
  { name: "수학", parentCategory: "자연과학" },
  { name: "물리학", parentCategory: "자연과학" },
  { name: "화학", parentCategory: "자연과학" },
  { name: "생명과학", parentCategory: "자연과학" },

  // 공학 > 소분류
  { name: "컴퓨터공학", parentCategory: "공학" },
  { name: "전자공학", parentCategory: "공학" },
  { name: "화학공학", parentCategory: "공학" },
  { name: "신소재공학", parentCategory: "공학" },
  { name: "기계공학", parentCategory: "공학" },

  // 인문학 > 소분류
  { name: "문학", parentCategory: "인문학" },
  { name: "철학", parentCategory: "인문학" },
  { name: "역사학", parentCategory: "인문학" },

  // 사회과학 > 소분류
  { name: "경제학", parentCategory: "사회과학" },
  { name: "경영학", parentCategory: "사회과학" },
  { name: "심리학", parentCategory: "사회과학" },

  // 예술 > 소분류
  { name: "음악", parentCategory: "예술" },
  { name: "미술", parentCategory: "예술" },
  { name: "디자인", parentCategory: "예술" },
];

/** 과목에 실제로 붙는 태그는 소분류(리프)뿐이다 — 대분류 자체는 리프의 상위 그룹핑 용도. */
export const leafFieldTagNames = fieldTagTaxonomy
  .filter((t) => t.parentCategory !== null)
  .map((t) => t.name);
