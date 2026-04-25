# Work Pass Dinosaur — Product Requirements Document

**Owner:** Manish (PO, sole engineer in MVP)
**Status:** Draft for greenfield build in a new repo
**Reference codebase:** SG Math Whiz (`/Users/manish/Documents/Projects/SG_Math_Whiz`) — reuse patterns where called out below.

---

## 1. Product summary

A daily Singapore work-pass trivia game for MOM colleagues. Three multiple-choice questions per day — one each on **policies**, **operational processes**, and **systems** — sourced from official mom.gov.sg material. Players pick an answer **and** declare their certainty (low/med/high); scores are weighted accordingly. Calibration matters as much as accuracy.

The product is named after a (friendly) dinosaur mascot. Tone is witty and playful, but the UI must read as something a colleague can open at their desk without embarrassment.

### Why it exists
- Make work-pass policy literacy a daily habit for MOM staff.
- Reward intellectual honesty (well-calibrated certainty) over reckless guessing.
- Be fun enough that colleagues actually share their scores.

### Non-goals (MVP)
- Public marketing site / SEO.
- Account systems beyond a username in localStorage.
- Anything mobile-native — responsive web only.
- Push notifications, email reminders.
- Anti-cheating measures beyond "one submission per day per question".

---

## 2. Audience & calibration

**Primary:** MOM colleagues. Assume domain familiarity.
**Difficulty:** Hard. Edge cases, exception clauses, recently-updated policies. The colleague who *thinks* they know it should still be wrong sometimes — that's where the game's fun and learning live.
**Tone of questions:** Plain English, scenario-flavoured where natural ("An EP holder switches employers mid-tenure; their previous EP is..."). No riddles, no trick wording — confusion should come from the policy itself, not the prose.

---

## 3. Core gameplay loop

### Daily challenge (single sitting, ~2 minutes total)
1. User opens the app. If they've already played today, see today's recap + leaderboard.
2. Otherwise, "Start today's challenge" CTA.
3. Question 1 (Policies) appears. 30-second countdown begins immediately.
   - User picks one of 4 options (A/B/C/D).
   - User picks one of 3 certainty levels (Low / Medium / High).
   - User clicks **Submit** OR the timer hits 0 → auto-submit.
4. Question 2 (Processes) — same flow.
5. Question 3 (Systems) — same flow.
6. **Reveal screen**: shows all 3 questions with correct answer, user's selection, certainty, score change, full explanation, and source URL on mom.gov.sg.
7. Total day score (range −90 to +90) displayed prominently with the dino reacting accordingly.
8. CTA to view weekly leaderboard.

### Hard rules
- One submission per question per user per SGT day. No retries, no edits.
- Questions must be answered in order (1 → 2 → 3) in one sitting.
- If the user closes the tab mid-session, on return: any submitted question stays submitted; any unsubmitted current question shows as forfeited (see §4 timeout handling) and the user resumes at the next question. **(Open question — see §17.)**
- All dates are **SGT (UTC+8)**. Reuse `getTodaySGT()` pattern from `api/_lib/dates.ts`.

### Timer behaviour (per question)
- 30s countdown begins when the question renders.
- Last 5s: visual urgency cue (timer turns red, dino looks nervous).
- At 0s, whatever the user has selected is submitted. If **no option** was selected, record the attempt as `submitted_answer = null`, treated as **incorrect with Low certainty** (−1). If **option but no certainty** was selected, default to **Medium certainty**. *(Recommendation — confirm in §17.)*

---

## 4. Scoring system

Symmetric multipliers. The user's daily score is the sum of three question scores.

| Outcome | Low | Medium | High |
|---|---|---|---|
| Correct | +10 | +20 | +30 |
| Incorrect | −10 | −20 | −30 |

**Daily score range:** −90 to +90.
**Calibration metric** (used for tiebreaks and stats, not displayed prominently): % of High-certainty answers that were correct, lifetime.

### Why symmetric, why round numbers
- Easy to explain in one sentence: "more confident, more points — both ways."
- 10/20/30 reads better on leaderboards than 1/2/3 (a +60 day looks like an achievement; a +6 day looks like a typo).
- Penalties matched to rewards keeps the certainty choice meaningful. Asymmetric variants are noted as future tuning levers but not MVP.

