-- Graded quiz lessons: a lesson can opt into pass-mark/shuffle/retry-gated
-- grading instead of the default free-flow content lesson. Null = ordinary
-- lesson (today's behavior, unchanged).

alter table public.lessons
  add column quiz_settings jsonb;
