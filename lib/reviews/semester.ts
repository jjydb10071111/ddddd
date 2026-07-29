// 리뷰 작성 시점 기준 "작성 학기" 라벨을 만드는 헬퍼.
//
// 클라이언트가 semester를 명시적으로 보내지 않으면 서버에서 현재 날짜로 추정한다.
// 학사 일정은 학교/학기마다 조금씩 다르므로 정확한 개강일 대신 대략적인 규칙(3~8월=1학기,
// 9~2월=2학기)을 쓴다 — 학기 경계 근처(예: 2월 말, 8월 말) 며칠은 오차가 있을 수 있고,
// 정확한 학사력이 확보되면(Sprint 3/4의 curricula 테이블 등) 교체 대상이다.
export function getCurrentSemesterLabel(date: Date = new Date()): string {
  const month = date.getMonth() + 1; // 1~12
  const isFirstHalf = month >= 3 && month <= 8;
  const academicYear = month <= 2 ? date.getFullYear() - 1 : date.getFullYear();
  return `${academicYear}-${isFirstHalf ? 1 : 2}학기`;
}
