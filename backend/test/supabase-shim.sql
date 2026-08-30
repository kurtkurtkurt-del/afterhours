-- FOR THE TESTS ONLY. Supabase already has these; this never ships.
-- PGlite is plain Postgres, so we build the auth schema by hand.

create schema if not exists auth;

create table if not exists auth.users (
  id                  uuid primary key default gen_random_uuid(),
  email               text unique,
  raw_user_meta_data  jsonb default '{}'::jsonb,
  created_at          timestamptz not null default now()
);

-- Identical to the definition Supabase uses. Note: nullif comes BEFORE
-- the cast; with claims an empty string, .::json blows up.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub',
    ''
  )::uuid;
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end
$$;

-- On Supabase these grants come ready made; here we imitate them.
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
