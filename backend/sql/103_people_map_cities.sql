-- afterhours — your people map knows the city each person set (103)
--
-- The map of your people (101) gets two filters on top: how far away (friends, the
-- second wave, the third) and which city. For the second one every node now carries
-- the city its person set on their profile: c (the slug) and cn (the name). In the
-- crowd that is still all there is: a code and a city, never a name. The function is
-- otherwise the one of 101: the same people, the same limits, the same lines.
--
--   people_map()   jsonb { nodes: [{ id, w, h, n, c, cn }], edges: [[a, b], ...] }

create or replace function public.people_map()
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

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('103_people_map_cities.sql', '1252401c2124b3e12beedea450b6b3e256fdca3d9d611a0a8d4a5c5cdbc68d68');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('103_people_map_cities.sql');
  end if;
end $$;
