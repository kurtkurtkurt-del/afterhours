-- afterhours — the venue desk: community managers run their rooms (97)
--
-- Until now a community manager was staff with a smaller key than the admin: the same
-- panel, every night in reach. The owner (26.10.2026): a community manager stands for a
-- ROOM — a club, a bar, a collective — and gets an interface of their own for it.
--
--   venue_managers (venue, user)   who runs which room. A manager who makes a room runs
--                                  it; the admin adds or removes anyone (admin_venue_assign):
--                                  given a room, a normal user becomes a community manager;
--                                  with no room left, a community manager is normal again.
--   my_venues()                    the rooms you run, with this months numbers
--   venue_managers_of(venue)       who else runs it (manager or admin)
--   venue_people()                 every room with a manager, with their handles — the
--                                  phone book of the managers, so one room can write another
--                                  (a direct message, 59_dms.sql). Managers and admin only.
--   person_venues(handle)          for anyone: the rooms a person runs — the badge on a
--                                  profile ("runs blitz · münchen").
--
--   events.featured_at             a night the room put on top: first in the deck of its
--                                  city, at most 3 per room at a time.
--   night_feature(id, on)          manager of the night room, or admin
--   deck()                         same as 67, featured first
--
--   venue_nights(venue, from, to)  the room nights in a window, with the numbers each
--                                  gathered: kept, let go, checked in, in / maybe, got a
--                                  ticket, comments — the calendar and the data page
--   venue_stats(venue)             the room over the last 30 and the 30 before: nights,
--                                  kept, checked in, got a ticket, comments, people reached
--   venue_comments(venue, limit)   the comments under the room nights; hiding is
--                                  staff_comment_hide (42), which a manager already has
--
--   venue_push(venue, line)        a push to the people who kept, answered, checked in or
--                                  got a ticket at the room in the last year — one a day
--                                  per room, up to 140 characters, kind venue, under the
--                                  nights switch. Logged.
--
--   staff_event_delete             as 43, and a manager also deletes a night at their room
--                                  made here by anyone (a night from the sync stays).
--
-- A ticketed night sent in by anyone else still waits for a look (43); a own of the manager
-- goes out at once, as before.

-- ------------------------------------------------------------ who runs what

-- the column the numbers below already count (featured is explained further down)
alter table public.events add column if not exists featured_at timestamptz;
create index if not exists events_featured_idx on public.events (featured_at) where featured_at is not null;


create table if not exists public.venue_managers (
  venue_id  uuid not null references public.venues on delete cascade,
  user_id   uuid not null references public.profiles on delete cascade,
  since     timestamptz not null default now(),
  primary key (venue_id, user_id)
);
create index if not exists venue_managers_user_idx on public.venue_managers (user_id);
alter table public.venue_managers enable row level security;
-- closed: every read goes through a function below

create or replace function public.runs_venue(p_venue uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.venue_managers m where m.venue_id = p_venue and m.user_id = auth.uid());
$$;
grant execute on function public.runs_venue(uuid) to authenticated;

create or replace function public.need_venue(p_venue uuid)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_venue is null or not public.runs_venue(p_venue) then
    raise exception 'not your room' using errcode = '42501';
  end if;
end;
$$;

-- A room made by a community manager is theirs (same body as 42, plus the one insert).
create or replace function public.staff_venue_save(p_id uuid, p_city text, p_name text, p_lat double precision, p_lng double precision)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  c uuid;
  v uuid;
  n text := btrim(coalesce(p_name, ''));
