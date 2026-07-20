-- Blocks pack 2 (audio, attachment, gallery) needs the media bucket to accept
-- audio + common document types, and a higher per-file cap than the 5MB
-- images-only limit set in 003_media_bucket.sql. Still one bucket — swap to
-- Cloudflare R2 behind the media seam (apps/web/src/lib/media.ts) before scale.

update storage.buckets
set
  file_size_limit = 15728640, -- 15MB per file
  allowed_mime_types = array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'text/plain'
  ]
where id = 'media';
