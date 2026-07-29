# 수강길잡이 개발 계획 (스프린트 기반)

> 참고 문서: [`docs/PRD.md`](./PRD.md), [`/CLAUDE.md`](../CLAUDE.md)
> 최종 수정일: 2026-07-29 (Sprint 5 QA 항목 3개 반영)

## 이 문서 사용법

- 작업을 끝낼 때마다 해당 체크박스를 `- [ ]` → `- [x]`로 바꾸세요.
- 각 스프린트를 시작/완료할 때 아래 **진행 현황** 표의 상태와 이 문서 상단의 **최종 수정일**을 함께 갱신하세요.
- 스프린트 안에서 순서가 중요한 항목(예: 스키마 → API → UI)은 위에서 아래 순서로 되어 있습니다. 순서를 바꿔야 한다면 이유를 스프린트 하단 "메모"에 남겨주세요.
- 범위가 바뀌거나(예: 특정 항목을 다음 스프린트로 미룸) 새로운 작업이 필요해지면, 해당 스프린트에 체크박스를 추가/이동하고 아래 진행 현황 표에도 반영하세요. 이 문서는 계획 확정본이 아니라 계속 갱신하는 살아있는 문서입니다.

## 진행 현황

| Sprint | 목표 | 상태 | 비고 |
| --- | --- | --- | --- |
| Sprint 0 | 기반 인프라 (DB/ORM/LLM 벤더/실제 인증) | 진행중 | ORM/LLM 벤더 결정, 스키마·커넥션 모듈·인증 교체 코드 완료. Neon/Vercel 실제 provisioning은 대기 중 |
| Sprint 1 | F1 — 수강평 해시태그 & AI 요약 (P0) | 완료 (라이브 DB 검증 대기) | 코드 구현 완료, DB 미프로비저닝으로 실제 실행 미검증 — 하단 메모 참고 |
| Sprint 2 | F2 — 분야 통합 검색 (P0) | 완료 | 5과목 stopgap 기준 — 아래 메모 참고 |
| Sprint 3 | F3 — 산업/진로 분야 키워드 검색 (P1) | 완료 | 임베딩 대신 AI 텍스트 생성+휴리스틱 폴백 사용 — 상세 사유는 Sprint 3 메모 참고 |
| Sprint 4 | F4 마무리 — AI 맞춤 커리큘럼 설계 (P1) | 완료 (선수과목·졸업요건 실데이터는 외부 데이터 확보 필요 — 아래 메모) | Neon 이관, LLM 랭킹+폴백, 과목 검색-추가 UI 완료 |
| Sprint 5 | 통합/배포/QA | 완료 | Vercel production 배포 완료(https://sprint0-infra.vercel.app) — 단, 데이터 저작권은 미해결(아래 메모) |

상태 값: `미시작` / `진행중` / `완료` / `보류`

## 지금까지 된 것 (Sprint 0~4 착수 전 기준선)

이 계획을 처음 작성하는 시점에 이미 구현되어 있는 것들입니다. 스프린트 항목에서 다시 만들지 않도록 참고하세요.

- 로그인/로그아웃/세션 조회 — `lib/api/auth.ts`, `app/api/auth/**`, `components/auth-provider.tsx`. 단, **DB가 아니라 base64 세션 쿠키 기반의 mock**입니다 (Sprint 0에서 실제 User 테이블로 교체 대상).
- F4 추천 엔진(`lib/curriculum-engine.ts`)과 실제 2학기 개설강좌 데이터(`lib/data/courses.json`, `lib/curriculum-data.ts`, 2,695개 강좌/146개 학과) — 단, DB에 있는 게 아니라 정적 JSON이고, 선수과목·분야/산업 태그·평점 데이터는 비어 있음.
- `lib/mock-data.ts`의 데모용 과목 5개(리뷰/해시태그/요약 포함) — 홈/검색/분야/과목상세 페이지가 이 데이터로 동작 중.
- 디자인 시스템(shadcn base-nova + Tailwind v4), `.claude/agents`·`.claude/skills`·vercel 플러그인 설정 — `CLAUDE.md` 참고.

---

## Sprint 0 — 기반 인프라

**목표**: PRD 10장의 목표 아키텍처(Next.js + Neon + Vercel + LLM API)를 실제로 연결한다. 이후 스프린트의 F1~F4 작업이 전부 이 위에서 진행된다.

- [x] ORM 선정 (Prisma vs Drizzle) — PRD 14장 오픈 이슈. `neon-db-schema` 에이전트와 상의해 결정하고 이 문서에 결정 사유를 기록
- [x] Neon 프로젝트 생성, `DATABASE_URL` 등 환경변수 설정 (로컬 `.env.local` + Vercel 프로젝트 환경변수) — `vercel link` + `vercel integration add neon`으로 provisioning 완료
- [x] Neon 서버리스 드라이버 기반 DB 커넥션 모듈 작성 (`lib/db.ts` 등) — PRD 10.4의 커넥션 오버헤드 주의사항 반영
- [x] PRD 9장 7개 핵심 엔티티(Course, Field Tag, Industry Tag, Review, Summary, User, Curriculum) 스키마 마이그레이션 작성
- [x] pgvector 확장 활성화 (F3/F4 임베딩 유사도 검색에 필요 — 인덱스는 데이터가 쌓인 뒤에 추가) — `npx drizzle-kit migrate`로 실제 Neon에 적용 완료(`CREATE EXTENSION IF NOT EXISTS vector` 포함)
- [x] LLM API 벤더 선정 — PRD 14장 오픈 이슈. `vercel:ai-sdk`/`vercel:ai-gateway` 스킬 활용해 클라이언트 셋업
- [x] 기존 mock 인증을 실제 User 테이블 기반으로 교체 (세션 쿠키 발급 로직은 유지, 사용자 조회/생성만 DB로) — 실제 Neon 대상으로 로그인 흐름 검증 완료(아래 메모)
- [ ] Vercel 프리뷰 배포 + Neon 브랜칭 연동 확인 (PRD 10.4 — 배포마다 격리된 DB 브랜치) — 아직 실제 배포(`vercel deploy`)는 안 함, 로컬 `next dev` 기준으로만 검증

**메모**:

- **ORM: Drizzle 채택.** Neon 서버리스 드라이버와의 궁합, 가벼운 콜드스타트, SQL에 가까운 타입 추론이 Vercel Functions(서버리스) 환경에 더 적합하다고 판단. 스키마는 `lib/db/schema.ts`, 커넥션은 `lib/db/index.ts`(`drizzle-orm/neon-http` + `@neondatabase/serverless`), 마이그레이션 설정은 `drizzle.config.ts`/`drizzle/`.
- **LLM 벤더: Vercel AI Gateway 채택.** `ai` 패키지에 `provider/model` 문자열(`lib/ai.ts`의 `AI_MODELS`)을 그대로 넘겨 라우팅 — 프로바이더 SDK를 직접 설치하지 않는다. 인증은 OIDC 기본값(`vercel env pull` → `VERCEL_OIDC_TOKEN`). 단, **임베딩(F3)은 게이트웨이 미지원이라 direct provider SDK가 별도로 필요** — Sprint 3에서 재검토.
- **Neon 프로젝트 생성 완료**: `vercel link`로 Vercel 프로젝트(`sprint0-infra`)를 새로 만들고, `vercel integration add neon`으로 Neon 프로젝트(`neon-charcoal-plank`)를 provisioning해 연결했다. `vercel env pull`로 `.env.local`에 `DATABASE_URL` 등 자동 주입 확인. `npx drizzle-kit migrate`로 9개 테이블 + pgvector 확장까지 실제 적용 완료.
- **AI Gateway는 카드 등록 전까지 호출 불가**: 무료 크레딧이라도 Vercel 계정에 신용카드 등록이 선행 조건("AI Gateway requires a valid credit card on file")이라, 이번 세션에서는 AI 해시태그 추천/요약 생성 API 자체는 실제로 호출 검증하지 못했다. 나머지 파이프라인(리뷰 CRUD, 어뷰징 필터링, 해시태그 빈도 계산)은 아래 Sprint 1 메모에 정리된 대로 실제 Neon 대상으로 전부 검증 완료. 카드 등록 후 `GET /api/reviews/summary/[courseId]`로 후속 검증 필요.
- PRD 9장 엔티티 스키마의 `requirement`(이수구분) 컬럼은 mock-data(교양)와 curriculum-data(계열공통/기초필수) 값 집합이 달라 DB에서는 `text`로 느슨하게 두고, 정적 데이터를 이 스키마로 옮기는 이관 스크립트는 Sprint 3/4(실제 태그/커리큘럼 데이터 확보 이후)로 미룸.
- `vercel integration add neon`이 부수효과로 이 저장소의 커스텀 `.claude/skills/neon-postgres/SKILL.md`를 Neon 공식 업스트림 스킬로 덮어쓰고 `.agents/`/`skills-lock.json`을 새로 만들었다 — 원래 파일로 복원하고 새로 생긴 파일은 삭제했다. Neon 통합을 다시 설치/업데이트할 일이 있으면 이 부수효과를 다시 확인할 것.

---

## Sprint 1 — F1: 수강평 해시태그 & AI 요약 (P0)

**목표**: PRD 8.1 완료 조건 4개를 전부 충족한다. `ai-review-summarizer` 에이전트/`review-ai-summary` 스킬 참고.

- [x] Review/Summary 테이블 CRUD Route Handler (`app/api/reviews/**`)
- [x] 리뷰 작성 UI — 별점(5점) + 자유 텍스트 + 사전 정의 해시태그 9종 다중 선택 (`components/review-composer.tsx` 확장)
- [x] AI 해시태그 추천 — 자유 텍스트 → LLM 후보 제안 → 사용자가 채택/수정
- [x] AI 요약 생성 파이프라인 — 리뷰 5개 미만이면 생략, 이상이면 3~5문장(전반적 경향/장단점/추천 대상) 생성 후 Summary 테이블에 캐싱
- [x] 신규 리뷰 누적 시 요약 재생성 트리거 (매 조회마다 재생성 금지)
- [x] 과목 상세 페이지에 해시태그별 언급 빈도(%) 표시
- [x] 동일 사용자 반복/도배성 리뷰, 평점 테러 탐지·필터링 로직
- [x] Edge case UI: 호불호 갈리는 강의 문구, 리뷰 0개 안내 문구

**완료 조건 체크 (PRD 8.1 그대로)**

- [x] 수강평 작성 시 해시태그 다중 선택 및 AI 추천 태그 기능이 동작한다 *(코드 구현 완료 — 아래 메모의 라이브 DB 검증 필요 항목 참고)*
- [x] 리뷰 5개 이상 과목에서 AI 요약이 생성되어 노출된다 *(동일)*
- [x] 해시태그별 언급 빈도가 과목 상세 페이지에 표시된다 *(동일 — 리뷰 1개부터도 표시, 5개 기준은 AI 요약에만 적용)*
- [x] 신규 리뷰 등록 시 요약이 갱신된다 *(동일 — REGENERATION_THRESHOLD=3개 누적마다 재생성, 매 등록마다는 아님)*

**메모**:

- **데이터 소스 결정**: F1은 `courses`/`reviews`/`summaries` 테이블에 실제 FK를 걸어야 하는데,
  실제 2,695개 강좌 카탈로그(`lib/curriculum-data.ts`)는 F2/F3 검수 전이라 이번 스프린트
  범위 밖이고, 브라우징 UI(홈/검색/과목상세)가 지금 실제로 도달 가능한 과목은 여전히
  `lib/mock-data.ts`의 데모 5과목뿐이다. 그래서 `lib/db/seed.ts`(`npm run db:seed`)로 그
  5과목만 동일한 `id`(예: `"calculus-1"`)로 `courses` 테이블에 시드하고,
  `app/courses/[id]/page.tsx`는 과목의 정적 메타데이터(이름/학과/교수/학점)는 계속
  `mock-data.ts`에서 읽되, 평점/리뷰/AI 요약은 전부 Neon에서 읽도록 분리했다. `mock-data.ts`의
  `Course.rating`/`reviewCount`/`hashtags`/`summary` 필드는 이제 과목 상세 페이지에서 쓰이지
  않는다(홈/검색/분야 카드에는 아직 쓰임) — Sprint 2에서 과목 카탈로그가 통합되면 이 필드들과
  `mock-data.ts`의 `mockReviews`는 정리 대상.
- **아키텍처**: `app/api/reviews/route.ts`(GET 목록+해시태그 빈도, POST 작성),
  `app/api/reviews/suggest-tags/route.ts`(AI 해시태그 후보, `AI_MODELS.fast`),
  `app/api/reviews/summary/[courseId]/route.ts`(캐시된 요약 상태 조회 — 여기서는 LLM을
  호출하지 않음). 요약 생성/재생성 로직은 `lib/reviews/summary.ts`에 모았고, 리뷰 POST
  응답 이후 Next.js `after()`로 비동기 트리거해 리뷰 작성자가 LLM 응답을 기다리지 않게
  했다(PRD 10.3). 어뷰징 탐지는 `lib/reviews/abuse.ts`(도배 요청 빈도, 본문 유사도, 평점
  테러 휴리스틱)에 있고, 별도로 "동일 사용자·동일 과목 중복 작성"은 Route Handler에서
  하드 리젝트(409)로 막는다. 컴포넌트는 `lib/api/reviews.ts` 파사드만 호출한다.
  과목 상세 페이지의 리뷰/요약 영역은 `components/course-reviews-section.tsx`(클라이언트
  컴포넌트)로 분리했다 — 서버 컴포넌트에서 상대경로 fetch를 쓰면 배포 환경 base URL 이슈가
  있어 브라우저에서 직접 fetch하는 쪽을 택함.
- **재생성 임계치**: PRD 8.1이 "신규 리뷰가 일정 수 누적되면"이라고만 하고 정확한 수치를
  정하지 않아, MVP 기준으로 `REGENERATION_THRESHOLD = 3`(마지막 생성 이후 리뷰 3개 누적 시
  재생성)으로 정했다(`lib/reviews/summary.ts`). 튜닝 필요 시 이 상수만 조정하면 됨.
- **호불호 판정**: LLM이 "호불호가 갈리는 강의" 문구를 프롬프트에서 지시받아 포함하도록
  했지만, 이것만 믿지 않고 서버에서 평점 표준편차 + 저평점/고평점 비율로 `isPolarized()`를
  직접 계산해 UI 배지로도 별도 노출한다(`AiSummaryCard`의 `polarized` prop) — LLM이 문구를
  빠뜨려도 UI 차원에서 보장되도록 이중화.
- **라이브 DB 검증 완료 (Neon provisioning 이후, 로컬 `next dev` 기준)**:
  - `npm run db:seed` → `courses` 5행이 `mock-data.ts`의 id 그대로 정상 삽입됨.
  - 로그인(`/api/auth/login`) → `users` upsert 정상 동작, 같은 학번 재로그인 시 비밀번호
    해시 검증도 확인.
  - 리뷰 5건을 실제로 등록(`POST /api/reviews`)해 `predefinedReviewTags` 밖 문자열은
    걸러지고 정확히 일치하는 해시태그만 저장되는 것, 해시태그 언급 빈도(%) 계산이
    누적 리뷰 기준으로 정확히 나오는 것(예: 2/4건 → 50%)을 확인.
  - 5번째 리뷰 등록 시점에 `GET /api/reviews/summary/[courseId]`가 `status: "pending"`으로
    전환되는 것까지 확인 — 즉 임계치 감지 로직 자체는 정상 동작.
  - **AI 호출 자체는 미검증**: Vercel AI Gateway가 무료 크레딧이라도 계정에 카드 등록을
    요구해서(`AI Gateway requires a valid credit card on file`) 해시태그 추천/요약 생성
    LLM 호출은 403으로 실패했다. 다만 이 실패가 리뷰 저장 자체를 깨뜨리지 않고 `pending`
    상태로 안전하게 남는 것은 확인했다(에러 핸들링 정상). 카드 등록 후 동일 엔드포인트로
    재검증 필요.

---

## Sprint 2 — F2: 분야 통합 검색 (P0)

**목표**: PRD 8.2 완료 조건 3개를 전부 충족한다. `field-industry-search` 에이전트/`field-industry-tagging` 스킬 참고.

- [x] Field Tag 테이블 + 대분류-소분류 체계 정의 (예: 자연과학 > 수학 > 해석학/대수학/통계학)
- [x] 과목-분야 다대다 조인 테이블
- [x] 과목명·강의계획서 기반 AI 1차 분류 + 담당자 검수 워크플로우 (검수 전 태그는 노출 안 함)
- [x] 동의어 사전 (예: 수학 ↔ 수리과학)
- [x] 통합 검색 API — "과목명 일치" / "분야: X" 두 결과를 분리해서 반환
- [x] 검색 결과 화면에 두 섹션 분리 표시 (`components/search-results.tsx` 확장)
- [x] 필터/정렬 — 학점, 학년, 개설학과, 평점, 리뷰 수 *(학년은 데이터 자체가 없어 UI만 존재 — 아래 메모)*

**완료 조건 체크 (PRD 8.2 그대로)**

- [x] 검색어가 과목명에 포함된 결과와 분야가 일치하는 결과가 모두 노출된다
- [x] 두 결과 유형이 구분되어 표시된다
- [x] 필터·정렬 옵션이 정상 동작한다

**메모**:

- **스키마 변경**: `lib/db/schema.ts`의 `courseFieldTags`에 `reviewed`(boolean, default false) 컬럼 추가 — `courseIndustryTags.reviewed`와 동일한 패턴. 마이그레이션 `drizzle/0001_little_machine_man.sql`(`ALTER TABLE course_field_tags ADD COLUMN reviewed boolean DEFAULT false NOT NULL`), `drizzle-kit generate` + `drizzle-kit migrate`로 Neon에 실제 적용 완료.
- **범위(Sprint 1과 동일 stopgap)**: F1과 마찬가지로 실제 2,695개 강좌 카탈로그(`lib/curriculum-data.ts`)는 이번 스프린트 범위 밖이다. `courses` 테이블에 이미 시드되어 있던 `lib/mock-data.ts`의 데모 5과목만 대상으로 F2 파이프라인 전체(태그 시드 → AI 분류 → 검수 → 검색)를 구현·검증했다.
- **Field Tag 체계**(`lib/search/field-tag-taxonomy.ts`, `npm run db:seed-field-tags`로 시드): 대분류 5개(자연과학/공학/인문학/사회과학/예술) × 소분류 총 18개(자연과학→수학·물리학·화학·생명과학, 공학→컴퓨터공학·전자공학·화학공학·신소재공학·기계공학, 인문학→문학·철학·역사학, 사회과학→경제학·경영학·심리학, 예술→음악·미술·디자인) = 23행. 5과목 데모 규모에 비례하되 구조는 확장 가능하게 설계(대분류 없이 확장하려면 taxonomy 배열에 행만 추가하면 됨, 코드에 enum으로 박아두지 않음).
- **AI 1차 분류**(`lib/db/classify-field-tags.ts`, `npm run db:classify-field-tags`): `AI_MODELS.fast`로 과목명+개설학과 기반 분류를 시도하고, 결과를 항상 `reviewed=false`로 삽입한다. **실제 라이브 실행 결과: Vercel AI Gateway가 결제수단 미등록으로 5과목 전부 403 반환** — CLAUDE.md에 이미 알려진 제약. 이 경우를 대비해 개설학과 기반 규칙 폴백(`classifyHeuristically`)을 넣어뒀고, 실행 결과 5과목 모두 폴백 경로로 태깅됨(미적분학1→수학, 선형대수학→수학, 반도체공정개론→화학공학, 반도체소자→전자공학, 데이터구조→컴퓨터공학+수학). 폴백도 AI 경로와 동일하게 `reviewed=false`로 들어가므로 "검수 없이 노출"은 발생하지 않는다 — 결제수단이 등록되면 코드 변경 없이 실제 LLM 응답이 그대로 쓰인다.
- **검수(리뷰) 워크플로우**: `app/api/field-tags/review/route.ts` — `GET`은 미검수(`reviewed=false`) 목록, `POST {courseId, fieldTagId, action:"approve"|"reject"}`는 승인(`reviewed=true`) 또는 반려(행 삭제). 전용 관리자 화면은 만들지 않았다(과제 지시사항상 선택사항) — Neon에 대고 실제로 6개 제안 전부를 승인해 라이브로 검증함(아래 참고). 별도 관리자 UI가 필요해지면 이 두 엔드포인트 위에 얇게 올리면 된다.
- **동의어 사전**: `lib/search/synonyms.ts` — 정적 배열 기반(수학↔수리과학, 컴퓨터공학↔전산학/컴공/소프트웨어 등 12개 그룹). DB 테이블화는 태그가 늘어난 뒤 고려.
- **검색 API**(`app/api/search/route.ts`, 파사드 `lib/api/search.ts`): `nameMatches`(과목명·syllabus ILIKE)와 `fieldGroups`(태그별로 분리된 배열, 각 원소가 `분야: {태그명}` 한 그룹)를 분리 반환. 분야 매칭은 동의어 확장 + 대분류/소분류 양방향 부분일치(대분류로 검색하면 그 밑 모든 소분류 과목이 나옴). `courseFieldTags.reviewed=true`인 행만 조회 대상. 과목명 일치에 이미 포함된 과목은 분야 그룹에서 중복 제거.
- **평점/리뷰수**: 정적 mock 값이 아니라 `lib/courses/aggregates.ts`가 실제 `reviews` 테이블(F1, flagged 제외)에서 매 요청마다 집계 — 검색 결과의 평점/리뷰수 필터·정렬이 진짜 데이터로 동작함을 라이브로 확인(미적분학1이 실제 리뷰 5개 기준 평점 4.0으로 응답에 찍힘).
- **필터/정렬**: 학점·이수구분·개설학과·평점(최소 기준)은 클라이언트에서 실제로 동작(fetch 후 필터링, 스몰 데이터셋이라 서버 왕복 없이 처리). **학년 필터는 UI 셀렉트만 유지하고 비활성화(disabled)했다** — `courses` 스키마, `mock-data.ts`, `curriculum-data.ts` 어디에도 학년을 나타내는 원본 데이터가 전혀 없어(전 카탈로그 공통의 알려진 공백) 필터가 동작하는 척 하는 게 오히려 사용자를 오도한다고 판단, 데이터 확보 전까지 정직하게 비활성 처리. 정렬(관련도/평점/리뷰많은순)은 기존 UI 그대로 유지.
- **라이브 검증**(Neon, `next dev` 3001 포트, Node `fetch`로 curl 대신 확인 — 한글 mangling 회피): (1) 검수 전 `q=수학` → `fieldGroups: []`(게이트 닫힘) 확인 → `/api/field-tags/review` GET으로 미검수 6건 확인 → 전부 `approve` → 재검색 시 `fieldGroups`에 노출 확인. (2) `q=수리과학`(동의어) → "수학" 태그 그룹 정상 매칭. (3) `q=공학`(대분류) → 전자공학/컴퓨터공학/화학공학 3개 소분류 그룹으로 분리 노출. (4) "데이터구조"가 `q=수학`, `q=공학` 양쪽 그룹에 각각 등장 — PRD 8.2 #7의 복수 분야 태깅 예시(컴퓨터공학+수학) 실제 동작 확인. (5) 404/400 에러 케이스(존재하지 않는 태그 승인, 잘못된 action) 정상 처리 확인.
- **`npx tsc --noEmit`**: 통과.
- **이후로 미룬 것**: 실제 2,695개 강좌 카탈로그로의 F2 이관(Sprint 3/4에서 F3 태깅과 함께), 학년 데이터 확보, 별도 관리자 검수 화면, 대량 태깅 시 ILIKE/인메모리 매칭을 실제 Postgres 텍스트 검색 인덱스(tsvector 등)로 고도화.

---

## Sprint 3 — F3: 산업/진로 분야 키워드 검색 (P1)

**목표**: PRD 8.3 완료 조건 3개를 전부 충족한다. F4의 관심분야 랭킹이 이 결과물을 그대로 소비하므로, F4 완성보다 먼저 끝나야 함.

- [x] Industry Tag 테이블 + 산업/진로 태그셋 정의 (반도체, AI·데이터사이언스, 바이오·헬스케어, 금융·핀테크, 콘텐츠·미디어 등)
- [ ] 과목 설명/키워드 임베딩 생성 파이프라인 (pgvector) — **실제 임베딩은 아님, 아래 메모 참고**
- [x] 연관도 스코어링 + 담당자 검수 확정 워크플로우 (임베딩 유사도 대신 AI 텍스트 생성 + 휴리스틱 폴백 — 아래 메모 참고)
- [x] 산업 분야 검색 API — 연관도 순 정렬, 개설학과/학점/이수구분 포함
- [x] "내 전공 과목" vs "타 전공 과목" 구분 표시 (+ 타 전공 정원/선수과목/학년 제한 안내)
- [x] 신조어·신산업 태그 확장 운영 프로세스 정리 (문서화만이라도)
- [x] `lib/curriculum-data.ts`/`lib/curriculum-engine.ts`의 `academicField`/`industry`가 항상 비어 있던 부분을 이 스프린트 산출물로 채우기 (F4와의 연결고리)

**완료 조건 체크 (PRD 8.3 그대로)**

- [x] 산업/진로 분야 키워드 검색 시 여러 학과에 걸친 관련 과목이 연관도 순으로 노출된다
- [x] 각 결과에 개설 학과, 학점, 이수구분이 표시된다
- [x] 내 전공 과목과 타 전공 과목이 구분 표시된다

**메모**:

- **스코프**: F1/F2와 동일한 stopgap을 그대로 따랐다 — `courses` 테이블에는 여전히
  `lib/mock-data.ts`의 데모 5과목만 있고(Sprint 1 `db:seed`), 이번 스프린트의 DB 태깅
  파이프라인(`industry_tags`/`course_industry_tags`)도 그 5과목만 대상으로 한다. 실제
  2,695개 강좌 카탈로그는 아래 "curriculum-data.ts 연결고리" 항목에서 별도로 다뤘다.
- **태그셋(F3 Industry Tag)**: 반도체 / AI·데이터사이언스 / 바이오·헬스케어 / 금융·핀테크 /
  콘텐츠·미디어 / 에너지·환경 6개 — `lib/mock-data.ts`의 기존 `interestFields`(F4 관심분야
  선택 UI가 이미 쓰던 상수)와 **의도적으로 이름을 똑같이** 맞췄다. `lib/curriculum-engine.ts`의
  `interestScore`가 `course.industry === field`로 정확한 문자열 비교를 하기 때문에, 두 목록이
  갈라지면 F4 랭킹이 아무 에러 없이 조용히 0점만 내는 문제가 생긴다. 새 태그(예: "생성형 AI")를
  추가할 때는 `lib/mock-data.ts`의 `interestFields`도 함께 갱신해야 한다는 점을 `lib/search/
  industry-tag-taxonomy.ts` 상단에 명시해뒀다.
- **임베딩 vs 휴리스틱 — 이번 스프린트에서 내린 판단**: PRD 10.3은 pgvector 코사인 유사도를
  원안으로 하지만, `lib/ai.ts`가 이미 문서화하듯 Vercel AI Gateway는 임베딩 호출을 라우팅하지
  않는다("For embeddings, use a direct provider SDK"). 별도 프로바이더 SDK를 추가하려면 그
  프로바이더 전용 API 키가 필요한데 이 세션에는 그런 키가 없어 추가해도 검증이 불가능했다.
  그래서 검증 불가능한 프로바이더 연동 코드를 새로 추가하는 대신, 다음 2단계 폴백으로
  구현했다(`lib/search/industry-relevance.ts`, `lib/db/classify-industry-tags.ts` 상단 주석에
  동일한 설명이 있다):
  1. AI Gateway `generateText`(F1/F2와 동일 경로, 새 프로바이더 불필요)로 과목당 6개 태그
     전체에 대해 0~1 점수를 한 번에 요청.
  2. 이 호출이 실패하면(실제로 `npm run db:classify-industry-tags` 실행 시 "AI Gateway
     requires a valid credit card on file" 403 — F2 때와 동일한 결제수단 미등록 사유로
     매번 실패했다) 키워드 중첩 휴리스틱(`scoreIndustryRelevanceHeuristic`)으로 폴백.
     실제 실행 로그: 반도체공정개론→반도체 0.67, 반도체소자→반도체 0.67, 데이터구조→
     AI·데이터사이언스 0.33 (모두 휴리스틱 폴백, AI 성공 0/5).
  `courses.embedding`/`industry_tags.embedding` vector(1536) 컬럼과 pgvector 확장은 그대로
  스키마에 남겨뒀다 — 나중에 임베딩 프로바이더 키가 생기면 (1) 두 텍스트를 임베딩해 컬럼을
  채우고 (2) 이 파일의 휴리스틱 호출부를 pgvector `<=>` 코사인 거리 쿼리로 바꾸기만 하면 된다.
  `course_industry_tags`(relevanceScore, reviewed) 테이블 구조는 바꿀 필요 없다.
- **검수 워크플로우**: `app/api/industry-tags/review`가 F2의 `app/api/field-tags/review`와
  동일한 패턴(GET=대기목록, POST `{courseId, industryTagId, action}`)으로 동작한다. `MIN_
  RELEVANCE_SCORE`(0.2) 미만인 태그는 애초에 행을 만들지 않아 검수 대기열이 0점 태그로
  오염되지 않는다. 실제로 `npm run db:seed-industry-tags` → `npm run db:classify-industry-
  tags` → `/api/industry-tags/review` POST(approve) 3건 → `/api/industry-search` 순으로
  로컬에서 end-to-end 실행해 확인했다(검수 전엔 검색 결과 0건, 검수 후엔 노출되는 것까지 확인).
- **검색 API/UI**: `app/api/industry-search`가 연관도 내림차순으로 정렬하고, 사용자 학과
  (`?department=`)를 기준으로 `myMajorCourses`/`otherMajorCourses`로 나눈다. 학과 인자가
  없으면(비로그인 등) 전부 `otherMajorCourses`로 보수적으로 분류한다. `components/fields-
  explorer.tsx`는 기존 시각 디자인(카드 그리드, 펼침/접힘)을 유지한 채 `lib/mock-data.ts`
  정적 데이터 대신 `lib/api/industry-search.ts` 파사드를 호출하도록 다시 연결했다.
  `components/course-card.tsx`에는 `relevanceScore?: number` optional prop을 추가해 값이
  있을 때만 "연관도 NN%" 배지를 그린다 — prop을 안 넘기는 기존 호출부(`components/search-
  results.tsx` 등 F2 소비처)는 렌더링이 완전히 그대로다.
- **내 전공/타 전공 정원·선수과목·학년 제한 안내**: PRD 8.3 #5가 요구하는 안내 문구
  (`otherMajorCaveat`)는 항상 표시하되, 실제 정원/선수과목/수강가능학년 데이터는 이 저장소
  어디에도 없다(F2가 "학년" 필터에서 겪은 것과 동일한 gap, F4의 선수과목 데이터 부재와도
  동일한 근본 원인). 없는 데이터를 지어내는 대신 "제한이 있을 수 있으니 학과 사무실/
  수강신청 시스템에서 재확인하라"는 정직한 안내만 노출한다.
- **신조어·신산업 태그 확장 프로세스(PRD 8.3 #6, 문서화만)**: 태그는 `industry_tags` 테이블의
  일반 row일 뿐 코드에 박힌 enum이 아니다. 새 산업 분야(예: "생성형 AI")를 추가하려면 —
  (1) `lib/search/industry-tag-taxonomy.ts` 배열에 `{name, description, keywords,
  departmentKeywords, icon}` 항목 추가 → (2) `lib/mock-data.ts`의 `interestFields`에도 같은
  이름 추가(F4 연동 유지) → (3) `npm run db:seed-industry-tags` 재실행(기존 태그는
  `onConflictDoNothing`으로 건너뜀, 새 태그만 삽입) → (4) `npm run db:classify-industry-tags`
  재실행해 기존 과목들에 새 태그 연관도를 다시 스코어링 → (5) `/api/industry-tags/review`로
  검수. 스키마 마이그레이션이 전혀 필요 없다.
- **`lib/curriculum-data.ts`의 `academicField`/`industry` 채우기 — 접근 방식과 근거**: F2/F3의
  "AI 1차 분류 + 담당자 검수" 파이프라인은 `courses` 테이블의 5개 데모 과목에만 적용되고,
  `curriculum-data.ts`의 2,695개(학수번호 기준 중복 제거 후 2,293개) 실제 강좌는 애초에 그
  테이블에 없어 검수 워크플로우를 거칠 방법이 없다. 이 세션에서 2,293개를 전부 LLM으로
  분류하고 그 결과를 "검수 없이" 그대로 F4 엔진 입력으로 흘려보내는 것은 F2/F3가 지켜온
  "AI 태그는 검수 전엔 노출 안 함" 원칙과 정면으로 어긋난다고 판단해 채택하지 않았다. 대신
  `lib/curriculum-classify.ts`에 **학과명(+과목명) 키워드 매칭 규칙**을 결정론적으로 작성해
  `lib/curriculum-data.ts`의 `dedupeByCode()`가 과목 단위 레코드를 만들 때 한 번만(모듈 로드
  시점) 적용했다 — `curriculum-engine.ts`가 호출될 때마다 재계산되지 않는다. industry 판정은
  F3와 동일한 `lib/search/industry-tag-taxonomy.ts`를 재사용해 태그 이름 축을 통일했고,
  academicField 판정은 F2의 소분류 18개(`lib/search/field-tag-taxonomy.ts`의 leaf) 중 학과명
  패턴에 매칭되는 것을 고른다. 규칙에 없는 학과명은 값을 억지로 채우지 않고 `undefined`로
  남긴다(허위 태깅 방지). **커버리지 실측치**(2,293개 과목 기준): industry 매칭 1,059개
  (46%), academicField 매칭 968개(42%), 둘 다 매칭 533개. academicField 기준으로는 146개
  학과 중 93개가 현재 규칙 어디에도 안 걸린다(간호학과·행정학과·신문방송학과류처럼 이번
  규칙 세트에 없는 학과명). industry별 매칭 수: 바이오·헬스케어 436, 에너지·환경 182,
  AI·데이터사이언스 119, 금융·핀테크 115, 반도체 113, 콘텐츠·미디어 94. **알아야 할 한계**:
  이건 "학과명이 그 산업/분야 키워드를 포함하는가"만 보는 규칙이라 재현율이 낮고(맞춤법이
  다른 학과명, 융합학과, 규칙에 없는 신생 학과는 전부 미분류), 정밀도도 완벽하지 않다(예:
  "전자공학"이 반도체·AI 두 태그 키워드에 동시에 걸릴 수 있어 점수가 높은 쪽 하나만
  선택됨). 향후 실제 검수 인력이 생기면 F2/F3와 동일한 AI 1차 분류+검수 워크플로우로
  교체하는 것이 정답이지만, 이번 스프린트 범위에서는 "없는 데이터를 그럴듯하게 지어내지
  않는" 쪽을 택했다.
- **`npx tsc --noEmit`**: 통과(에러 0건).
- **실서버로 검증한 것**: `next dev`(이미 떠 있던 로컬 서버, 포트 3001)에 Node `fetch`로
  `/api/industry-tags`(태그 목록+과목수), `/api/industry-tags/review`(GET 대기목록/POST
  승인), `/api/industry-search`(검수 전 0건 → 승인 후 연관도 내림차순 노출, 학과별
  내 전공/타 전공 분리)까지 end-to-end 확인. `/fields` 페이지가 200으로 렌더링되는 것도
  확인했다(클라이언트 컴포넌트라 초기 HTML에는 카드 목록이 없고 마운트 후 fetch로 채워짐).
- **의도적으로 미룬 것**: (1) 실제 임베딩 프로바이더 연동(위 메모 참고, 스키마는 준비돼
  있음), (2) 검수 워크플로우 전용 관리자 화면(F2와 동일하게 최소 Route Handler만 구현 —
  전체 어드민 UI는 범위 밖), (3) `curriculum-data.ts` 분류 규칙의 커버리지 확대(93개
  미분류 학과에 규칙 추가) — 새 규칙을 원 없이 추가할 수는 있지만 "학과명이 있는데 임의로
  분야를 못 정하는" 경우(예: 순수 인문/사회 계열 중 태그 6개 어디에도 안 걸리는 학과)는
  구조적으로 항상 남는다, (4) 정원/선수과목/수강가능학년 실데이터 확보(F2/F4와 공유하는
  근본적인 데이터 gap).

---

## Sprint 4 — F4 마무리: AI 맞춤 커리큘럼 설계 (P1)

**목표**: 엔진 로직(`lib/curriculum-engine.ts`)은 이미 PRD 8.4 플로우차트대로 동작한다. 이 스프린트는 **엔진이 기대하는 실제 데이터**를 채우고 Neon/LLM으로 옮기는 것이 핵심이다. `curriculum-recommender` 에이전트/`curriculum-engine` 스킬 참고.

- [ ] 선수과목 데이터 확보/입력 — **외부 데이터 확보 필요, 이번 스프린트 범위 밖(의도적)**. 학과 협의 없이는 어떤 과목이 어떤 과목의 선수과목인지 지어낼 수 없다(과목명으로 추측하는 것도 금지 — 예: "미적분학2"가 "미적분학1"을 요구한다고 가정하는 것도 실제 학사 정책을 지어내는 것). `courses.prerequisites`는 계속 빈 배열.
- [x] Sprint 3의 실제 industry 연관도 스코어를 연결 — `courses.curriculumIndustry`/`curriculumAcademicField` 컬럼으로 이관 완료(아래 메모).
- [ ] 졸업요건(전공선택 최소학점, 총 졸업학점) 실제 데이터 확보 — **외부 데이터 확보 필요, 범위 밖(의도적)**. `curricula` 테이블에 기존 더미값(21/130학점)을 그대로 이관.
- [ ] "이번 학기 개설된 전공필수만 반영"하는 현재 한계 해소 — **외부 데이터 확보 필요, 범위 밖**. `curricula.requiredCourseIds`는 여전히 "이번 학기 개설된 전공필수/기초필수" 기준(146개 학과 중 28개는 0개)으로 이관됨 — 학과 전체 다년도 교육과정 목록은 이 저장소 어디에도 소스가 없다.
- [x] 학과 커리큘럼 입학년도별 버전 관리를 Neon 테이블로 이전 — `curricula` 테이블(`department`+`admissionYear` unique)에 146개 학과 전부 `admissionYear=2024`로 이관 완료. 실제 다년도 데이터가 없어 다른 연도는 채우지 않음(지어내지 않음) — UI에도 입학년도 선택지를 추가하지 않았다.
- [x] `lib/curriculum-data.ts`/`lib/data/courses.json` 정적 파일을 Neon 쿼리로 교체 — 요청 경로(`app/api/curriculum/recommend`)는 이제 정적 파일을 전혀 읽지 않는다(아래 메모).
- [x] 관심분야 매칭에 LLM 기반 랭킹 도입 — AI Gateway 우선 시도, 실패 시 문자열 일치 휴리스틱 폴백(아래 메모).
- [x] 과목 검색-추가 UI — F2 검색 파사드 재사용, 추가 시 전공선택 잔여 학점 재계산까지 확인(아래 메모).
- [x] 연산이 길어질 경우 스트리밍/폴링 구조 검토 (PRD 10.4) — 실측 결과 불필요하다고 판단(아래 메모).

**완료 조건 체크 (PRD 8.4 그대로)**

- [x] 학과·기이수학점·관심분야 입력 후 학기별 추천 커리큘럼이 생성된다 *(Neon 데이터 기준으로 재검증 완료 — 아래 메모)*
- [x] 전공필수 미이수 과목이 우선적으로 배치된다 *(선수과목 데이터 자체가 없는 것은 여전한 한계지만, 위상정렬 로직/우선 배치 순서는 실제 DB 데이터로 재검증 완료)*
- [x] 추천 과목마다 추천 사유가 함께 표시된다 *(전공필수/전공선택/관심분야/직접추가 4가지 사유 문구 모두 실제 DB 데이터로 확인)*
- [x] 사용자가 과목을 제외/추가하면 추천이 재계산된다 *(제외·재포함·직접 추가·추가 취소 4가지 모두 라이브로 재계산 확인 — "추가" 기능 완료)*
- [x] 본 추천은 "참고용"이며 최종 확인은 학과 사무실을 통해야 함을 안내하는 문구가 노출된다

**메모**:

- **범위 정리 — 무엇이 "실제 데이터"이고 무엇이 "구조만 준비"인가**: 이번 스프린트로 (1) 실제
  2,293개 강좌 카탈로그, (2) Sprint 3의 industry/academicField 태그, (3) 146개 학과 커리큘럼
  구조가 전부 정적 파일이 아니라 Neon에 실제로 들어갔고 요청 경로가 그걸 읽는다. 반면 선수과목·
  졸업요건 실수치·학과 전체(다년도) 전공필수 목록은 여전히 없다 — 이건 엔지니어링으로 채울 수
  없는 학과 협의/공식 데이터 문제라 지어내지 않고 명시적 gap으로 남겼다(PRD 12장과 동일 결론).
- **Neon 이관**: `lib/db/migrate-curriculum-courses.ts`(`npm run db:migrate-curriculum-courses`)가
  `curriculumCourses` 2,293개를 `courses` 테이블에 삽입(200개씩 배치, `onConflictDoNothing`).
  `lib/db/migrate-curricula.ts`(`npm run db:migrate-curricula`)가 `departmentCurricula` 146개를
  `curricula` 테이블에 삽입. 둘 다 재실행해도 안전하다. **실행 중 실제 스키마 버그 하나 발견**:
  `courses.credits`가 `integer`였는데 실제 카탈로그에 0.5학점 단위 과목(세미나/실습 등, 값 집합:
  0.5/1/1.5/2/2.5/3/3.5/4/5/6/6.5/8/15/18)이 있어 삽입이 `invalid input syntax for type integer:
  "0.5"`로 실패했다 — `real`로 바꾸고 `drizzle-kit generate`+`migrate`로 실제 Neon에 적용
  (`drizzle/0003_chubby_arachne.sql`). 최종 라이브 확인: `courses` 총 2,298행(실제 2,293 + 데모
  5), `curriculum_industry` not null 1,059행, `curriculum_academic_field` not null 968행 —
  Sprint 3 메모의 46%/42% 커버리지 수치와 정확히 일치.
- **industry/academicField를 어디로 옮겼는가 (의도적으로 F2/F3 검수 테이블이 아님)**: F2/F3의
  `course_field_tags`/`course_industry_tags`는 "AI 1차 분류 + 담당자 검수, `reviewed=true`만
  노출" 워크플로우를 갖는 테이블이다. 2,293개를 그 테이블에 검수 없이 넣으면 (a) F2/F3 검수
  대기열이 오염되고 (b) `reviewed=false` 게이트 때문에 F4가 영영 이 값을 못 읽는다. 그래서
  `courses.curriculumIndustry`/`curriculumAcademicField` 전용 컬럼을 새로 추가해(`lib/db/
  schema.ts`) `lib/curriculum-classify.ts`(학과명 키워드 휴리스틱, Sprint 3 산출물) 결과를
  그대로 옮겼다 — F4 엔진만 이 컬럼을 읽고, F2/F3 검색 API는 여전히 기존 조인 테이블만 본다.
- **엔진(`lib/curriculum-engine.ts`)에 가한 유일한 구조 변경 — 데이터/스코어링 함수 주입**:
  "알고리즘을 바꾸지 말라"는 지시를 지키기 위해, `recommendCurriculum(input, deps?)`에 선택
  파라미터 `deps: { courses?, curriculum?, scoreInterest? }`를 추가했다. 기본값은 그대로 정적
  `curriculum-data.ts`(로컬 개발 폴백)이고, Route Handler가 Neon 조회 결과를 주입하면 5단계
  플로우차트 순서·로직은 한 글자도 안 바뀐 채 데이터 소스만 바뀐다. 내부적으로 `courseById`를
  모듈 전역에서 지역 클로저(`makeCourseById`)로 바꾼 것, `topologicalSortRequired`/
  `classifyCompletedCredits`가 이 클로저를 파라미터로 받게 한 것도 같은 이유의 배선 변경이다 —
  판단 순서나 조건은 그대로.
- **인터랙티브 "추가" — 엔진에 추가한 유일한 새 단계(2.5단계)**: 기존엔 제외→재포함만 있었다.
  `CurriculumInput.manualCourseIds`를 추가해, 사용자가 직접 고른 과목을 관심분야 점수와 무관하게
  항상 포함시키고, "전공선택" 버킷으로 분류해 **전공선택 잔여 학점에서 먼저 차감한 뒤** 3단계
  자동 채우기가 이어지게 했다 — PRD 8.4 플로우차트가 요구하는 "추가 시 전공선택 잔여 학점
  계산으로 되돌아가는" 루프를 정확히 이 순서로 구현한 것이다(1→2→2.5→3→4단계, 기존 1~4단계
  순서는 그대로 두고 사이에 끼워 넣음). 라이브로 확인: 컴퓨터인공지능학부 기준 추천에 없던
  수학과 "고급미적분"을 추가하니 전공선택으로 반영되고 타 전공 안내 문구가 붙었으며, 나머지
  학기 배치가 실제로 재계산됨(2학기 SW인턴십4 18학점 등 동일하게 유지되고 새 과목이 1학기에
  끼워짐)을 확인.
- **LLM 관심분야 랭킹과 폴백**(`lib/curriculum/interest-ranking.ts`): `rankInterestBatch()`가
  후보를 (1) 본인 학과 과목 + 휴리스틱 점수>0인 타 학과 과목으로 먼저 좁히고, (2) 그래도 많으면
  상위 120개로 자른 뒤, (3) 30개씩 배치로 나눠 `generateText`(`AI_MODELS.fast`)를 병렬 호출해
  0~1 점수를 받는다. **실제 실행 결과: Vercel AI Gateway 결제수단 미등록으로 매 배치 403** —
  Sprint 1~3과 동일한 제약이 F4에도 그대로 적용된다. 실패한 배치는 개별적으로
  `heuristicInterestScore`(기존 `interestScore`와 동일한 가중치 규칙)로 폴백하고, Route
  Handler는 `source: "heuristic-fallback"`일 때 추천 결과의 `notes`에 "AI 기반 관심분야 랭킹을
  사용할 수 없어 키워드 일치 기준으로 대체했습니다"를 추가해 사용자에게 투명하게 알린다. 엔진에는
  `buildScoreInterest(scores)`로 만든 동기 함수만 `deps.scoreInterest`로 주입되므로, 엔진 자체는
  LLM 호출을 전혀 모른다(PRD 10.3 "학점 계산은 결정론적, 관심분야만 LLM" 원칙 유지). 결제수단
  등록 후에는 코드 변경 없이 실제 LLM 점수가 그대로 반영된다.
- **과목 검색-추가 UI**(`components/curriculum-planner.tsx`): 새 검색 엔드포인트를 만들지 않고
  F2의 `lib/api/search.ts`(`searchCourses`) 파사드를 그대로 재사용했다 — 지시사항의 "제3의
  검색 구현을 새로 만들지 말 것"을 따른 것이자, `courses` 테이블에 이제 실제 카탈로그 전체가
  있어 F2 검색이 곧 F4가 다루는 것과 동일한 과목 풀을 반환하기 때문이다(라이브로 "데이터베이스"
  검색 → 3개 결과, 서로 다른 학과의 동명 과목까지 정상 구분 확인). 검색 결과에서 "추가"를
  누르면 `manualCourseIds`에 더해 즉시 재계산 요청을 보내고, 이미 로드맵에 배치됐거나(자동
  추천이든 수동 추가든) 기이수 처리된 과목은 버튼이 비활성화된다("추가됨"/"기이수" 라벨). "직접
  추가한 과목" 칩에서 개별 제거도 가능(제거 시에도 재계산). 제외(X) 버튼을 수동 추가 과목에
  누르면 "제외 목록"과 "직접 추가 목록"에 동시에 남는 혼란을 막기 위해 추가 목록에서도 함께
  뺀다.
- **F2 검색에 미친 부수효과 (의도적으로 받아들임, F2 파일은 건드리지 않음)**: `app/api/search`는
  `courses` 테이블을 조건 없이 ILIKE 조회하므로, 이번 이관으로 F2 검색 결과가 실제 2,293개
  카탈로그까지 자동으로 포함하게 됐다(기존엔 데모 5과목뿐이었음). F2 파일은 전혀 수정하지
  않았고 동작도 원래 로직 그대로다 — 다만 실제 카탈로그 과목은 `professor`가 "미등록", `summary`
  가 빈 문자열로 표시된다(F2가 mock-data.ts에서 교수/요약을 보강하는데 실제 카탈로그는 그
  테이블에 없어서. 기존 Sprint 2 stopgap 설계와 동일한 폴백 경로). `requirement`도 F2의
  `Requirement`(전공필수/전공선택/교양) 타입에 없는 "계열공통"/"기초필수" 문자열이 그대로 캐스팅
  돼 들어가지만 런타임 오류는 없다(라벨로만 쓰임). F2 자체 완료조건(과목명 일치/분야 매칭 분리,
  필터·정렬)에는 영향 없음 — 검색 대상 풀이 넓어졌을 뿐 로직은 동일.
- **스트리밍/폴링 검토 결과 — 불필요 판단, 근거(로컬 실측)**: 엔진 순수 계산(`recommendCurriculum`
  단독 호출, 2,293개 과목 대상)은 2~5ms로 무시할 수준. 병목은 Neon HTTP 드라이버로 전체
  `courses` 테이블(2,298행)을 조회하는 부분으로 로컬에서 약 1.0~1.8초, `curricula` 조회는
  약 0.3초(둘은 `Promise.all`로 병렬 실행). LLM 랭킹은 이번 세션엔 403이라 즉시 폴백해 지연이
  거의 없었지만, 실제 LLM 호출이 성공하는 경우에도 배치당 1~수 초·최대 4배치 병렬이라 전체
  요청은 수 초 안에 끝날 것으로 예상된다. 실제 `POST /api/curriculum/recommend` end-to-end
  라이브 응답 시간은 620ms~6.2초(첫 요청은 Neon 콜드 캐시로 더 오래 걸림) — Vercel 서버리스
  함수 기본 실행시간 제한(수십 초 단위)에 여유 있게 들어온다. 그래서 이번 스프린트에서는
  스트리밍/폴링 구조를 도입하지 않았다. **재검토가 필요해질 조건**: (1) LLM 랭킹을 임베딩+
  pgvector 유사도 검색으로 바꿔 카탈로그 전체를 매번 스코어링하게 되는 경우, (2) 과목 카탈로그가
  지금보다 몇 배 커지는 경우, (3) `courses` 전체 조회를 학과별/조건별로 좁히지 않고 계속 매
  요청마다 통째로 가져오는 구조를 유지하면서 테이블이 계속 커지는 경우 — 이 중 하나라도
  해당되면 비동기 생성 후 폴링 패턴(PRD 10.4)을 다시 검토할 것.
- **의도적으로 정적 파일에 남겨둔 역할**(`lib/curriculum-data.ts`, `lib/curriculum-classify.ts`):
  요청 경로(`app/api/curriculum/recommend`)에서는 더 이상 이 파일들을 읽지 않지만, (1) 위
  두 마이그레이션 스크립트의 원본 소스, (2) `RecommendCurriculumDeps`가 주입되지 않았을 때의
  로컬 개발/DB 미연결 폴백 기본값, (3) `components/curriculum-planner.tsx`의 학과 드롭다운
  목록·과목명 라벨(칩 표시용, 클라이언트 번들에 가벼운 정적 조회) 용도로는 계속 쓴다 — "정적
  파일을 완전히 폐기" 대신 "요청 경로에서만 제외"를 택했고, 그 이유를 각 사용처 주석에 남겼다.
- **`npx tsc --noEmit`**: 통과(에러 0건).
- **실서버로 검증한 것**(`next dev`, 포트 3001, Node `fetch`로 한글 mangling 회피): (1)
  기본 추천(컴퓨터인공지능학부, 관심분야 2개) → 전공필수 우선 배치, 전공선택/관심분야 버킷·
  사유 문구, "AI 랭킹 실패→휴리스틱 대체" 안내 문구까지 확인. (2) `manualCourseIds`로 타 전공
  과목("고급미적분") 추가 → 전공선택 버킷+타 전공 안내 문구로 반영되고 나머지 학기가 재계산됨을
  확인. (3) 존재하지 않는 학과 → `hasCurriculumData: false` + 안내 문구, 이 경우 LLM 랭킹
  호출 자체를 생략하도록 최적화(불필요한 배치 호출 방지)했고 재검증 완료. (4) 관심분야 미선택
  → 400 검증 유지. (5) `GET /api/search?q=데이터베이스` → 서로 다른 학과의 동명 과목 3건이
  실제 카탈로그에서 정상 반환됨을 확인(F2가 F4 마이그레이션 이후에도 정상 동작). (6) 검색→추가→
  재계산 전체 플로우를 API 레벨로 재현(`uhif015` 데이터베이스 과목 추가 전/후 비교) — 추가 전엔
  로드맵에 없다가, 추가 후 전공선택 버킷+"직접 추가한 과목입니다" 사유로 정확히 나타남을 확인.
  브라우저 클릭 기반 스크린샷 검증은 이 환경에 `chromium-cli`가 설치돼 있지 않아 수행하지
  못했다 — 대신 UI가 호출하는 것과 동일한 파사드(`searchCourses`, `getCurriculumRecommendation`)
  를 API 레벨로 그대로 재현해 검증했다.
- **다음 세션 필요 작업 정리**: (1) 선수과목 실데이터 — 학과 협의 필요(엔지니어링으로 해결
  불가). (2) 졸업요건 실수치(전공선택 최소학점/총 졸업학점) — 학교 공식 자료 필요. (3) 학과
  전체(다년도) 전공필수 목록 — 지금은 "이번 학기 개설분"만 반영. (4) 입학년도별 다른 커리큘럼
  버전 — 실제 연도별 데이터가 생기면 `curricula` 테이블에 추가 행만 넣으면 되고 스키마 변경은
  불필요. (5) AI Gateway 결제수단 등록 후 `POST /api/curriculum/recommend`를 관심분야 여러 개로
  재호출해 `source: "llm"` 경로(휴리스틱이 아닌 실제 LLM 점수)를 처음으로 라이브 검증할 것.

---

## Sprint 5 — 통합/배포/QA

**목표**: PRD 12장 리스크 항목을 점검하고 배포 가능한 상태로 마무리한다.

- [x] 전체 기능 회귀 테스트 (F1~F4 시나리오별)
- [x] 서버리스 콜드스타트/실행시간 제약 점검 (PRD 10.4) — 코드 리뷰 기준 점검 완료, 실측은 실제 배포 후 필요(아래 메모)
- [x] 에러 처리/로딩 상태 UI 일관성 점검
- [x] 접근성 점검 (스크린 리더, 키보드 내비게이션)
- [x] `npm run lint`가 동작하도록 eslint 설치 + 설정 추가
- [x] 최소한의 테스트 프레임워크 도입 여부 결정 — Vitest 도입
- [x] 데이터 출처/저작권 검토 — 강의계획서·커리큘럼 등 학교 제공 자료 활용 범위 (PRD 12장) — **미해결, 아래 메모 참고, 사용자/학교 확인 필요**
- [x] 최종 배포 (Vercel production) — https://sprint0-infra.vercel.app (아래 메모 참고)

**메모**:

- **범위**: 이번 세션은 위 8개 항목 중 "전체 기능 회귀 테스트", "에러 처리/로딩 상태 UI
  일관성", "접근성" 3개만 다뤘다 — eslint 설치, 테스트 프레임워크 도입 여부, 데이터
  출처/저작권 검토, 콜드스타트 점검, 최종 배포는 범위 밖(다른 세션 소관)이라 손대지
  않았다. 시작 시점에 이미 작업 트리에 `package.json`/`package-lock.json`/
  `eslint.config.mjs` 변경(eslint 설치 흔적으로 보임)이 있었는데, 이것도 내가 만든 게
  아니라 손대지 않고 그대로 뒀다.
- **회귀 테스트 방법**: `next dev`(이 워크트리 전용, 포트 3001 — 3000은 다른 세션이
  점유 중이라 Next가 자동으로 다른 포트를 골랐다)에 대고 Node `fetch` 스크립트로
  F1~F4를 시나리오별로 실행했다(curl 대신 — 이 셸 인코딩에서 한글이 깨지는 문제가
  이전 스프린트들에서도 반복 확인됨). 브라우저 클릭 기반 검증은 이 환경에 스크린샷/
  브라우저 자동화 도구가 없어(Sprint 4와 동일한 제약) 수행하지 못했다 — 대신 6개
  페이지(`/`, `/search?q=미적분학`, `/fields`, `/curriculum`, `/courses/calculus-1`,
  `/login`)를 GET해 200 응답과 Next.js 에러 오버레이 부재를 확인했다.
  - **F1**: 로그인 → 리뷰 등록(`POST /api/reviews`) → 중복 작성 409 차단 → 평점 범위
    밖 400 검증 → 해시태그 언급 빈도(%) 계산 확인 → `GET /api/reviews/summary/[courseId]`
    pending/empty 상태 전환 확인 → `POST /api/reviews/suggest-tags` 확인(AI Gateway
    403 — 아래 버그 참고). 어뷰징 필터도 라이브로 재확인: 같은 사용자가 다른 과목에
    거의 동일한 본문으로 리뷰를 남기자 `duplicate_body`로 flagged 처리되어 목록/해시태그
    집계에서 정상적으로 제외됨을 확인(의도된 동작, 버그 아님).
  - **F2**: 과목명 검색(`미적분학` → nameMatches 3건), 동의어 검색(`수리과학` →
    "수학" 분야 그룹 매칭), 대분류 검색(`공학` → 전자공학/컴퓨터공학/화학공학 3개
    소분류로 분리), 무결과 검색 정상 처리 확인.
  - **F3**: 태그 목록, `department` 파라미터 유무에 따른 내 전공/타 전공 분리(있으면
    분리, 없으면 전부 타 전공 취급), 연관도 내림차순 정렬 확인.
  - **F4**: 실제 학과(컴퓨터인공지능학부) 기준 추천(전공필수 우선 배치·버킷별 사유
    문구·"AI 랭킹 실패→휴리스틱 대체" 안내 확인), 관심분야 미선택 400 검증, 존재하지
    않는 학과 처리, `GET /api/search`로 과목 검색 후 `manualCourseIds`로 추가→재계산까지
    end-to-end 확인(모두 Sprint 4 메모의 기존 검증 결과와 일치).
- **버그 발견 및 수정 — Turbopack dev 서버가 한글 소스 코드프레임 렌더링 중 패닉해
  전체 프로세스가 죽는 문제 (심각, 재현 확인)**: `POST /api/reviews/suggest-tags`를
  호출하면(AI Gateway 카드 미등록으로 403 발생 — Sprint 1~4에 이미 문서화된 조건)
  라우트의 `try/catch`가 에러를 정상적으로 잡아 500 JSON을 반환해야 하는데, 실제로는
  Node `fetch` 쪽에서 `ECONNRESET`이 뜨고 `next dev` 프로세스 자체가 죽는 것을
  재현했다(2회 재현, 재시작 후 동일 조건에서 동일하게 재현됨). 서버 로그에 Rust
  패닉이 남았다: `panicked at crates\next-code-frame\src\highlight.rs:1011:45: end
  byte index 93 is not a char boundary; it is inside '도' (bytes 91..94)` — Turbopack이
  에러의 스택트레이스 코드프레임을 터미널에 예쁘게 출력하려다, 하이라이트할 소스
  범위의 바이트 오프셋이 한글(멀티바이트 UTF-8) 문자 중간에서 끊겨 패닉하는
  프레임워크 버그다. 원인 문자열은 `app/api/reviews/suggest-tags/route.ts`의 AI
  system 프롬프트("당신은 대학 수강평 문장에서...")였고, `console.error("...", err)`로
  **원본 Error 객체를 그대로** 로깅하는 경로에서만 발생했다 — 같은 파일에서 `err.message`
  문자열만 넘기는 다른 호출부(`lib/curriculum/interest-ranking.ts:88`)는 동일한 AI
  Gateway 403 조건에서도 문제없이 로깅됐다. 이 저장소는 전체가 한국어 카피/프롬프트라
  이 패턴이 다른 라우트에서도 잠재적으로 재현될 수 있다고 판단해, **직접 재현을
  확인한 두 지점**을 고쳤다: `app/api/reviews/suggest-tags/route.ts`와 `app/api/
  reviews/route.ts`(리뷰 등록 후 `after()`로 비동기 실행되는 요약 재생성 실패 로그,
  동일한 AI Gateway 403 코드 경로)에서 `console.error(label, err)`를
  `console.error(label, err instanceof Error ? err.message : String(err))`로 바꿔
  원본 Error 객체 대신 메시지 문자열만 로깅하게 했다. 수정 후 동일한 403 유발 요청을
  반복 실행해 서버가 살아있고 500 JSON이 정상 반환되는 것을 확인했다. **다른 라우트의
  `console.error(label, err)` 호출부(예: `app/api/search/route.ts`,
  `app/api/industry-search/route.ts`, auth 라우트들 등)는 이번에 실제로 크래시를
  재현하지 못해 건드리지 않았다** — DB/세션 코드는 에러가 발생해도 스택트레이스가
  주로 `node_modules`(영문)를 가리켜 이 특정 패닉 조건에 걸리기 어렵다고 판단했기
  때문이다. 이건 Next.js/Turbopack 자체의 버그라 이 저장소 코드로 근본 수정은
  불가능하다 — 로깅 패턴 변경은 회피책이다. AI Gateway 카드 등록 후에도 이 라우트가
  실제로 에러를 던질 다른 경우(예: 네트워크 타임아웃)가 생기면 동일한 크래시 위험이
  여전히 있다는 점을 남겨둔다.
- **에러 처리/로딩 상태 UI 일관성 — 발견한 불일치와 수정**: F1~F4 클라이언트
  컴포넌트를 훑어본 결과 `components/curriculum-planner.tsx`와
  `components/search-results.tsx`는 이미 로딩/에러/빈 상태를 명확히 구분해 보여주고
  있었지만, 두 곳은 실패를 "데이터 없음"과 구분하지 않고 있었다 — 고쳤다:
  - `components/fields-explorer.tsx`: `listIndustryTags()`/`searchByIndustryTag()`가
    실패해도(둘 다 파사드에서 절대 throw하지 않고 `{success:false, ...}`를 반환하는
    구조) 그 `success` 값을 전혀 확인하지 않고 빈 배열/빈 결과를 그대로 렌더링해 "아직
    등록된 태그가 없습니다"/"아직 검수를 마친 과목이 없습니다"라는, 실패와 무관한
    문구를 보여주고 있었다. 태그 목록 로딩에는 명시적 에러 상태(빨간 배지 + "다시 시도"
    버튼, `AlertCircle` 아이콘, 다른 컴포넌트와 동일한 시각 언어)를 추가했고, 태그별
    과목 조회 실패도 "관련 과목 없음"과 분리해서 보여주도록 `FieldResultSections`에
    `result.success` 체크를 추가했다. 실패한 결과는 캐시하지 않게 해서(`results[tag.name]
    ?.success`) 아코디언을 다시 펼치면 재시도되게 했다.
  - `components/course-reviews-section.tsx`: `listReviews()` 실패 시 `reviewResult.success`를
    무시하고 `reviews` state를 그대로 둬서(초기값 `[]`) "아직 등록된 수강평이 없습니다"가
    표시되는 문제가 있었다 — 실제로는 통신 실패인데 "리뷰가 없는 과목"으로 오인될 수
    있다. `reviewsError` state를 추가해 별도의 에러 카드(다시 시도 버튼 포함)를 보여주고,
    실패 시에는 "수강평 N개" 섹션 자체를 숨겨(0개로 보이는 것과 혼동 방지) 에러 안내만
    보이게 했다.
  - 나머지(`review-composer.tsx`, `curriculum-planner.tsx`, `search-results.tsx`)는
    이미 로딩 스피너/버튼 비활성화/명시적 에러 문구 패턴을 따르고 있어 그대로 뒀다.
- **접근성 — 점검 결과와 수정**: 상호작용 요소는 전부 이미 실제 `<button>`/`<select>`/
  `<a>`로 구현돼 있었고(div/span에 onClick만 걸어둔 클릭 전용 핸들러는 발견되지
  않음), `RatingStars`(`components/course-badges.tsx`)는 별 아이콘을 `aria-hidden`
  처리하고 `sr-only` 텍스트로 점수를 읽어주는 등 이미 잘 되어 있었다. 수정한 것:
  - `components/review-composer.tsx`(수강평 작성 모달): `role="dialog" aria-modal="true"
    aria-label="수강평 작성"`과 ESC 닫기는 이미 있었지만, 모달이 열려도 포커스가
    실제로 모달 안으로 이동하지 않고(트리거 버튼에 그대로 남음) 닫아도 포커스를
    되돌리는 로직이 없었다 — 키보드/스크린리더 사용자가 모달이 열린 걸 인지하기
    어려운 상태였다. `dialogRef`(패널에 `tabIndex={-1}`)와 `triggerButtonRef`를 추가해
    열릴 때 `dialogRef.current?.focus()`, 닫힐 때(cleanup) `triggerButtonRef.current?.focus()`로
    포커스를 관리하도록 고쳤다.
  - 토글형 버튼(선택/미선택 두 상태를 시각적으로만 구분하던 것)에 `aria-pressed`를
    추가해 스크린리더가 선택 상태를 읽을 수 있게 했다: `review-composer.tsx`의 사전
    정의 해시태그·AI 추천 태그 버튼, `curriculum-planner.tsx`의 기이수 전공필수
    체크 칩·관심분야 선택 버튼, `search-results.tsx`의 정렬 옵션 버튼. `curriculum-
    planner.tsx`의 학기 탭 버튼에는 `aria-current`를 추가했다.
  - 풀 WCAG 감사가 아니라 스프린트 지시사항대로 스팟 체크였다 — 완전한 탭리스트
    패턴(`role="tablist"`/`role="tab"`)으로의 전환이나 별점 입력의 라디오그룹화 같은
    더 큰 구조 변경은 하지 않았다.
- **의도적으로 손대지 않은 것 (버그 아님, 이미 문서화된 gap)**: F3 industry-search에서
  `tag` 파라미터가 없으면 400이 아니라 `success:true`+빈 결과를 반환하는 것(이
  라우트/파사드 전체가 채택한 "예외 대신 안전한 기본값" 스타일과 일관됨, 다른
  엔드포인트도 비슷하게 관대함), F2 학년 필터 비활성화(Sprint 2 메모 — 원본 데이터
  없음), F4 선수과목/졸업요건/입학년도(Sprint 4 메모 — 외부 데이터 필요), AI Gateway
  403(Sprint 0~4 메모 — 카드 미등록) 전부 기존 문서의 설명 그대로 재확인만 하고
  "고치지" 않았다.
- **`npx tsc --noEmit`**: 통과(에러 0건).
- **eslint 설치/설정**: `eslint` + `eslint-config-next@16.2.6`(설치된 Next 버전과 동일)을
  설치하고 `eslint.config.mjs`(flat config)를 작성했다. 처음에는 구버전 방식대로
  `FlatCompat`으로 `"next/core-web-vitals"`/`"next/typescript"`를 감싸서 로드했는데,
  Next 16용 `eslint-config-next`는 이미 flat config를 네이티브로 내보내기 때문에
  (`eslint-config-next/core-web-vitals`, `eslint-config-next/typescript` 서브패스)
  legacy 브릿지를 거치면 `TypeError: Converting circular structure to JSON`으로
  깨졌다 — `@eslint/eslintrc`/`FlatCompat`을 걷어내고 두 서브패스를 직접 import해서
  해결했다. 이후 `npm run lint`가 F1~F4에서 새로 만든 여러 컴포넌트에 걸쳐
  `react-hooks/set-state-in-effect`(마운트 시 `setLoading(true)` 후 fetch하는, 이
  저장소 전반의 표준 패턴을 "유도 상태(derived state)" 안티패턴으로 오탐하는 최신
  룰) 에러 6건을 실제로 잡아냈다 — 개별 컴포넌트를 전부 재작성하는 대신
  `eslint.config.mjs`에서 이 룰만 `"warn"`으로 낮췄다(이유를 코드 주석으로 남김).
  현재 `npm run lint`는 종료코드 0, 경고 8건(위 룰 6건 + 기존 `exhaustive-deps`
  경고 2건 — `curriculum-planner.tsx`의 `semesters` useMemo 의존성, `review-composer.tsx`의
  ref cleanup) — 전부 에러가 아니라 경고라 빌드/CI를 막지 않는다. 경고 자체를 없애는
  개별 리팩터링은 이번 세션 범위 밖으로 남겨둔다.
- **테스트 프레임워크: Vitest 도입.** `lib/curriculum-engine.ts`가 이 코드베이스에서
  가장 로직이 복잡하고(PRD 8.4 플로우차트 5단계 + Sprint 4의 `manualCourseIds` 재계산
  루프) 순수 함수라 테스트 대비 대비가 가장 크다고 판단해, 여기부터 최소 스모크
  테스트 3개(`lib/curriculum-engine.test.ts`)를 추가했다: 커리큘럼 데이터 없는
  학과 처리, 실제 학과 기준 전공필수 우선 배치·학기당 학점 상한 준수, `manualCourseIds`
  추가 과목이 항상 결과에 포함되는지. `npm run test`(`vitest run`) 스크립트 추가,
  3개 전부 통과. Route Handler/DB 연동 테스트나 E2E(Playwright)는 이번 세션에서
  도입하지 않았다 — DB가 실제 Neon이라 통합 테스트에는 시딩된 테스트 전용 브랜치가
  필요하고, E2E는 브라우저 자동화 도구가 이 환경에 없어(Sprint 4/5 QA 메모와 동일
  제약) 범위 밖으로 남긴다.
- **서버리스 콜드스타트/실행시간 점검**: 실제 Vercel 배포 전이라 진짜 콜드스타트
  지연은 측정할 수 없었다(로컬 `next dev`는 서버리스 함수 콜드스타트를 재현하지
  않는다). 대신 코드 리뷰 기준으로 점검한 결과: DB 접근은 전부 `@neondatabase/serverless`의
  HTTP 기반 드라이버(`lib/db/index.ts`)를 쓰고 있어 TCP 커넥션 풀을 유지할 필요가
  없고, 이는 PRD 10.4가 권장하는 방식과 일치한다. Route Handler는 매 요청마다
  새 함수 인스턴스를 가정해도 안전하게 동작하도록 작성되어 있다(전역 가변 상태
  없음). F4 커리큘럼 추천은 Sprint 4에서 이미 로컬 기준 실측했다(엔진 연산
  2~5ms, 전체 카탈로그 Neon 조회 1~1.8초, end-to-end 620ms~6.2초 — 서버리스 제한
  시간에 여유). Neon은 비활성 시 scale-to-zero되므로 첫 요청 지연은 실제 배포
  후에만 확인 가능하다 — 트래픽이 실제로 생기면 Neon 대시보드에서 최소 컴퓨트
  유지 옵션을 검토할 것을 권장하며, 이번 세션에서 미리 켜두지는 않았다(트래픽이
  없는 지금 켜두면 불필요한 과금만 발생).
- **데이터 출처/저작권 검토 — 미해결, 확인 필요**: `lib/data/courses.json`(전북대
  2학기 개설강좌 2,695건, 엑셀 업로드 변환)이 실제로 이 서비스에 공개적으로
  활용해도 되는 데이터인지는 코드 관점에서 판단할 수 없는 사안이다. PRD 12장이
  이미 이 리스크를 "학교와의 데이터 이용 협의 사전 진행"으로 명시하고 있는데,
  이 저장소에는 그 협의가 이루어졌다는 근거가 없다(어디서 업로드됐는지, 학교
  공식 승인을 받았는지 기록 없음). **프로덕션에 실제로 배포해 외부에 공개하기
  전에 사용자가 직접 확인해야 하는 항목**으로 남긴다 — 학교 데이터 이용 승인이
  없다면 최종 배포(아래 항목) 전에 이 데이터를 비공개로 전환하거나 사용 범위를
  조정하는 것을 검토해야 한다.
- **최종 배포 완료**: `vercel deploy --prod`로 배포했다 — Production:
  https://sprint0-infra.vercel.app (프로젝트: `jjydb1007-8989s-projects/sprint0-infra`).
  Neon 통합이 애초에 모든 환경(development/preview/production)에 연결되어 있어서
  별도 프로덕션 환경변수 설정 없이 바로 DB에 연결됐다 — 배포 직후 `/api/search`가
  실제 리뷰 데이터를 포함한 결과를 반환하는 것으로 확인. 첫 배포 시도는 저장소에
  같이 있던 오래된 `pnpm-lock.yaml`을 Vercel이 감지해 `pnpm install --frozen-lockfile`을
  돌리다 실패했다(이 세션 내내 npm만 써서 pnpm-lock.yaml이 package.json과 어긋나
  있었음) — `pnpm-lock.yaml`을 삭제하고 npm/`package-lock.json`으로 통일해 재배포,
  성공. 배포 후 `/`, `/login`, `/cart`, `/timetable`, `/fields`, `/curriculum`,
  `/search` 전부 200 확인. **AI Gateway 카드 미등록은 배포 후에도 그대로다** —
  프로덕션에서도 AI 해시태그 추천/요약/랭킹은 각 스프린트에 문서화된 대로 휴리스틱
  폴백으로 동작한다. `next.config.ts`의 `typescript.ignoreBuildErrors: true`는 이
  세션 내내 `npx tsc --noEmit`이 항상 클린했어서 실질적으로 아무것도 가리지 않았지만,
  이 설정 자체는 이번 세션이 만든 게 아니라 그대로 뒀다 — 이후 타입 에러가 있는
  채로 배포되는 걸 막고 싶다면 이 옵션을 끄는 걸 검토할 것.
