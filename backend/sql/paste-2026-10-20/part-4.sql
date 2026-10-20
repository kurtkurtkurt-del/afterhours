-- afterhours — paste 4 of 5 (20.10.2026): 89_export_all.sql … 94_retention.sql
-- Supabase → SQL Editor → New query → paste all → Run. Safe to run twice.

-- ===== 89_export_all.sql =====
-- afterhours — the export, whole (89)
--
-- export_me() (14, 64) handed back profile, settings, swipes, comments, friends,
-- feedback, messages and tickets and nothing else, while the privacy notice promises
-- everything (F3, 20.10.2026). The function is that of 64 with every later table a
-- person writes to: check-ins (with the position of 88), room lines, rsvps, posts and
-- their likes and comments, groups (membership, own messages and photos), sparks and
-- answers, profile links and photo, who they blocked, reports they made, objections,
-- every notification switch, the DJ page they own, the nights they sent in.
-- Lines of other people are never in it; only what this person wrote.

create or replace function public.export_me()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'taken_at', now(),
    'about', 'Everything afterhours holds about you. Your account email lives'
             || ' with the sign-in provider, not in this database.',

    'profile', (
      select to_jsonb(x) from (
        select p.handle, p.display_name, p.bio, c.slug as city,
               p.created_at as joined, p.onboarded_at, p.last_seen_at
        from public.profiles p
        left join public.cities c on c.id = p.city_id
        where p.id = auth.uid()
      ) x),

    'settings', (
      select to_jsonb(x) from (
        select s.kept_visibility, s.discoverable, s.notify_email, s.locale
        from public.profile_settings s where s.user_id = auth.uid()
      ) x),

    'swipes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'event', e.slug, 'title', e.title,
               'direction', w.direction, 'at', w.created_at)
             order by w.created_at)
      from public.swipes w
      join public.events e on e.id = w.event_id
      where w.user_id = auth.uid()
    ), '[]'::jsonb),

    'comments', coalesce((
      select jsonb_agg(jsonb_build_object(
               'event', e.slug, 'body', c.body,
               'reply_to', c.parent_id, 'at', c.created_at)
             order by c.created_at)
      from public.comments c
      join public.events e on e.id = c.event_id
      where c.author_id = auth.uid()
    ), '[]'::jsonb),

    'friendships', coalesce((
      select jsonb_agg(jsonb_build_object(
               'handle', p.handle, 'status', f.status,
               'direction', case when f.requester_id = auth.uid()
                                 then 'outgoing' else 'incoming' end,
               'at', f.created_at)
             order by f.created_at)
      from public.friendships f
      join public.profiles p
        on p.id = case when f.requester_id = auth.uid()
                       then f.addressee_id else f.requester_id end
      where f.requester_id = auth.uid() or f.addressee_id = auth.uid()
    ), '[]'::jsonb),

    'feedback', coalesce((
      select jsonb_agg(jsonb_build_object(
               'kind', g.kind, 'body', g.body, 'at', g.created_at)
             order by g.created_at)
      from public.feedback g where g.author_id = auth.uid()
    ), '[]'::jsonb),

    -- The lines you wrote, named by the friend they went to.
    'messages', coalesce((
      select jsonb_agg(jsonb_build_object(
               'to', p.handle, 'body', m.body, 'at', m.created_at)
             order by m.id)
      from public.dm_messages m
      join public.dm_threads t on t.id = m.thread_id
      left join public.profiles p
        on p.id = case when t.a = auth.uid() then t.b else t.a end
      where m.user_id = auth.uid()
    ), '[]'::jsonb),

    'checkins', coalesce((
      select jsonb_agg(jsonb_build_object('event', e.slug, 'title', e.title, 'card_no', k.card_no,
               'at', k.checked_at, 'lat', k.lat, 'lng', k.lng, 'shown_to_friends', k.show_friends) order by k.checked_at)
      from public.checkins k join public.events e on e.id = k.event_id where k.user_id = auth.uid()), '[]'::jsonb),
    'room_lines', coalesce((
      select jsonb_agg(jsonb_build_object('event', e.slug, 'body', r.body, 'at', r.created_at) order by r.created_at)
      from public.room_posts r join public.events e on e.id = r.event_id where r.user_id = auth.uid()), '[]'::jsonb),
    'rsvps', coalesce((
      select jsonb_agg(jsonb_build_object('event', e.slug, 'answer', v.answer, 'at', v.updated_at) order by v.updated_at)
      from public.rsvps v join public.events e on e.id = v.event_id where v.user_id = auth.uid()), '[]'::jsonb),
    'posts', coalesce((
      select jsonb_agg(jsonb_build_object('body', p.body, 'photo', p.photo_path, 'event', e.slug, 'hidden', p.is_hidden, 'at', p.created_at) order by p.created_at)
      from public.posts p left join public.events e on e.id = p.event_id where p.author_id = auth.uid()), '[]'::jsonb),
    'post_likes', coalesce((
      select jsonb_agg(jsonb_build_object('post', l.post_id, 'at', l.created_at) order by l.created_at)
      from public.post_likes l where l.user_id = auth.uid()), '[]'::jsonb),
    'post_comments', coalesce((
      select jsonb_agg(jsonb_build_object('post', c.post_id, 'body', c.body, 'at', c.created_at) order by c.created_at)
      from public.post_comments c where c.author_id = auth.uid()), '[]'::jsonb),
    'groups', coalesce((
      select jsonb_agg(jsonb_build_object('name', g.name, 'emoji', g.emoji, 'role', m.role, 'joined', m.joined_at,
               'messages', (select coalesce(jsonb_agg(jsonb_build_object('body', x.body, 'kind', x.kind, 'at', x.created_at) order by x.created_at), '[]'::jsonb)
                            from public.group_messages x where x.group_id = g.id and x.user_id = auth.uid()),
               'photos', (select coalesce(jsonb_agg(x.path order by x.created_at), '[]'::jsonb)
                          from public.group_photos x where x.group_id = g.id and x.user_id = auth.uid())) order by m.joined_at)
      from public.group_members m join public.groups g on g.id = m.group_id where m.user_id = auth.uid()), '[]'::jsonb),
    'sparks', coalesce((
      select jsonb_agg(jsonb_build_object('kind', s.kind, 'title', s.title, 'place', s.place, 'starts_at', s.starts_at, 'at', s.created_at) order by s.created_at)
      from public.sparks s where s.host_id = auth.uid()), '[]'::jsonb),
    'spark_answers', coalesce((
      select jsonb_agg(jsonb_build_object('spark', s.title, 'answer', i.answer, 'at', i.answered_at) order by i.answered_at)
      from public.spark_invites i join public.sparks s on s.id = i.spark_id where i.user_id = auth.uid()), '[]'::jsonb),
    'links', coalesce((
      select jsonb_agg(jsonb_build_object('kind', l.kind, 'value', l.value) order by l.kind)
      from public.profile_links l where l.user_id = auth.uid()), '[]'::jsonb),
    'photo', (select f.path from public.profile_photos f where f.user_id = auth.uid()),
    'blocked', coalesce((
      select jsonb_agg(jsonb_build_object('handle', p.handle, 'at', b.created_at) order by b.created_at)
      from public.blocks b join public.profiles p on p.id = b.blocked_id where b.blocker_id = auth.uid()), '[]'::jsonb),
    'reports_made', coalesce((
      select jsonb_agg(jsonb_build_object('kind', r.kind, 'reason', r.reason, 'handled', r.handled, 'at', r.created_at) order by r.created_at)
      from public.reports r where r.reporter_id = auth.uid()), '[]'::jsonb),
    'appeals', coalesce((
      select jsonb_agg(jsonb_build_object('body', a.body, 'outcome', a.outcome, 'at', a.created_at) order by a.created_at)
      from public.appeals a where a.user_id = auth.uid()), '[]'::jsonb),
    'notifications', (
      select to_jsonb(x) from (
        select s.notify_requests, s.notify_accepts, s.notify_matches, s.notify_live, s.notify_nights, s.notify_rooms,
               s.notify_replies, s.notify_digest, s.notify_djs, s.notify_waves, s.notify_sparks, s.notify_groups, s.notify_posts, s.notify_dms
        from public.profile_settings s where s.user_id = auth.uid()) x),
    'dj_page', (
      select to_jsonb(x) from (select d.slug, d.name, d.genre, d.bio, d.verified from public.djs d where d.owner_id = auth.uid()) x),
    'nights_sent', coalesce((
      select jsonb_agg(jsonb_build_object('title', e.title, 'starts_at', e.starts_at, 'published', e.is_published, 'at', e.created_at) order by e.created_at)
      from public.events e where e.created_by = auth.uid()), '[]'::jsonb),

    'tickets', coalesce((
      select jsonb_agg(jsonb_build_object(
               'event', e.slug, 'title', e.title,
               'answer', k.answer, 'at', k.answered_at)
             order by k.answered_at)
      from public.tickets k
      join public.events e on e.id = k.event_id
      where k.user_id = auth.uid()
    ), '[]'::jsonb)
  )
  where auth.uid() is not null;
