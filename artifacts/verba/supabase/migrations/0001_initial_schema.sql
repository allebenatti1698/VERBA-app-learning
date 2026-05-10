-- Verba — initial schema
-- Run in Supabase SQL Editor (project dashboard → SQL Editor → New query)

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. decks
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists decks (
  slug          text primary key,
  name          text not null,
  description   text,
  color_family  text not null,
  total_words   integer default 0
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. words
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists words (
  id                  uuid primary key default gen_random_uuid(),
  deck_slug           text references decks(slug) on delete cascade,
  word                text not null,
  difficulty          text check (difficulty in ('easy','medium','hard')),
  frequency_rank      integer,
  italian_translation text,
  synonyms            text[] default '{}',
  antonyms            text[] default '{}',
  distractors         text[] default '{}',
  source              text,
  created_at          timestamptz default now()
);
create index if not exists idx_words_deck_difficulty on words(deck_slug, difficulty);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. word_definitions (multi-definition support)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists word_definitions (
  id              uuid primary key default gen_random_uuid(),
  word_id         uuid references words(id) on delete cascade,
  part_of_speech  text not null,
  definition      text not null,
  example         text,
  display_order   integer default 0
);
create index if not exists idx_word_definitions_word on word_definitions(word_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. user_word_progress (SRS + mastery)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists user_word_progress (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete cascade,
  word_id             uuid references words(id) on delete cascade,
  consecutive_correct integer default 0,
  total_correct       integer default 0,
  total_seen          integer default 0,
  status              text default 'learning' check (status in ('learning','reviewing','mastered')),
  last_seen_at        timestamptz,
  next_review_at      timestamptz,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  unique(user_id, word_id)
);
create index if not exists idx_progress_user on user_word_progress(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. user_sessions
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists user_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  deck_slug     text references decks(slug),
  difficulty    text,
  word_count    integer,
  correct_count integer,
  duration_ms   integer,
  completed_at  timestamptz default now()
);
create index if not exists idx_sessions_user on user_sessions(user_id, completed_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. user_my_verba
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists user_my_verba (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid references auth.users(id) on delete cascade,
  word_id   uuid references words(id) on delete cascade,
  saved_at  timestamptz default now(),
  unique(user_id, word_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. user_settings
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists user_settings (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  feedback_card_visible  boolean default true,
  translation_language   text default 'it',
  quiz_mode_default      text default 'multiple_choice',
  updated_at             timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────
alter table decks               enable row level security;
alter table words               enable row level security;
alter table word_definitions    enable row level security;
alter table user_word_progress  enable row level security;
alter table user_sessions       enable row level security;
alter table user_my_verba       enable row level security;
alter table user_settings       enable row level security;

-- Public read access for catalog tables (anon + authenticated)
drop policy if exists "decks_public_read"            on decks;
drop policy if exists "words_public_read"            on words;
drop policy if exists "word_definitions_public_read" on word_definitions;

create policy "decks_public_read"
  on decks for select
  to anon, authenticated
  using (true);

create policy "words_public_read"
  on words for select
  to anon, authenticated
  using (true);

create policy "word_definitions_public_read"
  on word_definitions for select
  to anon, authenticated
  using (true);

-- Per-user policies: users can only touch their own rows
drop policy if exists "user_word_progress_owner" on user_word_progress;
create policy "user_word_progress_owner"
  on user_word_progress for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_sessions_owner" on user_sessions;
create policy "user_sessions_owner"
  on user_sessions for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_my_verba_owner" on user_my_verba;
create policy "user_my_verba_owner"
  on user_my_verba for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_settings_owner" on user_settings;
create policy "user_settings_owner"
  on user_settings for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
