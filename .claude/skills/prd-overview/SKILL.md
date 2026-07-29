---
name: prd-overview
description: 수강길잡이 PRD(v1.1, 2026-07-28)의 목표, 페르소나, 4대 기능(F1-F4), 데이터 엔티티, 기술 스택 핵심 요약. 이 프로젝트에서 기능 개발, 스키마 설계, UI 작업을 할 때 배경 지식으로 자동 참고.
user-invocable: true
---

수강길잡이는 대학생의 수강 의사결정(리뷰 탐색·검색·커리큘럼 설계)을 돕는 AI 기반 서비스입니다. 전체 PRD 원문은 `docs/PRD.md`, 스프린트별 진행 상황·체크리스트는 `docs/DEVELOPMENT_PLAN.md`에 있습니다 — 아래는 그 요약이니, 세부 구현 시 두 문서와 담당 스킬/에이전트를 함께 확인하세요.

## Non-goals (하지 않는 것)

- 실제 수강신청 자체는 대체하지 않음 (학교 시스템 안내에 그침)
- 성적 관리/학적 조회 등 학사 행정 기능 없음
- F4 추천은 **참고용**이며 최종 확인은 학과 사무실 — 이 문구를 UI에서 빼면 안 됨

## 4대 기능과 우선순위

| ID | 기능 | 우선순위 | 담당 스킬/에이전트 |
|----|------|---------|-------------------|
| F1 | 수강평 해시태그 & AI 요약 | P0 (MVP) | `review-ai-summary` 스킬, `ai-review-summarizer` 에이전트 |
| F2 | 분야 통합 검색 (학문분야) | P0 (MVP) | `field-industry-tagging` 스킬, `field-industry-search` 에이전트 |
| F3 | 산업/진로 분야 키워드 검색 | P1 | `field-industry-tagging` 스킬, `field-industry-search` 에이전트 |
| F4 | AI 맞춤 커리큘럼 설계 | P1 | `curriculum-engine` 스킬, `curriculum-recommender` 에이전트 |

릴리즈 순서(PRD 11장): Phase 1 = F1+F2, Phase 2 = F3, Phase 3 = F4. 지금 어떤 Phase 작업인지 불분명하면 사용자에게 확인하세요.

## 핵심 데이터 엔티티 (PRD 9장 — 상세는 `neon-postgres` 스킬 참고)

Course, Field Tag(학문분야), Industry Tag(산업/진로), Review, Summary, User, Curriculum(학과 커리큘럼, 입학년도별 버전 관리 필요).

## 기술 스택 (PRD 10장)

- **프레임워크**: Next.js App Router — 프론트엔드 + Route Handler를 한 코드베이스에서
- **DB**: Neon (Serverless Postgres) — 서버리스 오토스케일, 브랜칭, pgvector
- **배포**: Vercel — 서버리스/엣지 함수, 프리뷰 배포 (공식 `vercel` 플러그인 설치됨: `vercel:nextjs`, `vercel:ai-sdk`, `vercel:ai-gateway`, `vercel:shadcn`, `vercel:deployments-cicd`, `vercel:env-vars`, `vercel:vercel-storage`, `vercel:vercel-functions` 등)
- AI 기능(F1 요약, F3 연관도 스코어링, F4 관심분야 매칭)은 서버 사이드에서 LLM API 호출 — 벤더는 미확정(PRD 14장 오픈 이슈), 코드에 특정 벤더를 하드코딩하기 전에 확인
- ORM 미확정(Prisma/Drizzle 후보) — 가정하지 말고 `package.json`을 먼저 확인

## 리스크 (PRD 12장 — 놓치기 쉬운 것)

F4는 학과별 졸업요건 데이터 확보가 선행 조건. 서버리스 실행시간/페이로드 제약으로 F4처럼 무거운 연산은 스트리밍 또는 비동기+폴링 구조 검토 필요. AI 요약/추천은 편향·오류 가능성이 있으므로 "참고용" 문구 필수.
