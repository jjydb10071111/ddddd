// F2(분야 통합 검색) 동의어 사전 — PRD 8.2 #6 "분야명 동의어(예: 수학 ↔ 수리과학)를
// 인식할 수 있도록 동의어 사전을 관리한다".
//
// 정적 맵으로 시작한다. 태그 개수가 늘어나 관리 부담이 커지면 DB 테이블로 옮기는 것을
// 고려할 것(이번 스프린트 범위 밖 — field-industry-tagging 스킬 참고).
// app/api/search에서 검색어를 분야 태그와 매칭하기 전에 이 모듈로 검색어를 확장한다.

const synonymGroups: string[][] = [
  ["수학", "수리과학"],
  ["컴퓨터공학", "전산학", "컴공", "소프트웨어"],
  ["전자공학", "전자"],
  ["화학공학", "화공"],
  ["물리학", "물리"],
  ["생명과학", "생물학", "바이오"],
  ["경영학", "경영"],
  ["경제학", "경제"],
  ["심리학", "심리"],
  ["신소재공학", "재료공학"],
  ["기계공학", "기계"],
  ["디자인", "디자인학"],
];

const canonicalIndex = new Map<string, string[]>();
for (const group of synonymGroups) {
  const lowerGroup = group.map((term) => term.toLowerCase());
  for (const term of lowerGroup) {
    canonicalIndex.set(term, lowerGroup);
  }
}

/**
 * 검색어와 동의어 사전에 등록된 동의어를 모두 포함하는 검색어 집합을 반환한다.
 * 원 검색어는 등록 여부와 무관하게 항상 포함된다. 반환값은 전부 소문자다.
 */
export function expandSynonyms(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const group = canonicalIndex.get(q);
  return group ? [...new Set([q, ...group])] : [q];
}
