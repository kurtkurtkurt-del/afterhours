-- afterhours — a room reaches only its own nights and its own people (110)
--
-- Security pass of 28.10.2026, findings M-8, M-15, L-10 and L-3.
--
--   staff_event_save      as 43, and a community manager writes only nights at a room
--                         they run: a new night needs one of their rooms, an edit needs
--                         the night to be at one of their rooms already and to stay at
--                         one. A night with no room is for the admin alone. (M-8)
--   staff_event_delete    as 97, and a community manager deletes only nights at a room
--                         they run, whoever made them and whether staff or sent in. The
--                         admin as before. (M-8)
--   staff_review          as 76, and a community manager lets through or turns down only
--                         nights sent in at a room they run; a waiting night with no room
--                         is for the admin. (M-8)
--   venue_push            as 97, and the line never reaches anyone on either side of a
--                         block with the sender, a closed account, or someone with the
--                         nights switch off. A closed sender cannot send. The line itself
--                         is refused if it holds a watched word (79), a link or an
--                         invisible character; a word
--                         from the room goes to many at once, so here watch means refuse.
--                         (M-15)
--   staff_report_settle   as 84, with the direct message branch of 70 back: "remove" on a
--                         reported DM deletes the message again. (L-10)
--   people_map            as 103, and people_places as 102, now behind assert_member(): a
--   people_places         closed account no longer reads its people. (L-3)

-- ------------------------------------------------------------ nights

create or replace function public.staff_event_save(
  p_id uuid, p_title text, p_city text, p_type text, p_venue uuid,
  p_date text, p_time text, p_body text, p_ticket_url text, p_image_url text, p_published boolean)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  old public.events%rowtype;
  s text;
begin
  perform public.need_staff();
  if p_id is not null then
    select * into old from public.events where id = p_id;
    if old.id is null then raise exception 'no such night'; end if;
    if old.source not in ('staff', 'user') then raise exception 'only nights made here can be edited here'; end if;
    -- runs_venue is true for the admin, also with no room
    if not public.runs_venue(old.venue_id) then raise exception 'not your room' using errcode = '42501'; end if;
    if old.review = 'pending' and coalesce(p_published, true) then
      raise exception 'let it through first (waiting for review)';
    end if;
  end if;
  if not public.runs_venue(p_venue) then raise exception 'not your room' using errcode = '42501'; end if;
  s := public.night_write(p_id, p_title, p_city, p_type, p_venue, p_date, p_time, p_body, p_ticket_url, p_image_url,
                          p_published, coalesce(old.source, 'staff'), old.review);
  perform public.staff_note(case when p_id is null then 'create' else 'edit' end, 'night', s, btrim(p_title));
  return s;
end;
$$;

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
  if not public.runs_venue(e.venue_id) then
    raise exception 'only the admin or the room' using errcode = '42501';
  end if;
  delete from public.events where id = p_id;
  perform public.staff_note('delete', 'night', e.slug, e.title);
end;
$$;

