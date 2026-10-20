-- afterhours — paste 1 of 5 (20.10.2026): 64_export_more.sql … 71_health_more.sql
-- Supabase → SQL Editor → New query → paste all → Run. Safe to run twice.

-- ===== 64_export_more.sql =====
-- afterhours — the export, with your messages and your ticket answers (64)
--
-- export_me() (14) was written before direct messages (59) and ticket answers (60),
-- so it handed a person less than everything. The same function again, with two more
-- lists:
--   messages   the lines you wrote, each with the handle of the friend it went to
--   tickets    your answer for each night: got or no, and when
-- The lines the other person wrote are theirs, not yours, and stay out: the export
-- holds everything of yours and nothing of anybody else (promise 6).

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

grant execute on function public.export_me() to authenticated;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('64_export_more.sql', '75d37ddd068f002d692f299f8840fb3b69b703a57eae0d056f84cec6144a4bd4');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('64_export_more.sql');
  end if;
end $$;


-- ===== 65_account_delete.sql =====
-- afterhours — deleting an account, the two loose ends (65)
--
-- delete_account() (12) removes the auth user and lets the cascades do the rest; the
-- full sweep in delete-account.test.mjs shows no row of any table still points at the
-- person afterwards. Two things the cascade cannot know:
--   the last admin   guard_last_admin (53) keeps the last admin from being demoted,
--                    but a deletion went round it and left nobody to run the panel
--   a group owner    group_leave (44) hands a group to the longest member; a deletion
--                    took the owner row away and left a group nobody could manage,
--                    or, when the owner was alone, an empty group
-- The same function again, with both closed. Comments are still kept as someone (12).

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  g  uuid;
begin
  if me is null then
    raise exception 'sign in first';
  end if;

  if exists (select 1 from public.profiles where id = me and is_admin)
     and not exists (select 1 from public.profiles where is_admin and id <> me) then
    raise exception 'the last admin stays an admin';
  end if;

  for g in select group_id from public.group_members where user_id = me loop
    delete from public.group_members where group_id = g and user_id = me;
    if not exists (select 1 from public.group_members where group_id = g) then
      delete from public.groups where id = g;
    elsif not exists (select 1 from public.group_members where group_id = g and role = 'owner') then
      update public.group_members set role = 'owner'
       where group_id = g and user_id = (select user_id from public.group_members
                                          where group_id = g order by joined_at, user_id limit 1);
    end if;
  end loop;

  update public.comments
     set author_id = null, author_name = 'someone'
   where author_id = me;

  delete from auth.users where id = me;
end;
$$;

grant execute on function public.delete_account() to authenticated;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('65_account_delete.sql', '4b82eceeb5cf323a09884a8024f5fe06ee48435a83bfcb089160c9f3b6a3aa8e');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('65_account_delete.sql');
  end if;
end $$;


-- ===== 66_keep_past_nights.sql =====
-- afterhours — a night that happened stays (66)
--
-- The morning sync used to DELETE every Ticketmaster night whose date had passed.
-- events is the parent of nearly everything a person does on a night: the check-in
-- card in their collection, the room posts, the swipes, the comments, the answers to
-- who is coming, the ticket answers, the group votes. All of it went with the row,
-- every morning at 04:10. Found by the first autonomous night (A1 / F1, 20.10.2026).
--
-- From now on a past night is RETIRED, not deleted: is_published = false, which the
-- deck, the map and the counters already honour (06, 15, 18), while the collection
-- (19), the past feed (31) and the export (14) keep reading it. The sync does this
-- with a PATCH; hide_past_events() (09) does the same on its own clock.
--
-- Rows that nobody ever touched are still pruned, after a year: a night no one
-- swiped, kept, checked in to, answered or voted on carries no memory, and the
-- feed only reaches back 365 days. events_prune_untouched() is the only place that
-- deletes a synced night now, and it refuses any row something still points at.
--
--   events_prune_untouched(days)   service only; returns how many rows went