### What the UI shows after each reveal
- "+30" or "−20" rendered prominently next to the question with colour (green for positive, coral for negative).
- A one-line breakdown: e.g. "Correct + High certainty = +30" or "Incorrect + High certainty = −30 (ouch)".

---

## 5. Question taxonomy

Each daily set contains exactly one question from each category.

### 5.1 Policies
Questions about **what the rules are**. Eligibility criteria, salary thresholds, quotas, dependant rules, regulatory updates, exceptions.
**Sources:** mom.gov.sg `/passes-and-permits/...`, MOM press releases, statutes referenced from MOM pages.
**Example seed topics:** EP minimum qualifying salary by sector; S Pass quota and levy tiers; dependant pass eligibility; COMPASS framework points; in-principle approval validity period.

### 5.2 Processes
Questions about **how things are done operationally**. Application steps, supporting documents, timelines, appeals, cancellations, renewals, pre-approval and post-approval procedures.
**Sources:** MOM how-to pages, FAQ pages, EP Online / WPOL help docs.
**Example seed topics:** documents required for an EP renewal; what to do when a work pass is rejected; cancellation timelines on departure; appeal mechanisms.

### 5.3 Systems
Questions about **the digital tools**. EP Online, Work Permit Online (WPOL), MyMOM Portal, SGWorkPass mobile app, CorpPass interactions, gov.sg payment flows.
**Sources:** Help docs and feature pages for each system.
**Example seed topics:** which transactions require CorpPass vs. SingPass; what SGWorkPass shows; how to delegate access in EP Online.

> **Note for question authoring:** if a question could plausibly belong to two categories, file it under the one most central to the user's daily work. Borderline cases should be flagged in TSV review.

---

## 6. Question generation pipeline

Heavily simplified vs. SG Math Whiz — **no PDF extraction, no standalone AI script, no API key.** Drafting is done interactively in a Claude Code session using its built-in `WebFetch` / `WebSearch` tools.

```
data/sources/sources.tsv     ← PO maintains: url, category, notes, drafted (Y/N)
        │
        ▼
PO runs `claude` in the repo and asks Claude Code to draft N undrafted rows
        │  Claude Code:
        │    1. reads sources.tsv
        │    2. WebFetches each pending URL
        │    3. drafts MCQ + 4 options + correct answer + explanation + verbatim quote
        │    4. appends rows directly to data/review/questions-for-review.tsv
        │    5. flips drafted=Y in sources.tsv
        ▼
data/review/questions-for-review.tsv  ← PO reviews, edits, sets approved=Y
        │
        ▼
scripts/import-questions.ts  → Supabase questions table (date = NULL initially)
        │
        ▼
scripts/schedule-questions.ts  → assigns dates, balanced 1-per-category-per-day
```

### Why no Gemini script
For an MVP at this volume (~90 questions for launch, then a steady trickle), a generation script is overkill. Claude Code already has web access, can read MOM pages directly, and can produce a TSV in one session. Skipping the script removes:
- a Gemini API key dependency,
- a resumable state file,
- another `scripts/*.ts` to maintain.

The PO simply opens Claude Code, says "draft the next 20 undrafted rows from sources.tsv into questions-for-review.tsv", reviews the output, and moves on. Resumability is the session itself — `drafted=Y` in sources.tsv is the cursor.

If volume ever grows past what's pleasant to do interactively, a `scripts/generate-questions.ts` (Gemini Flash, mirroring SG Math Whiz `ingest.ts`) can be added — but it's not MVP.

### Pipeline rules
- **Drafting tool:** Claude Code interactive session. PO supplies the prompt; Claude does the WebFetches and TSV writes.
- **Source quoting:** the drafting prompt must require Claude to include a verbatim quote from the mom.gov.sg page that supports the correct answer, into the `explanation` field. This is the PO's primary verification handle.
- **Hallucination guard:** if a fetched page doesn't actually answer the intended question, Claude must skip it (leave `drafted=N`, add a note in sources.tsv) rather than invent a question. State this explicitly in the drafting prompt.
- **Diagrams:** out of scope for MVP. Drop the entire `data/diagrams/` and `question-diagrams` Storage bucket pattern.
- **PO review TSV columns:**
  `source_url`, `category` (policies/processes/systems), `question_text`, `option_a`, `option_b`, `option_c`, `option_d`, `correct_option` (A/B/C/D), `explanation`, `source_quote`, `source_fetched_at`, `difficulty` (easy/medium/hard), `notes`, `approved` (Y/N).
