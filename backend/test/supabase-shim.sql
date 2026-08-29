-- SADECE TEST ICIN. Supabase'de bunlar zaten var; uretime gitmez.
-- PGlite duz Postgres oldugu icin auth semasini elle kuruyoruz.

create schema if not exists auth;

create table if not exists auth.users (
  id                  uuid primary key default gen_random_uuid(),
  email               text unique,
  raw_user_meta_data  jsonb default '{}'::jsonb,
  created_at          timestamptz not null default now()
);

-- Supabase'in kendi tanimiyla birebir. Dikkat: nullif CAST'TAN ONCE
-- geliyor -- claims bos string oldugunda ''::json patliyor.
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

-- Supabase'de bu izinler hazir geliyor; taklidini burada kuruyoruz.
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
