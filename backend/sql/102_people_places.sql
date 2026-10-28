-- afterhours — where your people are, for the friends view on the map (102)
--
-- The map tab has a "friends view": your friends as faces in the city they set on their
-- profile, and the waves beyond them as counts per city. Cities have no coordinates of
-- their own; a city sits at the middle (the median) of its nights with a place, as the
-- app has done for its own city since the start.
--
-- What leaves the database:
--   friends   confirmed friends who set a city: id, handle, name, the city
--   crowd     per city and per wave (2: friends of friends, 3: one step further): how
--             many people live there; never who
--
-- The same people are left out as on the people map (101): anyone on either side of a
-- block with you, and in the waves anyone who turned "findable" off. At most 400 people
-- in the second wave and 800 in the third are counted.
--
--   people_places()   jsonb { friends: [{ id, h, n, city, name, lat, lng }],
--                             crowd:   [{ w, city, name, lat, lng, n }] }

create or replace function public.people_places()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with me as (select auth.uid() as id),
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
    perform public.migration_done('102_people_places.sql', '46cadc12f1eae4a8bd41b7188f0bf3704634891ead99a563ab3b42052b79589e');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('102_people_places.sql');
  end if;
end $$;