- **Manual additions:** PO can add rows directly to the TSV with all fields filled, then re-run import. Same as SG Math Whiz.

### Standing drafting prompt (template the PO keeps in the repo)
Save as `prompts/draft-questions.md` for reuse:
> "Read `data/sources/sources.tsv`. Pick up to N rows where drafted=N. For each: WebFetch the URL, identify a question a knowledgeable MOM colleague might still get wrong, draft it with 4 plausible options, mark the correct one, write a 1–3 paragraph explanation, and include a verbatim quote from the page supporting the answer. Append rows to `data/review/questions-for-review.tsv` with approved=N. If a page doesn't support a clean question, skip it and add a note. Then flip drafted=Y for processed rows."

### Scheduling
`schedule-questions.ts` assigns dates such that each calendar day has exactly one approved unscheduled question per category. If any category lacks supply, the script fails loudly and tells the PO which category is short. **No silent fallback.**

---

## 7. Solution & explanation flow

Solutions are revealed **only after all 3 questions in a session are submitted**. This was a deliberate choice over per-question reveals — preserves momentum and avoids the user "studying" Q1's answer before facing Q2.

### Reveal screen contents
For each question, show:
- The question and four options.
- User's selected option, marked.
- Correct option, marked.
- User's certainty level.
- Score delta (+3, −1, etc.) with colour coding.
- Explanation text (1–3 paragraphs).
- "Read more on mom.gov.sg" link to the exact source URL.

After all three are reviewed:
- Total day score, big.
- Dino reaction matched to score band (see §9 mascot states).
- Buttons: "View leaderboard", "See past challenges".

---

## 8. Leaderboards

Two boards. Both list all users who have played at least once.

### 8.1 Weekly
- Window: past 7 days, **today inclusive** (today is day 7).
- Metric: sum of daily scores in the window. Days not played count as 0.
- Tiebreaker: higher calibration % over the window, then alphabetical.
- Resets implicitly: rolling window, no hard reset.

### 8.2 Overall
- Metric: sum of all daily scores ever, alongside **days played** count.
- Display: rank, display name, total score, days played, calibration %.
- Tiebreaker: more days played, then higher calibration %, then alphabetical.

### Display rules
- Highlight the current user's row.
- Top 50 visible; current user always pinned visible if outside top 50.
- Pure server-side rendering of ranks (no client-side sorting); reuse SG Math Whiz `api/leaderboard/...` pattern.

---

## 9. UX, theme, and visual direction

### Tone
Witty + playful + workplace-safe. Think: a colleague made a tasteful indie game, not a corporate intranet form, not Duolingo's owl. Copy should occasionally make the user smile but never crack a joke that would feel out of place in an MOM Slack channel.

### Mascot
A friendly cartoon dinosaur. **The PO will provide the reference image.** Until then, treat the mascot as a placeholder with the following expected states:
- **Idle / welcoming** (home page, pre-challenge).
- **Thinking** (during a question).
- **Cheering** (correct answer in reveal).
- **Sad / sheepish** (incorrect answer in reveal).
- **Triumphant** (positive total day score).
- **Defeated but optimistic** (negative total day score).
- **Streak / milestone** (first time a user clears all 3 with high certainty correct).

### Colour palette (placeholder — finalise once mascot reference arrives)
Build the design tokens via Tailwind v4 `@theme` in `src/index.css`, same approach as SG Math Whiz. Suggested starting tokens (replace once mascot is in):

| Token | Suggested | Use |
|---|---|---|
| `bg-primary` | warm off-white `#FFFCF5` | Page background |
| `bg-card` | `#FFFFFF` | Cards |
| `accent-primary` | dino green `#5BB85C` | CTAs, correct |
| `accent-warm` | sunshine `#F4C95D` | Highlights, certainty=High |
| `accent-coral` | `#F46A6A` | Errors, incorrect |
| `text-primary` | near-black `#1F2937` | Body |
| `text-secondary` | slate `#64748B` | Meta |

Fonts: a friendly rounded sans for body (e.g. **Nunito** or **DM Sans**), a slightly more characterful display face for headers (e.g. **Fraunces** or keep DM Sans Bold). Mono only if needed for source URLs.

