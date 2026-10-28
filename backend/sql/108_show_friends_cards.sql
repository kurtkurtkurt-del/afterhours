-- afterhours — a hidden check-in stays hidden on every card (108, audit M-5, L-12, L-8 of 28.10.2026)
--
-- 19 says who sees a check-in: the person, their confirmed friends when show_friends
-- is on, and the others in the same room, who see initials only. The room itself
-- (room_posts) is read only by those who checked in to that night. Three calls did
-- not keep that:
--
--   person_cards(handle)    36 gave a friend every check-in of the person, hidden
--                           ones too, and for each night the first two room lines
--                           and the initials of the crew, a room the friend never
--                           entered. Now a friend gets only the nights with
--                           show_friends on, and the room lines and crew initials
--                           only of a room the caller checked in to as well. On
--                           your own page nothing changes.
--   group_night_rows(group) 47 built the group nights from every check-in of the
--                           members, so a member saw the night, name and card number
--                           of someone who is not their friend, or who hid it.
--                           Now a row counts for the caller when it is their own, or
--                           show_friends is on and the person is their friend or was
--                           in the same room as the caller. group_nights, the album
--                           door, and group_stats all read it, so all three follow.
--                           In the same room show_friends still counts: stricter
--                           than the room (initials only), because a group card
--                           gives the full name and the card number.
--   the photos              group_album, group_wall and group_leg_photos give a
--                           photo only on a night the caller may see (or the plan),
--                           or when the caller added it; group_stats counts the same.
--   people_suggested()      as in 104, but no longer ordered by last_seen_at: the
--                           order told who was online most recently, a signal
--                           profile_card keeps to friends and to the day. Now: mutual
--                           friends, same city, then handle.

-- ------------------------------------------------------------ person_cards

