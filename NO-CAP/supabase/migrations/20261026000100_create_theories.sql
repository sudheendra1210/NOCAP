-- NO CAP community theories.
-- Run only after enabling Clerk as a third-party auth provider in Supabase.

create table public.theories (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt() ->> 'sub'),
  username text not null default coalesce(nullif(auth.jwt() ->> 'username', ''), 'NO CAP member'),
  content text not null,
  created_at timestamptz not null default now(),
  is_approved boolean not null default false,
  constraint theories_content_length check (char_length(content) between 1 and 150),
  constraint theories_content_not_blank check (content ~ '[^[:space:]]')
);

alter table public.theories enable row level security;

revoke all on table public.theories from public, anon, authenticated;
grant select (id, username, content, created_at, is_approved)
  on table public.theories to anon, authenticated;
grant insert (content) on table public.theories to authenticated;

create policy "Anyone can read approved theories"
  on public.theories
  for select
  to anon
  using (is_approved is true);

create policy "Signed-in users can read approved theories and their own pending theories"
  on public.theories
  for select
  to authenticated
  using (
    is_approved is true
    or user_id = (select auth.jwt() ->> 'sub')
  );

create policy "Clerk users can submit only their own theories"
  on public.theories
  for insert
  to authenticated
  with check (
    (select auth.jwt() ->> 'role') = 'authenticated'
    and user_id = (select auth.jwt() ->> 'sub')
    and username = coalesce(nullif((select auth.jwt() ->> 'username'), ''), 'NO CAP member')
    and is_approved is false
  );

create index theories_approved_created_at_idx
  on public.theories (created_at desc)
  where is_approved is true;
