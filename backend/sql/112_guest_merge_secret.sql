-- afterhours — a guest is taken over only with its own secret (112)
--
-- guest_merge (80) asked for nothing but the guest id. A guest can be seen by id (a
-- friend list, a search), and whoever knew that id could take the swipes and delete
-- the guest user (security audit 28.10.2026, M-16). Now the phone that is the guest
-- makes a random secret before the session is replaced, keeps it in SecureStore, and
-- leaves only its sha256 here. guest_merge asks for the secret, checks it and uses it
-- up: one secret, one merge.
--
--   guest_secrets          one hash per guest; nobody reads it, not even the guest
--   guest_secret_set(s)    a guest leaves the hash of s (a new one replaces the old)
--   guest_merge(id, s)     as in 80, but only with the secret of that guest
--
-- The one-argument guest_merge(uuid) is dropped: an old app calling it gets an error
-- and forgets the guest, as it already did for a guest that was gone.

create table if not exists public.guest_secrets (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  hash       text not null check (hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);
alter table public.guest_secrets enable row level security;
-- no policy: the table is only reached through the two functions below
revoke all on public.guest_secrets from public, anon, authenticated;

create or replace function public.guest_secret_set(p_secret text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null or not public.is_guest() then raise exception 'guests only'; end if;
  if p_secret is null or length(p_secret) < 32 or length(p_secret) > 256 then raise exception 'bad secret'; end if;
  insert into public.guest_secrets (user_id, hash)
  values (me, encode(sha256(convert_to(p_secret, 'UTF8')), 'hex'))
  on conflict (user_id) do update set hash = excluded.hash, created_at = now();
end;
$$;
revoke execute on function public.guest_secret_set(text) from public, anon;
grant execute on function public.guest_secret_set(text) to authenticated;

drop function if exists public.guest_merge(uuid);

create or replace function public.guest_merge(p_guest uuid, p_secret text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  n  int;
begin
  if me is null or public.is_guest() then raise exception 'sign in first'; end if;
  if p_guest is null or p_guest = me then return 0; end if;
  if not exists (select 1 from auth.users u where u.id = p_guest and coalesce(u.is_anonymous, false) and u.email is null) then
    raise exception 'not a guest';
  end if;
  -- the secret is used up here; a wrong one says the same as no guest at all
  delete from public.guest_secrets g
   where g.user_id = p_guest
     and p_secret is not null
     and g.hash = encode(sha256(convert_to(p_secret, 'UTF8')), 'hex');
  if not found then raise exception 'not a guest'; end if;
  insert into public.swipes (user_id, event_id, direction, created_at)
  select me, s.event_id, s.direction, s.created_at from public.swipes s where s.user_id = p_guest
  on conflict (user_id, event_id) do nothing;
  get diagnostics n = row_count;
  delete from auth.users where id = p_guest;
  return n;
end;
$$;
revoke execute on function public.guest_merge(uuid, text) from public, anon;
grant execute on function public.guest_merge(uuid, text) to authenticated;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('112_guest_merge_secret.sql', '643a46f38c232343fbc200470c9f2c47c3ea2f66690e6503e3036738ddda60f9');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('112_guest_merge_secret.sql');
  end if;
end $$;
