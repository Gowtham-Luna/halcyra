-- Review-lite: a second, distinct share link (review_id, separate from the
-- learner-facing share_id) that enables commenting without exposing the
-- course to the public catalog-of-one is_public flag. No reviewer accounts —
-- anyone with the link can read and post comments (same "unguessable UUID is
-- the access control" model as the existing public share link); a display
-- name is captured per comment, not authenticated.
-- Flat comments only (no nested reply threading) — replying is just another
-- comment in the same thread. Author can resolve/delete; reviewers cannot.

alter table public.courses
  add column review_id uuid not null default gen_random_uuid(),
  add column review_enabled boolean not null default false;

create unique index if not exists courses_review_id_idx on public.courses (review_id);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  -- null lesson_id = general/course-level comment tab
  lesson_id uuid references public.lessons (id) on delete cascade,
  author_name text not null,
  body text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists comments_course_id_idx on public.comments (course_id);
create index if not exists comments_lesson_id_idx on public.comments (lesson_id);

alter table public.comments enable row level security;

create policy "Authors read comments on own courses" on public.comments for select
  using (exists (select 1 from public.courses c where c.id = comments.course_id and c.user_id = (select auth.uid())));
create policy "Authors update comments on own courses" on public.comments for update
  using (exists (select 1 from public.courses c where c.id = comments.course_id and c.user_id = (select auth.uid())));
create policy "Authors delete comments on own courses" on public.comments for delete
  using (exists (select 1 from public.courses c where c.id = comments.course_id and c.user_id = (select auth.uid())));

create policy "Anyone can read comments on review-enabled courses" on public.comments for select
  using (exists (select 1 from public.courses c where c.id = comments.course_id and c.review_enabled));
create policy "Anyone can post comments on review-enabled courses" on public.comments for insert
  with check (exists (select 1 from public.courses c where c.id = comments.course_id and c.review_enabled));

create policy "Anyone can read review-enabled courses" on public.courses for select
  using (review_enabled);
create policy "Anyone can read lessons of review-enabled courses" on public.lessons for select
  using (exists (select 1 from public.courses c where c.id = lessons.course_id and c.review_enabled));
