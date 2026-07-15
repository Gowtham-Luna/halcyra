-- Media storage: public-read bucket, per-user write access.
-- MVP decision: Supabase Storage now (1GB free), swap to Cloudflare R2 behind
-- the media seam (apps/web/src/lib/media.ts) before scale.
-- Objects are stored under <user_id>/<uuid>.<ext>; the folder name is what
-- the policies check ownership against.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  5242880, -- 5MB per file
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do nothing;

create policy "Public read for media"
  on storage.objects for select
  using (bucket_id = 'media');

create policy "Users upload to own media folder"
  on storage.objects for insert
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users update own media"
  on storage.objects for update
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users delete own media"
  on storage.objects for delete
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
