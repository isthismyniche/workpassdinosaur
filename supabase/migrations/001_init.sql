-- ============================================================
-- Work Pass Dinosaur — initial schema
-- Apply manually via Supabase SQL editor.
-- ============================================================

-- users
create table users (
  id            text primary key,
  display_name  text not null,
  google_sub    text unique,
  created_at    timestamptz default now()
);

create index on users (google_sub) where google_sub is not null;

-- questions
create table questions (
  id               uuid primary key default gen_random_uuid(),
  date             date,
  category         text not null check (category in ('policies', 'processes', 'systems')),
  question_text    text not null,
  option_a         text not null,
  option_b         text not null,
  option_c         text not null,
  option_d         text not null,
  correct_option   char(1) not null check (correct_option in ('A', 'B', 'C', 'D')),
  explanation      text not null,
  source_url       text not null,
  source_fetched_at date,
  difficulty       text check (difficulty in ('easy', 'medium', 'hard')),
  created_at       timestamptz default now(),
  unique (date, category)
);

create index on questions (date);

-- attempts
create table attempts (
  id               uuid primary key default gen_random_uuid(),
  user_id          text references users(id),
  question_id      uuid references questions(id),
  submitted_option char(1) check (submitted_option in ('A', 'B', 'C', 'D')),
  certainty        text not null check (certainty in ('low', 'medium', 'high')),
  is_correct       boolean not null,
  score_delta      int not null,
  created_at       timestamptz default now(),
  unique (user_id, question_id)
);

create index on attempts (user_id, created_at desc);

-- daily_summaries (materialised per-day totals for fast leaderboard queries)
create table daily_summaries (
  user_id           text references users(id),
  date              date not null,
  total_score       int not null,
  questions_answered int not null default 0,
  high_correct      int not null default 0,
  high_total        int not null default 0,
  primary key (user_id, date)
);

create index on daily_summaries (date desc, total_score desc);
create index on daily_summaries (user_id, date desc);