drop function if exists public.events_prune_untouched(int);
create or replace function public.events_prune_untouched(p_days int default 400)
returns integer
language sql
security definer
set search_path = public
as $$
  with gone as (
    delete from public.events e
    where e.source = 'ticketmaster'
      and e.starts_at is not null
      and e.starts_at < now() - make_interval(days => greatest(coalesce(p_days, 400), 365))
      and not exists (select 1 from public.swipes              x where x.event_id = e.id)
      and not exists (select 1 from public.comments            x where x.event_id = e.id)
      and not exists (select 1 from public.checkins            x where x.event_id = e.id)
      and not exists (select 1 from public.room_posts          x where x.event_id = e.id)
      and not exists (select 1 from public.rsvps               x where x.event_id = e.id)
      and not exists (select 1 from public.tickets             x where x.event_id = e.id)
      and not exists (select 1 from public.event_about         x where x.event_id = e.id)
      and not exists (select 1 from public.group_swipes        x where x.event_id = e.id)
      and not exists (select 1 from public.group_live_skips    x where x.event_id = e.id)
      and not exists (select 1 from public.group_photos        x where x.event_id = e.id)
      and not exists (select 1 from public.group_round_options x where x.event_id = e.id)
      and not exists (select 1 from public.group_ballots       x where x.event_id = e.id)
      and not exists (select 1 from public.group_tickets       x where x.event_id = e.id)
      and not exists (select 1 from public.posts               x where x.event_id = e.id)
      and not exists (select 1 from public.groups              x where x.plan_event_id = e.id)
    returning 1
  )
  select count(*)::int from gone;
$$;

-- The sync calls it with the service key; no browser role may.
revoke execute on function public.events_prune_untouched(int) from public, anon, authenticated;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('66_keep_past_nights.sql', 'c6bbe32a8697b1597cb2030db487d991b3ea853f0acc2413116ee63f59c143e6');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('66_keep_past_nights.sql');
  end if;
end $$;


-- ===== 67_deck_today.sql =====
-- afterhours — the deck does not depend on the clock job (67)
--
-- A synced night whose date has passed left the deck only when hide_past_events (09,
-- pg_cron) or the morning sync got to it. When neither ran, the deck and the counters
-- served last week: on 11.10.2026 health counted 680 past nights still published
-- (A7 / F11, 20.10.2026). The map already filtered by date (18); now the deck and the
-- counters do too. Only synced nights, whose dates are real: a seed or an admin-written
-- night with an estimated date is left to the jobs.
--
-- Same bodies as 15 and 06, plus one line: a synced night stays for eight hours after
-- its start (the night is still going), then it is gone from the deck.

create or replace function public.deck(
  p_city text default 'munchen',
  p_type text default null,
  p_limit int  default 60
)
returns setof public.events_public
language sql
stable
security definer
set search_path = public
as $$
  select e.*
  from public.events_public e
  where e.is_published
    and (p_city is null or e.city_slug = p_city)
    and (p_type is null or e.type_slug = p_type)
    and (e.source <> 'ticketmaster' or e.starts_at is null or e.starts_at > now() - interval '8 hours')
    and not exists (
      select 1 from public.swipes s
      where s.event_id = e.id and s.user_id = auth.uid()
    )
  order by e.poster_no nulls last, e.starts_at nulls last, e.slug
  limit p_limit;
$$;

create or replace function public.event_counts(p_city text default 'munchen')
returns table (type_slug text, type_name text, sort_order int, n bigint)
language sql
stable
as $$
  select e.type_slug, e.type_name, e.type_sort_order, count(*)
  from public.events_public e
  where e.is_published and e.city_slug = p_city
    and (e.source <> 'ticketmaster' or e.starts_at is null or e.starts_at > now() - interval '8 hours')
  group by e.type_slug, e.type_name, e.type_sort_order
  order by e.type_sort_order;
$$;

drop function if exists public.city_counts();
create or replace function public.city_counts()
returns table (
  slug            text,
  name            text,
  status          text,
  sort_order            int,
  country         text,
  country_slug    text,
  continent       text,
  continent_slug  text,
  n               bigint
)
language sql
stable
as $$
  select c.slug, c.name, c.status, c.sort_order, c.country, c.country_slug,
         c.continent, c.continent_slug,
         count(e.id) filter (where e.is_published
                             and (e.source <> 'ticketmaster' or e.starts_at is null or e.starts_at > now() - interval '8 hours'))
  from public.cities c
  left join public.events e on e.city_id = c.id
  group by c.slug, c.name, c.status, c.sort_order, c.country, c.country_slug,
           c.continent, c.continent_slug
  order by c.sort_order;
$$;