-- Same columns as 36, so the app and site read it unchanged.
create or replace function public.person_cards(p_handle text)
returns table (
  card_no     bigint,
  checked_at  timestamptz,
  freeze_at   timestamptz,
  frozen      boolean,
  slug        text,
  title       text,
  type_name   text,
  venue_name  text,
  city_name   text,
  starts_at   timestamptz,
  image_url   text,
  crew        text[],
  crew_more   int,
  who_count   int,
  post_count  int,
  q1_body     text,
  q1_who      text,
  q1_at       timestamptz,
  q2_body     text,
  q2_who      text,
  q2_at       timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with target as (
    select p.id from public.profiles p
    where p.handle = lower(btrim(p_handle))
      and (p.id = auth.uid() or public.is_friend(p.id))
  ),
  mine as (
    select c.*, public.room_freeze_at(c.event_id) as freeze_at
    from public.checkins c
    where c.user_id = (select id from target)
      and (c.user_id = auth.uid() or c.show_friends)
  ),
  -- the rooms of those nights the caller was in too: only these open their lines and initials.
  -- The number of lines stays on every card: the card reads an open room with no lines
  -- as a night not begun, and the count says nothing of who wrote what.
  inside as (
    select m.event_id from mine m
    where exists (select 1 from public.checkins c where c.event_id = m.event_id and c.user_id = auth.uid())
  ),
  others as (
    select c.event_id,
           array_agg(lower(left(coalesce(p.display_name, p.handle, 's'), 1)) order by c.checked_at) as initials,
           count(*)::int as n
    from public.checkins c
    join public.profiles p on p.id = c.user_id
    where c.user_id <> (select id from target) and c.event_id in (select event_id from mine)
    group by c.event_id
  ),
  posts as (
    select r.event_id, r.body, lower(left(coalesce(p.display_name, p.handle, 's'), 1)) as who, r.created_at,
           row_number() over (partition by r.event_id order by r.created_at) as rn,
           count(*) over (partition by r.event_id)::int as total
    from public.room_posts r
    left join public.profiles p on p.id = r.user_id
    where r.event_id in (select event_id from mine)
  )
  select m.card_no, m.checked_at, m.freeze_at, now() >= m.freeze_at,
         e.slug, e.title, t.name, v.name, ci.name, e.starts_at, e.image_url,
         case when i.event_id is null then '{}' else coalesce(o.initials[1:4], '{}') end,
         case when i.event_id is null then 0 else greatest(coalesce(o.n, 0) - 4, 0) end,
         coalesce(o.n, 0) + 1,
         coalesce((select total from posts p where p.event_id = m.event_id limit 1), 0),
         (select body from posts p where p.event_id = i.event_id and rn = 1),
         (select who  from posts p where p.event_id = i.event_id and rn = 1),
         (select created_at from posts p where p.event_id = i.event_id and rn = 1),
         (select body from posts p where p.event_id = i.event_id and rn = 2),
         (select who  from posts p where p.event_id = i.event_id and rn = 2),
         (select created_at from posts p where p.event_id = i.event_id and rn = 2)
  from mine m
  join public.events e on e.id = m.event_id
  join public.event_types t on t.id = e.type_id
  join public.cities ci on ci.id = e.city_id
  left join public.venues v on v.id = e.venue_id
  left join others o on o.event_id = m.event_id
  left join inside i on i.event_id = m.event_id
  order by m.checked_at desc;
$$;

revoke all on function public.person_cards(text) from public, anon;
grant execute on function public.person_cards(text) to authenticated;

-- -------------------------------------------------------- group_night_rows

-- As in 47, but only the check-ins the caller may see (the rule of 19). Still no
-- membership check here: callers check. Still closed to the browser roles.
create or replace function public.group_night_rows(p_group uuid)
returns table (event_id uuid, people uuid[], cards bigint[], first_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select c.event_id, array_agg(c.user_id order by c.checked_at), array_agg(c.card_no order by c.checked_at), min(c.checked_at)
  from public.checkins c
  join public.group_members m on m.group_id = p_group and m.user_id = c.user_id
  where c.user_id = auth.uid()
     or (c.show_friends and (public.is_friend(c.user_id) or public.checked_in(c.event_id)))
  group by c.event_id
  having count(*) >= 2;
$$;
revoke all on function public.group_night_rows(uuid) from public, anon, authenticated;

-- ------------------------------------------------------------ the photos

-- A group photo is seen when it hangs on a night the caller may see (or the plan),
-- or when the caller added it. Without this the wall, the album and the leg photos
-- gave back the night, its title and who added it for the very nights group_nights
-- now leaves out. Closed to the browser roles, like group_album_ok.
create or replace function public.group_photo_seen(p_group uuid, p_event uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_user = auth.uid() or public.group_album_ok(p_group, p_event);
$$;
revoke all on function public.group_photo_seen(uuid, uuid, uuid) from public, anon, authenticated;

-- As in 47, plus the rule above.
create or replace function public.group_album(p_group uuid, p_event uuid)
returns table (id uuid, path text, user_id uuid, name text, created_at timestamptz, mine boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.need_member(p_group);
  return query
    select ph.id, ph.path, ph.user_id, coalesce(p.display_name, p.handle), ph.created_at, ph.user_id = auth.uid()
    from public.group_photos ph left join public.profiles p on p.id = ph.user_id
    where ph.group_id = p_group and ph.event_id = p_event
      and public.group_photo_seen(p_group, ph.event_id, ph.user_id)
    order by ph.created_at;
end;
$$;

-- As in 49, plus the rule above.
create or replace function public.group_wall(p_group uuid)
returns table (id uuid, path text, event_id uuid, event_title text, starts_at timestamptz, name text, mine boolean, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.need_member(p_group);
  return query
    select ph.id, ph.path, e.id, e.title, e.starts_at, coalesce(p.display_name, p.handle), ph.user_id = auth.uid(), ph.created_at
    from public.group_photos ph
    join public.events e on e.id = ph.event_id
    left join public.profiles p on p.id = ph.user_id
    where ph.group_id = p_group
      and public.group_photo_seen(p_group, ph.event_id, ph.user_id)
    order by e.starts_at desc nulls last, ph.created_at
    limit 300;
end;
$$;

-- As in 61, plus the rule above.
create or replace function public.group_leg_photos(p_id uuid, p_leg uuid)
returns table (id uuid, path text, event_id uuid, event_title text, starts_at timestamptz, name text, mine boolean, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  l public.group_legs;
begin
  perform public.need_member(p_id);
  select * into l from public.group_legs where group_legs.id = p_leg and group_id = p_id;
  if l.id is null then raise exception 'no such leg'; end if;
  return query
    select ph.id, ph.path, e.id, e.title, e.starts_at, coalesce(p.display_name, p.handle), ph.user_id = auth.uid(), ph.created_at
    from public.group_photos ph
    join public.events e on e.id = ph.event_id
    join public.cities c on c.id = e.city_id and c.slug = l.city_slug
    left join public.profiles p on p.id = ph.user_id
    where ph.group_id = p_id and e.starts_at::date between l.date_from and l.date_to
      and public.group_photo_seen(p_id, ph.event_id, ph.user_id)
    order by e.starts_at, ph.created_at
    limit 300;
end;
$$;

-- As in 47; the photo count follows the rule above, so it agrees with the nights.
create or replace function public.group_stats(p_group uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  members uuid[];
begin
  perform public.need_member(p_group);
  members := array(select user_id from public.group_members where group_id = p_group);
  return json_build_object(
    'nights', (select count(*) from public.group_night_rows(p_group)),
    'nights_year', (select count(*) from public.group_night_rows(p_group) r join public.events e on e.id = r.event_id
                    where coalesce(e.starts_at, r.first_at) >= date_trunc('year', now())),
    'room', (select v.name from public.group_night_rows(p_group) r join public.events e on e.id = r.event_id
             join public.venues v on v.id = e.venue_id group by v.name order by count(*) desc, v.name limit 1),
    'regular', (select json_build_object('name', coalesce(p.display_name, p.handle), 'n', count(*))
                from public.group_night_rows(p_group) r cross join lateral unnest(r.people) u(uid) join public.profiles p on p.id = u.uid
                group by p.id, p.display_name, p.handle order by count(*) desc, p.display_name limit 1),
    'matches', (select count(*) from (
                  select s.event_id from public.group_swipes s where s.group_id = p_group and s.direction = 'right'
                    and s.user_id = any(members)
                  group by s.event_id having count(*) = cardinality(members)) x),
    'votes', (select count(*) from public.group_rounds where group_id = p_group),
    'photos', (select count(*) from public.group_photos ph where ph.group_id = p_group and public.group_photo_seen(p_group, ph.event_id, ph.user_id)),
    -- the vibe: from every yes said in the group and every night gone to together
    'kinds', (select coalesce(json_agg(k.name), '[]'::json) from (
                select t.name from (
                  select s.event_id from public.group_swipes s where s.group_id = p_group and s.direction = 'right'
                  union all select r.event_id from public.group_night_rows(p_group) r) x
                join public.events e on e.id = x.event_id join public.event_types t on t.id = e.type_id
                group by t.name order by count(*) desc, t.name limit 2) k),
    -- averaged from 18:00, so 23:00 and 01:00 make midnight, not noon
    'hour', (select ((round(avg(((extract(hour from e.starts_at) + 6)::int % 24)))::int + 18) % 24)
             from (select s.event_id from public.group_swipes s where s.group_id = p_group and s.direction = 'right'
                   union all select r.event_id from public.group_night_rows(p_group) r) x
             join public.events e on e.id = x.event_id where e.starts_at is not null)
  );
end;
$$;

-- ------------------------------------------------------- people_suggested

-- As in 104, minus the last_seen_at order.
create or replace function public.people_suggested(p_limit int default 3)
returns table (
  id            uuid,
  handle        text,
  display_name  text,
  city_name     text,
  mutual        int,
  reason        text
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
  with mine as (
    select p.city_id from public.profiles p where p.id = me
  ),
  pool as (
    select p.id, p.handle, p.display_name, c.name as city_name,
           public.people_mutual(p.id) as mutual,
           (p.city_id is not null and p.city_id = (select city_id from mine)) as same_city
    from public.profiles p
    left join public.cities c on c.id = p.city_id
    where p.handle is not null
      and p.id <> me
      and not public.has_any_link(p.id)
      and public.visible_to(me, p.id)
  )
  select pool.id, pool.handle, pool.display_name, pool.city_name, pool.mutual,
         case when pool.mutual > 0 then 'mutual' when pool.same_city then 'city' else 'new' end
  from pool
  order by pool.mutual desc, pool.same_city desc, pool.handle
  limit least(greatest(coalesce(p_limit, 3), 1), 12);
end;
$$;

-- Stamp the migration log, if it is there. Each numbered file still runs on
-- its own (the tests load them one at a time), so this cannot insist.
do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('108_show_friends_cards.sql', '03eb001ee2eafcf4c9746decb36a5dde7bfb7dca98a3237e8bf9eac9db81a3a4');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('108_show_friends_cards.sql');
  end if;
end $$;
