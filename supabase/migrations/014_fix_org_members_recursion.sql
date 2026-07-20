-- Fix: "infinite recursion detected in policy for relation org_members".
-- The org_members policies added in 011_organizations.sql check membership
-- by subquerying org_members from within an org_members policy itself —
-- Postgres re-applies that same policy to evaluate the subquery, forever.
-- This broke every query that touches org_members, including "read org
-- courses" (courses join org_members), which is why course loading failed
-- even for users with no orgs at all.
--
-- Standard fix: move the membership check into SECURITY DEFINER functions.
-- Such a function runs as its owner (the migration role, which owns
-- org_members and is exempt from its own RLS since FORCE ROW LEVEL SECURITY
-- was never set), so queries inside it bypass RLS and never recurse.

create or replace function public.org_role(target_org_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.org_members
  where org_id = target_org_id and user_id = (select auth.uid())
  limit 1;
$$;

create or replace function public.org_has_members(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.org_members where org_id = target_org_id);
$$;

revoke all on function public.org_role(uuid) from public;
revoke all on function public.org_has_members(uuid) from public;
grant execute on function public.org_role(uuid) to authenticated;
grant execute on function public.org_has_members(uuid) to authenticated;

drop policy if exists "Org members read roster" on public.org_members;
create policy "Org members read roster" on public.org_members for select
  using (public.org_role(org_id) is not null);

drop policy if exists "Bootstrap owner or admin invite" on public.org_members;
create policy "Bootstrap owner or admin invite" on public.org_members for insert
  with check (
    (user_id = (select auth.uid()) and role = 'owner' and not public.org_has_members(org_id))
    or public.org_role(org_id) in ('owner', 'admin')
  );

drop policy if exists "Org admins update member roles" on public.org_members;
create policy "Org admins update member roles" on public.org_members for update
  using (public.org_role(org_id) in ('owner', 'admin'));

drop policy if exists "Org admins remove members or self-leave" on public.org_members;
create policy "Org admins remove members or self-leave" on public.org_members for delete
  using (
    public.org_role(org_id) in ('owner', 'admin')
    or user_id = (select auth.uid())
  );

-- "Users claim their pending invite" (update) never subqueried org_members —
-- it only checks invited_email/user_id on the row itself — so it was never
-- recursive and is left untouched.