grant execute on function public.city_counts()         to anon, authenticated;
grant execute on function public.deck(text, text, int)  to anon, authenticated;
grant execute on function public.event_counts(text)     to anon, authenticated;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('67_deck_today.sql', '1f9c7019e1c0d8eca57c5a6ac4fb03e867cb2dfd721e72579df6348fb379045a');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('67_deck_today.sql');
  end if;
end $$;


-- ===== 68_report_answered.sql =====
-- afterhours — the person who reported hears the outcome (68)
--
-- A report went into the panel and the reporter never heard of it again (F16,
-- 20.10.2026). The one reported already gets a notice when something of theirs is
-- hidden or removed (53); now the reporter gets one too, the moment the staff settle
-- the report: report_removed when the thing went, report_kept when it stayed. The
-- notice says what kind of thing it was and nothing about who; the staff never
-- answer in their own words (58).
--
-- staff_report_settle() is the same as in 51, with the notices added before the
-- reports are marked handled.

alter table public.notices drop constraint if exists notices_kind_check;
alter table public.notices add constraint notices_kind_check
  check (kind in ('comment_hidden', 'post_hidden', 'removed', 'profile_cleared',
                  'role', 'dj_verified', 'dj_hidden', 'report_removed', 'report_kept'));

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
             where r.kind = p_kind and r.target = p_target and not r.handled loop
    perform public.notice(who.reporter_id,
                          case when coalesce(p_remove, false) then 'report_removed' else 'report_kept' end,
                          jsonb_build_object('what', p_kind));
  end loop;
  update public.reports set handled = true where kind = p_kind and target = p_target and not handled;
  perform public.staff_note(case when coalesce(p_remove, false) then 'remove' else 'keep' end, 'report:' || p_kind, p_target, null);
end;
$$;

revoke execute on function public.staff_report_settle(text, text, boolean) from public, anon;
grant execute on function public.staff_report_settle(text, text, boolean)  to authenticated;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('68_report_answered.sql', 'd31c57dbea50047478594749cc020ad351ba62ed92f4d92900ebac9714efe953');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('68_report_answered.sql');
  end if;
end $$;


-- ===== 69_rsvp_push.sql =====
-- afterhours — "I am in" reaches the friends on that night (69)
--
-- A friend answers who is coming with in (32) and nobody heard of it; a keep (a right
-- swipe) already tells the friends who kept the same night "{name} is going too"
-- (26, kind match). An answer is a louder keep: the same push, to the friends who
-- kept the night or answered in themselves, once per answerer and night. It rides on
-- the match switch (notify_matches) and the match words (58), so nothing new to set
-- or translate; the key says rsvp so it never collides with the push of the keep itself.
-- Nothing when the answerer keeps their keeps private (12: kept_visibility), as with
-- the keep itself. maybe and out say nothing. (C1, 20.10.2026)

create or replace function public.push_on_rsvp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  night record;
  them  record;
begin
  if new.answer <> 'in' or (tg_op = 'UPDATE' and old.answer = 'in') then
    return new;
  end if;
  if not public.kept_visible(new.user_id) then
    return new;
  end if;
  select e.title, e.slug into night from public.events e where e.id = new.event_id;

  for them in
    select distinct f.friend as user_id
    from public.push_edges f
    where f.who = new.user_id
      and (exists (select 1 from public.swipes w where w.user_id = f.friend and w.event_id = new.event_id and w.direction = 'right')
        or exists (select 1 from public.rsvps r where r.user_id = f.friend and r.event_id = new.event_id and r.answer = 'in'))
  loop
    perform public.push_enqueue(them.user_id, 'match',
      format('rsvp:%s:%s:%s', them.user_id, new.user_id, new.event_id),
      jsonb_build_object('name', public.push_name(new.user_id), 'title', night.title, 'url', '/night/' || night.slug));
  end loop;
  return new;
end;
$$;
revoke execute on function public.push_on_rsvp() from public, anon, authenticated;

drop trigger if exists push_rsvp on public.rsvps;
create trigger push_rsvp
  after insert or update of answer on public.rsvps
  for each row execute function public.push_on_rsvp();

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('69_rsvp_push.sql', '2979cba607450c3b34c5072b421b570596c8212155ba082c72a43ff3d8a5848d');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('69_rsvp_push.sql');
  end if;
end $$;


