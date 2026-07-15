-- Outlines: one row per generated course outline.
-- Generic table name on purpose (product name must stay out of schema).
create table if not exists public.outlines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  topic text not null,
  title text not null default '',
  blocks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists outlines_user_id_idx on public.outlines (user_id);

alter table public.outlines enable row level security;

create policy "Users can read own outlines"
  on public.outlines for select
  using ((select auth.uid()) = user_id);

create policy "Users can insert own outlines"
  on public.outlines for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update own outlines"
  on public.outlines for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own outlines"
  on public.outlines for delete
  using ((select auth.uid()) = user_id);
