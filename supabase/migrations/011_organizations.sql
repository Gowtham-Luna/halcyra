-- Orgs/teams (no billing — see CLAUDE.md, payment collection is explicitly
-- out of scope for this pass). "Invite" mirrors the Reach-lite self-enroll
-- pattern used for course enrollment: an admin adds a row keyed by email
-- with user_id null; the invitee claims it (sets their own user_id) the
-- first time they sign in, matched against their own JWT email — no email
-- delivery infra, no SECURITY DEFINER trigger on auth.users.

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  invited_email text not null,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  unique (org_id, invited_email)
);

create index if not exists organizations_created_by_idx on public.organizations (created_by);
create index if not exists org_members_org_id_idx on public.org_members (org_id);
create index if not exists org_members_user_id_idx on public.org_members (user_id);

alter table public.organizations enable row level security;
alter table public.org_members enable row level security;

create policy "Org members read their orgs" on public.organizations for select
  using (exists (select 1 from public.org_members m where m.org_id = organizations.id and m.user_id = (select auth.uid())));
create policy "Users create orgs" on public.organizations for insert
  with check ((select auth.uid()) = created_by);
create policy "Org owners/admins update org" on public.organizations for update
  using (exists (select 1 from public.org_members m where m.org_id = organizations.id and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin')));
create policy "Org owners delete org" on public.organizations for delete
  using (exists (select 1 from public.org_members m where m.org_id = organizations.id and m.user_id = (select auth.uid()) and m.role = 'owner'));

create policy "Org members read roster" on public.org_members for select
  using (exists (select 1 from public.org_members m2 where m2.org_id = org_members.org_id and m2.user_id = (select auth.uid())));
-- Bootstrap: the very first member of a brand-new org can self-insert as owner;
-- after that, only an existing owner/admin can insert (invite) further members.
create policy "Bootstrap owner or admin invite" on public.org_members for insert
  with check (
    (user_id = (select auth.uid()) and role = 'owner' and not exists (select 1 from public.org_members m where m.org_id = org_members.org_id))
    or exists (select 1 from public.org_members m where m.org_id = org_members.org_id and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin'))
  );
create policy "Users claim their pending invite" on public.org_members for update
  using (invited_email = (select auth.jwt() ->> 'email') and user_id is null)
  with check (user_id = (select auth.uid()));
create policy "Org admins update member roles" on public.org_members for update
  using (exists (select 1 from public.org_members m where m.org_id = org_members.org_id and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin')));
create policy "Org admins remove members or self-leave" on public.org_members for delete
  using (
    exists (select 1 from public.org_members m where m.org_id = org_members.org_id and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin'))
    or user_id = (select auth.uid())
  );

-- Courses can optionally belong to an org instead of (or in addition to
-- being owned by) a single author — org membership then grants co-editing.
alter table public.courses
  add column org_id uuid references public.organizations (id) on delete set null;

create policy "Org members read org courses" on public.courses for select
  using (exists (select 1 from public.org_members m where m.org_id = courses.org_id and m.user_id = (select auth.uid())));
create policy "Org members update org courses" on public.courses for update
  using (exists (select 1 from public.org_members m where m.org_id = courses.org_id and m.user_id = (select auth.uid())))
  with check (exists (select 1 from public.org_members m where m.org_id = courses.org_id and m.user_id = (select auth.uid())));

create policy "Org members read org course lessons" on public.lessons for select
  using (exists (
    select 1 from public.courses c join public.org_members m on m.org_id = c.org_id
    where c.id = lessons.course_id and m.user_id = (select auth.uid())
  ));
create policy "Org members insert org course lessons" on public.lessons for insert
  with check (exists (
    select 1 from public.courses c join public.org_members m on m.org_id = c.org_id
    where c.id = lessons.course_id and m.user_id = (select auth.uid())
  ));
create policy "Org members update org course lessons" on public.lessons for update
  using (exists (
    select 1 from public.courses c join public.org_members m on m.org_id = c.org_id
    where c.id = lessons.course_id and m.user_id = (select auth.uid())
  ));
create policy "Org members delete org course lessons" on public.lessons for delete
  using (exists (
    select 1 from public.courses c join public.org_members m on m.org_id = c.org_id
    where c.id = lessons.course_id and m.user_id = (select auth.uid())
  ));

-- Pre-existing gap found while adding the above: the original lessons insert
-- policy only checked that the new row's user_id was the caller — it never
-- verified the caller actually owns lessons.course_id, so any signed-in user
-- could previously insert a lesson row into a course they don't own. Tighten
-- it to require ownership (org-member insert is covered by the policy above).
drop policy if exists "Users manage own lessons insert" on public.lessons;
create policy "Users manage own lessons insert" on public.lessons for insert
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.courses c where c.id = lessons.course_id and c.user_id = (select auth.uid()))
  );