-- ===== 70_blocks_and_dm_reports.sql =====
-- afterhours — a block reaches every reader, and a direct message can be reported (70)
--
-- A block (50) closed the card, the search, the waves, the groups and the messages, but
-- not the two oldest readers: beforehours comments (comments_public, 06/12) and the
-- room of a night (room_list, 19). The blocked person kept reading the other, and the
-- other kept reading them (F14, 20.10.2026). hidden_by_block() is the one filter both
-- readers use now; it answers false when nobody is signed in, so the site keeps reading
-- comments signed out, and it may be called by anyone (is_blocked itself stays closed
-- to anon).
--
-- And a direct message was the one kind of writing nobody could report (F8): dm_message
-- joins the report kinds — the author is found only by someone in that thread, the
-- staff see the words, and removing it deletes the line.

-- ------------------------------------------------------------ the block filter

create or replace function public.hidden_by_block(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and other is not null and exists (
    select 1 from public.blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = other)
       or (b.blocker_id = other and b.blocked_id = auth.uid()));
$$;
revoke execute on function public.hidden_by_block(uuid) from public;
grant execute on function public.hidden_by_block(uuid) to anon, authenticated;

create or replace view public.comments_public
with (security_invoker = true) as
select
  c.id,
  c.event_id,
  c.parent_id,
  c.body,
  c.time_text,
  c.created_at,
  public.author_name(c.author_id, c.author_name) as author,
  c.author_id is not null as is_real
from public.comments c
where not c.is_hidden
  and not public.hidden_by_block(c.author_id);

