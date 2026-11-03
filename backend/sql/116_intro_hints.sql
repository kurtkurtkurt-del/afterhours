-- afterhours — ask for an intro: what the circle around someone already shows (116)
--
-- On the map of your people (101) a blurred person in the crowd can be asked about:
-- "ask bob for an intro". The ask now opens with who this person is to you, and shows
-- a few small things that are true about them, drawn only from what you can already
-- see on the pages of your own friends:
--
--   steps     2 (a friend of a friend) or 3 (one step further), as on the map
--   ties      how many of your friends (step 2), or of the people one step before them
--             on the map (step 3), are their confirmed friends; the map draws the same
--   via       your friends on the way to them: at step 2 your friends who know them,
--             at step 3 your friends who know someone on the map who knows them. Handle
--             and name; you know these people already. At most five, most connected first.
--   city      the city they set, as on the map since 103; same_city when it is yours
--   kinds     the kinds of nights the friends in via keep, over the last 180 days,
--             counted only over friends whose kept nights are open to you (105)
--   rooms     the two rooms those same friends keep nights at most
--   shared    the nights you kept that one of those friends kept too, the three latest,
--             with shared_n for how many in all
--
-- Never in it: anything the person kept, checked into or wrote. What someone keeps is
-- for their friends (promise 1) and you are not one yet, so what is shown is the circle
-- around them, never them. Nothing is made up: with nothing to say, the list is empty.
--
-- The crowd, made one place for both (separate eye, 03.11.2026):
--
--   crowd_code(me, them)  The code of 101 was md5 of the two ids, and both ids can be
--                         known: people_search gives out the id of a handle, so anyone
--                         could make the code of a handle and find that person on their
--                         map. The code now mixes in a secret that never leaves the
--                         database (crowd_secret, one row, closed). Every code changes
--                         once, on the day this file runs; the app reads the map again.
--   crowd_drawn(me)       The people of the crowd exactly as the map draws them: the same
--                         steps, the same limits (80 and 120, most connected first), and
--                         now without closed accounts (a banned person was still drawn).
--                         people_map and intro_hints both read it, so a code answers only
--                         for someone who is on your map, at the step the map shows.
--   people_map()          as 110, its crowd from crowd_drawn.
--
--   intro_hints(code, lines)   jsonb, or null when the code is nobody on your map.
--                              Behind assert_member(), at most 60 an hour (read_rate, 107).
--                              lines true also counts against a ceiling of 12 an hour:
--                              the intro-lines edge function asks that way before it calls
--                              the model, so every member has a bound on what the model costs.

-- ------------------------------------------------------------ the code

create table if not exists public.crowd_secret (k text not null);
alter table public.crowd_secret enable row level security;
revoke all on public.crowd_secret from public, anon, authenticated;
insert into public.crowd_secret (k)
select replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
where not exists (select 1 from public.crowd_secret);

