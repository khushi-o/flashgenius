-- FlashGenius initial schema + RLS + storage policies
-- Run via Supabase CLI or paste into SQL Editor (order matters).
-- On an existing project: run ONCE only. If you see "relation ... already exists", the DB
-- already has this schema — do not re-paste this file. For storage-only repair see
-- ../snippets/storage_pdfs_policies_idempotent.sql

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- PROFILES (1:1 with auth.users)
-- ─────────────────────────────────────────────
create table public.profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  updated_at   timestamptz default now()
);

create or replace function public.handle_new_user ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user ();

-- ─────────────────────────────────────────────
-- DECKS
-- ─────────────────────────────────────────────
create table public.decks (
  id                  uuid primary key default gen_random_uuid (),
  user_id             uuid not null references auth.users (id) on delete cascade,
  title               text not null,
  tone_preset         text not null default 'exam-crisp'
    check (tone_preset in ('exam-crisp', 'deep-understanding', 'quick-recall')),
  status              text not null default 'draft'
    check (status in ('draft', 'uploading', 'extracting', 'generating', 'ready', 'error')),
  source_storage_path text,
  source_filename     text,
  generation_error    text,
  card_count          int not null default 0,
  last_studied_at     timestamptz,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index idx_decks_user_updated on public.decks (user_id, updated_at desc);
create index idx_decks_user_title on public.decks (user_id, title);

-- ─────────────────────────────────────────────
-- DECK CHUNKS
-- ─────────────────────────────────────────────
create table public.deck_chunks (
  id          uuid primary key default gen_random_uuid (),
  deck_id     uuid not null references public.decks (id) on delete cascade,
  chunk_index int not null,
  content     text not null,
  page_start  int,
  page_end    int,
  created_at  timestamptz default now()
);

create index idx_chunks_deck on public.deck_chunks (deck_id, chunk_index);

-- ─────────────────────────────────────────────
-- CARDS
-- ─────────────────────────────────────────────
create table public.cards (
  id               uuid primary key default gen_random_uuid (),
  deck_id          uuid not null references public.decks (id) on delete cascade,
  user_id          uuid not null references auth.users (id) on delete cascade,
  card_type        text not null
    check (card_type in ('definition', 'contrast', 'misconception', 'procedure', 'cloze')),
  front            text not null,
  back             text not null,
  difficulty       smallint not null default 2 check (difficulty between 1 and 3),
  importance       smallint check (importance between 1 and 3),
  source_page      int,
  source_hint      text,
  ease_factor      numeric not null default 2.5,
  interval_days    int not null default 0,
  repetitions      int not null default 0,
  next_review_at   timestamptz,
  last_reviewed_at timestamptz,
  created_at       timestamptz default now (),
  updated_at       timestamptz default now ()
);

create index idx_cards_deck_review on public.cards (deck_id, next_review_at);
create index idx_cards_deck_created on public.cards (deck_id, created_at);
create index idx_cards_user on public.cards (user_id);

-- ─────────────────────────────────────────────
-- REVIEW EVENTS
-- ─────────────────────────────────────────────
create table public.review_events (
  id          uuid primary key default gen_random_uuid (),
  card_id     uuid not null references public.cards (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  grade       text not null check (grade in ('again', 'hard', 'good', 'easy')),
  sm2_quality smallint not null check (sm2_quality between 0 and 5),
  reviewed_at timestamptz default now ()
);

create index idx_reviews_user_date on public.review_events (user_id, reviewed_at desc);
create index idx_reviews_card_date on public.review_events (card_id, reviewed_at desc);

-- ─────────────────────────────────────────────
-- updated_at triggers
-- ─────────────────────────────────────────────
create or replace function public.set_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_decks_updated
before update on public.decks
for each row
execute function public.set_updated_at ();

create trigger trg_cards_updated
before update on public.cards
for each row
execute function public.set_updated_at ();

-- ─────────────────────────────────────────────
-- CARD COUNT SYNC
-- ─────────────────────────────────────────────
create or replace function public.sync_card_count ()
returns trigger
language plpgsql
as $$
declare
  target uuid;
begin
  target := coalesce(new.deck_id, old.deck_id);
  update public.decks d
  set card_count = (select count(*)::int from public.cards c where c.deck_id = target)
  where d.id = target;
  return null;
end;
$$;

create trigger trg_card_count_insert
after insert on public.cards
for each row
execute function public.sync_card_count ();

create trigger trg_card_count_delete
after delete on public.cards
for each row
execute function public.sync_card_count ();

-- ─────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.decks enable row level security;
alter table public.deck_chunks enable row level security;
alter table public.cards enable row level security;
alter table public.review_events enable row level security;

create policy "users manage own profile"
on public.profiles
for all
using (user_id = auth.uid ());

create policy "users manage own decks"
on public.decks
for all
using (user_id = auth.uid ());

create policy "users access own chunks"
on public.deck_chunks
for all
using (
  deck_id in (
    select id
    from public.decks
    where user_id = auth.uid ()
  )
);

create policy "users manage own cards"
on public.cards
for all
using (user_id = auth.uid ());

create policy "users manage own reviews"
on public.review_events
for all
using (user_id = auth.uid ());

-- ─────────────────────────────────────────────
-- STORAGE: pdfs bucket — path pattern {user_id}/{deck_id}/file.pdf
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('pdfs', 'pdfs', false)
on conflict (id) do nothing;

create policy "users upload own pdfs"
on storage.objects for insert
with check (
  bucket_id = 'pdfs'
  and (storage.foldername (name))[1] = auth.uid ()::text
);

create policy "users read own pdfs"
on storage.objects for select
using (
  bucket_id = 'pdfs'
  and (storage.foldername (name))[1] = auth.uid ()::text
);

create policy "users delete own pdfs"
on storage.objects for delete
using (
  bucket_id = 'pdfs'
  and (storage.foldername (name))[1] = auth.uid ()::text
);