begin
  perform public.need_staff();
  if length(n) not between 2 and 80 then raise exception 'name: 2 to 80 characters'; end if;
  select id into c from public.cities where slug = p_city;
  if c is null then raise exception 'unknown city'; end if;
  if p_lat is not null and (p_lat not between -90 and 90 or p_lng is null or p_lng not between -180 and 180) then
    raise exception 'that point is not on the map';
  end if;
  if p_id is null then
    insert into public.venues (city_id, slug, name, lat, lng, created_by)
    values (c, public.make_slug(n), n, p_lat, p_lng, auth.uid()) returning id into v;
    if not public.is_admin() then
      insert into public.venue_managers (venue_id, user_id) values (v, auth.uid()) on conflict do nothing;
    end if;
    perform public.staff_note('create', 'venue', v::text, n);
  else
    if not public.runs_venue(p_id) then raise exception 'not your room' using errcode = '42501'; end if;
    update public.venues set city_id = c, name = n, lat = p_lat, lng = p_lng where id = p_id returning id into v;
    if v is null then raise exception 'no such room'; end if;
    perform public.staff_note('edit', 'venue', v::text, n);
  end if;
  return v;
end;
$$;

-- The admin hands a room to a person (by handle), or takes it back.
create or replace function public.admin_venue_assign(p_venue uuid, p_handle text, p_on boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid;
  v public.venues%rowtype;
begin
  perform public.need_admin();
  select * into v from public.venues where id = p_venue;
  if v.id is null then raise exception 'no such room'; end if;
  select id into who from public.profiles where lower(handle) = lower(btrim(coalesce(p_handle, '')));
  if who is null then raise exception 'no one with that handle'; end if;
  if p_on then
    insert into public.venue_managers (venue_id, user_id) values (p_venue, who) on conflict do nothing;
    -- running a room makes you a community manager (the flag of 41 lets the type change)
    perform set_config('afterhours.account_type', 'on', true);
    update public.profiles set account_type = 'community_manager'
      where id = who and account_type = 'user';
    perform set_config('afterhours.account_type', '', true);
  else
    delete from public.venue_managers where venue_id = p_venue and user_id = who;
    -- with no room left, a community manager made this way is a normal user again
    if not exists (select 1 from public.venue_managers m where m.user_id = who) then
      perform set_config('afterhours.account_type', 'on', true);
      update public.profiles set account_type = 'user' where id = who and account_type = 'community_manager' and not is_admin;
      perform set_config('afterhours.account_type', '', true);
    end if;
  end if;
  perform public.staff_note(case when p_on then 'assign' else 'unassign' end, 'venue', v.id::text, v.name || ' · @' || btrim(p_handle));
end;
$$;
revoke all on function public.admin_venue_assign(uuid, text, boolean) from public, anon;
grant execute on function public.admin_venue_assign(uuid, text, boolean) to authenticated;

-- The rooms you run, with the numbers of the last 30 days. The admin sees every room
-- that has a manager, and the ones they made.
create or replace function public.my_venues()
returns table (id uuid, slug text, name text, city_slug text, city_name text, lat double precision, lng double precision,
               managers int, nights_ahead int, kept_30 int, checkins_30 int, featured int)
language sql
stable
security definer
set search_path = public
as $$
  select v.id, v.slug, v.name, c.slug, c.name, v.lat, v.lng,
         (select count(*)::int from public.venue_managers m where m.venue_id = v.id),
         (select count(*)::int from public.events e where e.venue_id = v.id and e.is_published
            and e.starts_at > now() - interval '8 hours'),
         (select count(*)::int from public.swipes s join public.events e on e.id = s.event_id
            where e.venue_id = v.id and s.direction = 'right' and s.created_at > now() - interval '30 days'),
         (select count(*)::int from public.checkins k join public.events e on e.id = k.event_id
            where e.venue_id = v.id and k.checked_at > now() - interval '30 days'),
         (select count(*)::int from public.events e where e.venue_id = v.id and e.featured_at is not null
            and e.is_published and (e.starts_at is null or e.starts_at > now() - interval '8 hours'))
  from public.venues v
  join public.cities c on c.id = v.city_id
  where auth.uid() is not null and (
    exists (select 1 from public.venue_managers m where m.venue_id = v.id and m.user_id = auth.uid())
    or (public.is_admin() and (v.created_by = auth.uid() or exists (select 1 from public.venue_managers m where m.venue_id = v.id))))
  order by c.name, v.name;
$$;
grant execute on function public.my_venues() to authenticated;

create or replace function public.venue_managers_of(p_venue uuid)
returns table (user_id uuid, handle text, display_name text, since timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select m.user_id, p.handle, p.display_name, m.since
  from public.venue_managers m
  join public.profiles p on p.id = m.user_id
  where m.venue_id = p_venue and public.runs_venue(p_venue)
  order by m.since;
$$;
grant execute on function public.venue_managers_of(uuid) to authenticated;

-- The phone book of the managers: every room with someone running it. Managers and admin only.
create or replace function public.venue_people()
returns table (venue_id uuid, venue text, city_slug text, city_name text, user_id uuid, handle text, display_name text, mine boolean)
language sql
stable
security definer
set search_path = public
as $$
  select v.id, v.name, c.slug, c.name, m.user_id, p.handle, p.display_name, m.user_id = auth.uid()
  from public.venue_managers m
  join public.venues v on v.id = m.venue_id
  join public.cities c on c.id = v.city_id
  join public.profiles p on p.id = m.user_id
  where public.is_staff() and p.handle is not null
    and not exists (select 1 from public.blocks b
                    where (b.blocker_id = auth.uid() and b.blocked_id = m.user_id)
                       or (b.blocker_id = m.user_id and b.blocked_id = auth.uid()))
  order by c.name, v.name, p.handle;
$$;
grant execute on function public.venue_people() to authenticated;

-- The badge: the rooms a person runs. For anyone, about anyone with a handle.
create or replace function public.person_venues(p_handle text default null)
returns table (id uuid, slug text, name text, city_slug text, city_name text)
language sql
stable
security definer
set search_path = public
as $$
  select v.id, v.slug, v.name, c.slug, c.name
  from public.venue_managers m
  join public.profiles p on p.id = m.user_id
  join public.venues v on v.id = m.venue_id
  join public.cities c on c.id = v.city_id
  where case when p_handle is null then p.id = auth.uid() else lower(p.handle) = lower(btrim(p_handle)) end
  order by c.name, v.name;
$$;
grant execute on function public.person_venues(text) to anon, authenticated;

-- ---------------------------------------------------------------- featured

-- the deck reads it from the view: the one column added at the end (create or replace keeps the rest)
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
left join public.venues v on v.id = e.venue_id;

create or replace function public.night_feature(p_id uuid, p_on boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.events%rowtype;
begin
  select * into e from public.events where id = p_id;
  if e.id is null then raise exception 'no such night'; end if;
  perform public.need_venue(e.venue_id);
  if p_on then
    if e.featured_at is not null then return; end if;
    if (select count(*) from public.events x where x.venue_id = e.venue_id and x.featured_at is not null
          and x.is_published and (x.starts_at is null or x.starts_at > now() - interval '8 hours')) >= 3 then
      raise exception 'three are already on top; take one down first';
    end if;
    update public.events set featured_at = now(), updated_at = now() where id = p_id;
  else
    update public.events set featured_at = null, updated_at = now() where id = p_id;
  end if;
  perform public.staff_note(case when p_on then 'feature' else 'unfeature' end, 'night', e.slug, e.title);
end;
$$;
revoke all on function public.night_feature(uuid, boolean) from public, anon;
grant execute on function public.night_feature(uuid, boolean) to authenticated;

-- Same body as 67, featured first.
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
  order by (e.featured_at is null), e.featured_at desc, e.poster_no nulls last, e.starts_at nulls last, e.slug
  limit p_limit;
$$;
grant execute on function public.deck(text, text, int) to anon, authenticated;

-- ------------------------------------------------------------ the numbers

create or replace function public.venue_nights(p_venue uuid, p_from timestamptz default now() - interval '60 days', p_to timestamptz default now() + interval '120 days')
returns table (id uuid, slug text, title text, starts_at timestamptz, is_published boolean, source text, review text,
               featured_at timestamptz, image_url text, ticket_url text,
               kept int, letgo int, checkins int, going int, maybe int, tickets int, comments int)
language sql
stable
security definer
set search_path = public
as $$
  select e.id, e.slug, e.title, e.starts_at, e.is_published, e.source, e.review, e.featured_at, e.image_url, e.ticket_url,
         (select count(*)::int from public.swipes s where s.event_id = e.id and s.direction = 'right'),
         (select count(*)::int from public.swipes s where s.event_id = e.id and s.direction = 'left'),
         (select count(*)::int from public.checkins k where k.event_id = e.id),
         (select count(*)::int from public.rsvps r where r.event_id = e.id and r.answer = 'in'),
         (select count(*)::int from public.rsvps r where r.event_id = e.id and r.answer = 'maybe'),
         (select count(*)::int from public.tickets t where t.event_id = e.id and t.answer = 'got'),
         (select count(*)::int from public.comments m where m.event_id = e.id and not m.is_hidden)
  from public.events e
  where e.venue_id = p_venue and public.runs_venue(p_venue)
    and e.starts_at >= p_from and e.starts_at <= p_to
  order by e.starts_at;
$$;
grant execute on function public.venue_nights(uuid, timestamptz, timestamptz) to authenticated;

create or replace function public.venue_stats(p_venue uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r json;
begin
  perform public.need_venue(p_venue);
  select json_build_object(
    'nights_30',    (select count(*) from public.events e where e.venue_id = p_venue and e.starts_at between now() - interval '30 days' and now()),
    'nights_prev',  (select count(*) from public.events e where e.venue_id = p_venue and e.starts_at between now() - interval '60 days' and now() - interval '30 days'),
    'nights_ahead', (select count(*) from public.events e where e.venue_id = p_venue and e.is_published and e.starts_at > now() - interval '8 hours'),
    'kept_30',      (select count(*) from public.swipes s join public.events e on e.id = s.event_id where e.venue_id = p_venue and s.direction = 'right' and s.created_at > now() - interval '30 days'),
    'kept_prev',    (select count(*) from public.swipes s join public.events e on e.id = s.event_id where e.venue_id = p_venue and s.direction = 'right' and s.created_at between now() - interval '60 days' and now() - interval '30 days'),
    'letgo_30',     (select count(*) from public.swipes s join public.events e on e.id = s.event_id where e.venue_id = p_venue and s.direction = 'left' and s.created_at > now() - interval '30 days'),
    'checkins_30',  (select count(*) from public.checkins k join public.events e on e.id = k.event_id where e.venue_id = p_venue and k.checked_at > now() - interval '30 days'),
    'checkins_prev',(select count(*) from public.checkins k join public.events e on e.id = k.event_id where e.venue_id = p_venue and k.checked_at between now() - interval '60 days' and now() - interval '30 days'),
    'tickets_30',   (select count(*) from public.tickets t join public.events e on e.id = t.event_id where e.venue_id = p_venue and t.answer = 'got' and t.answered_at > now() - interval '30 days'),
    'going',        (select count(*) from public.rsvps r join public.events e on e.id = r.event_id where e.venue_id = p_venue and r.answer = 'in' and e.starts_at > now() - interval '8 hours'),
    'comments_30',  (select count(*) from public.comments m join public.events e on e.id = m.event_id where e.venue_id = p_venue and not m.is_hidden and m.created_at > now() - interval '30 days'),
    'reach',        (select count(distinct u) from (
                       select s.user_id u from public.swipes s join public.events e on e.id = s.event_id where e.venue_id = p_venue and s.direction = 'right' and s.created_at > now() - interval '365 days'
                       union select k.user_id from public.checkins k join public.events e on e.id = k.event_id where e.venue_id = p_venue and k.checked_at > now() - interval '365 days'
                       union select r.user_id from public.rsvps r join public.events e on e.id = r.event_id where e.venue_id = p_venue and r.answer in ('in', 'maybe') and r.updated_at > now() - interval '365 days'
                       union select t.user_id from public.tickets t join public.events e on e.id = t.event_id where e.venue_id = p_venue and t.answer = 'got' and t.answered_at > now() - interval '365 days') x),
    'last_push',    (select max(l.at) from public.staff_log l where l.action = 'push' and l.target = 'venue' and l.target_id = p_venue::text)
  ) into r;
  return r;
end;
$$;
grant execute on function public.venue_stats(uuid) to authenticated;

create or replace function public.venue_comments(p_venue uuid, p_limit int default 100)
returns table (id uuid, body text, author text, handle text, night text, night_slug text, is_hidden boolean, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.body, coalesce(p.display_name, m.author_name), p.handle, e.title, e.slug, m.is_hidden, m.created_at
  from public.comments m
  join public.events e on e.id = m.event_id
  left join public.profiles p on p.id = m.author_id
  where e.venue_id = p_venue and public.runs_venue(p_venue)
  order by m.created_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 300));
$$;
grant execute on function public.venue_comments(uuid, int) to authenticated;

-- ------------------------------------------------------------------- push

alter table public.push_outbox drop constraint if exists push_outbox_kind_check;
alter table public.push_outbox add constraint push_outbox_kind_check check (kind in (
  'friend_request', 'friend_accepted', 'match', 'friend_live',
  'night_soon', 'room_open', 'room_closing', 'room_message', 'reply',
  'digest', 'dj_live', 'wave', 'spark', 'spark_in',
  'group_added', 'group_joined', 'group_match', 'group_round', 'group_won', 'group_plan',
  'group_message', 'group_live', 'group_ticket', 'post',
  'staff', 'post_like', 'post_comment',
  'dm', 'night_changed', 'spark_off', 'spark_changed', 'venue'));

-- push_wants() is that of 96 with the one kind added: a room word sits under the nights switch.
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
             when p_kind in ('night_soon', 'night_changed', 'venue') then s.notify_nights
             when p_kind in ('room_open', 'room_closing', 'room_message') then s.notify_rooms
             when p_kind = 'reply'           then s.notify_replies
             when p_kind = 'digest'          then s.notify_digest
             when p_kind = 'dj_live'         then s.notify_djs
             when p_kind = 'wave'            then s.notify_waves
             when p_kind in ('spark', 'spark_in', 'spark_off', 'spark_changed') then s.notify_sparks
             when p_kind like 'group\_%' then s.notify_groups
             when p_kind in ('post', 'post_like', 'post_comment') then false
             when p_kind = 'dm'              then s.notify_dms
           end
    from public.profile_settings s where s.user_id = p_user), true);
$$;

-- push_text() is that of 96 with the one kind added.
create or replace function public.push_text(p_kind text, p_lang text, p_data jsonb)
returns table (title text, body text)
language plpgsql
immutable
as $$
declare
  pair record;
begin
  select x.title, x.body into title, body
  from (values
    ('friend_request',  'en', 'friend request',                '{name} wants to add you'),
    ('friend_request',  'de', 'freundschaftsanfrage',          '{name} möchte dich hinzufügen'),
    ('friend_request',  'tr', 'arkadaşlık isteği',             '{name} seni eklemek istiyor'),
    ('friend_accepted', 'en', 'you are friends now',           '{name} accepted your request'),
    ('friend_accepted', 'de', 'ihr seid jetzt freunde',        '{name} hat deine anfrage angenommen'),
    ('friend_accepted', 'tr', 'artık arkadaşsınız',            '{name} isteğini kabul etti'),
    ('match',           'en', '{name} is going too',           '{title}'),
    ('match',           'de', '{name} geht auch hin',          '{title}'),
    ('match',           'tr', '{name} de gidiyor',             '{title}'),
    ('friend_live',     'en', '{name} is out now',             '{title}'),
    ('friend_live',     'de', '{name} ist gerade unterwegs',   '{title}'),
    ('friend_live',     'tr', '{name} şu an dışarıda',         '{title}'),
    ('night_soon',      'en', 'tonight · {time}',              '{title}'),
    ('night_soon',      'de', 'heute nacht · {time}',          '{title}'),
    ('night_soon',      'tr', 'bu gece · {time}',              '{title}'),
    ('room_open',       'en', 'your room is open',             '{title} · 48 hours to write'),
    ('room_open',       'de', 'dein raum ist offen',           '{title} · 48 stunden zum schreiben'),
    ('room_open',       'tr', 'odan açık',                     '{title} · 48 saat yazabilirsin'),
    ('room_closing',    'en', 'your room closes soon',         '{title} · the last two hours'),
    ('room_closing',    'de', 'dein raum schließt bald',       '{title} · die letzten zwei stunden'),
    ('room_closing',    'tr', 'odan birazdan kapanıyor',       '{title} · son iki saat'),
    ('room_message',    'en', '{name} in {title}',             'a new line in your room'),
    ('room_message',    'de', '{name} in {title}',             'eine neue zeile in deinem raum'),
    ('room_message',    'tr', '{title} · {name}',              'odanda yeni bir satır'),
    ('reply',           'en', '{name} replied',                'a new reply'),
    ('reply',           'de', '{name} hat geantwortet',        'eine neue antwort'),
    ('reply',           'tr', '{name} cevap verdi',            'yeni bir cevap'),
    ('digest',          'en', 'this weekend in {city}',        '{n} nights · {friends} kept by friends'),
    ('digest',          'de', 'dieses wochenende in {city}',   '{n} nächte · {friends} von freunden behalten'),
    ('digest',          'tr', 'bu hafta sonu {city}',          '{n} gece · {friends} tanesini arkadaşların sakladı'),
    ('dj_live',         'en', '{name} plays soon',             '{where} · {time}'),
    ('dj_live',         'de', '{name} legt bald auf',          '{where} · {time}'),
    ('dj_live',         'tr', '{name} birazdan çalıyor',       '{where} · {time}'),
    ('wave',            'en', '2nd wave',                      'a friend of {via} kept {title}'),
    ('wave',            'de', '2. welle',                      'ein freund von {via} hat {title} behalten'),
    ('wave',            'tr', '2. dalga',                      '{via} üzerinden biri {title} gecesini sakladı'),
    ('spark',           'en', '{name} is starting something',  '{title} · {when}'),
    ('spark',           'de', '{name} startet etwas',          '{title} · {when}'),
    ('spark',           'tr', '{name} bir şey başlatıyor',     '{title} · {when}'),
    ('spark_in',        'en', '{name} is in',                  '{title}'),
    ('spark_in',        'de', '{name} ist dabei',              '{title}'),
    ('spark_in',        'tr', '{name} geliyor',                '{title}'),
    ('group_added',     'en', 'you are in {group}',            '{name} added you · swipe nights together'),
    ('group_added',     'de', 'du bist in {group}',            '{name} hat dich hinzugefügt · wischt zusammen'),
    ('group_added',     'tr', '{group} grubundasın',           '{name} seni ekledi · birlikte gece seçin'),
    ('group_joined',    'en', '{group}',                       '{name} joined'),
    ('group_joined',    'de', '{group}',                       '{name} ist dazugekommen'),
    ('group_joined',    'tr', '{group}',                       '{name} gruba katıldı'),
    ('group_match',     'en', '{group} · everyone is in',      '{title}'),
    ('group_match',     'de', '{group} · alle sind dabei',     '{title}'),
    ('group_match',     'tr', '{group} · herkes var',          '{title}'),
    ('group_round',     'en', '{group} · vote',                '{name} put {title} to a vote'),
    ('group_round',     'de', '{group} · abstimmung',          '{name} lässt abstimmen: {title}'),
    ('group_round',     'tr', '{group} · oylama',              '{name} oylamaya sundu: {title}'),
    ('group_won',       'en', '{group} · the vote is in',      '{title}'),
    ('group_won',       'de', '{group} · abgestimmt',          '{title}'),
    ('group_won',       'tr', '{group} · oylama bitti',        '{title}'),
    ('group_plan',      'en', '{group} · the plan',            '{name}: {title}'),
    ('group_plan',      'de', '{group} · der plan',            '{name}: {title}'),
    ('group_plan',      'tr', '{group} · plan',                '{name}: {title}'),
    ('group_message',   'en', '{group} · {name}',              'a new message'),
    ('group_message',   'de', '{group} · {name}',              'eine neue nachricht'),
    ('group_message',   'tr', '{group} · {name}',              'yeni bir mesaj'),
    ('group_live',      'en', '{group} · live now',            '{name} wants to swipe together, now'),
    ('group_live',      'de', '{group} · gerade live',         '{name} will jetzt zusammen wischen'),
    ('group_live',      'tr', '{group} · şimdi canlı',         '{name} şimdi birlikte kaydırmak istiyor'),
    ('group_ticket',    'en', '{group} · tomorrow',            'you are in for {title} but have no ticket yet'),
    ('group_ticket',    'de', '{group} · morgen',              'du bist bei {title} dabei, hast aber noch kein ticket'),
    ('group_ticket',    'tr', '{group} · yarın',               '{title} için geliyorsun ama henüz biletin yok'),
    ('post',            'en', '{name} posted',                 'a new post'),
    ('post',            'de', '{name} hat gepostet',           'ein neuer post'),
    ('post',            'tr', '{name} paylaştı',               'yeni bir gönderi'),
    ('post_like',       'en', '{name} likes your post',        'open yours to see it'),
    ('post_like',       'de', '{name} gefällt dein post',      'in yours ansehen'),
    ('post_like',       'tr', '{name} gönderini beğendi',      'yours sekmesinde'),
    ('post_comment',    'en', '{name} commented',              'a new comment'),
    ('post_comment',    'de', '{name} hat kommentiert',        'ein neuer kommentar'),
    ('post_comment',    'tr', '{name} yorum yaptı',            'yeni bir yorum'),
    -- 59_dms.sql: a direct message; the name, never the words
    ('dm',              'en', '{name}',                        'a new message'),
    ('dm',              'de', '{name}',                        'eine neue nachricht'),
    ('dm',              'tr', '{name}',                        'yeni bir mesaj'),
    ('staff',           'en', 'the panel',                     '{n} waiting: reports, nights sent in, dj pages'),
    ('staff',           'de', 'das panel',                     '{n} warten: meldungen, eingesandte nächte, dj-seiten'),
    ('staff',           'tr', 'panel',                         '{n} iş bekliyor: şikayetler, gönderilen geceler, dj sayfaları'),
    -- 72_night_changed.sql: a night you kept, answered or hold a ticket for
    ('night_changed',   'en', '{title}',                       '{what}'),
    ('night_changed',   'de', '{title}',                       '{what}'),
    ('night_changed',   'tr', '{title}',                       '{what}'),
    -- 75_spark_off.sql: a spark you said in to was taken back by its host
    ('spark_off',       'en', '{name} took it back',            '{title}'),
    ('spark_off',       'de', '{name} hat es abgesagt',         '{title}'),
    ('spark_off',       'tr', '{name} iptal etti',              '{title}'),
    -- 96_spark_edit.sql: a spark you said in to was changed by its host
    ('spark_changed',   'en', '{title}',                        '{name} changed it · {what}'),
    ('spark_changed',   'de', '{title}',                        '{name} hat es geändert · {what}'),
    ('spark_changed',   'tr', '{title}',                        '{name} değiştirdi · {what}'),
    -- 97_venue_desk.sql: a word from a room you keep nights at (the own line of the manager)
    ('venue',           'en', '{venue}',                        '{line}'),
    ('venue',           'de', '{venue}',                        '{line}'),
    ('venue',           'tr', '{venue}',                        '{line}')
  ) as x(kind, lang, title, body)
  where x.kind = p_kind and x.lang = coalesce(nullif(p_lang, ''), 'en');

  -- The words of a member never reach a lock screen (the decision of owner, 11.10.2026): what the
  -- triggers still pass as text is dropped here, whatever the caller.
  for pair in select * from jsonb_each_text(coalesce(p_data, '{}') - 'text') loop
    title := replace(title, '{' || pair.key || '}', coalesce(pair.value, ''));
    body  := replace(body,  '{' || pair.key || '}', coalesce(pair.value, ''));
  end loop;
  return next;
end;
$$;


-- The room speaks to its people: one line, once a day. The line is the own of the manager
-- words and goes out as written (the word watch of 79 looks at staff_log too, so a
-- foul line is seen). Returns how many people it went to.
create or replace function public.venue_push(p_venue uuid, p_line text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.venues%rowtype;
  line text := btrim(coalesce(p_line, ''));
  n int := 0;
  who uuid;
begin
  perform public.need_venue(p_venue);
  select * into v from public.venues where id = p_venue;
  if length(line) not between 3 and 140 then raise exception 'the line: 3 to 140 characters'; end if;
  if exists (select 1 from public.staff_log l where l.action = 'push' and l.target = 'venue'
               and l.target_id = p_venue::text and l.at > now() - interval '1 day') then
    raise exception 'one a day per room; the last one is less than a day old';
  end if;
  if to_regprocedure('public.push_enqueue(uuid, text, text, jsonb)') is null then
    perform public.staff_note('push', 'venue', p_venue::text, line);
    return 0;
  end if;
  for who in
    select distinct u from (
      select s.user_id u from public.swipes s join public.events e on e.id = s.event_id where e.venue_id = p_venue and s.direction = 'right' and s.created_at > now() - interval '365 days'
      union select k.user_id from public.checkins k join public.events e on e.id = k.event_id where e.venue_id = p_venue and k.checked_at > now() - interval '365 days'
      union select r.user_id from public.rsvps r join public.events e on e.id = r.event_id where e.venue_id = p_venue and r.answer in ('in', 'maybe') and r.updated_at > now() - interval '365 days'
      union select t.user_id from public.tickets t join public.events e on e.id = t.event_id where e.venue_id = p_venue and t.answer = 'got' and t.answered_at > now() - interval '365 days') x
    where u <> auth.uid()
  loop
    perform public.push_enqueue(who, 'venue', 'venue:' || p_venue || ':' || who || ':' || to_char(now(), 'YYYYMMDD'),
                                jsonb_build_object('venue', lower(v.name), 'line', line, 'venue_slug', v.slug));
    n := n + 1;
  end loop;
  perform public.staff_note('push', 'venue', p_venue::text, line);
  return n;
end;
$$;
revoke all on function public.venue_push(uuid, text) from public, anon;
grant execute on function public.venue_push(uuid, text) to authenticated;

-- ---------------------------------------------------------------- deleting

-- As 43, and a manager also deletes a night at their room that was made here.
create or replace function public.staff_event_delete(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.events%rowtype;
begin
  perform public.need_staff();
  select * into e from public.events where id = p_id;
  if e.id is null then return; end if;
  if e.source not in ('staff', 'user') then raise exception 'only nights made here can be deleted here'; end if;
  if not public.is_admin() and e.source = 'staff' and e.created_by is distinct from auth.uid()
     and not public.runs_venue(e.venue_id) then
    raise exception 'only the admin, whoever made it, or the room' using errcode = '42501';
  end if;
  delete from public.events where id = p_id;
  perform public.staff_note('delete', 'night', e.slug, e.title);
end;
$$;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('97_venue_desk.sql', '017e5bdc29c064de801b1a3a2d88548f1aa42f63fcc5f7f7a17f5414bf8a3178');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('97_venue_desk.sql');
  end if;
end $$;