### Key screens
1. **Home / Today** — dino greeting, "Start today's challenge" or recap if played.
2. **Challenge** — single question card, 4 options, certainty selector, prominent timer. Minimalist; nothing distracting.
3. **Reveal** — long-scroll review of all 3 questions with explanations and source links.
4. **Past challenges** — list of past days; user can re-read questions and their own attempts (not retake).
5. **Leaderboards** — tabs: Weekly | Overall.
6. **Profile / me** — display name, days played, total score, calibration %, longest streak.

### Animation
Reuse Framer Motion. Keep transitions snappy (150–250ms). Reserve big motion moments for the reveal screen — the dino's reaction is the emotional payoff.

---

## 10. Stack & architecture

Identical to SG Math Whiz unless explicitly diverged.

- **Frontend:** React 19 + TypeScript + Vite + Tailwind v4 (CSS `@theme`, no `tailwind.config.js`).
- **Backend:** Vercel Serverless Functions (`api/**/*.ts`) using `@vercel/node`.
- **Database:** Supabase Postgres. Service role key for `api/` and scripts; anon key in frontend.
- **Storage:** Not needed for MVP (no diagrams). Provision a bucket only if a future question requires it.
- **Animation:** Framer Motion.
- **Local dev:** `vercel dev`.
- **Auth:** username in localStorage, sent as `x-user-id` header. Same pattern as `api/_lib/auth.ts`.
- **Dates:** SGT helpers, same as `api/_lib/dates.ts`.

### Architectural rules to carry over
- `correct_option` and `explanation` are **never** sent to the frontend before that question is submitted. The "today" endpoint returns only the prompt and options.
- Submit endpoint validates server-side that the user hasn't already submitted that question today.
- Race-condition pattern from SG Math Whiz `ChallengePage` (the "wait for both animation timer AND API response, with `apiReady` as state not ref") **may** apply if there's a between-question reveal animation; for MVP the simpler model is enough since the per-question reveal is deferred to end-of-session.

---

## 11. Database schema

Apply migrations manually via Supabase SQL editor. No Supabase CLI link.

```sql
-- users
create table users (
  id text primary key,                 -- localStorage userId; either crypto.randomUUID (username-only) or assigned at first Google sign-in
  display_name text not null,
  google_sub text unique,              -- NULL for username-only users; set on first Google sign-in
  created_at timestamptz default now()
);
create index on users (google_sub) where google_sub is not null;

-- questions
create table questions (
  id uuid primary key default gen_random_uuid(),
  date date,                           -- nullable until scheduled
  category text not null check (category in ('policies','processes','systems')),
  question_text text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_option char(1) not null check (correct_option in ('A','B','C','D')),
  explanation text not null,
  source_url text not null,
  difficulty text check (difficulty in ('easy','medium','hard')),
  created_at timestamptz default now(),
  unique (date, category)              -- enforce 1 per category per day
);

-- attempts
create table attempts (
  id uuid primary key default gen_random_uuid(),
  user_id text references users(id),
  question_id uuid references questions(id),
  submitted_option char(1) check (submitted_option in ('A','B','C','D')),  -- nullable for timeout-no-answer
  certainty text not null check (certainty in ('low','medium','high')),
  is_correct boolean not null,
  score_delta int not null,             -- −30, −20, −10, +10, +20, +30
  created_at timestamptz default now(),
  unique (user_id, question_id)
);

-- daily_summaries (optional but useful for fast leaderboard queries)
create table daily_summaries (
  user_id text references users(id),
  date date not null,
  total_score int not null,
  questions_answered int not null,      -- 0..3
  high_correct int not null default 0,
  high_total int not null default 0,
  primary key (user_id, date)
);
```

### Indexes
- `attempts (user_id, created_at desc)` for profile history.
- `daily_summaries (date desc, total_score desc)` for weekly board.
- `questions (date)` for today's lookup.

### Migrations directory
`supabase/migrations/` — same pattern as SG Math Whiz.

---

## 12. API surface

Mirror SG Math Whiz file layout.

