---
name: neon-postgres
description: Neon(Serverless Postgres) 스키마/연결/마이그레이션 관련 작업 시 참고. 수강길잡이 PRD 9장의 7개 핵심 엔티티, pgvector 사용처, 서버리스 커넥션 주의사항 요약. 실제 스키마 설계·마이그레이션 작성은 neon-db-schema 에이전트에 위임.
user-invocable: true
---

## 언제 쓰는가

테이블/컬럼 추가, 마이그레이션 작성, Route Handler에서 DB 쿼리 작성 시. **실제 스키마 설계나 여러 파일에 걸친 마이그레이션 작업은 `neon-db-schema` 에이전트에 위임**하세요 — 이 스킬은 빠른 참고용 요약입니다.

## 7개 핵심 엔티티 (PRD 9장)

Course · Field Tag(학문분야, F2) · Industry Tag(산업/진로, F3, 연관도 스코어 포함) · Review(어뷰징 방지 필드 필요) · Summary(과목ID, 요약본문, 생성일시, 기반 리뷰 수 — 캐시, 매 조회마다 재생성 금지) · User(익명 식별자, 복수전공 가능, 개인정보 최소 수집) · Curriculum(학과 커리큘럼, **입학년도별 버전 관리 필수**).

Course↔Field Tag, Course↔Industry Tag는 다대다 — join 테이블로, 배열 컬럼으로 하지 말 것 (F2/F3 검색이 인덱싱 가능해야 함).

## pgvector

F3(산업 연관도)와 향후 F2 고도화에 임베딩 유사도 검색이 필요 (PRD 10.3). course 설명/키워드 임베딩을 vector 컬럼에 저장하고, row 수가 실제로 늘어난 뒤에 ivfflat/hnsw 인덱스를 추가하세요 — 빈 테이블에 미리 인덱스 걸지 말 것.

## 서버리스 주의사항 (PRD 10.4)

- Route Handler는 요청마다 새로 실행됨 — Neon 서버리스 드라이버(`@neondatabase/serverless`) 또는 HTTP 기반 쿼리 경로를 쓰고, 하나의 프로세스가 계속 산다고 가정하는 커넥션 풀을 쓰지 마세요.
- 콜드 스타트(scale-to-zero)로 첫 요청 지연 가능 — 트래픽 많은 시간대엔 최소 컴퓨트 유지 옵션 검토.
- 어떤 ORM이 실제로 설치되어 있는지 (Prisma/Drizzle/미정) `package.json`을 먼저 확인 — PRD 10.4는 이걸 미확정 오픈 이슈로 남겨뒀습니다.

## 확인 없이 하지 말 것

- 커리큘럼 과거 버전을 덮어쓰는 파괴적 마이그레이션
- 리뷰 하드 삭제 (어뷰징 리뷰도 soft-delete/flag로 증거 보존)
