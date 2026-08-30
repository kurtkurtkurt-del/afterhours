-- afterhours — the views and functions the front end uses
-- Keep the query logic here; the JS in the browser should only call it.

-- security_invoker: the view runs with the rights of whoever calls it.
-- Without it the view steps around RLS and unpublished events leak.

-- ------------------------------------------------- event (readable form)

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
  v.name  as venue_name
from public.events e
join public.event_types t on t.id = e.type_id
join public.cities      c on c.id = e.city_id
left join public.venues v on v.id = e.venue_id;

-- ------------------------------------------------------------ comments

create or replace view public.comments_public
with (security_invoker = true) as
select
  c.id,
  c.event_id,
  c.parent_id,
  c.body,
  c.time_text,
  c.created_at,
  coalesce(p.handle, p.display_name, c.author_name) as author,
  c.author_id is not null as is_real
from public.comments c
left join public.profiles p on p.id = c.author_id
where not c.is_hidden;

-- ---------------------------------------------------------------- deck

-- The deck in explore. Signed in, the cards already swiped drop out;
-- anonymous gets all 36. Ordered by poster number (the order used today).
-- create or replace is not enough when the return type changes; drop first.
drop function if exists public.deck(text, text, int);
create or replace function public.deck(
  p_city text default 'munchen',
  p_type text default null,
  p_limit int  default 60
)
returns setof public.events_public
language sql
stable
-- security definer: anonymous has no rights on the swipes table at all, but
-- the deck has to look there to ask "was this already swiped". The function
-- runs with the rights of its owner, so the published filter and the user
-- filter are written out BY HAND below to stop anything leaking.
security definer
set search_path = public
as $$
  select e.*
  from public.events_public e
  where e.is_published
    and e.city_slug = p_city
    and (p_type is null or e.type_slug = p_type)
    and not exists (
      select 1 from public.swipes s
      where s.event_id = e.id and s.user_id = auth.uid()
    )
  order by e.poster_no
  limit p_limit;
$$;

-- -------------------------------------------------------- writing a swipe

-- The browser should not need to know the event id: the slug is enough.
-- This is what lets the swipes collected while signed out be carried to
-- the account before the deck loads. user_id still comes from the session.
create or replace function public.swipe_set(p_slug text, p_direction text)
returns void
language sql
as $$
  insert into public.swipes (event_id, direction)
  select e.id, p_direction from public.events e where e.slug = p_slug
  on conflict (user_id, event_id)
  do update set direction = excluded.direction, created_at = now();
$$;

-- Reset my deck: every swipe of mine goes and the cards come back.
-- It only touches your own rows; RLS already forces that, but it is
-- written here too so the intent is visible.
create or replace function public.swipes_reset()
returns integer
language sql
as $$
  with silinen as (
    delete from public.swipes where user_id = auth.uid() returning 1
  )
  select count(*)::int from silinen;
$$;

-- --------------------------------------------------------- kept cards

-- "kept tonight": the ones you threw right, newest first.
-- It returns flat rows, not a composite type: composite types serialise
-- differently from version to version in REST; flat columns are the same everywhere.
-- create or replace is not enough when the return type changes; drop first.
drop function if exists public.kept();
create or replace function public.kept()
returns setof public.events_public
language sql
stable
as $$
  select e.*
  from public.swipes s
  join public.events_public e on e.id = s.event_id
  where s.user_id = auth.uid() and s.direction = 'right'
  order by s.created_at desc;
$$;

-- ------------------------------------------------- what your friends kept

-- What feeds the "friends liked swipes" mode. Confirmed friends only,
-- right swipes only; RLS already forces it, this makes the intent visible.
-- create or replace is not enough when the return type changes; drop first.
drop function if exists public.friends_kept(int);
create or replace function public.friends_kept(p_limit int default 60)
returns table (
  friend      text,
  kept_at     timestamptz,
  id          uuid,
  slug        text,
  title       text,
  meta        text,
  body        text,
  poster_no   int,
  type_name   text,
  venue_name  text,
  city_slug   text,
  starts_at   timestamptz
)
language sql
stable
as $$
  select coalesce(p.handle, p.display_name, 'a friend'), s.created_at,
         e.id, e.slug, e.title, e.meta, e.body, e.poster_no,
         e.type_name, e.venue_name, e.city_slug, e.starts_at
  from public.swipes s
  join public.events_public e on e.id = s.event_id
  join public.profiles p on p.id = s.user_id
  where s.direction = 'right'
    and s.user_id <> auth.uid()
    and public.is_friend(s.user_id)
  order by s.created_at desc
  limit p_limit;
$$;

-- --------------------------------------------------------- counters

-- Where the line on the landing page — "36 nights in Munich this week ·
-- 7 Rave · ..." — comes from. Today it is counted in JS; the same number
-- can come from here.
-- create or replace is not enough when the return type changes; drop first.
drop function if exists public.event_counts(text);
create or replace function public.event_counts(p_city text default 'munchen')
returns table (type_slug text, type_name text, sort_order int, n bigint)
language sql
stable
as $$
  select e.type_slug, e.type_name, e.type_sort_order, count(*)
  from public.events_public e
  where e.is_published and e.city_slug = p_city
  group by e.type_slug, e.type_name, e.type_sort_order
  order by e.type_sort_order;
$$;

-- How many people have kept an event. Who kept it stays hidden:
-- security definer hands out the COUNT and nothing else.
-- create or replace is not enough when the return type changes; drop first.
drop function if exists public.keep_counts();
create or replace function public.keep_counts()
returns table (event_id uuid, n bigint)
language sql
stable
security definer
set search_path = public
as $$
  select s.event_id, count(*)
  from public.swipes s
  where s.direction = 'right'
  group by s.event_id;
$$;

-- The city list for the filter: every city and how many nights it has.
-- create or replace is not enough when the return type changes; drop first.
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
         count(e.id) filter (where e.is_published)
  from public.cities c
  left join public.events e on e.city_id = c.id
  group by c.slug, c.name, c.status, c.sort_order, c.country, c.country_slug,
           c.continent, c.continent_slug
  order by c.sort_order;
$$;

grant execute on function public.city_counts()         to anon, authenticated;
grant execute on function public.deck(text, text, int)  to anon, authenticated;
grant execute on function public.swipe_set(text, text)  to authenticated;
grant execute on function public.swipes_reset()         to authenticated;
grant execute on function public.kept()                 to authenticated;
grant execute on function public.friends_kept(int)      to authenticated;
grant execute on function public.event_counts(text)     to anon, authenticated;
grant execute on function public.keep_counts()          to anon, authenticated;

grant select on public.events_public, public.comments_public to anon, authenticated;