| Route | Method | Purpose |
|---|---|---|
| `api/auth/google-signin.ts` | POST | Body: `{ accessToken }`. Verifies via Supabase, upserts `users` row by `google_sub`. Returns `{ userId, displayName, isNewUser? }`. Edge runtime. |
| `api/register.ts` | POST | Body: `{ userId, displayName }`. Username-only fallback. Creates `users` row with `google_sub = NULL`. |
| `api/today.ts` | GET | Returns today's 3 questions (no answer/explanation). Cached per SGT day. |
| `api/submit.ts` | POST | Body: `{ questionId, submittedOption \| null, certainty }`. Returns `{ ok: true }` only. No reveal data. |
| `api/reveal.ts` | GET | Returns reveal data (correct option, explanation, source_url, score_delta) for **today's already-submitted questions** for this user. 403 if any of the 3 hasn't been submitted yet. |
| `api/question/[date].ts` | GET | Past challenge for a specific date. Includes reveal data if the user attempted it; otherwise locked. |
| `api/past-challenges.ts` | GET | List of past dates with the user's score per day. |
| `api/me.ts` | GET | Profile stats: total score, days played, calibration %, current streak. |
| `api/leaderboard/weekly.ts` | GET | Past 7 days inclusive. |
| `api/leaderboard/overall.ts` | GET | All-time totals + days played. |

### `api/_lib/`
- `supabase.ts` — service-role client.
- `auth.ts` — `getUserId(req)` reads `x-user-id`.
- `dates.ts` — `getTodaySGT()`, `addDaysSGT()`.
- `scoring.ts` — `computeScore(isCorrect, certainty)` returning the integer delta. Pure function, exhaustively unit-tested.

---

## 13. Pages & routes

| Route | Component | Notes |
|---|---|---|
| `/` | `HomePage` | Greeting, today's status (not started / in progress / done). |
| `/play` | `ChallengePage` | The 3-question session. State machine: idle → q1 → q2 → q3 → reveal. |
| `/reveal` | `RevealPage` | Today's full reveal. Re-accessible after first view. |
| `/past` | `PastChallengesPage` | Calendar or list of past days. |
| `/past/:date` | `PastChallengeDetailPage` | One day's questions + user's attempts (if any). |
| `/leaderboard` | `LeaderboardPage` | Tabs: Weekly / Overall. |
| `/me` | `MePage` | Profile + stats. |
| `/login` | `LoginPage` | "Continue with Google" (primary) + "Continue without signing in" (fallback → display-name modal). |

State machine on `/play` is the trickiest piece — the same "wait for animation" race that the SG Math Whiz `ChallengePage` solved is **not** required here because there's no per-question reveal animation. Keep it simple: one question at a time, advance immediately on submit/timeout.

---

## 14. Daily lifecycle

- **00:00 SGT** — new day rolls over. Today's 3 questions become available; previous day's becomes a "past challenge".
- **No batch jobs required** — the `api/today.ts` endpoint queries by `date = today_sgt()`. Scheduling is the only step that needs to have run far enough in advance.
- **PO operational responsibility:** ensure scheduled questions run at least 30 days ahead at all times. (Open: lightweight runbook / weekly check.)

---

## 15. Auth & identity

Mirror the SG Math Whiz pattern: **Google OAuth via Supabase Auth**, with a username-only fallback for users who don't want to sign in with Google.

### Pattern (port from SG Math Whiz)
- Frontend: Supabase JS client. `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, queryParams: { prompt: 'select_account' } } })` triggers the OAuth redirect.
- On return, frontend reads the session, posts the `access_token` to `/api/auth/google-signin`.
- Backend: `api/auth/google-signin.ts` (edge runtime) calls `supabase.auth.getUser(accessToken)` to verify, then upserts the `users` row keyed on `google_sub`. Returns `{ userId, displayName }`.
- Frontend stores `userId` and `displayName` in localStorage and uses them for the `x-user-id` header on subsequent API calls.
- `AuthContext` provider wraps the app, exposing `signInWithGoogle()`, `register(displayName)` (the fallback path), `userId`, `displayName`, `isAuthenticated`, `isLoading`. Mirrors `src/context/AuthContext.tsx`.

### Username-only fallback
For colleagues who don't want to use Google:
- "Continue without signing in" link on the login screen.
- Modal asks for a display name.
- POST `/api/register` with `{ userId: crypto.randomUUID(), displayName }` — creates a `users` row with `google_sub = NULL`.
- Stored in localStorage and used the same way.