create or replace function public.crowd_code(p_me uuid, p_them uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select 'x' || substr(md5((select k from public.crowd_secret limit 1) || p_me::text || p_them::text), 1, 12);
$$;
revoke execute on function public.crowd_code(uuid, uuid) from public, anon, authenticated;

-- ------------------------------------------------------------ the crowd

create or replace function public.crowd_drawn(p_me uuid)
returns table (id uuid, w int, code text)
language sql
stable
security definer
set search_path = public
as $$
  with f as (
    select requester_id as a, addressee_id as b from public.friendships where status = 'accepted'
    union all
    select addressee_id, requester_id from public.friendships where status = 'accepted'
  ),
  open_to as (
    select p.id from public.profiles p
    left join public.profile_settings s on s.user_id = p.id
    where coalesce(s.discoverable, true) and not public.is_banned(p.id)
  ),
  -- blocks are read for the caller, so the crowd is only ever that of the caller
  hop1 as (
    select distinct f.b as id from f
    where f.a = p_me and p_me = auth.uid() and not public.hidden_by_block(f.b)
  ),
  hop2 as (
    select f.b as id
    from f join hop1 on f.a = hop1.id
    where f.b <> p_me
      and f.b not in (select id from hop1)
      and f.b in (select id from open_to)
      and not public.hidden_by_block(f.b)
    group by f.b
    order by count(*) desc, f.b
    limit 80
  ),
  hop3 as (
    select f.b as id
    from f join hop2 on f.a = hop2.id
    where f.b <> p_me
      and f.b not in (select id from hop1)
      and f.b not in (select id from hop2)
      and f.b in (select id from open_to)
      and not public.hidden_by_block(f.b)
    group by f.b
    order by count(*) desc, f.b
    limit 120
  )
  select id, 2, public.crowd_code(p_me, id) from hop2
  union all
  select id, 3, public.crowd_code(p_me, id) from hop3;
$$;
revoke execute on function public.crowd_drawn(uuid) from public, anon, authenticated;

-- ------------------------------------------------------------ the map

-- as 110, the crowd from crowd_drawn
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
  hop1 as (
    select distinct f.b as id from f, me
    where f.a = me.id and not public.hidden_by_block(f.b)
  ),
  named as (
    select me.id, 0 as w, 'me' as code from me where me.id is not null
    union all select h.id, 1, h.id::text from hop1 h
    union all select c.id, c.w, c.code from me, public.crowd_drawn(me.id) c where me.id is not null
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

-- ------------------------------------------------------------ the hints

create or replace function public.intro_hints(p_code text, p_lines boolean default false)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me        uuid := public.assert_member();
  hop1      uuid[];
  hop2      uuid[];
  who       uuid;
  steps     int;
  near      uuid[];
  via       uuid[];
  open_via  uuid[];
begin
  if p_code is null or p_code !~ '^x[0-9a-f]{12}$' then return null; end if;
  perform public.read_rate('intro_hints', 60);
  if p_lines then perform public.read_rate('intro_lines', 12); end if;

  -- only someone the map draws for you, at the step it draws them
  select c.id, c.w into who, steps from public.crowd_drawn(me) c where c.code = p_code limit 1;
  if who is null then return null; end if;

  hop1 := array(select distinct x from public.friends_of(me) x where not public.hidden_by_block(x));
  if steps = 2 then
    near := array(select x from unnest(hop1) x where x in (select public.friends_of(who)));
    via := near;
  else
    hop2 := array(select c.id from public.crowd_drawn(me) c where c.w = 2);
    near := array(select x from unnest(hop2) x where x in (select public.friends_of(who)));
    via := array(
      select h from unnest(hop1) h
      where exists (select 1 from public.friends_of(h) y where y = any(near))
      order by (select count(*) from public.friends_of(h) y where y = any(near)) desc, h);
  end if;
  open_via := array(select v from unnest(via) v where public.kept_open_to_me(v));

  return jsonb_build_object(
    'steps', steps,
    'ties', cardinality(near),
    'via', coalesce((
      select jsonb_agg(jsonb_build_object('h', p.handle, 'n', p.display_name) order by o.i)
      from unnest(via) with ordinality o(id, i)
      join public.profiles p on p.id = o.id
      where p.handle is not null and o.i <= 5), '[]'::jsonb),
    'city', (select c.name from public.profiles p join public.cities c on c.id = p.city_id where p.id = who),
    'same_city', coalesce((
      select p.city_id is not null and p.city_id = m.city_id
      from public.profiles p, public.profiles m where p.id = who and m.id = me), false),
    'kinds', coalesce((
      select jsonb_agg(jsonb_build_object('k', k.slug, 'n', k.n) order by k.n desc, k.slug)
      from (select t.slug, count(*)::int as n
            from public.swipes s
            join public.events e on e.id = s.event_id
            join public.event_types t on t.id = e.type_id
            where s.user_id = any(open_via) and s.direction = 'right'
              and s.created_at > now() - interval '180 days'
              and public.night_shown(e)
            group by t.slug
            order by count(*) desc, t.slug
            limit 3) k), '[]'::jsonb),
    'rooms', coalesce((
      select jsonb_agg(r.name order by r.n desc, r.name)
      from (select v.name, count(*) as n
            from public.swipes s
            join public.events e on e.id = s.event_id
            join public.venues v on v.id = e.venue_id
            where s.user_id = any(open_via) and s.direction = 'right'
              and s.created_at > now() - interval '180 days'
              and public.night_shown(e)
            group by v.name
            order by count(*) desc, v.name
            limit 2) r), '[]'::jsonb),
    'shared', coalesce((
      select jsonb_agg(jsonb_build_object('t', x.title, 's', x.slug) order by x.at desc)
      from (select e.title, e.slug, s.created_at as at
            from public.swipes s
            join public.events e on e.id = s.event_id
            where s.user_id = me and s.direction = 'right'
              and public.night_shown(e)
              and exists (select 1 from public.swipes o
                          where o.event_id = s.event_id and o.direction = 'right' and o.user_id = any(open_via))
            order by s.created_at desc
            limit 3) x), '[]'::jsonb),
    'shared_n', (
      select count(*)::int
      from public.swipes s
      join public.events e on e.id = s.event_id
      where s.user_id = me and s.direction = 'right'
        and public.night_shown(e)
        and exists (select 1 from public.swipes o
                    where o.event_id = s.event_id and o.direction = 'right' and o.user_id = any(open_via))));
end;
$$;
revoke execute on function public.intro_hints(text, boolean) from public, anon;
grant execute on function public.intro_hints(text, boolean) to authenticated;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('116_intro_hints.sql', '8a247ad874a77772e7bf4fe6a24e3e4bc8c0fa10d66c445aeb74980a50feebf7');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('116_intro_hints.sql');
  end if;
end $$;
