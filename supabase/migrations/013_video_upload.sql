-- Screen recording (Peek-equivalent) records to webm and uploads through the
-- same media bucket — needs video/webm added to the allowed types and a
-- bigger size ceiling than documents/audio needed. Free tier is 1GB total
-- storage, so this raises how fast that fills up; flagged in the parity doc.

update storage.buckets
set
  file_size_limit = 52428800, -- 50MB per file
  allowed_mime_types = array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a',
    'video/webm', 'video/mp4',
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
