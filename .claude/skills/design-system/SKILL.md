---
name: design-system
description: 수강길잡이 프로젝트의 실제 디자인 시스템 — shadcn base-nova + Tailwind v4 토큰, 폰트, 기존 컴포넌트 관례, 한국어 카피 톤. UI 페이지/컴포넌트를 만들거나 수정할 때 자동 참고. vercel:shadcn 스킬(범용 shadcn 가이드)과 별개로, 이 저장소에 실제로 이미 쓰이고 있는 값/패턴만 담음.
user-invocable: true
---

이 프로젝트에 새 UI를 추가하기 전에, `app/globals.css`와 `components.json`이 실제로 아직 이 값을 유지하고 있는지 먼저 확인하세요 — 아래는 스냅샷이며 코드가 항상 최종 근거입니다.

## 토큰 (app/globals.css)

- shadcn style: `base-nova`, baseColor `neutral`, Tailwind v4 `@theme inline`
- 색상은 OKLCH CSS 변수(`--primary`, `--card`, `--border`, `--muted-foreground` 등) — 항상 `bg-card`, `text-muted-foreground`, `border-border` 같은 토큰 클래스를 쓰고 하드코딩된 색을 쓰지 마세요. 다크모드(`.dark` 클래스 + `prefers-color-scheme`)가 자동으로 따라옵니다.
- radius는 단일 `--radius` 변수에서 파생 (`rounded-lg`/`rounded-xl`/`rounded-2xl`...) — 임의의 `rounded-[Npx]` 금지
- 폰트: `font-sans` = Noto Sans KR(본문), `font-display` = Poppins + Noto Sans KR fallback(제목) — 제목 요소는 `font-display` 사용

## 기존 컴포넌트 관례

- `components/ui/button.tsx`: `@base-ui/react/button` + `class-variance-authority` 래퍼. variant(`default`/`outline`/`secondary`/`ghost`/`destructive`/`link`), size(`xs`/`sm`/`default`/`lg`/`icon*`) props를 쓰고, 원시 `<button>`을 직접 스타일링하지 마세요.
- 아직 `components/ui/input.tsx`나 `card.tsx`는 없음 — 지금은 `components/site-header.tsx`, `app/login/page.tsx`에서 쓰는 것과 같은 순수 `<input>` + Tailwind 클래스 패턴(`globals.css`의 `.input` 유틸리티 참고)이 확립된 방식입니다. 새 shadcn 프리미티브를 임의로 추가하지 말고, 필요하면 `npx shadcn add`로 추가할지 먼저 확인하세요.
- 아이콘: `lucide-react`, 크기는 `size-4`/`size-5`, 장식용 아이콘엔 항상 `aria-hidden="true"`
- 경로 별칭: `@/components`, `@/lib`, `@/hooks`, `@/components/ui` (`components.json` 참고)

## 카피 톤

- 모든 사용자 노출 텍스트는 한국어, PRD 톤(직접적·간결, 과장된 마케팅 문구 금지) — 예: "리뷰가 아직 충분하지 않습니다"
- 서비스명 "수강길잡이", 브랜드 마크는 `Compass`(lucide-react) 아이콘 — `SiteHeader`/`LoginPage`에서 이미 사용 중이니 새 로고를 만들지 마세요

## 완료 전 체크

- `npx tsc --noEmit` 통과 확인 (테스트 스위트가 아직 없어 타입체크가 현재의 정확성 기준)
- 실행 중인 dev 서버가 있으면 브라우저에서 실제로 확인 — 타입체크만으로 "동작 확인됨"이라 말하지 말 것
