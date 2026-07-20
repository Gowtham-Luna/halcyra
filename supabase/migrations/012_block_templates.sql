-- Shared block templates: save any block as a reusable template, then insert
-- it into other lessons. org_id null = personal (only the creator sees it);
-- set = shared with every member of that org.

create table if not exists public.block_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  org_id uuid references public.organizations (id) on delete set null,
  name text not null,
  block jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists block_templates_user_id_idx on public.block_templates (user_id);
create index if not exists block_templates_org_id_idx on public.block_templates (org_id);

alter table public.block_templates enable row level security;

create policy "Users read own templates" on public.block_templates for select
  using ((select auth.uid()) = user_id);
create policy "Org members read shared templates" on public.block_templates for select
  using (org_id is not null and exists (
    select 1 from public.org_members m where m.org_id = block_templates.org_id and m.user_id = (select auth.uid())
  ));
create policy "Users create own templates" on public.block_templates for insert
  with check ((select auth.uid()) = user_id);
create policy "Users delete own templates" on public.block_templates for delete
  using ((select auth.uid()) = user_id);
