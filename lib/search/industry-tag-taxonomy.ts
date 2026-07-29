// F3(산업/진로 분야 키워드 검색) 산업/진로 태그셋 — PRD 8.3 #1
// "산업/진로 분야(반도체, AI·데이터사이언스, 바이오·헬스케어, 금융·핀테크, 콘텐츠·미디어 등)"를
// F2(학문분야, lib/search/field-tag-taxonomy.ts)와 별도 축으로 정의한다.
//
// 이름 6개는 lib/mock-data.ts의 interestFields와 반드시 동일한 문자열을 유지해야 한다 —
// F4 커리큘럼 엔진(lib/curriculum-engine.ts의 interestScore)이 `course.industry === field`로
// 정확히 문자열 일치 비교를 하기 때문에, 두 목록이 갈라지면 F4의 관심분야 랭킹이 조용히
// 깨진다. 태그를 추가/이름 변경할 때는 lib/mock-data.ts의 interestFields도 함께 갱신할 것.
//
// 이 파일은 순수 데이터라 다음 세 곳에서 공유한다:
//   - lib/db/seed-industry-tags.ts (industry_tags 테이블 시드)
//   - lib/db/classify-industry-tags.ts (AI/휴리스틱 연관도 스코어링)
//   - lib/search/industry-relevance.ts (임베딩 대체 휴리스틱 스코어러)
//   - lib/curriculum-classify.ts (F4 curriculum-data.ts의 industry 필드 채우기)
//
// "신조어·신산업 태그 확장" 운영 프로세스(PRD 8.3 #6, Sprint 3 체크리스트)는 이 배열에
// 항목을 추가하고 db:seed-industry-tags를 재실행하는 것으로 끝난다 — 스키마 마이그레이션이나
// enum 변경이 필요 없다(lib/db/schema.ts의 industryTags는 그냥 name/embedding 테이블).
// 자세한 절차는 docs/DEVELOPMENT_PLAN.md Sprint 3 메모 참고.

export type IndustryTagSeed = {
  name: string
  /** 카드 UI에 노출하는 한 줄 설명. AI 스코어링 프롬프트의 분야 설명으로도 재사용한다. */
  description: string
  /** 과목명·강의계획서 텍스트와의 키워드 중첩 휴리스틱(임베딩 유사도 대체용)에 쓰는 키워드. */
  keywords: string[]
  /**
   * lib/curriculum-data.ts의 2,695개 실제 개설강좌를 학과명 기준으로 분류할 때 쓰는
   * 짧은 키워드. keywords보다 더 일반적인(학과명에 자주 등장하는) 단어로 구성한다.
   */
  departmentKeywords: string[]
  /** components/fields-explorer.tsx에서 쓰는 lucide-react 아이콘 이름. */
  icon: string
}

export const industryTagTaxonomy: IndustryTagSeed[] = [
  {
    name: "반도체",
    description: "공정·소자·회로 설계까지 반도체 산업 전반",
    keywords: ["반도체", "공정", "소자", "회로설계", "웨이퍼", "나노", "전자재료", "디스플레이"],
    departmentKeywords: ["반도체", "전자공학", "신소재", "재료공학", "전자"],
    icon: "Cpu",
  },
  {
    name: "AI·데이터사이언스",
    description: "머신러닝, 통계, 데이터 분석의 기초와 응용",
    keywords: ["인공지능", "머신러닝", "딥러닝", "데이터", "알고리즘", "빅데이터", "통계", "자료구조"],
    departmentKeywords: ["컴퓨터", "소프트웨어", "정보통신", "전산", "인공지능", "데이터"],
    icon: "BrainCircuit",
  },
  {
    name: "바이오·헬스케어",
    description: "생명공학과 디지털 헬스케어 융합 과목",
    keywords: ["생명", "바이오", "유전자", "의료", "제약", "신약", "헬스케어", "생물"],
    departmentKeywords: ["생명", "바이오", "의학", "간호", "보건", "제약", "수의"],
    icon: "HeartPulse",
  },
  {
    name: "금융·핀테크",
    description: "금융공학, 계량분석, 핀테크 서비스 설계",
    keywords: ["금융", "투자", "회계", "리스크", "핀테크", "블록체인", "계량", "경영"],
    departmentKeywords: ["경영", "경제", "금융", "회계", "무역"],
    icon: "LineChart",
  },
  {
    name: "콘텐츠·미디어",
    description: "미디어 기획, 인터랙션, 콘텐츠 기술",
    keywords: ["미디어", "콘텐츠", "영상", "방송", "게임", "인터랙션", "디자인", "UX"],
    departmentKeywords: ["미디어", "콘텐츠", "영상", "방송", "신문방송", "게임", "만화", "애니메이션"],
    icon: "Clapperboard",
  },
  {
    name: "에너지·환경",
    description: "신재생 에너지와 지속가능성 관련 과목",
    keywords: ["에너지", "환경", "신재생", "태양광", "배터리", "탄소중립", "지속가능성"],
    departmentKeywords: ["환경", "에너지", "자원", "신재생", "원자력"],
    icon: "Leaf",
  },
]

export const industryTagNames = industryTagTaxonomy.map((t) => t.name)
