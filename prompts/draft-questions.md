# Work Pass Dinosaur — Standing Question Drafting Prompt

Use this prompt (or a close variant) when starting a Claude Code drafting session.

---

## Prompt template

> Read `data/review/questions-for-review.tsv` to see what has already been drafted (look at the `source_url` and `category` columns). Then draft **[N]** new questions — aim for equal distribution across `policies`, `processes`, and `systems` unless I specify otherwise.
>
> For each question:
> 1. Use `WebSearch` with site-restricted queries (e.g. `site:mom.gov.sg employment pass eligibility`) to find a relevant, authoritative source page.
> 2. Use `WebFetch` to read the page.
> 3. Identify a question that a knowledgeable MOM colleague might still get wrong — edge cases, exception clauses, recently-updated rules, or subtle distinctions between work pass types.
> 4. Draft it as a 4-option multiple-choice question with exactly one correct answer.
> 5. Write a 1–3 paragraph explanation supporting the correct answer.
> 6. Include a **verbatim quote** from the source page in the `source_quote` field. This is my primary verification handle — if you cannot find a verbatim quote that directly supports the correct answer, skip this question.
> 7. Append a new row to `data/review/questions-for-review.tsv` with `approved=N`.
>
> **Hard rules:**
> - If a fetched page does not cleanly support a question (page is too vague, the rule is unclear, or the content has changed since the URL was indexed), skip it — add a one-line note in the `notes` field and move on. Never invent or extrapolate.
> - Do not draft a question from a `source_url` already present in the TSV.
> - Difficulty should be `hard` unless the question is genuinely straightforward — the target audience already works with these passes daily.

---

## Authorised source whitelist

**Primary (use freely):**
- Any `mom.gov.sg` subpath — passes and permits, press releases, FAQs, EP Online help, WPOL help, SGWorkPass help, employer guides.

**Secondary (only if the question is directly answered there):**
- `ica.gov.sg` — for Long Term Visit Pass, Dependant's Pass questions that cross to ICA.
- `mas.gov.sg` — for financial-sector EP questions.
- `gov.sg` — for CorpPass / SingPass operational questions.
- `sso.agc.gov.sg` (Singapore Statutes Online) — only when an MOM page references a specific statute and the statute text resolves the question.

**Disallowed:**
- Immigration consultants' marketing pages.
- Expat forums, community FAQs, Reddit, Quora.
- News outlets (unless republishing an MOM press release verbatim with a clearly attributed source).
- Blogs, LinkedIn posts, unofficial guides.
- AI-generated summaries of MOM rules (e.g. ChatGPT-written articles).

---

## TSV column reference

`source_url` | `category` | `question_text` | `option_a` | `option_b` | `option_c` | `option_d` | `correct_option` | `explanation` | `source_quote` | `source_fetched_at` | `difficulty` | `notes` | `approved`

- `category`: must be exactly `policies`, `processes`, or `systems`.
- `correct_option`: exactly `A`, `B`, `C`, or `D`.
- `source_fetched_at`: ISO 8601 date (e.g. `2026-04-25`).
- `difficulty`: `easy`, `medium`, or `hard`.
- `approved`: set to `N`; PO flips to `Y` after review.

---

## Topic areas to cover (non-exhaustive)

**Policies:** EP minimum qualifying salary by sector (COMPASS); S Pass quota and levy tiers; Dependant's Pass eligibility by pass type; LOC eligibility; in-principle approval validity; EP renewal criteria; COMPASS framework points and bonuses; EP/S Pass holders switching employers; salary increment requirements on renewal; Fair Consideration Framework obligations.

**Processes:** documents required for EP/S Pass application or renewal; EP Online vs WPOL transaction routing; what to do when a work pass is rejected; appeal mechanisms and timelines; cancellation and notification obligations on resignation/termination; how to get a reference number; pre-approval and post-approval steps for employers; re-entry permit interactions.

**Systems:** EP Online functions vs WPOL functions; CorpPass vs SingPass access for employers; what the SGWorkPass mobile app shows vs EP Online; how to delegate access within EP Online; MyMOM Portal self-service features; CorpPass sub-user setup for HR; payment flows for levies and application fees.
