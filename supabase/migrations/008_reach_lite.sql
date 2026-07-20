-- Reach-lite: learner accounts (reuses the same Supabase Auth users table as
-- authors — "learner" isn't a role flag, it's just someone with enrollment/
-- completion rows instead of authored courses), enrollment tracking, and
-- server-side completion for signed-in learners on public share links.
-- Anonymous share-link access (localStorage progress) is unchanged.
--
-- learner_email is denormalized onto enrollments (set client-side from the
-- learner's own session at enroll time) rather than joining auth.users —
-- simpler and avoids a SECURITY DEFINER trigger on auth.users. It can go
-- stale if a learner changes their email later; acceptable for a lite
-- reporting view.

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  learner_id uuid not null references auth.users (id) on delete cascade,
  learner_email text not null,
  enrolled_at timestamptz not null default now(),
  unique (course_id, learner_id)
);

create table if not exists public.completions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  learner_id uuid not null references auth.users (id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (lesson_id, learner_id)
);

create index if not exists enrollments_course_id_idx on public.enrollments (course_id);
create index if not exists completions_course_id_idx on public.completions (course_id);
create index if not exists completions_learner_id_idx on public.completions (learner_id);

alter table public.enrollments enable row level security;
alter table public.completions enable row level security;

create policy "Learners insert own enrollment" on public.enrollments for insert
  with check ((select auth.uid()) = learner_id);
create policy "Learners read own enrollment" on public.enrollments for select
  using ((select auth.uid()) = learner_id);
create policy "Authors read enrollments for own courses" on public.enrollments for select
  using (exists (select 1 from public.courses c where c.id = enrollments.course_id and c.user_id = (select auth.uid())));

create policy "Learners insert own completions" on public.completions for insert
  with check ((select auth.uid()) = learner_id);
create policy "Learners read own completions" on public.completions for select
  using ((select auth.uid()) = learner_id);
create policy "Authors read completions for own courses" on public.completions for select
  using (exists (select 1 from public.courses c where c.id = completions.course_id and c.user_id = (select auth.uid())));
