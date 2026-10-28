-- afterhours — a handle obeys the rules on every road, reads have a ceiling (107)
--
-- Four findings of the 28.10.2026 audit, one file:
--   M-2   77 guarded handle_status and handle_new_user, but the table took any handle:
--         a member could PATCH /profiles and become @admin or @support, or take back the
--         handle of a banned account that deleted itself. guard_handle() now stands on
--         the table: before insert or update of handle, the same four checks as
--         handle_status (format, reserved, banned_marks, taken). A handle that does not
--         change passes. Reserved names stay open to staff (handle_reserved says so) and
--         to the server itself (no auth.uid(): migrations, seeds, the SQL editor).
--         handle_new_user (77) also drops a wish that is in banned_marks, so sign-up
--         never meets the new check and never fails on it.
--   L-5   people_search and profile_card had no ceiling; a script could walk the member
--         list. read_rate(kind, most) counts reads per member per hour in read_counts
--         (closed table) and refuses past the ceiling: 200 searches, 300 cards an hour.
--         Typing a name is one search per letter; twenty names an hour is far from it.
--         A signed-out reader of profile_card is NOT counted: there is no address to
--         count by, and one bucket for everybody signed out would let one script close
--         every public profile page for an hour. The card a stranger gets is a lookup by
--         exact handle, not a list. Both functions become volatile (they write a count);
--         every caller already uses POST.
--         feedback: guard_feedback() on insert, 10 an hour for a signed-in writer, and
--         60 an hour for all signed-out writers together (the inbox is what it protects;
--         a flood closes only the signed-out form, signed-in feedback still goes). A
--         signed-in writer is always named (author_id cannot be sent empty to slip into
--         the signed-out bucket), and a lock per bucket keeps parallel posts in line.
--   L-11  room_info gave the count of a night that was never public. events_public read
--         by a definer function (profile_kept, person_kept, waves_kept, kept) skipped the
--         events rule, and past_feed (57) reads events with no rule at all, so a night
--         still waiting for review (or turned down) reached friends and the past feed.
--         All three now ask night_shown: published, or not held back for review. A
--         retired night (passed, cancelled, taken down) was public and stays in every
--         collection, as before. A staff draft cannot be told from a night the staff took
--         down (no mark says it was ever public), so it is not hidden here; nobody can
--         keep or check in to a night they never saw. A browser read of the view changes
--         nothing: the events rule already kept it to published rows.
--   B-2   watch_hit is called only by watch_ugc (definer, 79); no client uses it, so the
--         word list closes to the browser roles.
--
--   guard_handle()           trigger on profiles
--   read_rate(kind, most)    raises 54000 past the ceiling; staff and signed-out pass
--   read_counts              user_id, kind, hour, n; closed
--   guard_feedback()         trigger on feedback
--   night_shown(event row)   the night_page rule, for the view and room_info

-- ------------------------------------------------------------ M-2 the handle

create or replace function public.guard_handle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.handle is null then return new; end if;
  if tg_op = 'UPDATE' and new.handle is not distinct from old.handle then return new; end if;
  if new.handle !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'handle: format' using errcode = '22023';
  end if;
  if auth.uid() is not null and public.handle_reserved(new.handle) then
    raise exception 'handle: taken' using errcode = '23505';
  end if;
  if exists (select 1 from public.banned_marks where handle = new.handle) then
    raise exception 'handle: taken' using errcode = '23505';
  end if;
  if exists (select 1 from public.profiles where handle = new.handle and id <> new.id) then
    raise exception 'handle: taken' using errcode = '23505';
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_handle() from public, anon, authenticated;
drop trigger if exists guard_handle on public.profiles;
create trigger guard_handle
  before insert or update of handle on public.profiles
  for each row execute function public.guard_handle();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  wanted text := lower(btrim(coalesce(new.raw_user_meta_data ->> 'handle', '')));
  city_slug_in   text := lower(btrim(coalesce(new.raw_user_meta_data ->> 'city', '')));
  city_uuid uuid;
begin
  if wanted !~ '^[a-z0-9_]{3,20}$'
     or public.handle_reserved(wanted)
     or exists (select 1 from public.profiles where handle = wanted)
     or exists (select 1 from public.banned_marks where handle = wanted) then
    wanted := null;
  end if;

  if city_slug_in <> '' then
    select id into city_uuid from public.cities where slug = city_slug_in;
  end if;

  insert into public.profiles (id, display_name, handle, city_id, onboarded_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    wanted,
    city_uuid,
    case when wanted is null then null else now() end
  )
  on conflict (id) do nothing;

  insert into public.profile_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- ------------------------------------------------------------ L-5 a ceiling on reads

