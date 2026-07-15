-- Lightweight delivery: public share links.
-- share_id is the unguessable token in the URL; is_public is the on/off
-- switch so links can be revoked (rotate by regenerating share_id later).

alter table public.courses
  add column if not exists share_id uuid not null default gen_random_uuid(),
  add column if not exists is_public boolean not null default false;

create unique index if not exists courses_share_id_idx on public.courses (share_id);

-- Anonymous (and any) visitors can read shared courses and their lessons.
-- These are additive to the owner policies (permissive policies OR together).
create policy "Anyone can read shared courses"
  on public.courses for select
  using (is_public);

create policy "Anyone can read lessons of shared courses"
  on public.lessons for select
  using (
    exists (
      select 1 from public.courses c
      where c.id = lessons.course_id and c.is_public
    )
  );
