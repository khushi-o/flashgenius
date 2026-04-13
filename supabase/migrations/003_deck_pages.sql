-- Per-page PDF text for book-style reader (optional summaries filled on demand).

create table public.deck_pages (
  id uuid primary key default gen_random_uuid (),
  deck_id uuid not null references public.decks (id) on delete cascade,
  page_number int not null,
  content text not null,
  summary text,
  created_at timestamptz default now (),
  unique (deck_id, page_number)
);

create index idx_deck_pages_deck on public.deck_pages (deck_id, page_number);

alter table public.deck_pages enable row level security;

create policy "users access own deck pages"
on public.deck_pages
for all
using (
  deck_id in (
    select id
    from public.decks
    where user_id = auth.uid ()
  )
);