create table if not exists public.read_counts (
  user_id  uuid not null references public.profiles on delete cascade,
  kind     text not null,
  hour     timestamptz not null,
  n        int not null default 0,
  primary key (user_id, kind, hour)
);
alter table public.read_counts enable row level security;
revoke all on public.read_counts from public, anon, authenticated;

create or replace function public.read_rate(p_kind text, p_most int)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me  uuid := auth.uid();
  now_hour timestamptz := date_trunc('hour', now());
  got int;
begin
  if me is null or coalesce(public.is_staff(), false) then return; end if;
  insert into public.read_counts (user_id, kind, hour, n) values (me, p_kind, now_hour, 1)
  on conflict (user_id, kind, hour) do update set n = public.read_counts.n + 1
  returning n into got;
  if got = 1 then
    delete from public.read_counts where user_id = me and hour < now_hour - interval '1 day';
  end if;
  if got > p_most then
    raise exception 'slow down: too many in a short time' using errcode = '54000';
  end if;
end;
$$;
revoke execute on function public.read_rate(text, int) from public, anon, authenticated;

-- people_search: that of 57, volatile, with the count first
create or replace function public.people_search(p_query text, p_limit int default 12)
returns table (
  id            uuid,
  handle        text,
  display_name  text,
  city_name     text,
  mutual        int,
  relation      text
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me   uuid := public.assert_member();
  q    text := lower(btrim(regexp_replace(coalesce(p_query, ''), '^@', '')));
  safe text;
begin
  if length(q) < 2 then
    return;
  end if;
  perform public.read_rate('people_search', 200);
  safe := replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_');
  return query
    select p.id, p.handle, p.display_name, c.name,
           public.people_mutual(p.id), public.people_relation(p.id)
    from public.profiles p
    left join public.cities c on c.id = p.city_id
    where p.handle is not null
      and p.id <> me
      and public.visible_to(me, p.id)
      and (p.handle like safe || '%' or lower(coalesce(p.display_name, '')) like '%' || safe || '%')
    order by (p.handle = q) desc,
             (p.handle like safe || '%') desc,
             public.people_mutual(p.id) desc,
             p.handle
    limit least(greatest(coalesce(p_limit, 12), 1), 20);
end;
$$;
revoke execute on function public.people_search(text, int) from public, anon;
grant execute on function public.people_search(text, int) to authenticated;

-- profile_card: that of 12, in plpgsql to count first; the same rows
create or replace function public.profile_card(p_handle text)
returns table (
  handle        text,
  display_name  text,
  bio           text,
  city_name     text,
  created_at    timestamptz,
  last_seen_day date,
  is_friend     boolean,
  kept_count    int
)
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  perform public.read_rate('profile_card', 300);
  return query
  select p.handle, p.display_name, p.bio, c.name, p.created_at,
         -- Last seen goes to friends only, and only as a DAY.
         case when p.id = auth.uid() or public.is_friend(p.id)
              then p.last_seen_at::date end,
         public.is_friend(p.id),
         case
           when p.id = auth.uid()
             or (public.is_friend(p.id) and public.kept_visible(p.id))
           then (select count(*)::int from public.swipes w
                  where w.user_id = p.id and w.direction = 'right')
         end
  from public.profiles p
  left join public.cities c on c.id = p.city_id
  where p.handle = lower(btrim(p_handle))
    and public.card_visible(p.id);
end;
$$;
grant execute on function public.profile_card(text) to anon, authenticated;

create or replace function public.guard_feedback()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if auth.uid() is not null then
    new.author_id := auth.uid();
    if coalesce(public.is_staff(), false) then return new; end if;
  end if;
  perform pg_advisory_xact_lock(hashtext('feedback:' || coalesce(new.author_id::text, 'anon')));
  if new.author_id is not null then
    select count(*) into n from public.feedback
     where author_id = new.author_id and created_at > now() - interval '1 hour';
    if n >= 10 then
      raise exception 'slow down: too many in a short time' using errcode = '54000';
    end if;
  else
    select count(*) into n from public.feedback
     where author_id is null and created_at > now() - interval '1 hour';
    if n >= 60 then
      raise exception 'slow down: too many in a short time' using errcode = '54000';
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_feedback() from public, anon, authenticated;
drop trigger if exists guard_feedback on public.feedback;
create trigger guard_feedback
  before insert on public.feedback
  for each row execute function public.guard_feedback();

-- ------------------------------------------------------------ L-11 a night never public

-- Published, or not a night someone sent in that the staff held back (pending or
-- rejected). A retired night keeps its place in every list, whatever its date.
-- Plain sql, not definer and no search_path, so the planner folds it into the view
-- instead of calling it row by row; it only looks at the row it is handed.
create or replace function public.night_shown(e public.events)
returns boolean
language sql
stable
as $$
  select e.is_published
      or coalesce(public.is_admin(), false)
      or e.review is null;
$$;
grant execute on function public.night_shown(public.events) to anon, authenticated;

-- that of 97, with the rule as its where
create or replace view public.events_public
with (security_invoker = true) as
select
  e.id,
  e.slug,
  e.title,
  e.meta,
  e.body,
  e.poster_no,
  e.poster_path,
  e.starts_at,
  e.starts_at_estimated,
  e.date_text,
  e.is_published,
  t.slug  as type_slug,
  t.name  as type_name,
  t.sort_order  as type_sort_order,
  c.slug  as city_slug,
  c.name  as city_name,
  v.slug  as venue_slug,
  v.name  as venue_name,
  e.image_url,
  e.ticket_url,
  e.source,
  e.featured_at
from public.events e
join public.event_types t on t.id = e.type_id
join public.cities      c on c.id = e.city_id
left join public.venues v on v.id = e.venue_id
where public.night_shown(e);
grant select on public.events_public to anon, authenticated;

-- past_feed: that of 57, with the rule
create or replace function public.past_feed(
  p_city   text default null,
  p_before    timestamptz default null,
  p_before_id uuid default null,
  p_limit     int default 12
)
returns table (
  id          uuid,
  slug        text,
  title       text,
  image_url   text,
  venue_name  text,
  city_name   text,
  type_slug   text,
  type_name   text,
  starts_at   timestamptz,
  people      text[],
  mine        boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid := public.assert_member();
begin
  return query
  with circle as (
    select case when f.requester_id = me then f.addressee_id else f.requester_id end as id
    from public.friendships f
    where f.status = 'accepted' and me in (f.requester_id, f.addressee_id)
  ),
  -- who of yours was there, per night: checked in (shown to friends) or kept it
  went as (
    select c.event_id, c.user_id, c.checked_at as at
    from public.checkins c
    where c.user_id = me
       or (c.show_friends and c.user_id in (select circle.id from circle))
    union
    select s.event_id, s.user_id, s.created_at
    from public.swipes s
    where s.direction = 'right'
      and (s.user_id = me or (s.user_id in (select circle.id from circle) and public.kept_visible(s.user_id)))
  ),
  named as (
    select w.event_id,
           array_agg(distinct lower(coalesce(p.handle, p.display_name, 'someone'))) filter (where w.user_id <> me) as people,
           bool_or(w.user_id = me) as mine
    from went w
    join public.profiles p on p.id = w.user_id
    group by w.event_id
  )
  select e.id, e.slug, e.title, e.image_url, v.name, ci.name, t.slug, t.name, e.starts_at,
         coalesce(n.people, '{}'), coalesce(n.mine, false)
  from public.events e
  join public.event_types t on t.id = e.type_id
  join public.cities ci on ci.id = e.city_id
  left join public.venues v on v.id = e.venue_id
  left join named n on n.event_id = e.id
  where e.starts_at is not null
    and e.starts_at < now()
    and e.starts_at > now() - interval '365 days'
    and (p_before is null or e.starts_at < p_before
         or (e.starts_at = p_before and p_before_id is not null and e.id > p_before_id))
    and e.image_url is not null
    and public.night_shown(e)
    and (ci.slug = p_city or n.event_id is not null)
  order by e.starts_at desc, e.id
  limit least(greatest(coalesce(p_limit, 12), 1), 30);
end;
$$;

-- room_info: that of 19; a night never public gives nothing, unless you were in it
create or replace function public.room_info(p_slug text)
returns table (
  event_id    uuid,
  checked_in  boolean,
  freeze_at   timestamptz,
  frozen      boolean,
  who_count   int,
  initials    text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select e.id, public.checked_in(e.id), public.room_freeze_at(e.id), now() >= public.room_freeze_at(e.id),
         (select count(*)::int from public.checkins c where c.event_id = e.id),
         case when public.checked_in(e.id)
              then (select coalesce(array_agg(lower(left(coalesce(p.display_name, p.handle, 's'), 1)) order by c.checked_at), '{}')
                    from public.checkins c join public.profiles p on p.id = c.user_id where c.event_id = e.id)
              else '{}' end
  from public.events e
  where e.slug = p_slug
    and (public.night_shown(e) or public.checked_in(e.id));
$$;
grant execute on function public.room_info(text) to anon, authenticated;

-- ------------------------------------------------------------ B-2 the word list

revoke execute on function public.watch_hit(text) from public, anon, authenticated;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('107_handles_and_read_limits.sql', 'd2b488dd3a8b6496679b3fb9d224628136182c9207bdec9787df0b7dfa51d859');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('107_handles_and_read_limits.sql');
  end if;
end $$;
