-- FOR THE TESTS ONLY. Supabase already has these; this never ships.
-- PGlite is plain Postgres, so we build the auth schema by hand.

create schema if not exists auth;

create table if not exists auth.users (
  id                  uuid primary key default gen_random_uuid(),
  email               text unique,
  raw_user_meta_data  jsonb default '{}'::jsonb,
  is_anonymous        boolean not null default false,
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

-- The whole claims object, as Supabase defines it (111 reads amr from it).
create or replace function auth.jwt()
returns jsonb
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')
  )::jsonb;
$$;
grant execute on function auth.jwt() to anon, authenticated;

-- A test person is a member who already said yes in the app (TermsGate, 51), as every
-- account on the live database that writes has: 111 refuses what others read without
-- it. Runs after on_auth_user_created (triggers fire by name); a test that loads files
-- one by one may not have the columns (51) yet. A test of the terms themselves takes
-- the yes back (safety, terms-delete-reauth).
create or replace function auth.test_member_said_yes()
returns trigger
language plpgsql
as $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'profiles' and column_name = 'adult') then
    execute 'update public.profiles set terms_version = 1, terms_at = now(), adult = true where id = $1' using new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists zz_test_member_said_yes on auth.users;
create trigger zz_test_member_said_yes after insert on auth.users
  for each row execute function auth.test_member_said_yes();
