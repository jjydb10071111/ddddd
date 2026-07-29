# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Development proceeds sprint-by-sprint against [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md) — check it before starting work to see what sprint is active and what's already checked off, and check off/update it as you complete items rather than tracking progress only in conversation. The full PRD lives at [`docs/PRD.md`](docs/PRD.md); the product summary below is a condensed pointer, not a replacement.

## Product context (PRD v1.1, 2026-07-28)

**수강길잡이** is an AI course-planning assistant for university students (Korean-language product; target school is JBNU based on the real data in `lib/data/courses.json`). It addresses four gaps in incumbent tools like Everytime: reviews are unstructured text walls, search only matches exact course names, there's no way to browse courses by industry/career field, and there's no tool that plans a graduation-compliant, interest-aligned course schedule.

Four features, in PRD priority order, with **current implementation status**:

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| F1 | 수강평 해시태그 & AI 요약 (hashtag review + AI-generated course summary) | P0 | Not started — UI/data model only exist as hand-authored demo content in `lib/mock-data.ts` |
| F2 | 분야 통합 검색 (course-name match + academic-field match, shown as separate result groups) | P0 | Not started |
| F3 | 산업/진로 분야 키워드 검색 (cross-department industry/career tag search with relevance score) | P1 | Not started — this is also the tagging axis F4's interest-ranking depends on |
| F4 | AI 맞춤 커리큘럼 설계 (prerequisite-aware, credit-aware, interest-ranked semester roadmap) | P1 | Recommendation engine implemented (`lib/curriculum-engine.ts`) against the real course catalog, but see "Known data gaps" below — no real DB, no LLM call yet |

Non-goals: this product never replaces the school's actual registration system, doesn't do academic-records management, and F4's output is explicitly labeled **참고용 (reference only, confirm with the department office)** — that disclaimer string must stay on every curriculum result.

Target tech stack per the PRD (10장): Next.js App Router (single codebase for frontend + backend), Neon (Serverless Postgres) for storage, Vercel for hosting, server-side LLM API calls for the AI features. **None of the DB/LLM integration exists yet** — see "Current vs. target architecture" below.

## Commands

```
npm run dev     # next dev — start the dev server
npm run build   # next build
npm run start   # next start (serve a production build)
npm run lint    # eslint .  — NOTE: eslint is not currently installed (no eslint package, no config file). This script will fail until eslint is added.
npx tsc --noEmit   # the actual correctness gate right now — there is no test framework installed (no jest/vitest/playwright). Always run this after any change.
```

Both `package-lock.json` and `pnpm-lock.yaml` are present in the repo; pick one and don't introduce a third.

## Current vs. target architecture

The PRD's target architecture (Next.js + Neon Postgres + Vercel + LLM API) is **not built yet**. Today, every feature is backed by either hand-authored mock data or a real-but-static JSON export, wired through a facade layer so the eventual DB/LLM swap doesn't require touching UI code:

- **`lib/api/*.ts`** (`auth.ts`, `curriculum.ts`) is the only layer UI components are allowed to call. Each function calls a Route Handler under `app/api/**/route.ts` via `fetch`, matching the PRD's "one Next.js codebase, Route Handlers as the backend" decision. When Neon/an LLM vendor is actually wired in, only the Route Handlers (and whatever they call) change — not the facades, not the components. Don't bypass this by fetching directly from a component, and don't add a new data source without adding a facade function for it.
- **Auth** is session-cookie based, not DB-backed: `app/api/auth/login/route.ts` validates 학번(student ID, 6–10 digits) + password, then sets an `auth_session` cookie whose value is a **base64-encoded JSON blob** (not signed/encrypted — this is demo-level auth, not production-ready). `app/api/auth/me` and `/logout` read/clear that cookie. `components/auth-provider.tsx` (`AuthProvider`/`useAuth`) wraps the whole app in `app/layout.tsx` and is the only place client components should read session state.
- **Course data lives in two unrelated places — don't try to unify them:**
  - `lib/mock-data.ts` exports a small (5-course) hand-authored dataset with rich fake reviews/ratings/hashtags, used by the browsing/search/detail pages (`app/page.tsx`, `app/search`, `app/fields`, `app/courses/[id]`). Its `Course`/`Requirement` type (`Requirement = 전공필수 | 전공선택 | 교양`) only fits this demo dataset.
  - `lib/data/courses.json` is the real 2학기 개설강좌 export (2,695 rows, 146 departments, JBNU) converted from an Excel upload — see `lib/curriculum-data.ts`'s header comment for the conversion notes. It is **section-level** (one row per 분반), so `lib/curriculum-data.ts` deduplicates by 학수번호(course code) into course-level records before anything else uses it. This dataset's requirement categories are real and different: `CurriculumRequirement = 전공필수 | 전공선택 | 계열공통 | 기초필수` (no "교양" here — gen-ed isn't in this export). This dataset only feeds the curriculum engine right now; it is **not** wired into the browsing/search UI.
- **F4 engine (`lib/curriculum-engine.ts`)** is pure, deterministic logic — no DB, no LLM call. `recommendCurriculum()` follows the PRD 8.4 flowchart order: place unfinished required courses respecting prerequisites → compute remaining elective credits → rank electives/interest courses by a simple string-match score against `industry`/`academicField` (own department preferred) → pack everything into semesters under a credit cap. **Known data gaps to keep in mind when touching this**: `prerequisites`/`academicField`/`industry`/`rating`/`reviewCount` are always empty on real courses (not in the source spreadsheet), and `departmentCurricula`'s `requiredCourseIds` reflects only courses tagged 전공필수/기초필수 **in this semester's offering**, not a department's full multi-year requirement list — 28 of 146 departments have zero required courses this term for that reason, which is expected, not a bug. `electiveMinCredits`/`graduationMinCredits` are placeholder constants (21/130) applied to every department, pending real graduation-requirement data.
- **A real bug worth knowing about**: when packing recommended items into semesters, required + elective + interest items must be topologically re-sorted together (respecting `prerequisites`) *before* placement — sorting each bucket independently and packing them in bucket order can place a course before its own prerequisite once electives/interest items are involved (their relative order comes from an interest-relevance score, not dependency order). See the `orderedForPacking` step in `recommendCurriculum()` if this needs to change.

## Design system

shadcn `base-nova` style + Tailwind v4 (`@theme inline` tokens in `app/globals.css`, OKLCH colors, radius derived from a single `--radius` var). `font-sans` = Noto Sans KR (body), `font-display` = Poppins+fallback (headings). `components/ui/button.tsx` wraps `@base-ui/react/button` via `class-variance-authority` — use its `variant`/`size` props rather than styling a raw `<button>`. There's no `Input`/`Card` primitive yet; the established pattern for form inputs is a plain `<input>` with the `.input` utility class in `globals.css` (see `app/login/page.tsx` or `components/site-header.tsx`). All user-facing copy is Korean, direct and concise (no marketing tone).

## Claude Code project config already set up

This repo has project-scoped `.claude/` config for PRD-driven development — check it before adding new agents/skills so you don't duplicate what's already there:

- **`.claude/agents/`** — 5 custom subagents mapped to the PRD features and stack: `neon-db-schema`, `ai-review-summarizer` (F1), `field-industry-search` (F2+F3), `curriculum-recommender` (F4), `nextjs-ui-builder`. Each is granted the `Skill` tool so it can call the skills below.
- **`.claude/skills/`** — 6 project skills: `prd-overview` (condensed PRD reference — read this instead of re-deriving PRD facts), `design-system`, `neon-postgres`, `review-ai-summary`, `field-industry-tagging`, `curriculum-engine`. These are quick-reference checklists, not implementers — each one explicitly delegates deep, multi-file implementation work to its matching agent above.
- **`vercel` plugin** is installed at project scope (`.claude/settings.json`) from the official marketplace — gives `vercel:nextjs`, `vercel:shadcn`, `vercel:ai-sdk`, `vercel:ai-gateway`, `vercel:deployments-cicd`, `vercel:env-vars`, and more.