### Server-side verification
- `api/_lib/auth.ts` reads `x-user-id` header and looks up the user in Supabase. If the row doesn't exist, return 401. Same minimal pattern as SG Math Whiz `authenticateRequest`.
- We are not re-verifying the Google token on every request — once `users.google_sub` is set, the `userId` is the source of truth. This is a deliberate trade-off: it's an internal-colleague MVP, not a security-critical app.

### Required Supabase setup (one-time)
- Enable Google provider in Supabase Auth dashboard.
- Add the Vercel deployment URL and `localhost:3000` to authorised redirect URLs.
- Add the Google OAuth client ID + secret in Supabase.

### Display name
- Pulled from Google profile (`full_name` → `name` → email local-part → "Player"), capped at 30 chars.
- Editable on `/me` for both Google-auth and username-only users.
- `id` is permanent.

---

## 16. What gets built first (MVP cut)

**In MVP:**
- All 9 routes / pages above.
- Question generation pipeline end-to-end.
- ~30 days of approved questions ready at launch (90 questions total: 30 per category).
- Both leaderboards.
- Mascot integrated across mood states.

**Deferred (post-MVP):**
- Streaks (longer than current daily).
- Push / email reminders.
- Sharing cards (e.g. "I scored +7 today on Work Pass Dinosaur").
- Per-category leaderboards.
- Difficulty-adjusted scoring.
- Achievements / badges.
- Anti-cheat beyond the unique constraint.
- Mobile-native app.
- A "study mode" for past questions.

---

## 17. Open questions / decisions to confirm

1. **Timeout with no answer.** Recommendation: record as Incorrect + Low certainty (−10). Alternative: −20 (Med) to discourage running out the clock. Confirm.
2. **Mid-session abandonment.** Recommendation: forfeit the in-progress question (treat as timeout) and lock further play for the day. Alternative: allow resuming any time before SGT midnight. Confirm.
3. **Question bank size at launch.** Recommendation: 90 approved questions = 30 days of content. Lower bound: 30 (10 days). Confirm based on how much PO review time you can budget.
4. **Mascot reference image** — pending PO upload. Will drive final colour palette.
5. **Calibration % display.** Recommendation: show on `/me` only, not on leaderboards (avoid users gaming it). Confirm.
6. **Source URL freshness.** mom.gov.sg pages can change. Recommendation: store a `source_fetched_at` timestamp on each question and surface a small "as of <date>" note next to the source link. Confirm.

---

## 18. Differences from SG Math Whiz at a glance

| Area | SG Math Whiz | Work Pass Dinosaur |
|---|---|---|
| Frequency | 1 question/day | 3 questions/day (categorised) |
| Format | Free-text answer | Multiple choice + certainty |
| Ranking | Speed + correctness | Score-only (weekly + overall) |
| Source ingestion | PDF extraction via Gemini script | URL → drafting in Claude Code session (no script, no API key) |
| Diagrams | Yes (Storage bucket) | No (MVP) |
| Solution timing | Next day | Same session, after all 3 |
| Audience | Adults 25–55 | MOM colleagues |
| Tone | Earnest / nostalgic | Witty / playful (with dino) |
| Mascot | None | Dino, central to UX |

---

## 19. Engineering principles to carry over from CLAUDE.md

- All architectural decisions stay with the PO.
- Migrations applied manually via Supabase SQL editor.
- Don't introduce abstractions beyond what the task needs.
- Don't add features, fallbacks, or backwards-compat shims without being asked.
- Run `npm run build` before any push to production. Fix TS errors, don't suppress.
- Default to no comments. Only when WHY is non-obvious.
- Keep `data/` gitignored.
- `correct_option` never crosses the API boundary before submission.

---

## 20. Naming, domain, deployment

- **Repo name:** `work-pass-dinosaur`.
- **Local dev:** `vercel dev`.
- **Production:** Vercel project named `work-pass-dinosaur`. Custom domain TBD.
- **Supabase project:** new project, separate from SG Math Whiz. Service role key in Vercel env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`); anon key (`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`) for the frontend bundle.
- **Google OAuth:** configured in Supabase Auth dashboard (provider: Google). Authorised redirect URLs: production domain + `localhost:3000`.
- **AI keys:** none. Question drafting runs through the PO's Claude Code session, not a server-side API.

---

*End of PRD. Hand this file to a fresh Claude Code session in the new repo together with the mascot reference image and `sources.tsv` seed list.*
