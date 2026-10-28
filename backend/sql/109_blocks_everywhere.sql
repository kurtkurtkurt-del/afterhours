-- afterhours — a block closes everywhere, both ways (109, after 26, 28, 30, 35, 46 to 50, 57, 59, 61, 70, 108)
--
-- A block (50) ended the friendship and hid the card, comments and rooms (70).
-- Six places still read across it; each one now asks first:
--
--   waves_kept()           a chain through someone you blocked, or who blocked
--                          you, or who is banned, is no chain (reachable, 57)
--   group reads            in a group you share, the other is not there for you:
--                          their lines (group_thread), photos (group_wall,
--                          group_album, group_leg_photos, the cover in group_nights),
--                          votes and answers (group_plan, group_votes,
--                          group_live_state), their row in the member list
--                          (group_get), their name or face (group_nights, my_groups,
--                          group_peek)
--   push_group             a group push caused by one of you does not reach the other
--   sparks                 block_user drops the invites between the two of you
--                          (and this file drops them once for every block already there);
--                          spark_inbox, spark_rows (so sparks_near, spark_get) and
--                          spark_answer skip a host you cannot reach; spark_people
--                          leaves out the other
--   comments               the table policy itself hides a blocked author, not
--                          only the comments_public view
--   dm_thread()            the history is closed once either side blocks, as in
--                          dm_list and dm_send
--   push_on_comment /      no reply or room push from someone on the other side
--   push_on_room_post      of a block
--
-- Nobody is taken out of a group: unblocking brings the group back as it was.
-- The spark invites dropped by a block do not come back.
-- Every function is the latest one (file in brackets) with the check added.

-- ------------------------------------------------------------ waves_kept (57)

create or replace function public.waves_kept(p_limit int default 80)
returns table (
  wave        int,
  via         text[],
  kept_at     timestamptz,
  id          uuid,
  slug        text,
  title       text,
  poster_no   int,
  type_name   text,
  venue_name  text,
  city_slug   text,
  starts_at   timestamptz,
  image_url   text,
  ticket_url  text
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
  with near as (
    select w.person, w.hops, w.path
    from public.wave_paths(me) w
    where w.hops between 2 and 3
      -- everyone on the chain keeps their keeps open, and nobody on it is
      -- blocked either way or banned
      and not exists (
        select 1 from unnest(w.path) as link(id)
        where not public.kept_visible(link.id)
           or not public.reachable(me, link.id)
      )
  )
  select n.hops,
         array(select coalesce(p.handle, p.display_name, 'someone')
               from unnest(n.path) with ordinality as link(id, i)
               join public.profiles p on p.id = link.id
               order by link.i),
         s.created_at,
         e.id, e.slug, e.title, e.poster_no, e.type_name, e.venue_name,
         e.city_slug, e.starts_at, e.image_url, e.ticket_url
  from near n
  join public.swipes s on s.user_id = n.person and s.direction = 'right'
  join public.events_public e on e.id = s.event_id
  where e.starts_at > now() - interval '6 hours'
  order by e.starts_at, n.hops, s.created_at desc
  limit greatest(1, least(coalesce(p_limit, 80), 200));
end;
$$;

-- ------------------------------------------------------------ the group (46, 47, 49, 61)

create or replace function public.group_thread(p_group uuid, p_after bigint default 0)
returns table (id bigint, user_id uuid, name text, kind text, body text, event_slug text, created_at timestamptz, mine boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.need_member(p_group);
  return query
    select * from (
      select m.id, m.user_id, coalesce(p.display_name, p.handle), m.kind, m.body, e.slug, m.created_at, m.user_id = auth.uid()
      from public.group_messages m
      left join public.profiles p on p.id = m.user_id
      left join public.events e on e.id = m.event_id
      where m.group_id = p_group and m.id > coalesce(p_after, 0)
        and not public.hidden_by_block(m.user_id)
      order by m.id desc
      limit 80) x
    order by x.id;
end;
$$;

create or replace function public.group_plan(p_group uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.groups%rowtype;
  r public.group_rounds%rowtype;
  open_id uuid;
begin
  perform public.need_member(p_group);
  select id into open_id from public.group_rounds where group_id = p_group and closed_at is null;
  if open_id is not null then perform public.round_settle(open_id); end if;
  select * into g from public.groups where id = p_group;
  select * into r from public.group_rounds where group_id = p_group and closed_at is null;
  return json_build_object(
    'members', (select count(*) from public.group_members where group_id = p_group),
    'round', case when r.id is null then null else json_build_object(
      'id', r.id, 'closes_at', r.closes_at,
      'started_by', (select coalesce(p.display_name, p.handle) from public.profiles p
                     where p.id = r.started_by and not public.hidden_by_block(p.id)),
      'mine', r.started_by = auth.uid(),
      'voted', (select count(*) from public.group_ballots where round_id = r.id),
      'my_vote', (select event_id from public.group_ballots where round_id = r.id and user_id = auth.uid()),
      'options', (select json_agg(json_build_object(
          'id', e.id, 'slug', e.slug, 'title', e.title, 'starts_at', e.starts_at, 'venue_name', v.name, 'image_url', e.image_url,
          'votes', (select count(*) from public.group_ballots b where b.round_id = r.id and b.event_id = e.id),
          'voters', (select coalesce(json_agg(coalesce(p.display_name, p.handle)), '[]'::json) from public.group_ballots b
                     join public.profiles p on p.id = b.user_id
                     where b.round_id = r.id and b.event_id = e.id and not public.hidden_by_block(p.id))) order by e.starts_at)
        from public.group_round_options o join public.events e on e.id = o.event_id left join public.venues v on v.id = e.venue_id
        where o.round_id = r.id)) end,
    'plan', case when g.plan_event_id is null or not public.night_ahead(g.plan_event_id) then null else (
      select json_build_object(
        'id', e.id, 'slug', e.slug, 'title', e.title, 'starts_at', e.starts_at, 'venue_name', v.name, 'city_name', c.name,
        'image_url', e.image_url, 'ticket_url', e.ticket_url,
        'set_by', (select coalesce(p.display_name, p.handle) from public.profiles p
                   where p.id = g.plan_set_by and not public.hidden_by_block(p.id)),
        'people', (select json_agg(json_build_object(
            'id', p.id, 'name', coalesce(p.display_name, p.handle),
            'answer', (select a.answer from public.rsvps a where a.user_id = p.id and a.event_id = e.id),
            'ticket', exists (select 1 from public.group_tickets t where t.group_id = p_group and t.event_id = e.id and t.user_id = p.id))
            order by m.joined_at)
          from public.group_members m join public.profiles p on p.id = m.user_id
          where m.group_id = p_group and not public.hidden_by_block(p.id)))
      from public.events e join public.cities c on c.id = e.city_id left join public.venues v on v.id = e.venue_id
      where e.id = g.plan_event_id) end
  );
end;
$$;

-- The three photo readers keep 108's rule too (group_photo_seen): a photo from a
-- night the caller did not check in to stays out, block or no block.
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
      and not public.hidden_by_block(ph.user_id)
      and public.group_photo_seen(p_group, ph.event_id, ph.user_id)
    order by e.starts_at desc nulls last, ph.created_at
    limit 300;
end;
$$;

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
      and not public.hidden_by_block(ph.user_id)
      and public.group_photo_seen(p_group, ph.event_id, ph.user_id)
    order by ph.created_at;
end;
$$;

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
      and not public.hidden_by_block(ph.user_id)
      and public.group_photo_seen(p_id, ph.event_id, ph.user_id)
    order by e.starts_at, ph.created_at
    limit 300;
end;
$$;

create or replace function public.group_get(p_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.need_member(p_id);
  return (
    select json_build_object(
      'id', g.id, 'name', g.name, 'emoji', g.emoji, 'color', g.color, 'cover_path', g.cover_path,
      'kind', g.kind, 'city_slug', g.city_slug, 'date_from', g.date_from, 'date_to', g.date_to,
      'archived', g.kind = 'once' and g.date_to < current_date, 'visible', g.visible,
      'me', auth.uid(),
      'members', (select json_agg(json_build_object('id', p.id, 'handle', p.handle, 'name', p.display_name, 'role', m.role) order by m.joined_at)
                  from public.group_members m join public.profiles p on p.id = m.user_id
                  where m.group_id = g.id and not public.hidden_by_block(p.id)),
      'legs', coalesce((select json_agg(json_build_object('id', l.id, 'leg_no', l.leg_no, 'city', l.city_slug, 'from', l.date_from, 'to', l.date_to) order by l.leg_no)
                        from public.group_legs l where l.group_id = g.id), '[]'::json))
    from public.groups g where g.id = p_id);
end;
$$;

create or replace function public.group_votes(p_id uuid, p_event uuid)
returns table (user_id uuid, name text, direction text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.need_member(p_id);
  return query
    select m.user_id, coalesce(p.display_name, p.handle), s.direction
    from public.group_members m
    join public.profiles p on p.id = m.user_id
    left join public.group_swipes s on s.group_id = m.group_id and s.user_id = m.user_id and s.event_id = p_event
    where m.group_id = p_id
      and not public.hidden_by_block(m.user_id)
    order by m.joined_at;
end;
$$;

create or replace function public.group_live_state(p_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  here uuid[];
  card public.events_public%rowtype;
  left_ int;
begin
  perform public.need_member(p_id);
  here := array(select l.user_id from public.group_live l
                join public.group_members m on m.group_id = l.group_id and m.user_id = l.user_id
                where l.group_id = p_id and l.seen_at > now() - interval '40 seconds' order by l.user_id);
  if cardinality(here) = 0 then here := array[auth.uid()]; end if;
  select e.* into card from public.group_window(p_id) e
   where not exists (select 1 from public.group_live_skips k where k.group_id = p_id and k.event_id = e.id)
     and (select count(*) from public.group_swipes s where s.group_id = p_id and s.event_id = e.id and s.user_id = any(here)) < cardinality(here)
   limit 1;
  select count(*)::int into left_ from public.group_window(p_id) e
   where not exists (select 1 from public.group_live_skips k where k.group_id = p_id and k.event_id = e.id)
     and (select count(*) from public.group_swipes s where s.group_id = p_id and s.event_id = e.id and s.user_id = any(here)) < cardinality(here);
  return json_build_object(
    'card', case when card.id is null then null else row_to_json(card) end,
    'left', left_,
    'people', (select json_agg(json_build_object('id', p.id, 'name', coalesce(p.display_name, p.handle),
                                                 'answer', (select s.direction from public.group_swipes s
                                                            where s.group_id = p_id and s.user_id = p.id and s.event_id = card.id)))
               from public.profiles p where p.id = any(here) and not public.hidden_by_block(p.id)));
end;
$$;

create or replace function public.group_nights(p_group uuid)
returns table (id uuid, slug text, title text, starts_at timestamptz, venue_name text, city_name text, image_url text,
               people json, all_of_us boolean, photos int, cover text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  n int;
begin
  perform public.need_member(p_group);
  select count(*) into n from public.group_members where group_id = p_group;
  return query
    select e.id, e.slug, e.title, e.starts_at, v.name, c.name, e.image_url,
           (select json_agg(json_build_object('id', p.id, 'name', coalesce(p.display_name, p.handle), 'card', r.cards[i]) order by i)
              from generate_subscripts(r.people, 1) i join public.profiles p on p.id = r.people[i]
              where not public.hidden_by_block(p.id)),
           cardinality(r.people) >= n,
           (select count(*)::int from public.group_photos ph where ph.group_id = p_group and ph.event_id = e.id
              and not public.hidden_by_block(ph.user_id)),
           (select ph.path from public.group_photos ph where ph.group_id = p_group and ph.event_id = e.id
              and not public.hidden_by_block(ph.user_id) order by ph.created_at limit 1)
    from public.group_night_rows(p_group) r
    join public.events e on e.id = r.event_id
    join public.cities c on c.id = e.city_id
    left join public.venues v on v.id = e.venue_id
    order by coalesce(e.starts_at, r.first_at) desc;
end;
$$;

create or replace function public.my_groups()
returns table (id uuid, name text, emoji text, color text, cover_path text, kind text, city_slug text,
               date_from date, date_to date, members int, faces uuid[], matches int, to_swipe int,
               live int, archived boolean)
language sql
stable
security definer
set search_path = public
as $$
  with mine as (
    select g.* from public.groups g join public.group_members m on m.group_id = g.id and m.user_id = auth.uid()
  )
  select g.id, g.name, g.emoji, g.color, g.cover_path, g.kind, g.city_slug, g.date_from, g.date_to,
         (select count(*)::int from public.group_members m where m.group_id = g.id),
         array(select m.user_id from public.group_members m where m.group_id = g.id
                 and not public.hidden_by_block(m.user_id) order by m.joined_at limit 4),
         (select count(*)::int from public.group_matches(g.id) x where x.status = 'match'),
         (select count(*)::int from public.group_window(g.id) e
           where not exists (select 1 from public.group_swipes s where s.group_id = g.id and s.user_id = auth.uid() and s.event_id = e.id)),
         (select count(*)::int from public.group_live l where l.group_id = g.id and l.seen_at > now() - interval '40 seconds'),
         g.kind = 'once' and g.date_to < current_date
  from mine g
  order by (g.kind = 'once' and g.date_to < current_date), g.created_at desc;
$$;

create or replace function public.group_peek(p_code text)
returns table (id uuid, name text, emoji text, color text, cover_path text, members int, mine boolean, open boolean,
               names text[], owner text, plan_title text)
language sql
stable
security definer
set search_path = public
as $$
  select g.id, g.name, g.emoji, g.color, g.cover_path,
         (select count(*)::int from public.group_members m where m.group_id = g.id),
         public.in_group(g.id),
         i.expires_at > now() and i.uses < i.max_uses,
         array(select coalesce(p.display_name, p.handle) from public.group_members m join public.profiles p on p.id = m.user_id
               where m.group_id = g.id and not public.hidden_by_block(p.id) order by m.joined_at limit 6),
         (select coalesce(p.display_name, p.handle) from public.profiles p
          where p.id = i.created_by and not public.hidden_by_block(p.id)),
         (select e.title from public.events e where e.id = g.plan_event_id and e.is_published)
  from public.group_invites i join public.groups g on g.id = i.group_id
  where i.code = upper(btrim(p_code));
$$;

-- Everyone in the group but p_skip, with the words every group push carries.
-- Nobody hears what someone on the other side of a block did (48).
create or replace function public.push_group(p_group uuid, p_skip uuid, p_kind text, p_key text, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
  g public.groups%rowtype;
begin
  select * into g from public.groups where id = p_group;
  if g.id is null then return; end if;
  for m in select gm.user_id from public.group_members gm
           where gm.group_id = p_group and gm.user_id is distinct from p_skip
             and (p_skip is null or public.reachable(gm.user_id, p_skip)) loop
    perform public.push_enqueue(m.user_id, p_kind, replace(p_key, '{user}', m.user_id::text),
      jsonb_build_object('group', g.emoji || ' ' || g.name, 'url', '/groups/' || g.id) || coalesce(p_data, '{}'));
  end loop;
end;
$$;
revoke execute on function public.push_group(uuid, uuid, text, text, jsonb) from public, anon, authenticated;

-- ------------------------------------------------------------ sparks (28, 30, 35, 50)

create or replace function public.block_user(p_other uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if p_other is null or p_other = auth.uid() then raise exception 'not yourself'; end if;
  if not exists (select 1 from public.profiles where id = p_other) then raise exception 'no such person'; end if;
  insert into public.blocks (blocker_id, blocked_id) values (auth.uid(), p_other)
  on conflict do nothing;
  delete from public.friendships
  where (requester_id = auth.uid() and addressee_id = p_other)
     or (addressee_id = auth.uid() and requester_id = p_other);
  -- the invites between the two of you, either host
  delete from public.spark_invites i
  using public.sparks s
  where s.id = i.spark_id
    and ((s.host_id = auth.uid() and i.user_id = p_other)
      or (s.host_id = p_other and i.user_id = auth.uid()));
  return true;
end;
$$;

-- Once, for every block made before this file: the invites across it go.
delete from public.spark_invites i
using public.sparks s, public.blocks b
where s.id = i.spark_id
  and ((b.blocker_id = s.host_id and b.blocked_id = i.user_id)
    or (b.blocked_id = s.host_id and b.blocker_id = i.user_id));

create or replace function public.spark_inbox()
returns table (
  id          uuid,
  kind        text,
  title       text,
  starts_at   timestamptz,
  place       text,
  host_handle text,
  host_name   text,
  going       int,
  wave        int
)
language sql
stable
security definer
set search_path = public
as $$
  with near as (select person, hops from public.spark_waves(auth.uid()))
  select s.id, s.kind, s.title, s.starts_at, s.place, p.handle, p.display_name,
         (select count(*)::int from public.spark_invites g where g.spark_id = s.id and g.answer = 'in'),
         n.hops
  from public.sparks s
  join public.profiles p on p.id = s.host_id
  left join near n on n.person = s.host_id
  left join public.spark_invites i on i.spark_id = s.id and i.user_id = auth.uid()
  where auth.uid() is not null
    and s.host_id <> auth.uid()
    and public.reachable(auth.uid(), s.host_id)
    and s.starts_at > now() - interval '6 hours'
    and (
      (i.user_id is not null and i.answer = 'waiting')
      or (i.user_id is null and s.reach is not null and n.hops <= s.reach)
    )
  order by s.starts_at;
$$;

create or replace function public.spark_answer(p_spark uuid, p_answer text)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if p_answer not in ('in', 'out', 'waiting') then
    raise exception 'answer is in, out or waiting' using errcode = '22023';
  end if;
  -- a host on the other side of a block is nobody to answer
  if exists (select 1 from public.sparks s
             where s.id = p_spark and s.host_id <> me and not public.reachable(me, s.host_id)) then
    raise exception 'no such invite' using errcode = '42501';
  end if;
  update public.spark_invites
     set answer = p_answer,
         answered_at = case when p_answer = 'waiting' then null else now() end
   where spark_id = p_spark and user_id = me;
  if found then
    return;
  end if;
  if exists (
    select 1 from public.sparks s
    join public.spark_waves(me) w on w.person = s.host_id
    where s.id = p_spark and s.reach is not null and w.hops <= s.reach and s.host_id <> me
  ) then
    insert into public.spark_invites (spark_id, user_id, answer, answered_at)
    values (p_spark, me, p_answer, case when p_answer = 'waiting' then null else now() end);
    return;
  end if;
  raise exception 'no such invite' using errcode = '42501';
end;
$$;

create or replace function public.spark_rows()
returns table (
  id          uuid,
  kind        text,
  title       text,
  starts_at   timestamptz,
  place       text,
  host_handle text,
  host_name   text,
  going       int,
  wave        int,
  mine        boolean,
  my_answer   text,
  lat         double precision,
  lng         double precision
)
language sql
stable
security definer
set search_path = public
as $$
  with near as (select person, hops from public.spark_waves(auth.uid()))
  select s.id, s.kind, s.title, s.starts_at, s.place, p.handle, p.display_name,
         (select count(*)::int from public.spark_invites g where g.spark_id = s.id and g.answer = 'in'),
         n.hops,
         s.host_id = auth.uid(),
         i.answer,
         case when s.host_id = auth.uid() or n.hops = 1 then s.lat else round(s.lat::numeric, 2)::double precision end,
         case when s.host_id = auth.uid() or n.hops = 1 then s.lng else round(s.lng::numeric, 2)::double precision end
  from public.sparks s
  join public.profiles p on p.id = s.host_id
  left join near n on n.person = s.host_id
  left join public.spark_invites i on i.spark_id = s.id and i.user_id = auth.uid()
  where auth.uid() is not null
    and s.starts_at > now() - interval '6 hours'
    and (s.host_id = auth.uid()
         or (public.reachable(auth.uid(), s.host_id)
             and (i.user_id is not null
                  or (s.reach is not null and n.hops <= s.reach))));
$$;
revoke execute on function public.spark_rows() from public, anon, authenticated;

create or replace function public.spark_people(p_spark uuid)
returns table (name text, answer text, answered_at timestamptz, me boolean)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(p.handle, p.display_name, 'someone'), i.answer, i.answered_at, i.user_id = auth.uid()
  from public.spark_invites i
  join public.profiles p on p.id = i.user_id
  join public.sparks s on s.id = i.spark_id
  where i.spark_id = p_spark
    and i.answer in ('in', 'out')
    and auth.uid() is not null
    and not public.hidden_by_block(i.user_id)
    and (
      s.host_id = auth.uid()
      or (public.reachable(auth.uid(), s.host_id)
          and exists (select 1 from public.spark_invites m
                      where m.spark_id = p_spark and m.user_id = auth.uid() and m.answer = 'in'))
    )
    -- someone who is in sees the others who are in, not who said no
    and (s.host_id = auth.uid() or i.answer = 'in')
  order by (i.answer = 'in') desc, i.answered_at desc nulls last;
$$;

-- ------------------------------------------------------------ comments (02, 70)

drop policy if exists comments_read on public.comments;
create policy comments_read on public.comments for select
  using ((not is_hidden and not public.hidden_by_block(author_id)) or public.is_admin());

-- ------------------------------------------------------------ dm_thread (59)

create or replace function public.dm_thread(p_thread uuid, p_after bigint default 0)
returns table (id bigint, user_id uuid, name text, body text, created_at timestamptz, mine boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me    uuid := public.assert_member();
  other uuid;
begin
  other := public.dm_other(p_thread, me);
  if other is null or not public.reachable(me, other) then raise exception 'no such conversation'; end if;
  return query
  select * from (
    select m.id, m.user_id, coalesce(p.display_name, p.handle), m.body, m.created_at, m.user_id = me
    from public.dm_messages m join public.profiles p on p.id = m.user_id
    where m.thread_id = p_thread and m.id > p_after
    order by m.id desc
    limit case when p_after = 0 then 80 else 500 end
  ) last order by last.id;
end;
$$;

-- ------------------------------------------------------------ push (26)

-- A line in a room: everyone else checked in hears it, at most once per half
-- hour per room, unless a block stands between them and the writer.
create or replace function public.push_on_room_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  night record;
  them  uuid;
begin
  select e.title, e.slug into night from public.events e where e.id = new.event_id;
  for them in
    select c.user_id from public.checkins c
    where c.event_id = new.event_id and c.user_id is distinct from new.user_id
      and public.reachable(c.user_id, new.user_id)
  loop
    perform public.push_enqueue(them, 'room_message',
      format('room:%s:%s:%s', them, new.event_id, floor(extract(epoch from new.created_at) / 1800)),
      jsonb_build_object('name', public.push_name(new.user_id), 'title', night.title,
                         'text', left(new.body, 80), 'url', '/room/' || night.slug));
  end loop;
  return new;
end;
$$;

-- A reply to your beforehours comment, unless a block stands between you.
create or replace function public.push_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent uuid;
  night  record;
begin
  if new.parent_id is null or new.is_hidden then
    return new;
  end if;
  select c.author_id into parent from public.comments c where c.id = new.parent_id;
  if parent is null or parent is not distinct from new.author_id then
    return new;
  end if;
  if new.author_id is not null and not public.reachable(parent, new.author_id) then
    return new;
  end if;
  select e.title, e.slug into night from public.events e where e.id = new.event_id;
  perform public.push_enqueue(parent, 'reply', format('reply:%s', new.id),
    jsonb_build_object('name', coalesce(case when new.author_id is not null then public.push_name(new.author_id) end,
                                        new.author_name, 'someone'),
                       'title', night.title, 'text', left(new.body, 80), 'url', '/night/' || night.slug));
  return new;
end;
$$;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('109_blocks_everywhere.sql', 'c3d4b9506b985c4ff7e056a1d346ea228feb4183a55be51286208315d9c4a1e2');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('109_blocks_everywhere.sql');
  end if;
end $$;
