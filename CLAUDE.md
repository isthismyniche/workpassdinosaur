# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Greenfield. The repo currently contains only `WORK_PASS_DINOSAUR_PRD.md` — no code yet. The PRD is the source of truth for product, schema, API surface, and architectural decisions. Read it before doing significant work.

The reference codebase is **SG Math Whiz** at `/Users/manish/Documents/Projects/SG_Math_Whiz`. Most patterns (auth, dates, Supabase wiring, leaderboard endpoints, Tailwind v4 `@theme` tokens, `ChallengePage` state) are ported from there. When in doubt, mirror SG Math Whiz unless the PRD explicitly diverges (see PRD §18).

## Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind v4 (CSS `@theme` in `src/index.css`, **no** `tailwind.config.js`) + Framer Motion.
- **Backend:** Vercel Serverless Functions in `api/**/*.ts` using `@vercel/node`. Edge runtime only for `api/auth/google-signin.ts`.
- **DB:** Supabase Postgres. Service-role key on the server; anon key in the frontend bundle.
- **Auth:** Supabase Google OAuth, with a username-only fallback. Identity carried in `x-user-id` header.
- **Local dev:** `vercel dev`.
- **No Storage bucket, no AI/Gemini script, no Supabase CLI link** — all explicitly out of MVP.

## Common commands

Once scaffolded, the standard commands will be:

- `vercel dev` — local dev (frontend + serverless functions).
- `npm run build` — **run before any push to production**. Fix TS errors rather than suppressing them.
- `npx tsx scripts/import-questions.ts` — import approved rows from `data/review/questions-for-review.tsv` into the `questions` table with `date = NULL`.
- `npx tsx scripts/schedule-questions.ts` — assign dates so each day has exactly one approved question per category. **Fail loudly** if any category is short; no silent fallback.

Migrations are applied **manually via the Supabase SQL editor**. Files live in `supabase/migrations/`. Do not wire up the Supabase CLI.

## Architecture — load-bearing rules

These are the rules that span multiple files and are easy to violate by accident:

1. **`correct_option` and `explanation` never cross the API boundary before submission.** `api/today.ts` returns prompt + 4 options only. `api/reveal.ts` returns reveal data **only** for questions the user has already submitted today, and 403s if any of the 3 is unsubmitted. Past-challenge endpoints gate reveal data on whether the user attempted that day.
2. **Server-side double-submit guard.** `api/submit.ts` validates that the user has no existing `attempts` row for that `question_id` before inserting. The `unique (user_id, question_id)` constraint is the backstop.
3. **All dates are SGT (UTC+8).** Use the helpers in `api/_lib/dates.ts` (`getTodaySGT`, `addDaysSGT`) — never compute dates inline.
4. **Scoring lives in one pure function.** `api/_lib/scoring.ts` `computeScore(isCorrect, certainty)` returns the integer delta from the symmetric ±10/20/30 table (PRD §4). Both `api/submit.ts` and any reveal-side recomputation must go through it. Exhaustively unit-tested.
5. **Auth is `x-user-id`-based after first sign-in.** `api/_lib/auth.ts` reads the header and looks up the row in `users`; missing → 401. The Google access token is verified **only** at sign-in time in `api/auth/google-signin.ts` via `supabase.auth.getUser(accessToken)`. Once `users.google_sub` is populated, `userId` is the source of truth — this is a deliberate trade-off for an internal-colleague MVP, not a security-critical app.
6. **One question per category per day** is enforced by `unique (date, category)` on `questions`. The scheduler relies on this; don't work around it.
7. **`/play` is a state machine: idle → q1 → q2 → q3 → reveal.** Reveal happens **once, after all three submissions** — not per-question (PRD §7). The "wait for animation timer AND API response with `apiReady` as state" race pattern from SG Math Whiz `ChallengePage` is **not** required here; keep it simple.

## Question generation pipeline

There is no generation script and no Gemini API key. Drafting happens **in an interactive Claude Code session** using `WebFetch` / `WebSearch`:

```
data/sources/sources.tsv   →  Claude drafts via WebFetch  →  data/review/questions-for-review.tsv
                                                              (PO reviews, sets approved=Y)
                                                                            ↓
                                                          scripts/import-questions.ts
                                                                            ↓
                                                          scripts/schedule-questions.ts
```

`drafted=Y` in `sources.tsv` is the cursor (resumability is the session itself). The standing drafting prompt lives at `prompts/draft-questions.md` — see PRD §6 for the canonical text. Hard rules: every drafted question must include a **verbatim quote** from the source page in `explanation`; if a fetched page doesn't actually answer the intended question, **skip it** with a note rather than invent.

`data/` is gitignored.

## Engineering principles (from PRD §19)

- Architectural decisions stay with the PO. Surface trade-offs; don't unilaterally pick.
- Don't introduce abstractions beyond what the task needs.
- Don't add features, fallbacks, or backwards-compat shims that weren't asked for.
- Default to no comments. Only when the *why* is non-obvious.
- Keep `data/` gitignored.
- `correct_option` never crosses the API boundary before submission. (Repeated because it's the easiest rule to break.)

## Open questions (PRD §17)

Several behaviours are still PO-decisions: timeout-with-no-answer scoring, mid-session abandonment, launch question-bank size, calibration-% display location, source freshness UI. If a task touches one of these, ask the PO rather than picking a default.
