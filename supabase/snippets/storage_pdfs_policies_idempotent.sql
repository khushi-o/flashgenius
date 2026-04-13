-- Safe when 001 was already applied: (re)creates pdfs bucket + storage policies only.
-- Run in Supabase SQL editor if uploads fail with storage/RLS errors.
-- Do NOT paste full 001_initial_schema.sql again — you will hit "relation already exists".

insert into storage.buckets (id, name, public)
values ('pdfs', 'pdfs', false)
on conflict (id) do nothing;

drop policy if exists "users upload own pdfs" on storage.objects;
drop policy if exists "users read own pdfs" on storage.objects;
drop policy if exists "users delete own pdfs" on storage.objects;

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
