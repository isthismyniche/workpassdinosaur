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
> - Multiple questions from the same `source_url` are fine **only if each tests a clearly distinct fact** (e.g. one on quota, another on security bond, another on age). Don't draft near-duplicates.
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

## Distribution targets (load-bearing)

Every batch should rebalance toward gaps in `data/review/questions-for-review.tsv`. Count what's already drafted by category AND by pass type before picking topics.

**Policies** — even mix across the four pass types:
- Employment Pass (EP)
- S Pass
- Work Permit (WP)
- Migrant Domestic Worker (MDW) Work Permit

**Processes** — same four pass types, but **bias toward Work Permit and MDW WP**. They have more procedural steps even though those steps tend to be less represented on the web — so harder to find, but more valuable to teach.

**Systems** — restrict to these only:
- **EP eService** (formerly EP Online)
- **WP eService**
- **MDW eService**
- **SGWorkPass** (mobile app + digital pass)
- **Work Permit Online** (where distinct from WP eService)

**Leave out MyCareersFuture entirely** — it sits under a different agency, not MOM, and is out of scope for this app.

## Reader's lens

Frame every question from the perspective of a citizen or business HR person reading mom.gov.sg trying to make sense of things. Not a regulator's perspective. Not exam-style trivia.

Difficulty should come from subtle distinctions, exception clauses, edge cases, and counter-intuitive rules — **not** from memorising specific dollar amounts or dates without consequence. A good test: if the correct answer is just a number, ask whether the reader walks away with a useful real-world implication. If not, find a different angle on the same source.

## Topic areas to cover (non-exhaustive)

**Policies:** EP/S Pass minimum qualifying salary by sector and age; COMPASS framework, exemptions, and bonus criteria (C1–C6); WP source-country and sector rules; WP and S Pass quotas, sub-DRC, and levy tiers; MDW eligibility for both employer and helper; security bond rules for WP/MDW; Dependant's Pass eligibility by pass type; LOC eligibility (DP business owners, LTVP); ONE Pass and PEP eligibility and renewal; Fair Consideration Framework obligations.

**Processes:** documents required for application or renewal across all four pass types; cancellation timelines and notification obligations; appeal mechanisms and timelines; pre- and post-arrival processes for WP and MDW (medical exam, settling-in programme, thumbprint, card collection); IPA validity and extension; renewal medical examination (six-monthly FME) for WP holders; repatriation obligations; in-principle approval to issuance.

**Systems:** EP eService capabilities and scope; WP eService and Work Permit Online for WP transactions; MDW eService for MDW-specific transactions; SGWorkPass mobile app — digital pass, QR verification by employers, notifications; how the system landscape splits across pass types; CorpPass access requirements for each system.