-- As 76, and a community manager lets through or turns down only nights at a room they run.
create or replace function public.staff_review(p_id uuid, p_ok boolean, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.events%rowtype;
begin
  perform public.need_staff();
  select * into e from public.events where id = p_id and review = 'pending';
  if e.id is null then raise exception 'nothing waiting with that id'; end if;
  if not public.runs_venue(e.venue_id) then raise exception 'not your room' using errcode = '42501'; end if;
  if p_ok then
    update public.events set review = null, review_note = null, is_published = true, updated_at = now() where id = p_id;
  else
    update public.events set review = 'rejected', review_note = left(nullif(btrim(p_note), ''), 300), is_published = false, updated_at = now() where id = p_id;
  end if;
  perform public.notice(e.created_by, case when p_ok then 'night_ok' else 'night_no' end,
                        jsonb_build_object('title', e.title, 'slug', e.slug,
                                           'note', coalesce(left(nullif(btrim(p_note), ''), 300), '')));
  perform public.staff_note(case when p_ok then 'approve' else 'reject' end, 'night', e.slug, e.title);
end;
$$;

-- ------------------------------------------------------------ the room speaks

create or replace function public.venue_push(p_venue uuid, p_line text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.venues%rowtype;
  line text := btrim(coalesce(p_line, ''));
  me uuid := public.assert_member();
  n int := 0;
  who uuid;
begin
  perform public.need_venue(p_venue);
  select * into v from public.venues where id = p_venue;
  if length(line) not between 3 and 140 then raise exception 'the line: 3 to 140 characters'; end if;
  -- invisible characters could hide a link inside a word, so they are refused too
  if line ~ '[\u00AD\u034F\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFE00-\uFE0F\uFEFF]' then
    raise exception 'the line: no invisible characters' using errcode = '22023';
  end if;
  -- a link: a scheme, www, an address of four numbers, or a word, a dot (also the look-alike
  -- ones) and two letters in any script. A name like st.pauli is caught too; st. pauli with
  -- a space is not, nor a time like 23.30.
  if line ~* '(https?:|www[.。．｡․﹒։]|[0-9]+[.][0-9]+[.][0-9]+[.][0-9]+|[^[:space:][:punct:]][.。．｡․﹒։][^[:space:][:punct:][:digit:]]{2,})' then
    raise exception 'the line: no links' using errcode = '22023';
  end if;
  if public.watch_hit(line) is not null then
    raise exception 'the line: a word on the watch list' using errcode = '22023';
  end if;
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
    where u <> me
      and public.reachable(me, u)
      and public.push_wants(u, 'venue')
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

-- ------------------------------------------------------------ reports

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
             where r.kind = p_kind and r.target = p_target and not r.handled and r.reporter_id is not null loop
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

-- ------------------------------------------------------------ your people

create or replace function public.people_map()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with me as (select case when auth.uid() is null then null else public.assert_member() end as id),
  f as (
    select requester_id as a, addressee_id as b from public.friendships where status = 'accepted'
    union all
    select addressee_id, requester_id from public.friendships where status = 'accepted'
  ),
  open_to as (
    select p.id from public.profiles p
    left join public.profile_settings s on s.user_id = p.id
    where coalesce(s.discoverable, true)
  ),
  hop1 as (
    select distinct f.b as id from f, me
    where f.a = me.id and not public.hidden_by_block(f.b)
  ),
  hop2 as (
    select f.b as id, count(*) as c
    from f join hop1 on f.a = hop1.id, me
    where f.b <> me.id
      and f.b not in (select id from hop1)
      and f.b in (select id from open_to)
      and not public.hidden_by_block(f.b)
    group by f.b
    order by count(*) desc, f.b
    limit 80
  ),
  hop3 as (
    select f.b as id, count(*) as c
    from f join hop2 on f.a = hop2.id, me
    where f.b <> me.id
      and f.b not in (select id from hop1)
      and f.b not in (select id from hop2)
      and f.b in (select id from open_to)
      and not public.hidden_by_block(f.b)
    group by f.b
    order by count(*) desc, f.b
    limit 120
  ),
  everyone as (
    select me.id, 0 as w from me where me.id is not null
    union all select id, 1 from hop1
    union all select id, 2 from hop2
    union all select id, 3 from hop3
  ),
  named as (
    select e.id, e.w,
           case when e.w = 0 then 'me'
                when e.w = 1 then e.id::text
                else 'x' || substr(md5((select id from me)::text || e.id::text), 1, 12) end as code
    from everyone e
  ),
  lines as (
    select distinct least(x.code, y.code) as a, greatest(x.code, y.code) as b,
           greatest(x.w, y.w) as deep
    from f
    join named x on x.id = f.a
    join named y on y.id = f.b
    where x.code < y.code
    order by deep, a, b
    limit 2000
  )
  select case when (select id from me) is null then jsonb_build_object('nodes', '[]'::jsonb, 'edges', '[]'::jsonb)
  else jsonb_build_object(
    'nodes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', n.code,
               'w', n.w,
               'h', case when n.w = 1 then p.handle end,
               'n', case when n.w = 1 then p.display_name end,
               'c', c.slug,
               'cn', c.name)
             order by n.w)
      from named n
      left join public.profiles p on p.id = n.id
      left join public.cities c on c.id = p.city_id), '[]'::jsonb),
    'edges', coalesce((select jsonb_agg(jsonb_build_array(l.a, l.b)) from lines l), '[]'::jsonb))
  end;
