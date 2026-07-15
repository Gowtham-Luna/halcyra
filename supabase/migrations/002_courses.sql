-- Real course data model: courses -> lessons.
-- Lesson content is a jsonb block array so slice 2 (block editor) needs no
-- schema change. Generic table names on purpose (product name stays out of schema).

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default 'Untitled course',
  topic text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  position integer not null default 0,
  heading text not null default '',
  body text not null default '',
  blocks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists courses_user_id_idx on public.courses (user_id);
create index if not exists lessons_course_id_idx on public.lessons (course_id);
create index if not exists lessons_user_id_idx on public.lessons (user_id);

alter table public.courses enable row level security;
alter table public.lessons enable row level security;

create policy "Users manage own courses select" on public.courses for select using ((select auth.uid()) = user_id);
create policy "Users manage own courses insert" on public.courses for insert with check ((select auth.uid()) = user_id);
create policy "Users manage own courses update" on public.courses for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage own courses delete" on public.courses for delete using ((select auth.uid()) = user_id);

create policy "Users manage own lessons select" on public.lessons for select using ((select auth.uid()) = user_id);
create policy "Users manage own lessons insert" on public.lessons for insert with check ((select auth.uid()) = user_id);
create policy "Users manage own lessons update" on public.lessons for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage own lessons delete" on public.lessons for delete using ((select auth.uid()) = user_id);

-- The slice-0 outlines table is superseded by courses/lessons.
-- It only ever held test data; drop it.
drop table if exists public.outlines;
