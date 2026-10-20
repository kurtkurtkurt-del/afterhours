-- afterhours — paste 3 of 5 (20.10.2026): 78_min_version.sql … 88_checkin_truth.sql
-- Supabase → SQL Editor → New query → paste all → Run. Safe to run twice.

-- ===== 78_min_version.sql =====
-- afterhours — the oldest app that still works (78)
--
-- The numbered files drop and remake functions; an app built before such a change
-- keeps calling the old shape and fails in silence (F10, 20.10.2026). The server now
-- carries the oldest version it still answers: min_app_version() is read at every
-- launch, and an app below it shows a full-screen door to the download page
-- (components/UpdateGate.tsx) instead of a broken deck. One row, set by an admin
-- through set_min_app_version; nothing else writes it. version_lt compares two
-- dotted numbers the way people mean them (1.2.0 is below 1.10.0).

create table if not exists public.app_floor (
  one         boolean primary key default true check (one),
  min_version text not null default '0.1.0' check (min_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
  note        text,
  set_at      timestamptz not null default now()
);
insert into public.app_floor (one) values (true) on conflict do nothing;

alter table public.app_floor enable row level security;
revoke all on public.app_floor from public, anon, authenticated;

create or replace function public.version_lt(a text, b text)
returns boolean
language sql
immutable
as $$
  select string_to_array(a, '.')::int[] < string_to_array(b, '.')::int[];
$$;
grant execute on function public.version_lt(text, text) to anon, authenticated;

create or replace function public.min_app_version()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select f.min_version from public.app_floor f where f.one;
$$;
grant execute on function public.min_app_version() to anon, authenticated;

create or replace function public.set_min_app_version(p_version text, p_note text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not coalesce(public.is_admin(), false) then
    raise exception 'admin only' using errcode = '42501';
  end if;
  if p_version !~ '^[0-9]+\.[0-9]+\.[0-9]+$' then
    raise exception 'a version looks like 1.2.3' using errcode = '22023';
  end if;
  update public.app_floor set min_version = p_version, note = p_note, set_at = now() where one;
  return p_version;
end;
$$;
grant execute on function public.set_min_app_version(text, text) to authenticated;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('78_min_version.sql', '1670ac287ac7ff389e9ca9c123caea56b59dd1a669dbb207ca7fc380a23ef97f');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('78_min_version.sql');
  end if;
end $$;


-- ===== 79_word_watch.sql =====
-- afterhours — words the staff want to see (79)
--
-- Nothing looked at what people wrote until someone reported it (F21, 20.10.2026;
-- Apple 1.2 asks for a filtering method). Decided: watch, do not refuse. A short
-- three-language list of words lives in watch_words; whenever a comment, a post, a
-- room line, a group message, a DM, a group name, a spark or a profile is written or
-- edited and holds one of them, it lands in the open reports as if its own author had
-- reported it, reason "filter: <word>". It stays visible; the staff decide in the
-- panel as with any report. The list grows and shrinks by admin calls.
--
--   watch_hit(text)                the first watched word in it, or null
--   watch_add(word) / watch_drop   admin
--   watch_list()                   staff

create table if not exists public.watch_words (
  word      text primary key check (word = lower(btrim(word)) and length(word) between 2 and 40),
  added_at  timestamptz not null default now()
);
alter table public.watch_words enable row level security;
revoke all on public.watch_words from public, anon, authenticated;

insert into public.watch_words (word) values
  ('nigger'), ('nigga'), ('faggot'), ('fag'), ('retard'), ('kike'), ('spic'), ('chink'), ('tranny'), ('whore'), ('slut'), ('cunt'), ('rape'), ('kill yourself'), ('kys'),
  ('kanake'), ('kanacke'), ('neger'), ('schwuchtel'), ('fotze'), ('hure'), ('schlampe'), ('judensau'), ('bring dich um'),
  ('orospu'), ('ibne'), ('pezevenk'), ('amcık'), ('amcik'), ('siktir'), ('sikerim'), ('göt'), ('piç'), ('pic kurusu'), ('geber'), ('kendini öldür')
on conflict do nothing;

create or replace function public.watch_hit(p_text text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select w.word from public.watch_words w
  where p_text is not null
    and lower(p_text) ~ ('(^|[^[:alnum:]])' || regexp_replace(w.word, '([.*+?^${}()|\[\]\\])', '\\\1', 'g') || '($|[^[:alnum:]])')
  order by length(w.word) desc
  limit 1;
$$;
grant execute on function public.watch_hit(text) to authenticated;

create or replace function public.watch_add(p_word text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not coalesce(public.is_admin(), false) then raise exception 'admin only' using errcode = '42501'; end if;
  insert into public.watch_words (word) values (lower(btrim(p_word))) on conflict do nothing;
end;
$$;
create or replace function public.watch_drop(p_word text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not coalesce(public.is_admin(), false) then raise exception 'admin only' using errcode = '42501'; end if;
  delete from public.watch_words where word = lower(btrim(p_word));
end;
$$;
create or replace function public.watch_list()
returns setof text
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.need_staff();
  return query select w.word from public.watch_words w order by w.word;
end;
$$;
grant execute on function public.watch_add(text), public.watch_drop(text), public.watch_list() to authenticated;

-- One trigger body for every table: args are the report kind, the author column,
-- then the text columns. A post goes to post_reports, everything else to reports.
create or replace function public.watch_ugc()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  j     jsonb := to_jsonb(new);
  body  text := '';
  i     int;
  hit   text;
  who   uuid;
begin
  for i in 2 .. tg_nargs - 1 loop
    body := body || ' ' || coalesce(j ->> tg_argv[i], '');
  end loop;
  hit := public.watch_hit(body);
  if hit is null then return new; end if;
  who := (j ->> tg_argv[1])::uuid;
  if tg_argv[0] = 'post' then
    insert into public.post_reports (post_id, reporter_id, reason) values (new.id, who, 'filter: ' || hit)
    on conflict do nothing;
  else
    insert into public.reports (reporter_id, kind, target, reason) values (who, tg_argv[0], new.id::text, 'filter: ' || hit)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists watch_comments       on public.comments;
drop trigger if exists watch_post_comments  on public.post_comments;
drop trigger if exists watch_room_posts     on public.room_posts;
drop trigger if exists watch_group_messages on public.group_messages;
drop trigger if exists watch_dm_messages    on public.dm_messages;
drop trigger if exists watch_groups         on public.groups;
drop trigger if exists watch_sparks         on public.sparks;
drop trigger if exists watch_posts          on public.posts;
drop trigger if exists watch_profiles       on public.profiles;
create trigger watch_comments       after insert or update of body  on public.comments       for each row execute function public.watch_ugc('comment', 'author_id', 'body');
create trigger watch_post_comments  after insert or update of body  on public.post_comments  for each row execute function public.watch_ugc('post_comment', 'author_id', 'body');
create trigger watch_room_posts     after insert or update of body  on public.room_posts     for each row execute function public.watch_ugc('room_post', 'user_id', 'body');
create trigger watch_group_messages after insert or update of body  on public.group_messages for each row execute function public.watch_ugc('group_message', 'user_id', 'body');
create trigger watch_dm_messages    after insert or update of body  on public.dm_messages    for each row execute function public.watch_ugc('dm_message', 'user_id', 'body');
create trigger watch_groups         after insert or update of name  on public.groups         for each row execute function public.watch_ugc('group', 'created_by', 'name');
create trigger watch_sparks         after insert or update of title, place on public.sparks  for each row execute function public.watch_ugc('spark', 'host_id', 'title', 'place');
create trigger watch_posts          after insert or update of body  on public.posts          for each row execute function public.watch_ugc('post', 'author_id', 'body');
create trigger watch_profiles       after insert or update of handle, display_name, bio, about on public.profiles for each row execute function public.watch_ugc('profile', 'id', 'handle', 'display_name', 'bio', 'about');

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('79_word_watch.sql', '3a484dd375b17d135f53c7eb72bbd97bb12469d790015c60347746d280e4fec7');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('79_word_watch.sql');
  end if;
end $$;


-- ===== 80_guest_merge.sql =====
-- afterhours — what a guest kept comes along (80)
--
-- A guest who signs up with an email that already has an account is sent to sign in,
-- and the anonymous session is replaced: the swipes made as a guest stayed behind on
-- a user nobody could reach again (F31, 20.10.2026). The app now remembers the guest
-- id across that sign-in and calls guest_merge once: the swipes move to the account
-- (a night already swiped there keeps the answer of the account), and the guest user is
-- deleted. Only an anonymous user with no email can be taken over, and only by a
-- signed-in account; the id is the one thing the device knows about its guest.
--
--   guest_merge(guest_id)   returns how many swipes came along

create or replace function public.guest_merge(p_guest uuid)
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
  insert into public.swipes (user_id, event_id, direction, created_at)
  select me, s.event_id, s.direction, s.created_at from public.swipes s where s.user_id = p_guest
  on conflict (user_id, event_id) do nothing;
  get diagnostics n = row_count;
  delete from auth.users where id = p_guest;
  return n;
end;
$$;
grant execute on function public.guest_merge(uuid) to authenticated;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('80_guest_merge.sql', 'd053253ca69f493d9d74c7f94056bef8327b61d0a65d7ba9beaf129d90b5e3d0');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('80_guest_merge.sql');
  end if;
end $$;


-- ===== 81_posts_off.sql =====
-- afterhours — posts are off (81)
--
-- The yours tab has been hidden since 12.10.2026; post/new and the past feed were
-- reachable only from there, and a like or a comment still sent a push whose link
-- opened nothing (F26, 20.10.2026). Decided: take posts down for the release rather
-- than find them a new home. The tables, the triggers and the staff view stay; the
-- app redirects its two screens (content/flags.ts POSTS_ON) and push_wants here says
-- no to every post kind, whatever the person set, so nothing leaves the outbox.
-- push_wants is that of 75 with the one line; flip the line back with the flag.

create or replace function public.push_wants(p_user uuid, p_kind text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select case
             when p_kind = 'friend_request'  then s.notify_requests
             when p_kind = 'friend_accepted' then s.notify_accepts
             when p_kind = 'match'           then s.notify_matches
             when p_kind = 'friend_live'     then s.notify_live
             when p_kind in ('night_soon', 'night_changed') then s.notify_nights
             when p_kind in ('room_open', 'room_closing', 'room_message') then s.notify_rooms
             when p_kind = 'reply'           then s.notify_replies
             when p_kind = 'digest'          then s.notify_digest
             when p_kind = 'dj_live'         then s.notify_djs
             when p_kind = 'wave'            then s.notify_waves
             when p_kind in ('spark', 'spark_in', 'spark_off') then s.notify_sparks
             when p_kind like 'group\_%' then s.notify_groups
             when p_kind in ('post', 'post_like', 'post_comment') then false
             when p_kind = 'dm'              then s.notify_dms
           end
    from public.profile_settings s where s.user_id = p_user), true);
$$;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('81_posts_off.sql', '7c72d645cc6875566aa55521c252c5e172b32bd7d31347588831a2ed4da19bab');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('81_posts_off.sql');
  end if;
end $$;


-- ===== 82_leftovers.sql =====
-- afterhours — a file goes with its row (82)
--
-- The photos bucket is public in the storage sense: whoever holds the address sees
-- the file. Removing a post, a group photo, a cover or a face only ever deleted the
-- row (and the app tried to remove the file from the phone, when it was online and
-- had not crashed); a photo the staff hid stayed served; a deleted account and a
-- pruned guest left their folder behind (F39, 20.10.2026). Decided: the file goes
-- with the row, and a hidden post loses its photo at once. The text stays as the
-- record. Done in the database so that no client is trusted to clean up.
--
--   storage_drop(path)        one object of the photos bucket, service level
--   storage_drop_folder(uid)  everything under a person
-- The triggers below fire on delete, on a replaced path and on hiding. Outside
-- Supabase (the tests) storage.objects may not exist; then there is nothing to drop.

create or replace function public.storage_drop(p_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_path is null or to_regclass('storage.objects') is null then return; end if;
  execute 'delete from storage.objects where bucket_id = $1 and name = $2' using 'photos', p_path;
end;
$$;
revoke execute on function public.storage_drop(text) from public, anon, authenticated;

create or replace function public.storage_drop_folder(p_uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_uid is null or to_regclass('storage.objects') is null then return; end if;
  execute 'delete from storage.objects where bucket_id = $1 and name like $2' using 'photos', p_uid::text || '/%';
end;
$$;
revoke execute on function public.storage_drop_folder(uuid) from public, anon, authenticated;

-- One trigger body: the argument names the path column.
create or replace function public.photo_gone()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  col  text := tg_argv[0];
  was  text := case when tg_op = 'INSERT' then null else to_jsonb(old) ->> col end;
  now_ text := case when tg_op = 'DELETE' then null else to_jsonb(new) ->> col end;
begin
  if tg_op = 'DELETE' then
    perform public.storage_drop(was);
    return old;
  end if;
  if was is distinct from now_ then
    perform public.storage_drop(was);
  elsif (to_jsonb(new) ->> 'is_hidden')::boolean and not coalesce((to_jsonb(old) ->> 'is_hidden')::boolean, false) then
    perform public.storage_drop(now_);
  end if;
  return new;
end;
$$;

create or replace function public.folder_gone()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.storage_drop_folder(old.id);
  return old;
end;
$$;

drop trigger if exists photo_gone_posts          on public.posts;
drop trigger if exists photo_gone_profile_photos on public.profile_photos;
drop trigger if exists photo_gone_group_photos   on public.group_photos;
drop trigger if exists photo_gone_groups         on public.groups;
drop trigger if exists folder_gone_profiles      on public.profiles;
create trigger photo_gone_posts          after delete or update of photo_path, is_hidden on public.posts          for each row execute function public.photo_gone('photo_path');
create trigger photo_gone_profile_photos after delete or update of path                  on public.profile_photos for each row execute function public.photo_gone('path');
create trigger photo_gone_group_photos   after delete or update of path                  on public.group_photos   for each row execute function public.photo_gone('path');
create trigger photo_gone_groups         after delete or update of cover_path            on public.groups         for each row execute function public.photo_gone('cover_path');
create trigger folder_gone_profiles      after delete                                    on public.profiles       for each row execute function public.folder_gone();

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('82_leftovers.sql', 'fd331d73d48eca15b020a2173b0828c697fd674a6e72ab30ea4759e2cc933dbf');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('82_leftovers.sql');
  end if;
end $$;


-- ===== 83_dj_after.sql =====
-- afterhours — a DJ page after the DJ (83)
--
-- When a DJ deleted their account the page stayed up: owner_id fell to null and
-- verified stayed true, so a page nobody could edit or answer for kept its place;
-- and push_hourly told followers about sets of pages the staff had taken down
-- (F25, 20.10.2026). Now: a page loses its check the moment its owner goes
-- (before the profile row leaves, while owner_id still points at it) - a page the
-- staff made themselves, with no owner, is not touched; and the dj_live push goes
-- only for a checked page. push_hourly is that of 26 with the one condition. The bio
-- the DJ writes is shown on the page from this day (app/src/app/dj/[id].tsx).

create or replace function public.dj_owner_gone()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.djs set verified = false, verified_at = null where owner_id = old.id and verified;
  return old;
end;
$$;
drop trigger if exists dj_owner_gone on public.profiles;
create trigger dj_owner_gone before delete on public.profiles
  for each row execute function public.dj_owner_gone();

create or replace function public.push_hourly(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n    integer := 0;
  them record;
begin
  -- a kept night starts in two to three hours
  for them in
    select w.user_id, e.id, e.title, e.slug, e.starts_at
    from public.swipes w join public.events e on e.id = w.event_id
    where w.direction = 'right' and e.is_published and not e.starts_at_estimated
      and e.starts_at > p_now + interval '2 hours' and e.starts_at <= p_now + interval '3 hours'
  loop
    perform public.push_enqueue(them.user_id, 'night_soon', format('soon:%s:%s', them.user_id, them.id),
      jsonb_build_object('title', them.title, 'time', public.push_clock(them.user_id, them.starts_at),
                         'url', '/night/' || them.slug));
    n := n + 1;
  end loop;

  -- a room freezes within two hours
  if to_regclass('public.checkins') is not null then
    for them in execute $q$
      select c.id, c.user_id, e.title, e.slug
      from public.checkins c join public.events e on e.id = c.event_id
      where public.room_freeze_at(c.event_id) > $1 + interval '1 hour'
        and public.room_freeze_at(c.event_id) <= $1 + interval '2 hours'
    $q$ using p_now
    loop
      perform public.push_enqueue(them.user_id, 'room_closing', format('closing:%s', them.id),
        jsonb_build_object('title', them.title, 'url', '/room/' || them.slug));
      n := n + 1;
    end loop;
  end if;

  -- a followed DJ plays within the hour
  if to_regclass('public.dj_sets') is not null then
    for them in execute $q$
      select f.user_id, s.id, s.venue, s.starts_at, d.name, d.slug
      from public.dj_follows f
      join public.dj_sets s on s.dj_id = f.dj_id
      join public.djs d on d.id = f.dj_id
      where s.starts_at > $1 and s.starts_at <= $1 + interval '1 hour'
        and d.verified
    $q$ using p_now
    loop
      perform public.push_enqueue(them.user_id, 'dj_live', format('dj:%s:%s', them.user_id, them.id),
        jsonb_build_object('name', them.name, 'where', them.venue,
                           'time', public.push_clock(them.user_id, them.starts_at), 'url', '/dj/' || them.slug));
      n := n + 1;
    end loop;
  end if;

  -- thursday 18:00 on the phone: the weekend in your city (friday 18:00 to monday 06:00)
  for them in
    with here as (
      select distinct on (k.user_id) k.user_id, k.tz from public.push_tokens k order by k.user_id, k.updated_at desc
    ),
    due as (
      select h.user_id, p.city_id, c.name as city,
             ((p_now at time zone h.tz)::date + 1 + time '18:00') at time zone h.tz as from_at,
             ((p_now at time zone h.tz)::date + 4 + time '06:00') at time zone h.tz as to_at
      from here h
      join public.profiles p on p.id = h.user_id
      join public.cities c on c.id = p.city_id
      where extract(isodow from p_now at time zone h.tz) = 4
        and extract(hour from p_now at time zone h.tz) = 18
    )
    select d.user_id, d.city,
           (select count(*)::int from public.events e
             where e.city_id = d.city_id and e.is_published and e.starts_at >= d.from_at and e.starts_at < d.to_at) as nights,
           (select count(distinct w.event_id)::int from public.swipes w
              join public.events e on e.id = w.event_id
              join public.push_edges f on f.who = d.user_id and f.friend = w.user_id
             where w.direction = 'right' and public.kept_visible(w.user_id)
               and e.city_id = d.city_id and e.starts_at >= d.from_at and e.starts_at < d.to_at) as kept
    from due d
  loop
    if them.nights > 0 then
      perform public.push_enqueue(them.user_id, 'digest', format('digest:%s:%s', them.user_id, to_char(p_now, 'IYYY-IW')),
        jsonb_build_object('city', them.city, 'n', them.nights, 'friends', them.kept, 'url', '/flow'));
      n := n + 1;
    end if;
  end loop;
  return n;
end;
$$;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('83_dj_after.sql', '18c17fad8d80b42de42afe6e275348f34a0ea1edf993e45dc07eff43b571b861');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('83_dj_after.sql');
  end if;
end $$;


-- ===== 84_report_snapshot.sql =====
-- afterhours — a report keeps a copy (84)
--
-- A report pointed at a row and nothing else. When the row went (the author took it
-- back, the staff removed it, the account was deleted) the panel showed an empty
-- line; and the report itself left with the reporter, since it hung off their
-- profile (F12, 20.10.2026). Decided: the report takes a copy of what it is about
-- at the moment it is made - the text, the id and handle of the author, the time - and
-- outlives both the content and the reporter. Files are not copied. Removal and
-- deletion flows stay as they are.
--
--   reports.snapshot          jsonb {text, author, author_id, at}, filled by trigger
--   reports.reporter_id       may be null now (the reporter left); fk sets null
-- staff_reports (70) falls back to the copy; staff_report_settle (68) skips a
-- reporter who is gone. Both are their latest text with the one change each.

alter table public.reports add column if not exists snapshot jsonb;
alter table public.reports alter column reporter_id drop not null;
alter table public.reports drop constraint if exists reports_reporter_id_fkey;
alter table public.reports add constraint reports_reporter_id_fkey
  foreign key (reporter_id) references public.profiles (id) on delete set null;

create or replace function public.report_text(p_kind text, p_target text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case p_kind
    when 'comment'       then (select c.body from public.comments c where c.id::text = p_target)
    when 'room_post'     then (select x.body from public.room_posts x where x.id::text = p_target)
    when 'group_message' then (select x.body from public.group_messages x where x.id::text = p_target)
    when 'profile'       then (select concat_ws(' · ', p.handle, p.display_name, p.bio, p.about) from public.profiles p where p.id::text = p_target)
    when 'group'         then (select g.name from public.groups g where g.id::text = p_target)
    when 'spark'         then (select concat_ws(' · ', s.title, s.place) from public.sparks s where s.id::text = p_target)
    when 'post_comment'  then public.post_comment_body(p_target)
    when 'dm_message'    then (select x.body from public.dm_messages x where x.id::text = p_target)
  end;
$$;
revoke execute on function public.report_text(text, text) from public, anon, authenticated;

create or replace function public.report_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := public.report_author_any(new.kind, new.target);
begin
  if new.snapshot is null then
    new.snapshot := jsonb_build_object(
      'text', left(public.report_text(new.kind, new.target), 1000),
      'author_id', who,
      'author', (select coalesce(p.handle, p.display_name) from public.profiles p where p.id = who),
      'at', now());
  end if;
  return new;
end;
$$;
drop trigger if exists report_snapshot on public.reports;
create trigger report_snapshot before insert on public.reports
  for each row execute function public.report_snapshot();

create or replace function public.staff_reports()
returns table (kind text, target text, preview text, author text, reports int, reasons text[], first_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.need_staff();
  return query
    with open as (
      select r.kind, r.target, count(*)::int as n, array_remove(array_agg(r.reason order by r.created_at), null) as why, min(r.created_at) as first_at,
             (array_agg(r.snapshot order by r.created_at))[1] as snap
      from public.reports r where not r.handled
      group by r.kind, r.target
    )
    select o.kind, o.target,
           coalesce(case o.kind
             when 'comment'       then (select c.body from public.comments c where c.id::text = o.target)
             when 'room_post'     then (select x.body from public.room_posts x where x.id::text = o.target)
             when 'group_message' then (select x.body from public.group_messages x where x.id::text = o.target)
             when 'profile'       then (select concat_ws(' · ', p.display_name, p.bio, p.about) from public.profiles p where p.id::text = o.target)
             when 'group'         then (select g.name from public.groups g where g.id::text = o.target)
             when 'spark'         then (select concat_ws(' · ', s.title, s.place) from public.sparks s where s.id::text = o.target)
             when 'post_comment'  then public.post_comment_body(o.target)
             when 'dm_message'    then (select x.body from public.dm_messages x where x.id::text = o.target)
           end, o.snap ->> 'text'),
           coalesce((select coalesce(p.handle, p.display_name) from public.profiles p where p.id = public.report_author_any(o.kind, o.target)), o.snap ->> 'author'),
           o.n, o.why, o.first_at
    from open o
    order by o.n desc, o.first_at;
end;
$$;

create or replace function public.staff_report_settle(p_kind text, p_target text, p_remove boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  who record;
begin
  perform public.need_staff();
  if coalesce(p_remove, false) then
    if p_kind = 'comment' then
      update public.comments set is_hidden = true where id::text = p_target;
    elsif p_kind = 'room_post' then
      delete from public.room_posts where id::text = p_target;
    elsif p_kind = 'group_message' then
      delete from public.group_messages where id::text = p_target;
    elsif p_kind = 'spark' then
      delete from public.sparks where id::text = p_target;
    elsif p_kind = 'group' then
      delete from public.groups where id::text = p_target;
    elsif p_kind = 'post_comment' then
      execute 'update public.post_comments set is_hidden = true where id::text = $1' using p_target;
    elsif p_kind = 'profile' then
      update public.profiles set bio = null, about = null where id::text = p_target;
      delete from public.profile_links where user_id::text = p_target;
      delete from public.profile_photos where user_id::text = p_target;
    else
      raise exception 'which kind?';
    end if;
  end if;
  for who in select distinct r.reporter_id from public.reports r
             where r.kind = p_kind and r.target = p_target and not r.handled and r.reporter_id is not null loop
    perform public.notice(who.reporter_id,
                          case when coalesce(p_remove, false) then 'report_removed' else 'report_kept' end,
                          jsonb_build_object('what', p_kind));
  end loop;
  update public.reports set handled = true where kind = p_kind and target = p_target and not handled;
  perform public.staff_note(case when coalesce(p_remove, false) then 'remove' else 'keep' end, 'report:' || p_kind, p_target, null);
end;
$$;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('84_report_snapshot.sql', 'c54686d5ef5522460c11364078715e0b5ee8dcd170bcaabd302b6cddd79c5064');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('84_report_snapshot.sql');
  end if;
end $$;


-- ===== 85_appeals.sql =====
-- afterhours — a closed account may object (85)
--
-- A closed account could read why, download its data and leave; it could not say
-- "that is wrong" anywhere the staff would see (F16, 20.10.2026; the DSA asks for
-- an internal way to complain about a decision). Decided: a box on the closed
-- screen. One open objection at a time, 20 to 600 characters; the staff see them
-- in the panel beside the reports and answer with "open again" or "stays closed";
-- the person hears through a notice (appeal_ok / appeal_no) the next time the app
-- starts, and sees the state on the closed screen itself.
--
--   appeal(body)                       the closed account writes once
--   my_appeal()                        what the closed screen shows
--   staff_appeals()                    the open ones, oldest first
--   staff_appeal_settle(id, unban)     open again, or not; both are logged

create table if not exists public.appeals (
  id          bigserial primary key,
  user_id     uuid not null references public.profiles on delete cascade,
  body        text not null check (length(btrim(body)) between 20 and 600),
  created_at  timestamptz not null default now(),
  settled_at  timestamptz,
  outcome     text check (outcome is null or outcome in ('unban', 'keep')),
  settled_by  uuid references public.profiles on delete set null
);
create index if not exists appeals_open on public.appeals (created_at) where settled_at is null;
alter table public.appeals enable row level security;
revoke all on public.appeals from public, anon, authenticated;

alter table public.notices drop constraint if exists notices_kind_check;
alter table public.notices add constraint notices_kind_check
  check (kind in ('comment_hidden', 'post_hidden', 'removed', 'profile_cleared',
                  'role', 'dj_verified', 'dj_hidden', 'report_removed', 'report_kept',
                  'night_ok', 'night_no', 'appeal_ok', 'appeal_no'));

create or replace function public.appeal(p_body text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if not public.is_banned() then raise exception 'the account is open'; end if;
  if exists (select 1 from public.appeals a where a.user_id = auth.uid() and a.settled_at is null) then
    raise exception 'already sent';
  end if;
  insert into public.appeals (user_id, body) values (auth.uid(), btrim(p_body));
end;
$$;
grant execute on function public.appeal(text) to authenticated;

create or replace function public.my_appeal()
returns table (sent_at timestamptz, outcome text, settled_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select a.created_at, a.outcome, a.settled_at from public.appeals a
  where a.user_id = auth.uid() order by a.created_at desc limit 1;
$$;
grant execute on function public.my_appeal() to authenticated;

create or replace function public.staff_appeals()
returns table (id bigint, user_id uuid, handle text, reason text, banned_at timestamptz, body text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.need_staff();
  return query
    select a.id, a.user_id, coalesce(p.handle, p.display_name), p.banned_reason, p.banned_at, a.body, a.created_at
    from public.appeals a join public.profiles p on p.id = a.user_id
    where a.settled_at is null
    order by a.created_at;
end;
$$;
grant execute on function public.staff_appeals() to authenticated;

create or replace function public.staff_appeal_settle(p_id bigint, p_unban boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.appeals%rowtype;
begin
  perform public.need_staff();
  select * into a from public.appeals where id = p_id and settled_at is null;
  if a.id is null then raise exception 'no such appeal'; end if;
  update public.appeals set settled_at = now(), outcome = case when coalesce(p_unban, false) then 'unban' else 'keep' end, settled_by = auth.uid()
   where id = p_id;
  if coalesce(p_unban, false) then
    perform public.staff_unban(a.user_id);
  end if;
  perform public.notice(a.user_id, case when coalesce(p_unban, false) then 'appeal_ok' else 'appeal_no' end, '{}'::jsonb);
  perform public.staff_note(case when coalesce(p_unban, false) then 'appeal-unban' else 'appeal-keep' end, 'person', a.user_id::text, null);
end;
$$;
grant execute on function public.staff_appeal_settle(bigint, boolean) to authenticated;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('85_appeals.sql', '1c7ec869e98f4f8cff38ddc21df11bcf30cf7e7909633f92a856377cd3d6ae17');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('85_appeals.sql');
  end if;
end $$;


-- ===== 86_person_file.sql =====
-- afterhours — the file on a person, and who may open a closed account (86)
--
-- The staff saw a person as one row: a name, a role, a badge. What they had been
-- reported for, how often, what was said, whether they had been closed before and
-- what they wrote in objection lived in five tables nobody could read together
-- (F18, 20.10.2026). And a community manager could open an account an admin had
-- closed. Decided: one file per person, and a tier.
--
--   staff_person(user)   jsonb: who, reports about them (with the copies of 84),
--                        reports they made, objections (85), the staff log on them
--   staff_unban(user)    as 52, but a ban given by an admin is lifted by an admin only;
--                        staff_appeal_settle (85) goes through it and inherits the rule

create or replace function public.staff_unban(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  by_admin boolean;
begin
  perform public.need_staff();
  select coalesce(b.is_admin or b.account_type = 'admin', false) into by_admin
    from public.profiles p left join public.profiles b on b.id = p.banned_by
   where p.id = p_user;
  if coalesce(by_admin, false) and not coalesce(public.is_admin(), false) then
    raise exception 'an admin closed this account; only an admin opens it' using errcode = '42501';
  end if;
  perform set_config('afterhours.ban', 'on', true);
  update public.profiles set banned_at = null, banned_reason = null, banned_by = null where id = p_user;
  perform set_config('afterhours.ban', '', true);
  perform public.staff_note('unban', 'person', p_user::text, null);
end;
$$;

create or replace function public.staff_person(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  out jsonb;
begin
  perform public.need_staff();
  select jsonb_build_object(
    'who', (select jsonb_build_object('id', p.id, 'handle', p.handle, 'name', p.display_name, 'role',
                     case when p.is_admin then 'admin' else p.account_type end, 'created_at', p.created_at,
                     'banned_at', p.banned_at, 'banned_reason', p.banned_reason,
                     'banned_by', (select coalesce(b.handle, b.display_name) from public.profiles b where b.id = p.banned_by),
                     'banned_by_admin', (select coalesce(b.is_admin or b.account_type = 'admin', false) from public.profiles b where b.id = p.banned_by))
            from public.profiles p where p.id = p_user),
    'reports_about', coalesce((select jsonb_agg(jsonb_build_object('kind', r.kind, 'target', r.target, 'text', r.snapshot ->> 'text',
                                 'reason', r.reason, 'handled', r.handled, 'at', r.created_at) order by r.created_at desc)
            from public.reports r where (r.snapshot ->> 'author_id') = p_user::text), '[]'::jsonb),
    'reports_made', coalesce((select jsonb_agg(jsonb_build_object('kind', r.kind, 'reason', r.reason, 'handled', r.handled, 'at', r.created_at) order by r.created_at desc)
            from public.reports r where r.reporter_id = p_user), '[]'::jsonb),
    'appeals', coalesce((select jsonb_agg(jsonb_build_object('body', a.body, 'outcome', a.outcome, 'at', a.created_at, 'settled_at', a.settled_at) order by a.created_at desc)
            from public.appeals a where a.user_id = p_user), '[]'::jsonb),
    'log', coalesce((select jsonb_agg(jsonb_build_object('action', l.action, 'note', l.note, 'at', l.at,
                                 'by', (select coalesce(x.handle, x.display_name) from public.profiles x where x.id = l.actor_id)) order by l.at desc)
            from public.staff_log l where l.target = 'person' and l.target_id = p_user::text), '[]'::jsonb)
  ) into out;
  return out;
end;
$$;
grant execute on function public.staff_person(uuid) to authenticated;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('86_person_file.sql', 'c4ec3d2800b5dc808a1b3a53e9fa2a380fdea01912c699317cd69b9aa1ed7649');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('86_person_file.sql');
  end if;
end $$;


-- ===== 87_cron_health.sql =====
-- afterhours — is the clock running (87)
--
-- Six jobs hang off pg_cron: push_flush, push_hourly, group_push_hourly,
-- hide_past_events, guests_prune, the error prune. If the extension is off or a job
-- is unscheduled, every one of them dies in silence and nothing says so (F11,
-- 20.10.2026; the deck has filtered its own dates since 67). cron_health() reads
-- the cron schema when it is there - how many afterhours jobs are scheduled, when
-- one last ran well, when one last failed - and tools/health.mjs goes red when the
-- last good run is more than two hours old. Outside Supabase (the tests) the schema
-- is missing and the answer is zero and null.

create or replace function public.cron_health()
returns table (jobs int, last_ok timestamptz, last_failed timestamptz, failed_24h int)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if to_regclass('cron.job') is null or to_regclass('cron.job_run_details') is null then
    return query select 0, null::timestamptz, null::timestamptz, 0;
    return;
  end if;
  return query execute $q$
    select (select count(*)::int from cron.job where active),
           (select max(end_time) from cron.job_run_details where status = 'succeeded'),
           (select max(end_time) from cron.job_run_details where status = 'failed'),
           (select count(*)::int from cron.job_run_details where status = 'failed' and end_time > now() - interval '24 hours')
  $q$;
end;
$$;
grant execute on function public.cron_health() to anon, authenticated;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('87_cron_health.sql', '66855abff143fb2e064f228a9169eda723792c65e627a10e8998c1f8813e3715');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('87_cron_health.sql');
  end if;
end $$;


-- ===== 88_checkin_truth.sql =====
-- afterhours — a check-in that means something (88)
--
-- 23 took the door tests away so that a card is never refused; since then any tap,
-- any time, anywhere, told every friend "X is out now" - and the location the phone
-- sent was thrown away (F9, 20.10.2026). Decided: the card is still never refused,
-- but the word to friends is. A check-in is LIVE when it falls six hours before to
-- eight hours after the night starts and, when the phone gave a position and the
-- night has one, within two kilometres of it. Only a live check-in pushes friend_live
-- and shows in friends_live(); the card, the room and the collection are the same
-- either way. The position is kept on the row now (the export of 64 lists it).
-- And a check-in can be taken back within an hour: the card goes, the pushes that
-- have not left go with it.
--
--   check_in(slug, lat, lng, at)   as 37; sets lat, lng, live
--   check_out(slug)                within an hour of the check-in; "toolate" after
--   km_between(lat1, lng1, lat2, lng2)

-- the table of 19 predates 23, which meant to add the position; the columns are made sure of here
alter table public.checkins add column if not exists lat double precision;
alter table public.checkins add column if not exists lng double precision;
alter table public.checkins add column if not exists live boolean not null default true;

create or replace function public.km_between(a_lat double precision, a_lng double precision, b_lat double precision, b_lng double precision)
returns double precision
language sql
immutable
as $$
  select 2 * 6371 * asin(sqrt(
    power(sin(radians(b_lat - a_lat) / 2), 2)
    + cos(radians(a_lat)) * cos(radians(b_lat)) * power(sin(radians(b_lng - a_lng) / 2), 2)));
$$;

create or replace function public.check_in(
  p_slug text,
  p_lat  double precision default null,
  p_lng  double precision default null,
  p_at   timestamptz default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  e     public.events%rowtype;
  n     bigint;
  at    timestamptz := least(coalesce(p_at, now()), now());
  there double precision;
  x_lat double precision;
  x_lng double precision;
  live  boolean := true;
begin
  if auth.uid() is null or public.is_guest() then raise exception 'signedout'; end if;
  select * into e from public.events where slug = p_slug and is_published;
  if not found then raise exception 'nonight'; end if;

  -- One card per person per night: a second try returns the first card.
  select card_no into n from public.checkins where user_id = auth.uid() and event_id = e.id;
  if found then return n; end if;

  if at < now() - interval '12 hours' then at := now(); end if;

  -- the window: six hours before to eight after; a night without a time is always in it
  if e.starts_at is not null and (at < e.starts_at - interval '6 hours' or at > e.starts_at + interval '8 hours') then
    live := false;
  end if;
  -- the place: the position of the night, else of its venue; no position on either side, no test
  select coalesce(e.lat, v.lat), coalesce(e.lng, v.lng) into x_lat, x_lng
    from (select 1) one left join public.venues v on v.id = e.venue_id;
  if live and p_lat is not null and p_lng is not null and x_lat is not null and x_lng is not null then
    there := public.km_between(p_lat, p_lng, x_lat, x_lng);
    if there > 2 then live := false; end if;
  end if;

  insert into public.checkins (user_id, event_id, checked_at, lat, lng, live)
  values (auth.uid(), e.id, at, p_lat, p_lng, live) returning card_no into n;
  return n;
end;
$$;

create or replace function public.check_out(p_slug text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  c public.checkins%rowtype;
begin
  if auth.uid() is null then raise exception 'signedout'; end if;
  select c0.* into c from public.checkins c0 join public.events e on e.id = c0.event_id
   where c0.user_id = auth.uid() and e.slug = p_slug;
  if c.id is null then return false; end if;
  if c.checked_at < now() - interval '1 hour' then raise exception 'toolate'; end if;
  delete from public.push_outbox
   where sent_at is null and (key = 'room_open:' || c.id::text or key like 'live:%:' || c.id::text);
  delete from public.checkins where id = c.id;
  return true;
end;
$$;
grant execute on function public.check_out(text) to authenticated;

create or replace function public.push_on_checkin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  night  record;
  friend uuid;
begin
  select e.title, e.slug, v.name as venue
    into night
  from public.events e left join public.venues v on v.id = e.venue_id
  where e.id = new.event_id;

  perform public.push_enqueue(new.user_id, 'room_open', format('room_open:%s', new.id),
    jsonb_build_object('title', night.title, 'url', '/room/' || night.slug));

  if new.show_friends and new.live then
    for friend in select f.friend from public.push_edges f where f.who = new.user_id loop
      perform public.push_enqueue(friend, 'friend_live',
        format('live:%s:%s', friend, new.id),
        jsonb_build_object('name', public.push_name(new.user_id),
                           'title', coalesce(night.venue || ' · ', '') || night.title,
                           'url', '/night/' || night.slug));
    end loop;
  end if;
  return new;
end;
$$;

create or replace function public.friends_live()
returns table (
  friend_id     uuid,
  handle        text,
  display_name  text,
  slug          text,
  title         text,
  venue_name    text,
  checked_at    timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select c.user_id, p.handle, p.display_name, e.slug, e.title, v.name, date_trunc('hour', c.checked_at)
  from public.checkins c
  join public.profiles p on p.id = c.user_id
  join public.events e on e.id = c.event_id
  left join public.venues v on v.id = e.venue_id
  where c.show_friends and c.live
    and c.checked_at > now() - interval '8 hours'
    and public.is_friend(c.user_id)
  order by c.checked_at desc;
$$;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('88_checkin_truth.sql', 'd29cb8a9f3e17270d5f4fb130240b544df21cdf44a76ee452afae94dc84f78d9');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('88_checkin_truth.sql');
  end if;
end $$;