create or replace function public.room_list(p_slug text)
returns table (
  id          uuid,
  body        text,
  who         text,
  mine        boolean,
  created_at  timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.body, lower(left(coalesce(p.display_name, p.handle, 's'), 1)), r.user_id = auth.uid(), r.created_at
  from public.room_posts r
  join public.events e on e.id = r.event_id
  left join public.profiles p on p.id = r.user_id
  where e.slug = p_slug and public.checked_in(e.id)
    and not public.hidden_by_block(r.user_id)
  order by r.created_at;
$$;

-- ------------------------------------------------------------ reporting a message

alter table public.reports drop constraint if exists reports_kind_check;
alter table public.reports add constraint reports_kind_check
  check (kind in ('comment', 'room_post', 'group_message', 'profile', 'group', 'spark', 'post_comment', 'dm_message'));

-- Who wrote it, as the reporter may know it: only someone in the thread.
create or replace function public.report_author(p_kind text, p_target text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  a uuid;
begin
  if p_kind = 'comment' then
    select author_id into a from public.comments where id::text = p_target;
  elsif p_kind = 'room_post' then
    select user_id into a from public.room_posts where id::text = p_target;
  elsif p_kind = 'group_message' then
    select m.user_id into a from public.group_messages m
     where m.id::text = p_target and m.kind = 'say' and public.in_group(m.group_id);
  elsif p_kind = 'profile' then
    select id into a from public.profiles where id::text = p_target or handle = lower(p_target);
  elsif p_kind = 'group' then
    select g.created_by into a from public.groups g where g.id::text = p_target;
  elsif p_kind = 'spark' then
    select host_id into a from public.sparks where id::text = p_target;
  elsif p_kind = 'post_comment' and to_regclass('public.post_comments') is not null then
    execute 'select c.author_id from public.post_comments c join public.posts p on p.id = c.post_id
             where c.id::text = $1 and public.can_see_post(p.author_id)' into a using p_target;
  elsif p_kind = 'dm_message' then
    select m.user_id into a from public.dm_messages m
      join public.dm_threads t on t.id = m.thread_id
     where m.id::text = p_target and auth.uid() in (t.a, t.b) and m.user_id <> auth.uid();
  end if;
  return a;
end;
$$;

create or replace function public.report_author_any(p_kind text, p_target text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select case p_kind
    when 'comment'       then (select author_id from public.comments where id::text = p_target)
    when 'room_post'     then (select user_id from public.room_posts where id::text = p_target)
    when 'group_message' then (select user_id from public.group_messages where id::text = p_target)
    when 'profile'       then (select id from public.profiles where id::text = p_target)
    when 'group'         then (select created_by from public.groups where id::text = p_target)
    when 'spark'         then (select host_id from public.sparks where id::text = p_target)
    when 'post_comment'  then public.post_comment_author(p_target)
    when 'dm_message'    then (select user_id from public.dm_messages where id::text = p_target)
  end;
$$;
revoke all on function public.report_author_any(text, text) from public, anon, authenticated;

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
      select r.kind, r.target, count(*)::int as n, array_remove(array_agg(r.reason order by r.created_at), null) as why, min(r.created_at) as first_at
      from public.reports r where not r.handled
      group by r.kind, r.target
    )
    select o.kind, o.target,
           case o.kind
             when 'comment'       then (select c.body from public.comments c where c.id::text = o.target)
             when 'room_post'     then (select x.body from public.room_posts x where x.id::text = o.target)
             when 'group_message' then (select x.body from public.group_messages x where x.id::text = o.target)
             when 'profile'       then (select concat_ws(' · ', p.display_name, p.bio, p.about) from public.profiles p where p.id::text = o.target)
             when 'group'         then (select g.name from public.groups g where g.id::text = o.target)
             when 'spark'         then (select concat_ws(' · ', s.title, s.place) from public.sparks s where s.id::text = o.target)
             when 'post_comment'  then public.post_comment_body(o.target)
             when 'dm_message'    then (select x.body from public.dm_messages x where x.id::text = o.target)
           end,
           (select coalesce(p.handle, p.display_name) from public.profiles p where p.id = public.report_author_any(o.kind, o.target)),
           o.n, o.why, o.first_at
    from open o
    order by o.n desc, o.first_at;
end;
$$;

-- As in 68, plus the message.
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
    elsif p_kind = 'dm_message' then
      delete from public.dm_messages where id::text = p_target;
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
             where r.kind = p_kind and r.target = p_target and not r.handled loop
    perform public.notice(who.reporter_id,
                          case when coalesce(p_remove, false) then 'report_removed' else 'report_kept' end,
                          jsonb_build_object('what', p_kind));
  end loop;
  update public.reports set handled = true where kind = p_kind and target = p_target and not handled;
  perform public.staff_note(case when coalesce(p_remove, false) then 'remove' else 'keep' end, 'report:' || p_kind, p_target, null);
end;
$$;

revoke execute on function public.staff_reports()                          from public, anon;
revoke execute on function public.staff_report_settle(text, text, boolean) from public, anon;
grant execute on function public.staff_reports()                           to authenticated;
grant execute on function public.staff_report_settle(text, text, boolean)  to authenticated;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('70_blocks_and_dm_reports.sql', '674e630174dc3e2a9d58d21c9d1bfc612f9bfd8d999fc6bfeaf9a5cd98ed5bda');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('70_blocks_and_dm_reports.sql');
  end if;
end $$;


-- ===== 71_health_more.sql =====
-- afterhours — the health check says when the sync last brought a night, and
-- whether the push outbox is stuck (71)
--
-- health() (09) counted rows; it could not say whether the morning sync still ran or
-- whether pushes were leaving. On 11.10.2026 nobody knew for a week that 680 past
-- nights sat on the deck (F34, 20.10.2026). Two more numbers, and tools/health.mjs
-- now goes red on them: a last synced night older than three days, more than fifty
-- past nights still published, pushes older than six hours still unsent.
-- The return type grows, so the function is dropped and made again with its grants.

drop function if exists public.health();
create or replace function public.health()
returns table (
  events            bigint,
  published         bigint,
  missing_venue     bigint,
  unverified_date   bigint,
  past_still_up     bigint,
  comments          bigint,
  hidden_comments   bigint,
  people            bigint,
  swipes            bigint,
  friendships       bigint,
  newest_synced     timestamptz,
  outbox_stuck      bigint
)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from public.events),
    (select count(*) from public.events where is_published),
    (select count(*) from public.events where venue_id is null),
    (select count(*) from public.events where starts_at_estimated),
    (select count(*) from public.events
      where is_published and starts_at is not null
        and not starts_at_estimated and starts_at < now()),
    (select count(*) from public.comments),
    (select count(*) from public.comments where is_hidden),
    (select count(*) from public.profiles),
    (select count(*) from public.swipes),
    (select count(*) from public.friendships where status = 'accepted'),
    (select max(created_at) from public.events where source = 'ticketmaster'),
    (select count(*) from public.push_outbox
      where sent_at is null
        and greatest(created_at, coalesce(send_after, created_at)) < now() - interval '6 hours');
$$;
grant execute on function public.health() to anon, authenticated;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('71_health_more.sql', '8454b42f5a542d7fa6e981f35678d9dd0f029d4e79f77cb64ad099e93da0e904');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('71_health_more.sql');
  end if;
end $$;
