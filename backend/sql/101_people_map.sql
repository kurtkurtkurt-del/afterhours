-- afterhours — your people as a map: you, your friends, and the crowd around them (101)
--
-- Messages opens with "your people": a map with you in the middle, your friends
-- around you, and their friends and one step further as a blurred crowd. The app
-- groups the crowd into islands (circles of friends who know each other) and draws
-- at most a few lines from each person, so the map stays readable.
--
-- What leaves the database:
--   you          your own node (id "me")
--   friends      confirmed friends, with handle and name (you know them already)
--   the crowd    friends of friends (2) and one step further (3), as codes only:
--                "x" and twelve hex letters, made from your id and theirs, so the
--                same person is the same code for you and nobody can turn it back
--                into a person; no handle, no name, no photo
--   lines        who is a confirmed friend of whom, between the people above
--
-- Never on the map: anyone on either side of a block with you, and in the crowd
-- anyone who turned "findable" off (12). At most 80 people in the second step
-- (the most connected first) and 120 in the third, 2000 lines in all.
--
--   people_map()   jsonb { nodes: [{ id, w, h, n }], edges: [[a, b], ...] }

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
               'n', case when n.w = 1 then p.display_name end)
             order by n.w)
      from named n left join public.profiles p on p.id = n.id), '[]'::jsonb),
    'edges', coalesce((select jsonb_agg(jsonb_build_array(l.a, l.b)) from lines l), '[]'::jsonb))
  end;
$$;

revoke execute on function public.people_map() from public, anon;
grant execute on function public.people_map() to authenticated;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('101_people_map.sql', '83946b4f5258a331715626b424f85581d37352ccd75b7a64cfd165b72b35d45b');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('101_people_map.sql');
  end if;
end $$;
