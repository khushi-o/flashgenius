-- Allow users to overwrite objects in their own pdfs prefix (optional; uploads use unique keys).

drop policy if exists "users update own pdfs" on storage.objects;

create policy "users update own pdfs"
on storage.objects for update
using (
  bucket_id = 'pdfs'
  and (storage.foldername (name))[1] = auth.uid ()::text
);