$$;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('89_export_all.sql', '7b31143e846e9a6f8410a1175e128cdacca2128dd437e2119333721d6c5127fb');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('89_export_all.sql');
  end if;
end $$;


-- ===== 90_dm_seen.sql =====
-- afterhours — who has read what, kept by the server (90)
--
-- What a person had seen of a conversation lived on the phone alone: a second
-- phone, a reinstall or the web showed every line as new (F28, 20.10.2026). The
-- thread now carries, for each side, the last line that side has seen; dm_seen
-- moves it, dm_list counts the lines after it that are not mine. The phone keeps
-- its own mark too and uses the one on the server when it is there. dm_list is that of 59
-- with the one column, so it is dropped and made again with its grant.

alter table public.dm_threads add column if not exists seen_a bigint not null default 0;
alter table public.dm_threads add column if not exists seen_b bigint not null default 0;

create or replace function public.dm_seen(p_thread uuid, p_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'sign in first'; end if;
  update public.dm_threads
     set seen_a = case when a = me then greatest(seen_a, p_id) else seen_a end,
         seen_b = case when b = me then greatest(seen_b, p_id) else seen_b end
   where id = p_thread and me in (a, b);
end;
$$;
grant execute on function public.dm_seen(uuid, bigint) to authenticated;

drop function if exists public.dm_list();
create or replace function public.dm_list()
returns table (id uuid, other_id uuid, handle text, name text, last_body text, last_mine boolean, last_id bigint, last_at timestamptz, unread int)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid := public.assert_member();
begin
  return query
  select t.id, o.id, o.handle, coalesce(o.display_name, o.handle),
         l.body, l.user_id = me, l.id, t.last_at,
         (select count(*)::int from public.dm_messages u
           where u.thread_id = t.id and u.user_id <> me
             and u.id > case when t.a = me then t.seen_a else t.seen_b end)
  from public.dm_threads t
  join public.profiles o on o.id = case when t.a = me then t.b else t.a end
  left join lateral (select m.id, m.body, m.user_id from public.dm_messages m where m.thread_id = t.id order by m.id desc limit 1) l on true
  where me in (t.a, t.b)
    and public.reachable(me, o.id)
  order by t.last_at desc;
end;
$$;
grant execute on function public.dm_list() to authenticated;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('90_dm_seen.sql', 'ffd942a2cb07ce815b8c3df126b045187574293773a33b312af376f731811fe5');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('90_dm_seen.sql');
  end if;
end $$;


-- ===== 91_checksums.sql =====
-- afterhours — a file remembers its own text (91)
--
-- The migration log (00) knew a file by name alone: a file edited after it was
-- pasted, or an old copy pasted again over newer shared functions, left no trace
-- (F33, 20.10.2026). tools/stamp-sql.mjs now writes the sha256 of each file into
-- its own stamp block; migration_done(name, hash) keeps it here, and
-- tools/health.mjs compares what is applied with what the repository holds.
-- A file pasted before this one still stamps by name (the block tries both).
-- migrations_applied returns the hash too, so it is dropped and made again.

alter table public.migrations add column if not exists hash text;

create or replace function public.migration_done(p_name text, p_hash text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.migrations (name, hash) values (p_name, p_hash)
  on conflict (name) do update set applied_at = now(), hash = excluded.hash;
$$;

drop function if exists public.migrations_applied();
create or replace function public.migrations_applied()
returns table (name text, applied_at timestamptz, hash text)
language sql
stable
security definer
set search_path = public
as $$
  select m.name, m.applied_at, m.hash from public.migrations m order by m.name;
$$;
grant execute on function public.migrations_applied() to anon, authenticated;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('91_checksums.sql', '3e2d52d795b47a138cfdb605bf8c6d50fc8ebe393292a64f26aafb56e41061f0');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('91_checksums.sql');
  end if;
end $$;


-- ===== 92_timezones.sql =====
-- afterhours — the hour a night starts, in its own city (92)
--
-- The sync wrote the local date and time of a night with no zone, and Postgres
-- read it as UTC: every synced night sat one or two hours late in the database,
-- and the pushes, the past cut, the rooms and the quiet hours moved with it
-- (F37, 20.10.2026). From now on the sync sends the zone Ticketmaster names
-- (tools/sync-ticketmaster.mjs) and keeps it on the row; the cities carry theirs
-- by country for everything else. The rows already here are moved once: what was
-- stored as 20:00 UTC becomes 20:00 in the city. The move runs only the first time
-- this file does - the log of 00 says whether it has.

alter table public.cities add column if not exists tz text not null default 'Europe/Berlin';
update public.cities set tz = case country_slug
    when 'de' then 'Europe/Berlin'
    when 'at' then 'Europe/Vienna'
    when 'ch' then 'Europe/Zurich'
    when 'nl' then 'Europe/Amsterdam'
    when 'be' then 'Europe/Brussels'
    when 'fr' then 'Europe/Paris'
    when 'es' then 'Europe/Madrid'
    when 'it' then 'Europe/Rome'
    when 'pl' then 'Europe/Warsaw'
    when 'cz' then 'Europe/Prague'
    when 'hu' then 'Europe/Budapest'
    when 'dk' then 'Europe/Copenhagen'
    when 'se' then 'Europe/Stockholm'
    when 'no' then 'Europe/Oslo'
    when 'fi' then 'Europe/Helsinki'
    when 'gr' then 'Europe/Athens'
    when 'tr' then 'Europe/Istanbul'
    when 'gb' then 'Europe/London'
    when 'ie' then 'Europe/Dublin'
    when 'pt' then 'Europe/Lisbon'
    when 'ae' then 'Asia/Dubai'
    when 'hk' then 'Asia/Hong_Kong'
    when 'sg' then 'Asia/Singapore'
    when 'jp' then 'Asia/Tokyo'
    when 'kr' then 'Asia/Seoul'
    when 'tw' then 'Asia/Taipei'
    when 'id' then 'Asia/Jakarta'
    when 'au' then 'Australia/Sydney'
    when 'nz' then 'Pacific/Auckland'
    when 'fj' then 'Pacific/Fiji'
    when 'ke' then 'Africa/Nairobi'
    when 'ma' then 'Africa/Casablanca'
    when 'ng' then 'Africa/Lagos'
    else 'Europe/Berlin' end;

alter table public.events add column if not exists tz text;

do $$ begin
  if not exists (select 1 from public.migrations where name = '92_timezones.sql') then
    update public.events e
       set starts_at = ((e.starts_at at time zone 'UTC') at time zone c.tz),
           tz = c.tz
      from public.cities c
     where c.id = e.city_id and e.source = 'ticketmaster' and e.starts_at is not null and e.tz is null;
  end if;
end $$;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('92_timezones.sql', '6a39dfdcfe1d157e9c02b639f4b03de15aa2fd906a1d017942edaf2bcb36b2c5');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('92_timezones.sql');
  end if;
end $$;


-- ===== 93_staff_backlog.sql =====
-- afterhours — what the staff have left waiting (93)
--
-- The staff hear of a report by push alone (staff_ping); with no phone registered
-- nobody hears, and nothing watches the promise of a look within 24 hours
-- (F38, 20.10.2026). staff_backlog() counts what has waited too long - reports
-- open for 20 hours, objections for 3 days, nights sent in for 3 days - and
-- tools/health.mjs goes red on it, which the morning health workflow turns into
-- a failed run and a mail. No new service; the repository already sends those.

create or replace function public.staff_backlog()
returns table (reports_waiting int, oldest_report timestamptz, appeals_waiting int, nights_waiting int)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(distinct (r.kind, r.target))::int from public.reports r
      where not r.handled and r.created_at < now() - interval '20 hours'),
    (select min(r.created_at) from public.reports r where not r.handled),
    (select count(*)::int from public.appeals a where a.settled_at is null and a.created_at < now() - interval '3 days'),
    (select count(*)::int from public.events e where not e.is_published and e.source = 'user' and e.created_at < now() - interval '3 days');
$$;
grant execute on function public.staff_backlog() to anon, authenticated;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('93_staff_backlog.sql', 'fbc4f21a9db0099d046ecc689a1c54cd1b1a3476683c1e0da9181a290cb9b6fc');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('93_staff_backlog.sql');
  end if;
end $$;


-- ===== 94_retention.sql =====
-- afterhours — what is kept, and for how long (94)
--
-- The privacy notice promised periods the code did not keep: pushes stayed in the
-- outbox for ever, settled reports and objections never left (F5, 20.10.2026).
-- retention_prune() runs every night at 04:45 and holds the database to the notice:
--   push_outbox     sent pushes after 30 days, unsent ones after 7
--   reports         settled ones a year after they were made (repeat offences are
--                   recognised within that year; the copy of 84 goes with them)
--   appeals         settled ones after a year
--   notices         read or not, after 90 days
-- Guests (54, 30 days), client errors (51, 30 days) and the backups (90 and 30 days)
-- keep their own clocks. Returns how many rows went, for the log.

create or replace function public.retention_prune()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n int := 0;
  k int;
begin
  delete from public.push_outbox where (sent_at is not null and sent_at < now() - interval '30 days')
                                    or (sent_at is null and created_at < now() - interval '7 days');
  get diagnostics k = row_count; n := n + k;
  delete from public.reports where handled and created_at < now() - interval '1 year';
  get diagnostics k = row_count; n := n + k;
  delete from public.appeals where settled_at is not null and settled_at < now() - interval '1 year';
  get diagnostics k = row_count; n := n + k;
  delete from public.notices where created_at < now() - interval '90 days';
  get diagnostics k = row_count; n := n + k;
  return n;
end;
$$;
revoke execute on function public.retention_prune() from public, anon, authenticated;

do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'afterhours-retention';
    perform cron.schedule('afterhours-retention', '45 4 * * *', $q$select public.retention_prune()$q$);
  end if;
end $$;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('94_retention.sql', '97eaddca67f1c86737829fd9206277640cf2c524ef5964688cf53d8d100ef94a');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('94_retention.sql');
  end if;
end $$;