$$;

revoke execute on function public.people_map() from public, anon;
grant execute on function public.people_map() to authenticated;

create or replace function public.people_places()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with me as (select case when auth.uid() is null then null else public.assert_member() end as id),
  f as (
    select requester_id as a, addressee_id as b from public.friendships where status = 'accepted'
    union all
    select addressee_id, requester_id from public.friendships where status = 'accepted'
  ),
  open_to as (
    select p.id from public.profiles p
    left join public.profile_settings s on s.user_id = p.id
    where coalesce(s.discoverable, true)
  ),
  hop1 as (
    select distinct f.b as id from f, me
    where f.a = me.id and not public.hidden_by_block(f.b)
  ),
  hop2 as (
    select f.b as id
    from f join hop1 on f.a = hop1.id, me
    where f.b <> me.id
      and f.b not in (select id from hop1)
      and f.b in (select id from open_to)
      and not public.hidden_by_block(f.b)
    group by f.b
    order by count(*) desc, f.b
    limit 400
  ),
  hop3 as (
    select f.b as id
    from f join hop2 on f.a = hop2.id, me
    where f.b <> me.id
      and f.b not in (select id from hop1)
      and f.b not in (select id from hop2)
      and f.b in (select id from open_to)
      and not public.hidden_by_block(f.b)
    group by f.b
    order by count(*) desc, f.b
    limit 800
  ),
  everyone as (
    select h.id, 1 as w from hop1 h
    union all select id, 2 from hop2
    union all select id, 3 from hop3
  ),
  homes as (
    select e.id, e.w, p.handle, p.display_name, p.city_id
    from everyone e join public.profiles p on p.id = e.id
    where p.city_id is not null
  ),
  centre as (
    select ev.city_id,
           percentile_cont(0.5) within group (order by ev.lat) as lat,
           percentile_cont(0.5) within group (order by ev.lng) as lng
    from public.events ev
    where ev.lat is not null and ev.lng is not null
      and ev.city_id in (select city_id from homes)
    group by ev.city_id
  ),
  placed as (
    select h.*, c.slug, c.name as city_name, ce.lat, ce.lng
    from homes h
    join public.cities c on c.id = h.city_id
    join centre ce on ce.city_id = h.city_id
  )
  select case when (select id from me) is null then jsonb_build_object('friends', '[]'::jsonb, 'crowd', '[]'::jsonb)
  else jsonb_build_object(
    'friends', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'h', p.handle, 'n', p.display_name, 'city', p.slug, 'name', p.city_name, 'lat', p.lat, 'lng', p.lng) order by p.slug, p.handle)
      from placed p where p.w = 1), '[]'::jsonb),
    'crowd', coalesce((
      select jsonb_agg(jsonb_build_object('w', x.w, 'city', x.slug, 'name', x.city_name, 'lat', x.lat, 'lng', x.lng, 'n', x.n) order by x.w, x.n desc)
      from (select w, slug, city_name, lat, lng, count(*) as n from placed where w >= 2 group by w, slug, city_name, lat, lng) x), '[]'::jsonb))
  end;
$$;

revoke execute on function public.people_places() from public, anon;
grant execute on function public.people_places() to authenticated;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('110_venue_scope.sql', '28aa02aed2756853d2905d6adcc62ddfe22d6da4b883fadbe5cf33512d839257');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('110_venue_scope.sql');
  end if;
end $$;
