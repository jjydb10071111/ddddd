# 수강길잡이 개발 계획 (스프린트 기반)

> 참고 문서: [`docs/PRD.md`](./PRD.md), [`/CLAUDE.md`](../CLAUDE.md)
> 최종 수정일: 2026-07-29

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
| Sprint 3 | F3 — 산업/진로 분야 키워드 검색 (P1) | 미시작 | |
| Sprint 4 | F4 마무리 — AI 맞춤 커리큘럼 설계 (P1) | 부분 진행 | 추천 엔진·실과목 데이터는 이미 있음, 아래 참고 |
| Sprint 5 | 통합/배포/QA | 미시작 | |

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

- [ ] Industry Tag 테이블 + 산업/진로 태그셋 정의 (반도체, AI·데이터사이언스, 바이오·헬스케어, 금융·핀테크, 콘텐츠·미디어 등)
- [ ] 과목 설명/키워드 임베딩 생성 파이프라인 (pgvector)
- [ ] 임베딩 유사도 기반 연관도 스코어링 + 담당자 검수 확정 워크플로우
- [ ] 산업 분야 검색 API — 연관도 순 정렬, 개설학과/학점/이수구분 포함
- [ ] "내 전공 과목" vs "타 전공 과목" 구분 표시 (+ 타 전공 정원/선수과목/학년 제한 안내)
- [ ] 신조어·신산업 태그 확장 운영 프로세스 정리 (문서화만이라도)
- [ ] `lib/curriculum-data.ts`/`lib/curriculum-engine.ts`의 `academicField`/`industry`가 항상 비어 있던 부분을 이 스프린트 산출물로 채우기 (F4와의 연결고리)

**완료 조건 체크 (PRD 8.3 그대로)**

- [ ] 산업/진로 분야 키워드 검색 시 여러 학과에 걸친 관련 과목이 연관도 순으로 노출된다
- [ ] 각 결과에 개설 학과, 학점, 이수구분이 표시된다
- [ ] 내 전공 과목과 타 전공 과목이 구분 표시된다

**메모**:

---

## Sprint 4 — F4 마무리: AI 맞춤 커리큘럼 설계 (P1)

**목표**: 엔진 로직(`lib/curriculum-engine.ts`)은 이미 PRD 8.4 플로우차트대로 동작한다. 이 스프린트는 **엔진이 기대하는 실제 데이터**를 채우고 Neon/LLM으로 옮기는 것이 핵심이다. `curriculum-recommender` 에이전트/`curriculum-engine` 스킬 참고.

- [ ] 선수과목 데이터 확보/입력 (현재 전무 — 학과 협의 또는 수동 입력)
- [ ] Sprint 3의 실제 industry 연관도 스코어를 연결 (현재 태그가 없어 관심분야 랭킹이 항상 0점)
- [ ] 졸업요건(전공선택 최소학점, 총 졸업학점) 실제 데이터 확보 — 현재 전 학과 동일한 더미값(21/130학점)
- [ ] "이번 학기 개설된 전공필수만 반영"하는 현재 한계 해소 — 학과 전체 교육과정의 전공필수 목록 확보 (146개 학과 중 28개는 이번 학기 개설 전공필수가 0개)
- [ ] 학과 커리큘럼 입학년도별 버전 관리를 Neon 테이블로 이전 (현재는 admissionYear=2024 고정값)
- [ ] `lib/curriculum-data.ts`/`lib/data/courses.json` 정적 파일을 Neon 쿼리로 교체
- [ ] 관심분야 매칭에 LLM 기반 랭킹 도입 (현재는 단순 문자열 일치 스코어)
- [ ] 과목 검색-추가 UI (현재는 제외한 과목 재포함만 가능, 새 과목 추가는 불가)
- [ ] 연산이 길어질 경우 스트리밍/폴링 구조 검토 (PRD 10.4)

**완료 조건 체크 (PRD 8.4 그대로)**

- [x] 학과·기이수학점·관심분야 입력 후 학기별 추천 커리큘럼이 생성된다 *(엔진 구현 완료, 정적 데이터 기준)*
- [x] 전공필수 미이수 과목이 우선적으로 배치된다 *(선수과목 없는 상태 기준 — 실제 선수과목 데이터 반영 후 재검증 필요)*
- [x] 추천 과목마다 추천 사유가 함께 표시된다
- [x] 사용자가 과목을 제외/추가하면 추천이 재계산된다 *(제외/재포함만 — "추가"는 위 체크박스에서 별도 작업 필요)*
- [x] 본 추천은 "참고용"이며 최종 확인은 학과 사무실을 통해야 함을 안내하는 문구가 노출된다

**메모**: 위 완료 조건 5개는 "더미 데이터 기준"으로는 이미 충족되어 있습니다. 이 스프린트의 나머지 체크박스(선수과목/태그/졸업요건 실데이터, DB 이전)를 마치면 완료 조건이 실제 데이터 기준으로도 성립하는지 다시 한번 검증하세요.

---

## Sprint 5 — 통합/배포/QA

**목표**: PRD 12장 리스크 항목을 점검하고 배포 가능한 상태로 마무리한다.

- [ ] 전체 기능 회귀 테스트 (F1~F4 시나리오별)
- [ ] 서버리스 콜드스타트/실행시간 제약 점검 (PRD 10.4) — 필요 시 최소 컴퓨트 유지 옵션 검토
- [ ] 에러 처리/로딩 상태 UI 일관성 점검
- [ ] 접근성 점검 (스크린 리더, 키보드 내비게이션)
- [ ] `npm run lint`가 동작하도록 eslint 설치 + 설정 추가 (현재 스크립트만 있고 미설치 상태)
- [ ] 최소한의 테스트 프레임워크 도입 여부 결정 (현재 무 — `npx tsc --noEmit`만으로 충분한지, 아니면 Vitest/Playwright 등을 도입할지)
- [ ] 데이터 출처/저작권 검토 — 강의계획서·커리큘럼 등 학교 제공 자료 활용 범위 (PRD 12장)
- [ ] 최종 배포 (Vercel production)

**메모**:
