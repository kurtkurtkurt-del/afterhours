-- afterhours — a closed account swipes nothing, a guest befriends nobody (106, audit M-1 M-3 M-4 of 28.10.2026)
--
-- Three doors the audit found open:
--
--   M-1  52 put a guard on every table a closed account could write to, but not on
--        swipes and checkins. A banned account could still keep nights and check in,
--        and the push triggers on those tables told its friends ("match", "friend_live").
--        And a ban leaves the friendship rows in place, so the banned side could still
--        read what a friend kept: through the swipes rule of 12 and through person_kept
--        of 38. (The second half was found by the separate eye of session 2, H-2.)
--   M-3  91 made a two-argument migration_done as definer. 00 revoked only the old
--        one-argument version, and a new function is open to PUBLIC by default: anybody
--        with the public key could write a row into the migration log.
--   M-4  friend_request, spark_create and set_account_type asked only for a session.
--        A guest (anonymous session) could send forty requests a day, start a spark,
--        become a dj. check_in, dm_start, photo_set, report and the others already
--        refuse a guest.
--
-- Now:
--   swipes, checkins   the guard_banned trigger of 52, as on the other tables. The
--                      push triggers fire after the row is written, so no write, no push.
--   swipe_set          asks assert_member first (signed in, not closed). A guest may still
--                      swipe: the deck works before an account exists, by design.
--   swipes_read        a friend reads your right swipes only while the reader is not closed.
--   checkins_read      the same for check-ins (19): a closed account sees no friend check in.
--   person_kept        as in 38, and the caller must not be closed.
--   migration_done     both versions closed to every browser role; only the owner that
--                      runs the migrations calls them.
--   guard_guest        a trigger on friendships and sparks: a guest writes no row there.
--                      It covers friend_request, accepting a request, spark_create and a
--                      row written straight through the table, in one place.
--   set_account_type   as in 42, and a guest is refused.
--
-- Not changed: profile_setup. The app lets a guest pick a name during onboarding and
-- keeps it when the guest turns into an account (AuthContext, updateUser). Closing it
-- would break that path; a guest in the search results is a separate question.

-- ------------------------------------------------------------ M-1 the ban

do $$
declare
  t text;
begin
  foreach t in array array['swipes', 'checkins']
  loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('drop trigger if exists guard_banned on public.%I', t);
    execute format('create trigger guard_banned before insert or update on public.%I for each row execute function public.guard_banned()', t);
  end loop;
end $$;

create or replace function public.swipe_set(p_slug text, p_direction text)
returns void
language plpgsql
as $$
begin
  perform public.assert_member();
  insert into public.swipes (event_id, direction)
  select e.id, p_direction from public.events e where e.slug = p_slug
  on conflict (user_id, event_id)
  do update set direction = excluded.direction, created_at = now();
end;
$$;
revoke execute on function public.swipe_set(text, text) from public, anon;
grant execute on function public.swipe_set(text, text) to authenticated;

drop policy if exists swipes_read on public.swipes;
create policy swipes_read on public.swipes for select
  using (
    user_id = auth.uid()
    or (direction = 'right'
        and not public.is_banned(auth.uid())
        and public.is_friend(user_id)
        and public.kept_visible(user_id))
  );

drop policy if exists checkins_read on public.checkins;
create policy checkins_read on public.checkins for select
  using (user_id = auth.uid()
         or (show_friends
             and not public.is_banned(auth.uid())
             and public.is_friend(user_id)));

drop function if exists public.person_kept(text);
create or replace function public.person_kept(p_handle text)
returns setof public.events_public
language sql
stable
security definer
set search_path = public
as $$
  select e.*
  from public.profiles p
  join public.swipes s on s.user_id = p.id and s.direction = 'right'
  join public.events_public e on e.id = s.event_id
  where p.handle = lower(btrim(p_handle))
    and (p.id = auth.uid()
         or (not public.is_banned(auth.uid())
             and public.is_friend(p.id)
             and public.kept_visible(p.id)))
  order by s.created_at desc;
$$;
revoke all on function public.person_kept(text) from public, anon;
grant execute on function public.person_kept(text) to authenticated;

-- ------------------------------------------------- M-3 the migration log

revoke execute on function public.migration_done(text) from public, anon, authenticated;
do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    revoke execute on function public.migration_done(text, text) from public, anon, authenticated;
  end if;
end $$;

-- ------------------------------------------------------- M-4 the guest

create or replace function public.guard_guest()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and public.is_guest() then
    raise exception 'make an account first' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;
revoke execute on function public.guard_guest() from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['friendships', 'sparks']
  loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('drop trigger if exists guard_guest on public.%I', t);
    execute format('create trigger guard_guest before insert or update on public.%I for each row execute function public.guard_guest()', t);
  end loop;
end $$;

create or replace function public.set_account_type(p_type text, p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  name text := case p_type when 'user' then 'normal user' when 'dj' then 'dj' end;
  me public.profiles%rowtype;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if public.is_guest() then raise exception 'make an account first' using errcode = '42501'; end if;
  if p_type in ('community_manager', 'admin') then return 'locked'; end if;
  if name is null then return 'type'; end if;
  select * into me from public.profiles where id = auth.uid();
  if me.is_admin or me.account_type = 'community_manager' then return 'locked'; end if;
  if lower(btrim(coalesce(p_code, ''))) <> name then return 'code'; end if;
  perform set_config('afterhours.account_type', 'on', true);
  update public.profiles set account_type = p_type where id = auth.uid();
  perform set_config('afterhours.account_type', '', true);
  return 'ok';
end;
$$;
revoke all on function public.set_account_type(text, text) from public, anon;
grant execute on function public.set_account_type(text, text) to authenticated;

-- Stamp the migration log, if it is there. Each numbered file still runs on
-- its own (the tests load them one at a time), so this cannot insist.
do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('106_ban_and_guest_doors.sql', 'c116496592040f6b90c9ceb1237c5f3a3178e4bf9f2ad74b0d15095847e65c4a');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('106_ban_and_guest_doors.sql');
  end if;
end $$;
