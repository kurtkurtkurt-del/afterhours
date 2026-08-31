-- ============================================================
--  afterhours — SETUP 1 / 2 : THE STRUCTURE
--  VERSION: 2026-08-31 12:31   ← if the editor shows this line, it is the right copy
--
--  In the Supabase panel: SQL Editor → New query → paste this file
--  IN FULL → Run.
--
--  When it finishes you should see "Success. No rows returned".
--  Then run setup-2-comments.sql the same way.
--
--  GENERATED FILE — source: backend/tools/build-setup.mjs
-- ============================================================


-- ============================================================
--  THE MIGRATION LOG — which files have been run   (00_migrations.sql)
-- ============================================================

-- afterhours — which of these files has actually been run
-- The setup is pasted into the Supabase editor by hand, so a project can
-- easily be a file or two behind without anything looking wrong: a page
-- just answers PGRST202 because the function it wants was never created.
-- This table is the record. Every numbered file stamps its own name at
-- the end, so the answer to "what is live" stops being a memory.
--
-- It has to come first. Everything after it writes into it.

create table if not exists public.migrations (
  name        text primary key,
  applied_at  timestamptz not null default now()
);

alter table public.migrations enable row level security;

-- RLS is on with no policy yet, so the table is closed to every browser
-- until 02_rls.sql opens it to the admin. is_admin() does not exist this
-- early, which is why the policy lives there and not here. Nothing writes
-- to this table from a browser in any case: the stamps come from the SQL
-- editor, which is above RLS.

-- The list itself is only filenames and dates, so the health check may
-- read it with the public key. Nothing about the content leaks through it.
-- create or replace is not enough when the return type changes; drop first.
drop function if exists public.migrations_applied();
create or replace function public.migrations_applied()
returns table (name text, applied_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select m.name, m.applied_at from public.migrations m order by m.name;
$$;

grant execute on function public.migrations_applied() to anon, authenticated;

-- Used by every file below to stamp itself.
create or replace function public.migration_done(p_name text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.migrations (name) values (p_name)
  on conflict (name) do update set applied_at = now();
$$;

-- The stamps come from the SQL editor, which runs as the table owner.
-- Postgres hands EXECUTE on a new function to everyone by default, and
-- through the API that would let any visitor forge the log — including
-- stamping a file as applied that never ran, which is exactly the lie
-- the health check exists to catch.
revoke execute on function public.migration_done(text) from public, anon, authenticated;

select public.migration_done('00_migrations.sql');


-- ============================================================
--  TABLES   (01_schema.sql)
-- ============================================================

-- afterhours — the tables
-- Run them in order in the Supabase SQL editor: 01 → 02 → 03 → ...
-- Authentication comes from the auth schema Supabase provides; what is
-- here is only the public schema that hangs off it.

-- gen_random_uuid() has been core since Postgres 13; no extension needed.

-- The two ordering columns were called `sira` before the code moved to
-- English. On a fresh database this does nothing; on one that already
-- exists it renames them, so the rest of this file lines up either way.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'cities'
               and column_name = 'sira') then
    alter table public.cities rename column sira to sort_order;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'event_types'
               and column_name = 'sira') then
    alter table public.event_types rename column sira to sort_order;
  end if;
end
$$;

-- ---------------------------------------------------------------- city

create table if not exists public.cities (
  id      uuid primary key default gen_random_uuid(),
  slug    text unique not null,
  name    text not null,
  -- the honest city list on the landing page: live / soon / planned
  status  text not null default 'live' check (status in ('live', 'soon', 'planned')),
  sort_order    int  not null default 0,
  -- The filter picks a country first, then the cities in that country;
  -- and the countries themselves are grouped by continent
  country         text,
  country_slug    text,
  continent       text,
  continent_slug  text
);

create index if not exists cities_country_idx on public.cities (country_slug, sort_order);

-- ----------------------------------------------------------------- kind

create table if not exists public.event_types (
  id    uuid primary key default gen_random_uuid(),
  slug  text unique not null,
  name  text not null,
  -- the order from the spec itself: rave, club night, konzert, festival, meetup, hausparty
  sort_order  int  not null
);

-- ---------------------------------------------------------------- venue

create table if not exists public.venues (
  id          uuid primary key default gen_random_uuid(),
  city_id     uuid not null references public.cities on delete restrict,
  slug        text not null,
  name        text not null,
  -- for the globe and the map; the "rooms open" counter uses the hours
  map_x       int,
  map_y       int,
  opens_hour  numeric(4,1),
  open_hours  numeric(4,1),
  unique (city_id, slug)
);

-- ---------------------------------------------------------------- event

create table if not exists public.events (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  city_id       uuid not null references public.cities on delete restrict,
  type_id       uuid not null references public.event_types on delete restrict,
  venue_id      uuid references public.venues on delete set null,

  title         text not null,
  -- the line shown on screen word for word. This is the source; do not break it.
  meta          text not null,
  body          text not null default '',

  poster_no     int check (poster_no > 0),
  -- when set, the file in storage; when empty, posters/NN.svg is used
  poster_path   text,

  -- The data holds non-dates like "Sommer 2027", "Mittwochs" and "TBA",
  -- so this can be empty. meta is always right.
  starts_at     timestamptz,
  date_text     text,
  -- Most dates in the data carry no year ("05.09"). The year was filled in
  -- by inference; this flag means "not verified". It shows as a warning in
  -- the admin panel. Since meta is always right, the screen is unaffected.
  starts_at_estimated boolean not null default false,

  is_published  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists events_city_idx    on public.events (city_id);
create index if not exists events_type_idx    on public.events (type_id);
create index if not exists events_starts_idx  on public.events (starts_at);
create index if not exists events_published_idx on public.events (is_published);

-- ---------------------------------------------------------------- people

-- auth.users stays private (the email lives there); this is the public part.
create table if not exists public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  handle        text unique,
  display_name  text,
  -- the right to write events comes from here. True for Ahmet only.
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now()
);

-- --------------------------------------------------------------- swipes

-- Kept cards are not a separate table: they are the swipes going right.
create table if not exists public.swipes (
  id          uuid primary key default gen_random_uuid(),
  -- Defaults to the person in the session: the browser never sends
  -- never sends it, so it cannot be faked.
  user_id     uuid not null default auth.uid() references public.profiles on delete cascade,
  event_id    uuid not null references public.events on delete cascade,
  direction   text not null check (direction in ('left', 'right')),
  created_at  timestamptz not null default now(),
  unique (user_id, event_id)
);

create index if not exists swipes_event_idx on public.swipes (event_id);
create index if not exists swipes_user_dir_idx on public.swipes (user_id, direction);

-- ----------------------------------------------------------- beforehours

-- One table, two levels: empty parent_id means a topic, a set one a reply.
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events on delete cascade,
  parent_id   uuid references public.comments on delete cascade,
  author_id   uuid default auth.uid() references public.profiles on delete set null,
  -- for the sample comments that have no real user behind them
  author_name text,
  body        text not null check (length(btrim(body)) > 0),
  is_hidden   boolean not null default false,
  created_at  timestamptz not null default now(),
  -- The time text shown for sample comments ("4 days ago", "Nov 2023").
  -- Empty on real comments; then it is worked out from created_at.
  time_text   text,
  constraint comments_author_var check (author_id is not null or author_name is not null)
);

-- The inline check above only says "not empty"; a ceiling matters just as
-- much, or one signed-in account can store megabytes per row. Named and
-- added separately so a database built before this line gets it too.
alter table public.comments
  drop constraint if exists comments_body_length;
alter table public.comments
  add constraint comments_body_length
  check (length(btrim(body)) between 1 and 2000);

create index if not exists comments_event_idx on public.comments (event_id, created_at);
create index if not exists comments_parent_idx on public.comments (parent_id);

-- There is no third level (the screen shows two) and a reply has to
-- belong to the same event as its topic.
-- security definer, because the SELECT below otherwise runs under the
-- caller’s read rule: a HIDDEN parent came back as no row at all, both
-- checks passed on NULL, and a reply could land on a hidden reply (a
-- third level) or carry the wrong event. The check has to see every
-- parent to mean anything.
create or replace function public.comments_check_depth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent public.comments%rowtype;
begin
  if new.parent_id is null then
    return new;
  end if;

  select * into parent from public.comments where id = new.parent_id;

  if parent.parent_id is not null then
    raise exception 'a reply cannot be replied to (two levels only)';
  end if;

  if parent.event_id <> new.event_id then
    raise exception 'a reply must belong to the same event as its topic';
  end if;

  return new;
end;
$$;

drop trigger if exists comments_depth on public.comments;
create trigger comments_depth
  before insert or update on public.comments
  for each row execute function public.comments_check_depth();

-- ------------------------------------------------------------ friendship

create table if not exists public.friendships (
  requester_id  uuid not null default auth.uid() references public.profiles on delete cascade,
  addressee_id  uuid not null references public.profiles on delete cascade,
  status        text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at    timestamptz not null default now(),
  primary key (requester_id, addressee_id),
  constraint friendship_not_self check (requester_id <> addressee_id)
);

create index if not exists friendships_addressee_idx on public.friendships (addressee_id, status);

-- --------------------------------------------------------- updated_at

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists events_touch on public.events;
create trigger events_touch
  before update on public.events
  for each row execute function public.touch_updated_at();

-- ------------------------------- an automatic profile for a new user

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Stamp the migration log, if it is there. Each numbered file still runs on
-- its own (the tests load them one at a time), so this cannot insist.
do $$ begin
  if to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('01_schema.sql');
  end if;
end $$;


-- ============================================================
--  RULES — the security lives here   (02_rls.sql)
-- ============================================================

-- afterhours — who may read what, and who may write it
-- This file IS the security. Hiding a page is not security; the rule is here.

-- ------------------------------------------------------------- helpers

-- profiles has RLS on it; reading profiles from inside a policy loops for
-- ever. Hence security definer: the function steps around RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

create or replace function public.is_friend(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = auth.uid() and f.addressee_id = other)
        or (f.addressee_id = auth.uid() and f.requester_id = other))
  );
$$;

-- Nobody may make themselves an admin.
create or replace function public.guard_is_admin()
returns trigger
language plpgsql
as $$
begin
  -- An empty auth.uid() means the request came from the service role or the
  -- SQL editor; that is where the first admin is appointed. Anonymous never
  -- gets this far, because profiles_update_own already stops it.
  if new.is_admin is distinct from old.is_admin
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'is_admin can only be changed by an admin';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_admin on public.profiles;
create trigger profiles_guard_admin
  before update on public.profiles
  for each row execute function public.guard_is_admin();

-- ------------------------------------------------------------------ RLS

alter table public.cities       enable row level security;
alter table public.event_types  enable row level security;
alter table public.venues       enable row level security;
alter table public.events       enable row level security;
alter table public.profiles     enable row level security;
alter table public.swipes       enable row level security;
alter table public.comments     enable row level security;
alter table public.friendships  enable row level security;

-- ------------------------------- the catalogue: everyone reads, the admin writes

drop policy if exists cities_read on public.cities;
create policy cities_read on public.cities for select using (true);
drop policy if exists cities_write on public.cities;
create policy cities_write on public.cities for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists types_read on public.event_types;
create policy types_read on public.event_types for select using (true);
drop policy if exists types_write on public.event_types;
create policy types_write on public.event_types for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists venues_read on public.venues;
create policy venues_read on public.venues for select using (true);
drop policy if exists venues_write on public.venues;
create policy venues_write on public.venues for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- event

-- You can look around without signing in: published events are public.
drop policy if exists events_read on public.events;
create policy events_read on public.events for select
  using (is_published or public.is_admin());

drop policy if exists events_write on public.events;
create policy events_write on public.events for all
  using (public.is_admin()) with check (public.is_admin());

-- --------------------------------------------------------------- profile

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (true);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------- swipe

-- Your own swipes + what your confirmed friends swiped RIGHT.
-- What a friend swiped left concerns nobody but them.
drop policy if exists swipes_read on public.swipes;
create policy swipes_read on public.swipes for select
  using (
    user_id = auth.uid()
    or (direction = 'right' and public.is_friend(user_id))
  );

drop policy if exists swipes_insert_own on public.swipes;
create policy swipes_insert_own on public.swipes for insert
  with check (user_id = auth.uid());

drop policy if exists swipes_update_own on public.swipes;
create policy swipes_update_own on public.swipes for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists swipes_delete_own on public.swipes;
create policy swipes_delete_own on public.swipes for delete
  using (user_id = auth.uid());

-- ------------------------------------------------------------ beforehours

drop policy if exists comments_read on public.comments;
create policy comments_read on public.comments for select
  using (not is_hidden or public.is_admin());

-- Writing needs an account, and nobody can write as somebody else.
drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments for insert
  with check (author_id = auth.uid());

drop policy if exists comments_update on public.comments;
create policy comments_update on public.comments for update
  using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());

drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments for delete
  using (author_id = auth.uid() or public.is_admin());

-- Hiding a comment is moderation, and moderation has to stick: the
-- update rule above lets an author edit their own row, and without this
-- guard that included quietly writing is_hidden back to false.
create or replace function public.guard_comment_hidden()
returns trigger
language plpgsql
as $$
begin
  -- An empty auth.uid() is the service role or the SQL editor, same as
  -- in guard_is_admin above.
  if new.is_hidden is distinct from old.is_hidden
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'is_hidden can only be changed by an admin';
  end if;
  return new;
end;
$$;

drop trigger if exists comments_guard_hidden on public.comments;
create trigger comments_guard_hidden
  before update on public.comments
  for each row execute function public.guard_comment_hidden();

-- ------------------------------------------------------------ friendship

drop policy if exists friendships_read on public.friendships;
create policy friendships_read on public.friendships for select
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- A request is born pending. Without the status check here, a row could
-- be INSERTED as ’accepted’ and skip the other side’s consent entirely.
drop policy if exists friendships_insert on public.friendships;
create policy friendships_insert on public.friendships for insert
  with check (requester_id = auth.uid() and status = 'pending');

-- Only the side that RECEIVED the request may change it: that is what
-- accepting is. The requester’s tools are insert and delete — with
-- update too, a requester could flip their own request to ’accepted’
-- and walk into everything a friend may see.
drop policy if exists friendships_update on public.friendships;
create policy friendships_update on public.friendships for update
  using (addressee_id = auth.uid())
  with check (addressee_id = auth.uid());

drop policy if exists friendships_delete on public.friendships;
create policy friendships_delete on public.friendships for delete
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- ------------------------------------------------------- the migration log

-- Only the admin reads the table itself. The public list goes through
-- migrations_applied(), which is security definer and returns nothing but
-- filenames and dates (00_migrations.sql).
-- Guarded the same way as the stamps: 02 has to run on its own too (the
-- test suites load it without 00).
do $$ begin
  if to_regclass('public.migrations') is not null then
    execute 'drop policy if exists migrations_read_admin on public.migrations';
    execute 'create policy migrations_read_admin on public.migrations
               for select using (public.is_admin())';
  end if;
end $$;


-- ------------------------------------------------------------ privileges

grant usage on schema public to anon, authenticated;

grant select on public.cities, public.event_types, public.venues,
                public.events, public.profiles, public.comments to anon, authenticated;

grant insert, update, delete on public.swipes to authenticated;
grant select on public.swipes, public.friendships to authenticated;

-- Comments and friendships accept writes only on the columns the site
-- actually sends. The others either default (author_id, created_at,
-- status) or belong to the seed and the tools, which run as the table
-- owner and are not bound by these grants. Grants pile up, so the old
-- broad ones are taken back first — a database that ran the previous
-- version of this file keeps them otherwise.
revoke insert, update on public.comments from authenticated;
grant delete                                  on public.comments to authenticated;
grant insert (event_id, parent_id, author_id, body) on public.comments to authenticated;
grant update (body, is_hidden)                on public.comments to authenticated;

revoke insert, update on public.friendships from authenticated;
grant delete                                  on public.friendships to authenticated;
grant insert (requester_id, addressee_id)     on public.friendships to authenticated;
grant update (status)                         on public.friendships to authenticated;
grant update on public.profiles to authenticated;
grant insert, update, delete on public.cities, public.event_types,
                                 public.venues, public.events to authenticated;

-- Stamp the migration log, if it is there. Each numbered file still runs on
-- its own (the tests load them one at a time), so this cannot insist.
do $$ begin
  if to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('02_rls.sql');
  end if;
end $$;


-- ============================================================
--  CITIES, TYPES, VENUES   (03_seed_catalog.sql)
-- ============================================================

-- GENERATED FILE - do not edit by hand. Source: backend/tools/build-seed.mjs
-- Cities, types and venues. This first, then 04.

insert into public.cities (slug, name, status, sort_order, country, country_slug) values
  ('munchen', 'münchen', 'live', 1, 'Deutschland', 'de'),
  ('istanbul', 'istanbul', 'live', 2, 'Türkiye', 'tr'),
  ('ankara', 'ankara', 'soon', 3, 'Türkiye', 'tr'),
  ('berlin', 'berlin', 'planned', 4, 'Deutschland', 'de'),
  ('wien', 'wien', 'planned', 5, 'Österreich', 'at'),
  ('koln', 'köln', 'planned', 6, 'Deutschland', 'de'),
  ('hamburg', 'hamburg', 'planned', 7, 'Deutschland', 'de'),
  ('frankfurt', 'frankfurt', 'planned', 8, 'Deutschland', 'de'),
  ('leipzig', 'leipzig', 'planned', 9, 'Deutschland', 'de'),
  ('izmir', 'izmir', 'planned', 10, 'Türkiye', 'tr'),
  ('graz', 'graz', 'planned', 11, 'Österreich', 'at')
on conflict (slug) do nothing;

insert into public.event_types (slug, name, sort_order) values
  ('rave', 'Rave', 1),
  ('club-night', 'Club Night', 2),
  ('konzert', 'Konzert', 3),
  ('festival', 'Festival', 4),
  ('meetup', 'Meetup', 5),
  ('hausparty', 'Hausparty', 6)
on conflict (slug) do nothing;

insert into public.venues (city_id, slug, name, map_x, map_y, opens_hour, open_hours)
select id, 'olympiahalle', 'OLYMPIAHALLE', 512, 236, 18.5, 4
from public.cities where slug = 'munchen'
on conflict (city_id, slug) do nothing;
insert into public.venues (city_id, slug, name, map_x, map_y, opens_hour, open_hours)
select id, 'olympiapark', 'OLYMPIAPARK', 556, 288, 19.5, 4
from public.cities where slug = 'munchen'
on conflict (city_id, slug) do nothing;
insert into public.venues (city_id, slug, name, map_x, map_y, opens_hour, open_hours)
select id, 'zenith', 'ZENITH', 946, 196, 25, 5
from public.cities where slug = 'munchen'
on conflict (city_id, slug) do nothing;
insert into public.venues (city_id, slug, name, map_x, map_y, opens_hour, open_hours)
select id, 'tonhalle', 'TONHALLE', 902, 236, 22, 6
from public.cities where slug = 'munchen'
on conflict (city_id, slug) do nothing;
insert into public.venues (city_id, slug, name, map_x, map_y, opens_hour, open_hours)
select id, 'schwabing', 'SCHWABING', 760, 300, 21, 4
from public.cities where slug = 'munchen'
on conflict (city_id, slug) do nothing;
insert into public.venues (city_id, slug, name, map_x, map_y, opens_hour, open_hours)
select id, 'maxvorstadt', 'MAXVORSTADT', 664, 396, 22.2, 8
from public.cities where slug = 'munchen'
on conflict (city_id, slug) do nothing;
insert into public.venues (city_id, slug, name, map_x, map_y, opens_hour, open_hours)
select id, 'neuhausen', 'NEUHAUSEN', 556, 430, 21.5, 5
from public.cities where slug = 'munchen'
on conflict (city_id, slug) do nothing;
insert into public.venues (city_id, slug, name, map_x, map_y, opens_hour, open_hours)
select id, 'p1', 'P1', 792, 404, 23, 6
from public.cities where slug = 'munchen'
on conflict (city_id, slug) do nothing;
insert into public.venues (city_id, slug, name, map_x, map_y, opens_hour, open_hours)
select id, 'pimpernel', 'PIMPERNEL', 748, 444, 22, 6
from public.cities where slug = 'munchen'
on conflict (city_id, slug) do nothing;
insert into public.venues (city_id, slug, name, map_x, map_y, opens_hour, open_hours)
select id, 'museumsinsel-1', 'MUSEUMSINSEL 1', 828, 478, 24, 7
from public.cities where slug = 'munchen'
on conflict (city_id, slug) do nothing;
insert into public.venues (city_id, slug, name, map_x, map_y, opens_hour, open_hours)
select id, 'haidhausen', 'HAIDHAUSEN', 892, 494, 20, 4
from public.cities where slug = 'munchen'
on conflict (city_id, slug) do nothing;
insert into public.venues (city_id, slug, name, map_x, map_y, opens_hour, open_hours)
select id, 'westend', 'WESTEND', 596, 552, 19, 3
from public.cities where slug = 'munchen'
on conflict (city_id, slug) do nothing;
insert into public.venues (city_id, slug, name, map_x, map_y, opens_hour, open_hours)
select id, 'milla', 'MILLA', 726, 556, 22, 5
from public.cities where slug = 'munchen'
on conflict (city_id, slug) do nothing;
insert into public.venues (city_id, slug, name, map_x, map_y, opens_hour, open_hours)
select id, 'glockenbach', 'GLOCKENBACH', 764, 578, 19, 4
from public.cities where slug = 'munchen'
on conflict (city_id, slug) do nothing;
insert into public.venues (city_id, slug, name, map_x, map_y, opens_hour, open_hours)
select id, 'schlachthof', 'SCHLACHTHOF', 704, 614, 18, 4
from public.cities where slug = 'munchen'
on conflict (city_id, slug) do nothing;
insert into public.venues (city_id, slug, name, map_x, map_y, opens_hour, open_hours)
select id, 'bahnwarter-thiel', 'BAHNWÄRTER THIEL', 668, 662, 21.1, 6
from public.cities where slug = 'munchen'
on conflict (city_id, slug) do nothing;
insert into public.venues (city_id, slug, name, map_x, map_y, opens_hour, open_hours)
select id, 'sunny-red', 'SUNNY RED', 636, 690, 22.6, 6
from public.cities where slug = 'munchen'
on conflict (city_id, slug) do nothing;
insert into public.venues (city_id, slug, name, map_x, map_y, opens_hour, open_hours)
select id, 'alte-utting', 'ALTE UTTING', 700, 706, 18.5, 4
from public.cities where slug = 'munchen'
on conflict (city_id, slug) do nothing;
insert into public.venues (city_id, slug, name, map_x, map_y, opens_hour, open_hours)
select id, 'giesing', 'GIESING', 812, 682, 20, 4
from public.cities where slug = 'munchen'
on conflict (city_id, slug) do nothing;
insert into public.venues (city_id, slug, name, map_x, map_y, opens_hour, open_hours)
select id, 'riem', 'RIEM', 1128, 512, 20, 8
from public.cities where slug = 'munchen'
on conflict (city_id, slug) do nothing;

-- Stamp the migration log, if it is there (00_migrations.sql).
do $$ begin
  if to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('03_seed_catalog.sql');
  end if;
end $$;


-- ============================================================
--  36 EVENTS   (04_seed_events.sql)
-- ============================================================

-- GENERATED FILE - source: events-data.js (36 records)
-- The meta field is the very line shown on screen; it must not be changed.

insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select 'asap-rocky', c.id, t.id, v.id,
       'A$AP Rocky', 'Olympiahalle · 11.09.26 · 18:30', 'An arena show built around one voice. Doors early, everyone seated until they aren''t.', 1,
       '2026-09-11T18:30:00+02:00'::timestamptz, false, '11.09.26 · 18:30'
from public.cities c
join public.event_types t on t.slug = 'konzert'
join public.venues v on v.city_id = c.id and v.slug = 'olympiahalle'
where c.slug = 'munchen'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select 'nick-cave', c.id, t.id, v.id,
       'Nick Cave', 'Olympiapark · 23.08 · open air', 'The Bad Seeds outdoors, at dusk. Quiet enough that you hear the crowd breathing between songs.', 2,
       '2026-08-23T18:00:00.000Z'::timestamptz, true, '23.08 · open air'
from public.cities c
join public.event_types t on t.slug = 'konzert'
join public.venues v on v.city_id = c.id and v.slug = 'olympiapark'
where c.slug = 'munchen'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select 'bonez-mc-raf-camora', c.id, t.id, v.id,
       'Bonez MC & RAF Camora', 'Olympiahalle · 21.12.26 · 20:00', 'Palmen aus Plastik, ten years on. A December hall show that behaves like a summer one.', 3,
       '2026-12-21T20:00:00+02:00'::timestamptz, false, '21.12.26 · 20:00'
from public.cities c
join public.event_types t on t.slug = 'konzert'
join public.venues v on v.city_id = c.id and v.slug = 'olympiahalle'
where c.slug = 'munchen'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select 'thirty-seconds-to-mars', c.id, t.id, v.id,
       'Thirty Seconds to Mars', 'Olympiahalle · 12.04.27', 'Stadium rock at hall scale. Bring a voice you don''t mind losing.', 4,
       '2027-04-12T20:00:00+02:00'::timestamptz, false, '12.04.27'
from public.cities c
join public.event_types t on t.slug = 'konzert'
join public.venues v on v.city_id = c.id and v.slug = 'olympiahalle'
where c.slug = 'munchen'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select 'annenmaykantereit', c.id, t.id, v.id,
       'AnnenMayKantereit', 'Olympiapark · 15—16.09', 'Two nights in a row, same park, different setlist. Sung back word for word either way.', 5,
       '2026-09-15T18:00:00.000Z'::timestamptz, true, '15—16.09'
from public.cities c
join public.event_types t on t.slug = 'konzert'
join public.venues v on v.city_id = c.id and v.slug = 'olympiapark'
where c.slug = 'munchen'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select 'elysium', c.id, t.id, v.id,
       'Elysium', 'Maxvorstadt · 12.09.26', 'Three stages, one night, no camping. A festival that fits inside a single walk home.', 6,
       '2026-09-12T20:00:00+02:00'::timestamptz, false, '12.09.26'
from public.cities c
join public.event_types t on t.slug = 'festival'
join public.venues v on v.city_id = c.id and v.slug = 'maxvorstadt'
where c.slug = 'munchen'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select 'tollwood', c.id, t.id, v.id,
       'Tollwood', 'Olympiapark · Sommer 2027', 'Three weeks of stages, kitchens and market stalls. Come for one act, stay for the field.', 7,
       null, false, 'Sommer 2027'
from public.cities c
join public.event_types t on t.slug = 'festival'
join public.venues v on v.city_id = c.id and v.slug = 'olympiapark'
where c.slug = 'munchen'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select 'mondscheinexpress', c.id, t.id, v.id,
       'Mondscheinexpress', 'Bahnwärter Thiel · 19.11 — 23.12', 'The winter counterpart: a month of short, cold, close-up nights between the containers.', 8,
       '2026-12-11T18:00:00.000Z'::timestamptz, true, '19.11 — 23.12'
from public.cities c
join public.event_types t on t.slug = 'festival'
join public.venues v on v.city_id = c.id and v.slug = 'bahnwarter-thiel'
where c.slug = 'munchen'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select 'isle-of-summer', c.id, t.id, v.id,
       'Isle of Summer', 'Galopprennbahn Riem · 2027 TBA', 'Open air on the old racecourse. Line-up lands in spring, tickets go before it does.', 9,
       null, false, '2027 TBA'
from public.cities c
join public.event_types t on t.slug = 'festival'
join public.venues v on v.city_id = c.id and v.slug = 'riem'
where c.slug = 'munchen'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select 'zamanand', c.id, t.id, null,
       'Zamanand', 'München · 12.09 · 16:00', 'Starts in daylight and never quite admits it''s a festival. Local bills, no headliner hierarchy.', 10,
       '2026-09-12T14:00:00.000Z'::timestamptz, true, '12.09 · 16:00'
from public.cities c
join public.event_types t on t.slug = 'festival'
where c.slug = 'munchen'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select 'blitz', c.id, t.id, v.id,
       'Blitz', 'Museumsinsel 1 · 23:59', 'CJ Bolland b2b The Advent, Polygonia after. Phones stay in pockets — the no-photo rule is the point.', 11,
       null, false, '23:59'
from public.cities c
join public.event_types t on t.slug = 'rave'
join public.venues v on v.city_id = c.id and v.slug = 'museumsinsel-1'
where c.slug = 'munchen'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select 'rote-sonne-bahnwarter', c.id, t.id, null,
       'Rote Sonne × Bahnwärter', '29.08.26 · 12:00 — 06:00', 'Eighteen hours that start in the sun and end in a basement. One ticket, two places.', 12,
       '2026-08-29T12:00:00+02:00'::timestamptz, false, '12:00 — 06:00'
from public.cities c
join public.event_types t on t.slug = 'rave'
where c.slug = 'munchen'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select 'silo-west', c.id, t.id, null,
       'Silo West', 'München · 05.09 · 14:00', 'Narciss, Bambounou, B4ME. A day rave that sends you home before the last train, in theory.', 13,
       '2026-09-05T12:00:00.000Z'::timestamptz, true, '05.09 · 14:00'
from public.cities c
join public.event_types t on t.slug = 'rave'
where c.slug = 'munchen'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select 'cfu-open-air', c.id, t.id, v.id,
       'CFU Open Air', 'Bahnwärter Thiel · 18.07 · 14:00', 'Outside while it''s warm, inside when it isn''t. The same crowd moves between both all afternoon.', 14,
       '2027-07-18T12:00:00.000Z'::timestamptz, true, '18.07 · 14:00'
from public.cities c
join public.event_types t on t.slug = 'rave'
join public.venues v on v.city_id = c.id and v.slug = 'bahnwarter-thiel'
where c.slug = 'munchen'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select 'daytime-rave', c.id, t.id, null,
       'Daytime Rave', 'München · 24.10 · 17:00', 'Anna Reusch and Thomas Schumacher, finished by midnight. Built for people who like sleeping.', 15,
       '2026-10-24T15:00:00.000Z'::timestamptz, true, '24.10 · 17:00'
from public.cities c
join public.event_types t on t.slug = 'rave'
where c.slug = 'munchen'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select 'echonomist', c.id, t.id, v.id,
       'Echonomist', 'Pimpernel · 25.09 · 22:00', 'Staged inside a former cinema — the screen stays up, the seats don''t. Sound follows the room.', 16,
       '2026-09-25T20:00:00.000Z'::timestamptz, true, '25.09 · 22:00'
from public.cities c
join public.event_types t on t.slug = 'club-night'
join public.venues v on v.city_id = c.id and v.slug = 'pimpernel'
where c.slug = 'munchen'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select '10-years-blurred-vision', c.id, t.id, null,
       '10 Years Blurred Vision', 'München · 30.10 · 22:00', 'A decade of one collective, condensed into one night. Residents only, no guest slot.', 17,
       '2026-10-30T20:00:00.000Z'::timestamptz, true, '30.10 · 22:00'
from public.cities c
join public.event_types t on t.slug = 'club-night'
where c.slug = 'munchen'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select 'legal-blitz', c.id, t.id, null,
       'Legal × Blitz', '29.08 · Muallem', 'Two bookers sharing one floor. House early, techno late, the handover is the whole show.', 18,
       '2026-08-29T18:00:00.000Z'::timestamptz, true, 'Muallem'
from public.cities c
join public.event_types t on t.slug = 'club-night'
where c.slug = 'munchen'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select 'bahnwarter-techno-nacht', c.id, t.id, v.id,
       'Bahnwärter Techno-Nacht', 'Bahnwärter Thiel · 22:00', 'Moritz Minoa, Palastica, Sayuara. Stacked containers, low ceilings, nothing polished.', 19,
       null, false, '22:00'
from public.cities c
join public.event_types t on t.slug = 'club-night'
join public.venues v on v.city_id = c.id and v.slug = 'bahnwarter-thiel'
where c.slug = 'munchen'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select 'unterwelt', c.id, t.id, v.id,
       'Unterwelt', 'Sunny Red · 02.10.26 · 22:00', 'Down one staircase at a time until the room stops getting bigger. Ends when it ends.', 20,
       '2026-10-02T22:00:00+02:00'::timestamptz, false, '02.10.26 · 22:00'
from public.cities c
join public.event_types t on t.slug = 'club-night'
join public.venues v on v.city_id = c.id and v.slug = 'sunny-red'
where c.slug = 'munchen'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select 'kuchentisch', c.id, t.id, v.id,
       'Küchentisch', 'Schwabing · 14.11 · 21:00', 'Four rooms, one kitchen, and everyone ends up in the kitchen anyway. Bring something to share.', 21,
       '2026-11-14T19:00:00.000Z'::timestamptz, true, '14.11 · 21:00'
from public.cities c
join public.event_types t on t.slug = 'hausparty'
join public.venues v on v.city_id = c.id and v.slug = 'schwabing'
where c.slug = 'munchen'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select '3-stock-links', c.id, t.id, v.id,
       '3. Stock Links', 'Haidhausen · 05.07 · 20:00', 'Balcony party with string lights and a borrowed speaker. Quiet by two, that''s the deal with the neighbours.', 22,
       '2027-07-05T18:00:00.000Z'::timestamptz, true, '05.07 · 20:00'
from public.cities c
join public.event_types t on t.slug = 'hausparty'
join public.venues v on v.city_id = c.id and v.slug = 'haidhausen'
where c.slug = 'munchen'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select 'boxenturm', c.id, t.id, null,
       'Boxenturm', 'Sendling · 19.09 · 22:00', 'Someone stacked four cabinets in a backyard. The stack is the whole concept.', 23,
       '2026-09-19T20:00:00.000Z'::timestamptz, true, '19.09 · 22:00'
from public.cities c
join public.event_types t on t.slug = 'hausparty'
where c.slug = 'munchen'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select 'klingel-14', c.id, t.id, v.id,
       'Klingel 14', 'Maxvorstadt · 28.11 · 22:00', 'No address posted — you get the doorbell number and a name. Ring the right one.', 24,
       '2026-11-28T20:00:00.000Z'::timestamptz, true, '28.11 · 22:00'
from public.cities c
join public.event_types t on t.slug = 'hausparty'
join public.venues v on v.city_id = c.id and v.slug = 'maxvorstadt'
where c.slug = 'munchen'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select 'plattenabend', c.id, t.id, v.id,
       'Plattenabend', 'Giesing · 07.12', 'Vinyl only, everyone brings one record, nobody gets to hear their own twice.', 25,
       '2026-12-07T18:00:00.000Z'::timestamptz, true, '07.12'
from public.cities c
join public.event_types t on t.slug = 'hausparty'
join public.venues v on v.city_id = c.id and v.slug = 'giesing'
where c.slug = 'munchen'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select 'vierter-stock', c.id, t.id, v.id,
       'Vierter Stock', 'Neuhausen · 21.02', 'Fourth floor, no lift, and the stairwell becomes the smoking area by midnight.', 26,
       '2027-02-21T18:00:00.000Z'::timestamptz, true, '21.02'
from public.cities c
join public.event_types t on t.slug = 'hausparty'
join public.venues v on v.city_id = c.id and v.slug = 'neuhausen'
where c.slug = 'munchen'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select 'zine-klub', c.id, t.id, v.id,
       'Zine Klub', 'Glockenbach · 03.09 · 19:00', 'Bring a page, leave with a stapled issue. First Tuesday of every month, no experience needed.', 27,
       '2026-09-03T17:00:00.000Z'::timestamptz, true, '03.09 · 19:00'
from public.cities c
join public.event_types t on t.slug = 'meetup'
join public.venues v on v.city_id = c.id and v.slug = 'glockenbach'
where c.slug = 'munchen'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select 'kaffee-karten', c.id, t.id, v.id,
       'Kaffee & Karten', 'Westend · Sonntags · 15:00', 'Card games and too much coffee. Daylight only — it''s over before anything else starts.', 28,
       null, false, 'Sonntags · 15:00'
from public.cities c
join public.event_types t on t.slug = 'meetup'
join public.venues v on v.city_id = c.id and v.slug = 'westend'
where c.slug = 'munchen'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select 'nachtlinie', c.id, t.id, null,
       'Nachtlinie', 'ab Isartor · 18.10 · 18:00', 'A guided night walk along the river and back through the old town. Ends at a bar, obviously.', 29,
       '2026-10-18T16:00:00.000Z'::timestamptz, true, '18.10 · 18:00'
from public.cities c
join public.event_types t on t.slug = 'meetup'
where c.slug = 'munchen'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select 'sprechstunde', c.id, t.id, v.id,
       'Sprechstunde', 'Untergiesing · Mittwochs · 19:30', 'An open round table — you talk about what you''re making, someone tells you what''s wrong with it.', 30,
       null, false, 'Mittwochs · 19:30'
from public.cities c
join public.event_types t on t.slug = 'meetup'
join public.venues v on v.city_id = c.id and v.slug = 'giesing'
where c.slug = 'munchen'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select 'riso-abend', c.id, t.id, v.id,
       'Riso Abend', 'Schlachthofviertel · 09.10 · 18:00', 'Two-colour risograph workshop. You leave with ink on your hands and forty prints.', 31,
       '2026-10-09T16:00:00.000Z'::timestamptz, true, '09.10 · 18:00'
from public.cities c
join public.event_types t on t.slug = 'meetup'
join public.venues v on v.city_id = c.id and v.slug = 'schlachthof'
where c.slug = 'munchen'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select 'lange-tafel', c.id, t.id, v.id,
       'Lange Tafel', 'Alte Utting · 26.09 · 18:30', 'One long table on a beached ship, strangers seated next to each other on purpose.', 32,
       '2026-09-26T16:30:00.000Z'::timestamptz, true, '26.09 · 18:30'
from public.cities c
join public.event_types t on t.slug = 'meetup'
join public.venues v on v.city_id = c.id and v.slug = 'alte-utting'
where c.slug = 'munchen'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select 'strobo', c.id, t.id, v.id,
       'Strobo', 'Zenith Halle · 14.11 · 01:00', 'Hector Oaks and Sara Landry. Fast, loud, and unapologetically bright — sit this one out if lights are a problem.', 33,
       '2026-11-13T23:00:00.000Z'::timestamptz, true, '14.11 · 01:00'
from public.cities c
join public.event_types t on t.slug = 'rave'
join public.venues v on v.city_id = c.id and v.slug = 'zenith'
where c.slug = 'munchen'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select 'tunnelblick', c.id, t.id, v.id,
       'Tunnelblick', 'Tonhalle · 31.10', 'Twenty-four hours with no announced ending. People arrive in shifts.', 34,
       '2026-10-31T18:00:00.000Z'::timestamptz, true, '31.10'
from public.cities c
join public.event_types t on t.slug = 'rave'
join public.venues v on v.city_id = c.id and v.slug = 'tonhalle'
where c.slug = 'munchen'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select 'spiegelsaal', c.id, t.id, v.id,
       'Spiegelsaal', 'P1 · 06.12 · 23:00', 'Italo and disco under an actual mirror ball. The most fun you''ll have taking nothing seriously.', 35,
       '2026-12-06T21:00:00.000Z'::timestamptz, true, '06.12 · 23:00'
from public.cities c
join public.event_types t on t.slug = 'club-night'
join public.venues v on v.city_id = c.id and v.slug = 'p1'
where c.slug = 'munchen'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select 'pegel', c.id, t.id, v.id,
       'Pegel', 'Milla Club · 11.10 · 22:00', 'Live hardware sets, no laptops on stage. You watch the sound get built in front of you.', 36,
       '2026-10-11T20:00:00.000Z'::timestamptz, true, '11.10 · 22:00'
from public.cities c
join public.event_types t on t.slug = 'club-night'
join public.venues v on v.city_id = c.id and v.slug = 'milla'
where c.slug = 'munchen'
on conflict (slug) do nothing;


-- Stamp the migration log, if it is there (00_migrations.sql).
do $$ begin
  if to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('04_seed_events.sql');
  end if;
end $$;


-- ============================================================
--  DECK, KEPT, COUNTERS   (06_views.sql)
-- ============================================================

-- afterhours — the views and functions the front end uses
-- Keep the query logic here; the JS in the browser should only call it.

-- security_invoker: the view runs with the rights of whoever calls it.
-- Without it the view steps around RLS and unpublished events leak.

-- ------------------------------------------- a column a view cannot rename

-- `create or replace view` can add a column but it cannot RENAME one, and
-- the column carrying the type order was called type_sira before the code
-- moved to English. On a database built before that rename this file used
-- to stop dead with
--     42P16: cannot change name of view column "type_sira" to "type_sort_order"
-- and nothing after it ran. Dropping the view first is the only way.
--
-- cascade is safe here and nowhere else: the only things that depend on
-- events_public are deck() and kept(), which say `returns setof
-- public.events_public`, and both are recreated further down this same
-- file. On a fresh database the block does nothing at all.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'events_public'
      and column_name  = 'type_sira'
  ) then
    drop view public.events_public cascade;
    raise notice 'events_public dropped so its renamed column can come back';
  end if;
end
$$;


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
  with removed as (
    delete from public.swipes where user_id = auth.uid() returning 1
  )
  select count(*)::int from removed;
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

-- keep_counts is the admin panel’s number; nothing signed out reads it.
-- Definer functions hand out exactly what they select, so the fewer keys
-- to this one the better (it was open to anonymous for no reason).
revoke execute on function public.keep_counts() from public, anon;
grant execute on function public.keep_counts()          to authenticated;

grant select on public.events_public, public.comments_public to anon, authenticated;

-- Stamp the migration log, if it is there. Each numbered file still runs on
-- its own (the tests load them one at a time), so this cannot insist.
do $$ begin
  if to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('06_views.sql');
  end if;
end $$;


-- ============================================================
--  FRIENDSHIP   (07_friends.sql)
-- ============================================================

-- afterhours — the friendship calls
-- The table and the rules live in 01/02; these are the day-to-day calls.

-- The handle: friendship is built on it, so the shape is enforced.
-- Lower case, digits, underscore; 3-20 characters.
alter table public.profiles
  drop constraint if exists profiles_handle_bicim;
alter table public.profiles
  drop constraint if exists profiles_handle_format;
alter table public.profiles
  add constraint profiles_handle_format
  check (handle is null or handle ~ '^[a-z0-9_]{3,20}$');

-- Your friends and the pending requests, in one list.
-- direction: outgoing = you asked for it, incoming = they asked you.
-- create or replace is not enough when the return type changes; drop first.
drop function if exists public.friends_list();
create or replace function public.friends_list()
returns table (
  other_id      uuid,
  handle        text,
  display_name  text,
  status        text,
  direction     text
)
language sql
stable
as $$
  select f.addressee_id, p.handle, p.display_name, f.status, 'outgoing'
  from public.friendships f
  join public.profiles p on p.id = f.addressee_id
  where f.requester_id = auth.uid()
  union all
  select f.requester_id, p.handle, p.display_name, f.status, 'incoming'
  from public.friendships f
  join public.profiles p on p.id = f.requester_id
  where f.addressee_id = auth.uid()
  order by 4, 2;
$$;

-- Send a request by handle. If the other side
-- has already sent you one, this accepts it: no need to ask twice.
create or replace function public.friend_request(p_handle text)
returns text
language plpgsql
as $$
declare
  target uuid;
begin
  select id into target from public.profiles where handle = lower(btrim(p_handle));

  if target is null then
    return 'notfound';
  end if;
  if target = auth.uid() then
    return 'yourself';
  end if;

  -- If a request is pending in the other direction, accept that one
  if exists (select 1 from public.friendships
             where requester_id = target and addressee_id = auth.uid()) then
    update public.friendships set status = 'accepted'
    where requester_id = target and addressee_id = auth.uid();
    return 'accepted';
  end if;

  insert into public.friendships (requester_id, addressee_id)
  values (auth.uid(), target)
  on conflict (requester_id, addressee_id) do nothing;

  return 'sent';
end;
$$;

-- Accept a request that came to you.
create or replace function public.friend_accept(p_other uuid)
returns boolean
language sql
as $$
  update public.friendships set status = 'accepted'
  where requester_id = p_other and addressee_id = auth.uid()
  returning true;
$$;

-- End a friendship / take a request back. Works in both directions.
create or replace function public.friend_remove(p_other uuid)
returns boolean
language sql
as $$
  with removed as (
    delete from public.friendships
    where (requester_id = auth.uid() and addressee_id = p_other)
       or (addressee_id = auth.uid() and requester_id = p_other)
    returning 1
  )
  select exists (select 1 from removed);
$$;

grant execute on function public.friends_list()          to authenticated;
grant execute on function public.friend_request(text)    to authenticated;
grant execute on function public.friend_accept(uuid)     to authenticated;
grant execute on function public.friend_remove(uuid)     to authenticated;

-- Stamp the migration log, if it is there. Each numbered file still runs on
-- its own (the tests load them one at a time), so this cannot insist.
do $$ begin
  if to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('07_friends.sql');
  end if;
end $$;


-- ============================================================
--  POSTER STORE   (08_storage.sql)
-- ============================================================

-- afterhours — the poster store (Supabase Storage)
-- The storage schema only exists on Supabase; in the local tests this
-- block skips itself. That is why every statement is dynamic (execute).

do $$
begin
  if not exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    raise notice 'no storage schema - poster store skipped (running locally)';
    return;
  end if;

  -- A public bucket: the posters are already on the site, nothing secret.
  execute $q$
    insert into storage.buckets (id, name, public)
    values ('posters', 'posters', true)
    on conflict (id) do nothing
  $q$;

  -- Reading is open to everyone
  execute $q$ drop policy if exists "posters okunur" on storage.objects $q$;
  execute $q$
    create policy "posters okunur" on storage.objects
      for select using (bucket_id = 'posters')
  $q$;

  -- Writing belongs to the admin alone. public.is_admin() is defined in 02_rls.sql.
  execute $q$ drop policy if exists "posters yonetici yazar" on storage.objects $q$;
  execute $q$ drop policy if exists "posters admin writes" on storage.objects $q$;
  execute $q$
    create policy "posters admin writes" on storage.objects
      for insert with check (bucket_id = 'posters' and public.is_admin())
  $q$;

  execute $q$ drop policy if exists "posters yonetici gunceller" on storage.objects $q$;
  execute $q$ drop policy if exists "posters admin updates" on storage.objects $q$;
  execute $q$
    create policy "posters admin updates" on storage.objects
      for update using (bucket_id = 'posters' and public.is_admin())
      with check (bucket_id = 'posters' and public.is_admin())
  $q$;

  execute $q$ drop policy if exists "posters yonetici siler" on storage.objects $q$;
  execute $q$ drop policy if exists "posters admin deletes" on storage.objects $q$;
  execute $q$
    create policy "posters admin deletes" on storage.objects
      for delete using (bucket_id = 'posters' and public.is_admin())
  $q$;
end
$$;

-- Stamp the migration log, if it is there. Each numbered file still runs on
-- its own (the tests load them one at a time), so this cannot insist.
do $$ begin
  if to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('08_storage.sql');
  end if;
end $$;


-- ============================================================
--  BACKGROUND JOBS   (09_jobs.sql)
-- ============================================================

-- afterhours — the jobs that run in the background
-- The pg_cron extension is switched on under Database → Extensions.
-- Without the extension the functions still work, they just do not run
-- on their own; you can also call them by hand.

-- Drop past events off the list.
-- IMPORTANT: it only touches events with a CONFIRMED date. Dropping one
-- of the 24 inferred dates could be wrong, and hiding those on their own
-- whose year was merely guessed would take a real event off the site.
create or replace function public.hide_past_events()
returns integer
language sql
security definer
set search_path = public
as $$
  with closed as (
    update public.events
    set is_published = false
    where is_published
      and starts_at is not null
      and not starts_at_estimated
      and starts_at < now() - interval '12 hours'   -- let the night end first
    returning 1
  )
  select count(*)::int from closed;
$$;

-- This is the cron job’s tool (pg_cron runs it as the owner). Postgres
-- hands EXECUTE to everyone by default, and there is no reason a browser
-- should be able to trigger it through the API.
revoke execute on function public.hide_past_events() from public, anon, authenticated;

-- The maintenance summary: one row saying what wants attention.
-- The database side of the warnings in the admin panel.
-- create or replace is not enough when the return type changes; drop first.
drop function if exists public.health();
create or replace function public.health()
returns table (
  events            bigint,
  published         bigint,
  missing_venue     bigint,
  unverified_date   bigint,
  past_still_up     bigint,
  comments          bigint,
  hidden_comments   bigint,
  people            bigint,
  swipes            bigint,
  -- confirmed pairs only: the number the help page shows as
  -- "friend connections". A pending request is not a connection yet.
  friendships       bigint
)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from public.events),
    (select count(*) from public.events where is_published),
    (select count(*) from public.events where venue_id is null),
    (select count(*) from public.events where starts_at_estimated),
    (select count(*) from public.events
      where is_published and starts_at is not null
        and not starts_at_estimated and starts_at < now()),
    (select count(*) from public.comments),
    (select count(*) from public.comments where is_hidden),
    (select count(*) from public.profiles),
    (select count(*) from public.swipes),
    (select count(*) from public.friendships where status = 'accepted');
$$;

grant execute on function public.health() to anon, authenticated;

-- The schedule. If pg_cron is off, this block is skipped quietly.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('afterhours-gecmisi-dusur')
      where exists (select 1 from cron.job where jobname = 'afterhours-gecmisi-dusur');
    perform cron.unschedule('afterhours-drop-past')
      where exists (select 1 from cron.job where jobname = 'afterhours-drop-past');
    perform cron.schedule(
      'afterhours-drop-past',
      '30 5 * * *',                       -- 05:30 UTC daily, after the night is over
      $job$ select public.hide_past_events(); $job$
    );
  end if;
end
$$;

-- Stamp the migration log, if it is there. Each numbered file still runs on
-- its own (the tests load them one at a time), so this cannot insist.
do $$ begin
  if to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('09_jobs.sql');
  end if;
end $$;


-- ============================================================
--  THE WORLD — 54 CITIES, 106 NIGHTS   (11_world.sql)
-- ============================================================

-- ============================================================
--  afterhours — THE WORLD: 6 continents, 18 countries, 54 cities, 106 nights
--
--  GENERATED FILE — source: backend/tools/world-sql.mjs
--  The content is invented but written by hand; the posters were
--  generated alongside it (posters/37.svg … 142.svg).
-- ============================================================

-- Continent fields on the cities
alter table public.cities add column if not exists continent text;
alter table public.cities add column if not exists continent_slug text;

-- Drop the cities with no nights that broke the shape (three per country).
delete from public.cities
where slug in ('hamburg', 'frankfurt', 'leipzig')
  and not exists (select 1 from public.events e where e.city_id = cities.id);

insert into public.cities
  (slug, name, status, sort_order, country, country_slug, continent, continent_slug)
values
  ('munchen', 'münchen', 'live', 1, 'Deutschland', 'de', 'Europe', 'eu'),
  ('berlin', 'berlin', 'live', 2, 'Deutschland', 'de', 'Europe', 'eu'),
  ('koln', 'köln', 'live', 3, 'Deutschland', 'de', 'Europe', 'eu'),
  ('istanbul', 'istanbul', 'live', 4, 'Türkiye', 'tr', 'Europe', 'eu'),
  ('ankara', 'ankara', 'live', 5, 'Türkiye', 'tr', 'Europe', 'eu'),
  ('izmir', 'izmir', 'live', 6, 'Türkiye', 'tr', 'Europe', 'eu'),
  ('wien', 'wien', 'live', 7, 'Österreich', 'at', 'Europe', 'eu'),
  ('graz', 'graz', 'live', 8, 'Österreich', 'at', 'Europe', 'eu'),
  ('salzburg', 'salzburg', 'live', 9, 'Österreich', 'at', 'Europe', 'eu'),
  ('tokyo', 'tokyo', 'live', 10, '日本', 'jp', 'Asia', 'as'),
  ('osaka', 'osaka', 'live', 11, '日本', 'jp', 'Asia', 'as'),
  ('kyoto', 'kyoto', 'live', 12, '日本', 'jp', 'Asia', 'as'),
  ('seoul', 'seoul', 'live', 13, '한국', 'kr', 'Asia', 'as'),
  ('busan', 'busan', 'live', 14, '한국', 'kr', 'Asia', 'as'),
  ('daegu', 'daegu', 'live', 15, '한국', 'kr', 'Asia', 'as'),
  ('jakarta', 'jakarta', 'live', 16, 'Indonesia', 'id', 'Asia', 'as'),
  ('bandung', 'bandung', 'live', 17, 'Indonesia', 'id', 'Asia', 'as'),
  ('yogyakarta', 'yogyakarta', 'live', 18, 'Indonesia', 'id', 'Asia', 'as'),
  ('lagos', 'lagos', 'live', 19, 'Nigeria', 'ng', 'Africa', 'af'),
  ('abuja', 'abuja', 'live', 20, 'Nigeria', 'ng', 'Africa', 'af'),
  ('ibadan', 'ibadan', 'live', 21, 'Nigeria', 'ng', 'Africa', 'af'),
  ('nairobi', 'nairobi', 'live', 22, 'Kenya', 'ke', 'Africa', 'af'),
  ('mombasa', 'mombasa', 'live', 23, 'Kenya', 'ke', 'Africa', 'af'),
  ('kisumu', 'kisumu', 'live', 24, 'Kenya', 'ke', 'Africa', 'af'),
  ('casablanca', 'casablanca', 'live', 25, 'Maroc', 'ma', 'Africa', 'af'),
  ('marrakesh', 'marrakesh', 'live', 26, 'Maroc', 'ma', 'Africa', 'af'),
  ('tanger', 'tanger', 'live', 27, 'Maroc', 'ma', 'Africa', 'af'),
  ('new-york', 'new york', 'live', 28, 'United States', 'us', 'North America', 'na'),
  ('chicago', 'chicago', 'live', 29, 'United States', 'us', 'North America', 'na'),
  ('detroit', 'detroit', 'live', 30, 'United States', 'us', 'North America', 'na'),
  ('ciudad-de-mexico', 'ciudad de méxico', 'live', 31, 'México', 'mx', 'North America', 'na'),
  ('guadalajara', 'guadalajara', 'live', 32, 'México', 'mx', 'North America', 'na'),
  ('monterrey', 'monterrey', 'live', 33, 'México', 'mx', 'North America', 'na'),
  ('montreal', 'montréal', 'live', 34, 'Canada', 'ca', 'North America', 'na'),
  ('toronto', 'toronto', 'live', 35, 'Canada', 'ca', 'North America', 'na'),
  ('vancouver', 'vancouver', 'live', 36, 'Canada', 'ca', 'North America', 'na'),
  ('sao-paulo', 'são paulo', 'live', 37, 'Brasil', 'br', 'South America', 'sa'),
  ('rio-de-janeiro', 'rio de janeiro', 'live', 38, 'Brasil', 'br', 'South America', 'sa'),
  ('belo-horizonte', 'belo horizonte', 'live', 39, 'Brasil', 'br', 'South America', 'sa'),
  ('buenos-aires', 'buenos aires', 'live', 40, 'Argentina', 'ar', 'South America', 'sa'),
  ('cordoba', 'córdoba', 'live', 41, 'Argentina', 'ar', 'South America', 'sa'),
  ('rosario', 'rosario', 'live', 42, 'Argentina', 'ar', 'South America', 'sa'),
  ('bogota', 'bogotá', 'live', 43, 'Colombia', 'co', 'South America', 'sa'),
  ('medellin', 'medellín', 'live', 44, 'Colombia', 'co', 'South America', 'sa'),
  ('cali', 'cali', 'live', 45, 'Colombia', 'co', 'South America', 'sa'),
  ('sydney', 'sydney', 'live', 46, 'Australia', 'au', 'Oceania', 'oc'),
  ('melbourne', 'melbourne', 'live', 47, 'Australia', 'au', 'Oceania', 'oc'),
  ('brisbane', 'brisbane', 'live', 48, 'Australia', 'au', 'Oceania', 'oc'),
  ('auckland', 'auckland', 'live', 49, 'Aotearoa', 'nz', 'Oceania', 'oc'),
  ('wellington', 'wellington', 'live', 50, 'Aotearoa', 'nz', 'Oceania', 'oc'),
  ('christchurch', 'christchurch', 'live', 51, 'Aotearoa', 'nz', 'Oceania', 'oc'),
  ('suva', 'suva', 'live', 52, 'Viti', 'fj', 'Oceania', 'oc'),
  ('nadi', 'nadi', 'live', 53, 'Viti', 'fj', 'Oceania', 'oc'),
  ('lautoka', 'lautoka', 'live', 54, 'Viti', 'fj', 'Oceania', 'oc')
on conflict (slug) do update set
  name = excluded.name,
  status = excluded.status,
  sort_order = excluded.sort_order,
  country = excluded.country,
  country_slug = excluded.country_slug,
  continent = excluded.continent,
  continent_slug = excluded.continent_slug;

create index if not exists cities_continent_idx
  on public.cities (continent_slug, country_slug, sort_order);

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'berlin-betonhalle', c.id, t.id, 'Betonhalle', 'Kraftwerk Mitte · 12.09 · 23:30', 'Concrete, three storeys of it, and a sound system that treats the building as a cabinet.',
       37, '2026-09-12T23:30:00+02:00'::timestamptz, false, '12.09 · 23:30'
from public.cities c
join public.event_types t on t.slug = 'rave'
where c.slug = 'berlin'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'berlin-sonntagsclub', c.id, t.id, 'Sonntagsclub', 'Neukölln basement · 20.09 · 22:00', 'Sunday evening as a proper night out. Everyone has work tomorrow and nobody mentions it.',
       38, '2026-09-20T22:00:00+02:00'::timestamptz, false, '20.09 · 22:00'
from public.cities c
join public.event_types t on t.slug = 'club-night'
where c.slug = 'berlin'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'koln-domplatte', c.id, t.id, 'Domplatte', 'Kulturkirche · 03.10 · 20:00', 'A choir, a drum machine, and a church that was not built for either.',
       39, '2026-10-03T20:00:00+02:00'::timestamptz, false, '03.10 · 20:00'
from public.cities c
join public.event_types t on t.slug = 'konzert'
where c.slug = 'koln'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'koln-zweite-etage', c.id, t.id, 'Zweite Etage', 'Ehrenfeld · 17.10 · 21:00', 'Fourth flat on the left. The neighbours are invited, which is the only reason it works.',
       40, '2026-10-17T21:00:00+02:00'::timestamptz, false, '17.10 · 21:00'
from public.cities c
join public.event_types t on t.slug = 'hausparty'
where c.slug = 'koln'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'istanbul-karakoy-alt-kat', c.id, t.id, 'Karaköy Alt Kat', 'Karaköy · 19.09 · 23:00', 'Below street level, one room, and the ferry horn coming through the wall at 2am.',
       41, '2026-09-19T23:00:00+02:00'::timestamptz, false, '19.09 · 23:00'
from public.cities c
join public.event_types t on t.slug = 'club-night'
where c.slug = 'istanbul'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'istanbul-plak-degisimi', c.id, t.id, 'Plak Değişimi', 'Kadıköy · 27.09 · 16:00', 'Bring three records you are done with. Leave with three you are not.',
       42, '2026-09-27T16:00:00+02:00'::timestamptz, false, '27.09 · 16:00'
from public.cities c
join public.event_types t on t.slug = 'meetup'
where c.slug = 'istanbul'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'ankara-sanat-sahnesi', c.id, t.id, 'Sanat Sahnesi', 'Kızılay · 10.10 · 20:30', 'A hall built for speeches, borrowed for a band that does not make any.',
       43, '2026-10-10T20:30:00+02:00'::timestamptz, false, '10.10 · 20:30'
from public.cities c
join public.event_types t on t.slug = 'konzert'
where c.slug = 'ankara'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'ankara-depo-gecesi', c.id, t.id, 'Depo Gecesi', 'Ostim · 24.10 · 00:30', 'An industrial district that empties at six and fills again at midnight.',
       44, '2026-10-24T00:30:00+02:00'::timestamptz, false, '24.10 · 00:30'
from public.cities c
join public.event_types t on t.slug = 'rave'
where c.slug = 'ankara'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'izmir-korfez-acik-hava', c.id, t.id, 'Körfez Açık Hava', 'Kültürpark · 05.09 · 18:00', 'Five hours of sea breeze, then the wind drops and the bass finally sits still.',
       45, '2026-09-05T18:00:00+02:00'::timestamptz, false, '05.09 · 18:00'
from public.cities c
join public.event_types t on t.slug = 'festival'
where c.slug = 'izmir'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'izmir-alsancak-gec-saat', c.id, t.id, 'Alsancak Geç Saat', 'Alsancak · 18.10 · 23:30', 'The street is loud until two; the room is louder after.',
       46, '2026-10-18T23:30:00+02:00'::timestamptz, false, '18.10 · 23:30'
from public.cities c
join public.event_types t on t.slug = 'club-night'
where c.slug = 'izmir'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'wien-gurtelbogen', c.id, t.id, 'Gürtelbogen', 'Stadtbahnbögen · 26.09 · 22:30', 'Under the railway arches, a train passing every four minutes and nobody flinching.',
       47, '2026-09-26T22:30:00+02:00'::timestamptz, false, '26.09 · 22:30'
from public.cities c
join public.event_types t on t.slug = 'club-night'
where c.slug = 'wien'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'wien-kaffeehaus-runde', c.id, t.id, 'Kaffeehaus Runde', 'Josefstadt · 11.10 · 17:00', 'One table, one waiter who has seen it all, and no agenda whatsoever.',
       48, '2026-10-11T17:00:00+02:00'::timestamptz, false, '11.10 · 17:00'
from public.cities c
join public.event_types t on t.slug = 'meetup'
where c.slug = 'wien'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'graz-altbau-dritter', c.id, t.id, 'Altbau Dritter', 'Lend · 04.10 · 21:30', 'High ceilings, thin walls, and a landlord who is somehow also invited.',
       49, '2026-10-04T21:30:00+02:00'::timestamptz, false, '04.10 · 21:30'
from public.cities c
join public.event_types t on t.slug = 'hausparty'
where c.slug = 'graz'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'graz-murufer', c.id, t.id, 'Murufer', 'Kunsthaus · 22.11 · 20:00', 'Played to the river, which does not applaud but does carry the sound.',
       50, '2026-11-22T20:00:00+02:00'::timestamptz, false, '22.11 · 20:00'
from public.cities c
join public.event_types t on t.slug = 'konzert'
where c.slug = 'graz'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'salzburg-kellergewolbe', c.id, t.id, 'Kellergewölbe', 'Altstadt · 14.11 · 19:30', 'A cellar older than the country, and a set that leans into the reverb.',
       51, '2026-11-14T19:30:00+02:00'::timestamptz, false, '14.11 · 19:30'
from public.cities c
join public.event_types t on t.slug = 'konzert'
where c.slug = 'salzburg'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'salzburg-bergweg-fruhstuck', c.id, t.id, 'Bergweg Frühstück', 'Kapuzinerberg · 29.11 · 09:00', 'Walk up, eat, walk down. The whole event is the walk.',
       52, '2026-11-29T09:00:00+02:00'::timestamptz, false, '29.11 · 09:00'
from public.cities c
join public.event_types t on t.slug = 'meetup'
where c.slug = 'salzburg'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'tokyo-shibuya-chika', c.id, t.id, 'Shibuya Chika', 'Dogenzaka basement · 13.09 · 23:00', 'Second basement, forty people, and a policy of never announcing who is playing.',
       53, '2026-09-13T23:00:00+02:00'::timestamptz, false, '13.09 · 23:00'
from public.cities c
join public.event_types t on t.slug = 'club-night'
where c.slug = 'tokyo'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'tokyo-bayside-warehouse', c.id, t.id, 'Bayside Warehouse', 'Shinkiba · 27.09 · 01:00', 'Out where the trains stop early, so nobody leaves before the sun.',
       54, '2026-09-27T01:00:00+02:00'::timestamptz, false, '27.09 · 01:00'
from public.cities c
join public.event_types t on t.slug = 'rave'
where c.slug = 'tokyo'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'osaka-namba-loft', c.id, t.id, 'Namba Loft', 'Namba · 08.10 · 19:00', 'Three bands, one hour each, and a crowd that stays for all three.',
       55, '2026-10-08T19:00:00+02:00'::timestamptz, false, '08.10 · 19:00'
from public.cities c
join public.event_types t on t.slug = 'konzert'
where c.slug = 'osaka'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'osaka-nagaya-night', c.id, t.id, 'Nagaya Night', 'Nishinari · 25.10 · 20:00', 'A row house with the doors open and the party spilling into the lane.',
       56, '2026-10-25T20:00:00+02:00'::timestamptz, false, '25.10 · 20:00'
from public.cities c
join public.event_types t on t.slug = 'hausparty'
where c.slug = 'osaka'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'kyoto-kamogawa-sit', c.id, t.id, 'Kamogawa Sit', 'Kamo riverbank · 20.09 · 18:30', 'Everyone sits the same distance apart. Nobody planned it; it just happens here.',
       57, '2026-09-20T18:30:00+02:00'::timestamptz, false, '20.09 · 18:30'
from public.cities c
join public.event_types t on t.slug = 'meetup'
where c.slug = 'kyoto'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'kyoto-machiya-sound', c.id, t.id, 'Machiya Sound', 'Nakagyo · 15.11 · 22:00', 'A wooden townhouse with a sound system that respects the wood.',
       58, '2026-11-15T22:00:00+02:00'::timestamptz, false, '15.11 · 22:00'
from public.cities c
join public.event_types t on t.slug = 'club-night'
where c.slug = 'kyoto'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'seoul-mullae-ironworks', c.id, t.id, 'Mullae Ironworks', 'Mullae-dong · 19.09 · 23:30', 'Metal shops by day, still smelling of it by night, which somehow suits the music.',
       59, '2026-09-19T23:30:00+02:00'::timestamptz, false, '19.09 · 23:30'
from public.cities c
join public.event_types t on t.slug = 'rave'
where c.slug = 'seoul'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'seoul-itaewon-late', c.id, t.id, 'Itaewon Late', 'Itaewon · 10.10 · 23:00', 'The last hour is the point. Everything before it is a waiting room.',
       60, '2026-10-10T23:00:00+02:00'::timestamptz, false, '10.10 · 23:00'
from public.cities c
join public.event_types t on t.slug = 'club-night'
where c.slug = 'seoul'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'busan-gwangalli-open-air', c.id, t.id, 'Gwangalli Open Air', 'Gwangalli Beach · 12.09 · 17:00', 'The bridge lights up at nine and the whole crowd turns around for it.',
       61, '2026-09-12T17:00:00+02:00'::timestamptz, false, '12.09 · 17:00'
from public.cities c
join public.event_types t on t.slug = 'festival'
where c.slug = 'busan'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'busan-jagalchi-morning', c.id, t.id, 'Jagalchi Morning', 'Jagalchi Market · 26.09 · 07:00', 'For people who would rather start a day than end one.',
       62, '2026-09-26T07:00:00+02:00'::timestamptz, false, '26.09 · 07:00'
from public.cities c
join public.event_types t on t.slug = 'meetup'
where c.slug = 'busan'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'daegu-bangcheon-stage', c.id, t.id, 'Bangcheon Stage', 'Bangcheon Market · 17.10 · 19:30', 'A market alley that turns into a room once the shutters come down.',
       63, '2026-10-17T19:30:00+02:00'::timestamptz, false, '17.10 · 19:30'
from public.cities c
join public.event_types t on t.slug = 'konzert'
where c.slug = 'daegu'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'daegu-rooftop-4f', c.id, t.id, 'Rooftop 4F', 'Jung-gu · 07.11 · 21:00', 'Fourth floor, no lift, and everyone arrives slightly out of breath.',
       64, '2026-11-07T21:00:00+02:00'::timestamptz, false, '07.11 · 21:00'
from public.cities c
join public.event_types t on t.slug = 'hausparty'
where c.slug = 'daegu'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'jakarta-kota-tua-cellar', c.id, t.id, 'Kota Tua Cellar', 'Kota Tua · 26.09 · 22:30', 'Colonial walls, tropical heat, and a fan that gave up an hour ago.',
       65, '2026-09-26T22:30:00+02:00'::timestamptz, false, '26.09 · 22:30'
from public.cities c
join public.event_types t on t.slug = 'club-night'
where c.slug = 'jakarta'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'jakarta-ancol-late', c.id, t.id, 'Ancol Late', 'Ancol · 24.10 · 00:00', 'By the water, where the city finally stops being loud in the other way.',
       66, '2026-10-24T00:00:00+02:00'::timestamptz, false, '24.10 · 00:00'
from public.cities c
join public.event_types t on t.slug = 'rave'
where c.slug = 'jakarta'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'bandung-dago-hall', c.id, t.id, 'Dago Hall', 'Dago · 11.10 · 19:00', 'Cool enough at altitude that nobody complains about standing.',
       67, '2026-10-11T19:00:00+02:00'::timestamptz, false, '11.10 · 19:00'
from public.cities c
join public.event_types t on t.slug = 'konzert'
where c.slug = 'bandung'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'bandung-zine-sore', c.id, t.id, 'Zine Sore', 'Braga · 01.11 · 16:00', 'Photocopied, stapled, handed over. The whole economy runs on trade.',
       68, '2026-11-01T16:00:00+02:00'::timestamptz, false, '01.11 · 16:00'
from public.cities c
join public.event_types t on t.slug = 'meetup'
where c.slug = 'bandung'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'yogyakarta-kos-kosan', c.id, t.id, 'Kos Kosan', 'Sleman · 18.10 · 20:30', 'A student boarding house where the rule is that you bring something.',
       69, '2026-10-18T20:30:00+02:00'::timestamptz, false, '18.10 · 20:30'
from public.cities c
join public.event_types t on t.slug = 'hausparty'
where c.slug = 'yogyakarta'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'yogyakarta-sawah-sonic', c.id, t.id, 'Sawah Sonic', 'rice terraces · 22.11 · 16:00', 'Speakers between the fields. The frogs join in after dark and stay.',
       70, '2026-11-22T16:00:00+02:00'::timestamptz, false, '22.11 · 16:00'
from public.cities c
join public.event_types t on t.slug = 'festival'
where c.slug = 'yogyakarta'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'lagos-yaba-backroom', c.id, t.id, 'Yaba Backroom', 'Yaba · 19.09 · 23:00', 'Behind a phone repair shop, and the queue knows exactly which door.',
       71, '2026-09-19T23:00:00+02:00'::timestamptz, false, '19.09 · 23:00'
from public.cities c
join public.event_types t on t.slug = 'club-night'
where c.slug = 'lagos'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'lagos-freedom-park-live', c.id, t.id, 'Freedom Park Live', 'Lagos Island · 10.10 · 19:00', 'An old prison yard that has been a concert venue longer than it was a prison.',
       72, '2026-10-10T19:00:00+02:00'::timestamptz, false, '10.10 · 19:00'
from public.cities c
join public.event_types t on t.slug = 'konzert'
where c.slug = 'lagos'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'abuja-rock-bottom', c.id, t.id, 'Rock Bottom', 'Wuse · 03.10 · 00:00', 'A city designed on paper, and a night that ignores the plan entirely.',
       73, '2026-10-03T00:00:00+02:00'::timestamptz, false, '03.10 · 00:00'
from public.cities c
join public.event_types t on t.slug = 'rave'
where c.slug = 'abuja'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'abuja-sunday-sound', c.id, t.id, 'Sunday Sound', 'Jabi Lake · 25.10 · 17:00', 'Everyone brings one speaker. It should not work and it does.',
       74, '2026-10-25T17:00:00+02:00'::timestamptz, false, '25.10 · 17:00'
from public.cities c
join public.event_types t on t.slug = 'meetup'
where c.slug = 'abuja'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'ibadan-bodija-compound', c.id, t.id, 'Bodija Compound', 'Bodija · 17.10 · 20:00', 'A compound, four families, and one generator that everyone is polite about.',
       75, '2026-10-17T20:00:00+02:00'::timestamptz, false, '17.10 · 20:00'
from public.cities c
join public.event_types t on t.slug = 'hausparty'
where c.slug = 'ibadan'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'ibadan-agodi-open-air', c.id, t.id, 'Agodi Open Air', 'Agodi Gardens · 14.11 · 16:00', 'Starts in daylight so the drummers can see each other.',
       76, '2026-11-14T16:00:00+02:00'::timestamptz, false, '14.11 · 16:00'
from public.cities c
join public.event_types t on t.slug = 'festival'
where c.slug = 'ibadan'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'nairobi-westlands-basement', c.id, t.id, 'Westlands Basement', 'Westlands · 26.09 · 22:30', 'Down two flights, and the traffic above stops mattering.',
       77, '2026-09-26T22:30:00+02:00'::timestamptz, false, '26.09 · 22:30'
from public.cities c
join public.event_types t on t.slug = 'club-night'
where c.slug = 'nairobi'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'nairobi-industrial-area', c.id, t.id, 'Industrial Area', 'Enterprise Road · 07.11 · 01:00', 'Warehouses that are still warehouses on Monday morning.',
       78, '2026-11-07T01:00:00+02:00'::timestamptz, false, '07.11 · 01:00'
from public.cities c
join public.event_types t on t.slug = 'rave'
where c.slug = 'nairobi'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'mombasa-old-town-beats', c.id, t.id, 'Old Town Beats', 'Old Town · 12.09 · 18:00', 'Coral walls hold the heat and hand it back all evening.',
       79, '2026-09-12T18:00:00+02:00'::timestamptz, false, '12.09 · 18:00'
from public.cities c
join public.event_types t on t.slug = 'festival'
where c.slug = 'mombasa'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'mombasa-dhow-sunset', c.id, t.id, 'Dhow Sunset', 'Tudor Creek · 04.10 · 17:30', 'On the water for two hours. There is nowhere to go, which is the design.',
       80, '2026-10-04T17:30:00+02:00'::timestamptz, false, '04.10 · 17:30'
from public.cities c
join public.event_types t on t.slug = 'meetup'
where c.slug = 'mombasa'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'kisumu-lakeside-stage', c.id, t.id, 'Lakeside Stage', 'Dunga Beach · 24.10 · 18:30', 'The lake goes flat at dusk and the sound carries much further than it should.',
       81, '2026-10-24T18:30:00+02:00'::timestamptz, false, '24.10 · 18:30'
from public.cities c
join public.event_types t on t.slug = 'konzert'
where c.slug = 'kisumu'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'kisumu-milimani-house', c.id, t.id, 'Milimani House', 'Milimani · 21.11 · 20:00', 'One long table outside, and nobody sits at it until midnight.',
       82, '2026-11-21T20:00:00+02:00'::timestamptz, false, '21.11 · 20:00'
from public.cities c
join public.event_types t on t.slug = 'hausparty'
where c.slug = 'kisumu'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'casablanca-corniche-sous-sol', c.id, t.id, 'Corniche Sous-Sol', 'Ain Diab · 10.10 · 23:30', 'The sea on one side, a wall of speakers on the other.',
       83, '2026-10-10T23:30:00+02:00'::timestamptz, false, '10.10 · 23:30'
from public.cities c
join public.event_types t on t.slug = 'club-night'
where c.slug = 'casablanca'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'casablanca-ancienne-medina', c.id, t.id, 'Ancienne Médina', 'Old Medina · 28.11 · 20:00', 'A courtyard with four walls and a ceiling of exactly nothing.',
       84, '2026-11-28T20:00:00+02:00'::timestamptz, false, '28.11 · 20:00'
from public.cities c
join public.event_types t on t.slug = 'konzert'
where c.slug = 'casablanca'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'marrakesh-riad-rooftop', c.id, t.id, 'Riad Rooftop', 'Medina · 19.09 · 18:00', 'Mint tea, low cushions, and the call to prayer cutting cleanly through the conversation.',
       85, '2026-09-19T18:00:00+02:00'::timestamptz, false, '19.09 · 18:00'
from public.cities c
join public.event_types t on t.slug = 'meetup'
where c.slug = 'marrakesh'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'marrakesh-palmeraie-night', c.id, t.id, 'Palmeraie Night', 'Palmeraie · 31.10 · 23:00', 'Out among the palms, where the sound has nothing to bounce off.',
       86, '2026-10-31T23:00:00+02:00'::timestamptz, false, '31.10 · 23:00'
from public.cities c
join public.event_types t on t.slug = 'rave'
where c.slug = 'marrakesh'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'tanger-detroit-sessions', c.id, t.id, 'Détroit Sessions', 'Cap Spartel · 05.09 · 17:00', 'Two seas meet here and the wind cannot decide which way to blow.',
       87, '2026-09-05T17:00:00+02:00'::timestamptz, false, '05.09 · 17:00'
from public.cities c
join public.event_types t on t.slug = 'festival'
where c.slug = 'tanger'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'tanger-rue-de-la-plage', c.id, t.id, 'Rue de la Plage', 'Malabata · 14.11 · 23:00', 'A room that has been a cinema, a café, and now this.',
       88, '2026-11-14T23:00:00+02:00'::timestamptz, false, '14.11 · 23:00'
from public.cities c
join public.event_types t on t.slug = 'club-night'
where c.slug = 'tanger'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'new-york-bushwick-loft', c.id, t.id, 'Bushwick Loft', 'Bushwick · 12.09 · 23:00', 'Freight lift, fourth floor, and a door person who remembers faces.',
       89, '2026-09-12T23:00:00+02:00'::timestamptz, false, '12.09 · 23:00'
from public.cities c
join public.event_types t on t.slug = 'club-night'
where c.slug = 'new-york'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'new-york-bowery-basement', c.id, t.id, 'Bowery Basement', 'Lower East Side · 03.10 · 20:00', 'Two hundred people in a room built for eighty, which is the tradition.',
       90, '2026-10-03T20:00:00+02:00'::timestamptz, false, '03.10 · 20:00'
from public.cities c
join public.event_types t on t.slug = 'konzert'
where c.slug = 'new-york'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'chicago-south-side-warehouse', c.id, t.id, 'South Side Warehouse', 'Bridgeport · 26.09 · 00:00', 'Where the whole thing started, and the room still acts like it knows.',
       91, '2026-09-26T00:00:00+02:00'::timestamptz, false, '26.09 · 00:00'
from public.cities c
join public.event_types t on t.slug = 'rave'
where c.slug = 'chicago'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'chicago-record-fair', c.id, t.id, 'Record Fair', 'Pilsen · 18.10 · 11:00', 'Crates on folding tables. Bring cash and a bag you can carry home.',
       92, '2026-10-18T11:00:00+02:00'::timestamptz, false, '18.10 · 11:00'
from public.cities c
join public.event_types t on t.slug = 'meetup'
where c.slug = 'chicago'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'detroit-eastern-market-late', c.id, t.id, 'Eastern Market Late', 'Eastern Market · 10.10 · 23:30', 'Produce sheds by day. The concrete floor takes the low end perfectly.',
       93, '2026-10-10T23:30:00+02:00'::timestamptz, false, '10.10 · 23:30'
from public.cities c
join public.event_types t on t.slug = 'club-night'
where c.slug = 'detroit'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'detroit-riverfront-open-air', c.id, t.id, 'Riverfront Open Air', 'Detroit Riverfront · 05.09 · 15:00', 'Canada on the far bank, close enough to wave at.',
       94, '2026-09-05T15:00:00+02:00'::timestamptz, false, '05.09 · 15:00'
from public.cities c
join public.event_types t on t.slug = 'festival'
where c.slug = 'detroit'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'ciudad-de-mexico-roma-norte-sotano', c.id, t.id, 'Roma Norte Sótano', 'Roma Norte · 19.09 · 23:30', 'A basement under a building that survived two earthquakes and shows it.',
       95, '2026-09-19T23:30:00+02:00'::timestamptz, false, '19.09 · 23:30'
from public.cities c
join public.event_types t on t.slug = 'club-night'
where c.slug = 'ciudad-de-mexico'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'ciudad-de-mexico-vecindad', c.id, t.id, 'Vecindad', 'Doctores · 07.11 · 01:00', 'Courtyard housing, doors open onto it, and the party is the courtyard.',
       96, '2026-11-07T01:00:00+02:00'::timestamptz, false, '07.11 · 01:00'
from public.cities c
join public.event_types t on t.slug = 'rave'
where c.slug = 'ciudad-de-mexico'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'guadalajara-teatro-chico', c.id, t.id, 'Teatro Chico', 'Centro · 24.10 · 20:00', 'Velvet seats nobody uses, because everyone stands from the first song.',
       97, '2026-10-24T20:00:00+02:00'::timestamptz, false, '24.10 · 20:00'
from public.cities c
join public.event_types t on t.slug = 'konzert'
where c.slug = 'guadalajara'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'guadalajara-azotea', c.id, t.id, 'Azotea', 'Americana · 14.11 · 21:00', 'Rooftop, string lights, and a view of every other rooftop doing the same.',
       98, '2026-11-14T21:00:00+02:00'::timestamptz, false, '14.11 · 21:00'
from public.cities c
join public.event_types t on t.slug = 'hausparty'
where c.slug = 'guadalajara'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'monterrey-cerro-sonoro', c.id, t.id, 'Cerro Sonoro', 'Parque Fundidora · 12.09 · 16:00', 'Old steelworks, mountains behind, and heat that only breaks at nine.',
       99, '2026-09-12T16:00:00+02:00'::timestamptz, false, '12.09 · 16:00'
from public.cities c
join public.event_types t on t.slug = 'festival'
where c.slug = 'monterrey'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'monterrey-fanzine-nocturno', c.id, t.id, 'Fanzine Nocturno', 'Barrio Antiguo · 01.11 · 18:00', 'Photocopies, folding tables, and arguments about staples.',
       100, '2026-11-01T18:00:00+02:00'::timestamptz, false, '01.11 · 18:00'
from public.cities c
join public.event_types t on t.slug = 'meetup'
where c.slug = 'monterrey'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'montreal-mile-end-loft', c.id, t.id, 'Mile End Loft', 'Mile End · 03.10 · 23:00', 'A permit that expires at three and a crowd that has read it.',
       101, '2026-10-03T23:00:00+02:00'::timestamptz, false, '03.10 · 23:00'
from public.cities c
join public.event_types t on t.slug = 'club-night'
where c.slug = 'montreal'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'montreal-plateau-church', c.id, t.id, 'Plateau Church', 'Le Plateau · 21.11 · 19:30', 'Deconsecrated, freezing, and acoustically almost unfair.',
       102, '2026-11-21T19:30:00+02:00'::timestamptz, false, '21.11 · 19:30'
from public.cities c
join public.event_types t on t.slug = 'konzert'
where c.slug = 'montreal'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'toronto-junction-warehouse', c.id, t.id, 'Junction Warehouse', 'The Junction · 17.10 · 00:30', 'Beside a rail line, so the low end has competition twice an hour.',
       103, '2026-10-17T00:30:00+02:00'::timestamptz, false, '17.10 · 00:30'
from public.cities c
join public.event_types t on t.slug = 'rave'
where c.slug = 'toronto'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'toronto-kensington-swap', c.id, t.id, 'Kensington Swap', 'Kensington Market · 27.09 · 13:00', 'Trade a record, trade a jacket, trade a phone number. All equally likely.',
       104, '2026-09-27T13:00:00+02:00'::timestamptz, false, '27.09 · 13:00'
from public.cities c
join public.event_types t on t.slug = 'meetup'
where c.slug = 'toronto'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'vancouver-east-van-basement', c.id, t.id, 'East Van Basement', 'East Vancouver · 07.11 · 21:00', 'Rain outside, condensation inside, and nobody going home early because of either.',
       105, '2026-11-07T21:00:00+02:00'::timestamptz, false, '07.11 · 21:00'
from public.cities c
join public.event_types t on t.slug = 'hausparty'
where c.slug = 'vancouver'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'vancouver-harbour-open-air', c.id, t.id, 'Harbour Open Air', 'Crab Park · 05.09 · 15:00', 'Mountains on one side, container cranes on the other.',
       106, '2026-09-05T15:00:00+02:00'::timestamptz, false, '05.09 · 15:00'
from public.cities c
join public.event_types t on t.slug = 'festival'
where c.slug = 'vancouver'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'sao-paulo-barra-funda', c.id, t.id, 'Barra Funda', 'Barra Funda · 19.09 · 23:59', 'Nothing starts before midnight and nothing ends before the metro reopens.',
       107, '2026-09-19T23:59:00+02:00'::timestamptz, false, '19.09 · 23:59'
from public.cities c
join public.event_types t on t.slug = 'club-night'
where c.slug = 'sao-paulo'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'sao-paulo-minhoc-o', c.id, t.id, 'Minhocão', 'Elevado · 31.10 · 01:00', 'An elevated road closed to cars on Sundays, borrowed a few hours early.',
       108, '2026-10-31T01:00:00+02:00'::timestamptz, false, '31.10 · 01:00'
from public.cities c
join public.event_types t on t.slug = 'rave'
where c.slug = 'sao-paulo'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'rio-de-janeiro-lapa-arcos', c.id, t.id, 'Lapa Arcos', 'Lapa · 12.09 · 18:00', 'Under the arches, where four sound systems negotiate all night.',
       109, '2026-09-12T18:00:00+02:00'::timestamptz, false, '12.09 · 18:00'
from public.cities c
join public.event_types t on t.slug = 'festival'
where c.slug = 'rio-de-janeiro'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'rio-de-janeiro-roda-na-praca', c.id, t.id, 'Roda na Praça', 'Santa Teresa · 04.10 · 16:00', 'A circle, instruments passed around it, and no stage anywhere.',
       110, '2026-10-04T16:00:00+02:00'::timestamptz, false, '04.10 · 16:00'
from public.cities c
join public.event_types t on t.slug = 'meetup'
where c.slug = 'rio-de-janeiro'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'belo-horizonte-praca-sonora', c.id, t.id, 'Praça Sonora', 'Savassi · 24.10 · 19:00', 'A square that fills from the edges in, until you cannot see where it started.',
       111, '2026-10-24T19:00:00+02:00'::timestamptz, false, '24.10 · 19:00'
from public.cities c
join public.event_types t on t.slug = 'konzert'
where c.slug = 'belo-horizonte'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'belo-horizonte-casa-amarela', c.id, t.id, 'Casa Amarela', 'Santa Efigênia · 21.11 · 21:00', 'Yellow house, green gate, and a hill that punishes anyone who arrives late.',
       112, '2026-11-21T21:00:00+02:00'::timestamptz, false, '21.11 · 21:00'
from public.cities c
join public.event_types t on t.slug = 'hausparty'
where c.slug = 'belo-horizonte'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'buenos-aires-palermo-sotano', c.id, t.id, 'Palermo Sótano', 'Palermo · 26.09 · 01:00', 'Dinner at eleven, arrive at one, leave when the bakeries open.',
       113, '2026-09-26T01:00:00+02:00'::timestamptz, false, '26.09 · 01:00'
from public.cities c
join public.event_types t on t.slug = 'club-night'
where c.slug = 'buenos-aires'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'buenos-aires-galpon-san-telmo', c.id, t.id, 'Galpón San Telmo', 'San Telmo · 14.11 · 20:30', 'A shed with a tin roof that becomes an instrument when it rains.',
       114, '2026-11-14T20:30:00+02:00'::timestamptz, false, '14.11 · 20:30'
from public.cities c
join public.event_types t on t.slug = 'konzert'
where c.slug = 'buenos-aires'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'cordoba-sierra-chica', c.id, t.id, 'Sierra Chica', 'outside the city · 10.10 · 23:00', 'Forty minutes out, no lights on the road, and a horizon you can hear.',
       115, '2026-10-10T23:00:00+02:00'::timestamptz, false, '10.10 · 23:00'
from public.cities c
join public.event_types t on t.slug = 'rave'
where c.slug = 'cordoba'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'cordoba-feria-de-discos', c.id, t.id, 'Feria de Discos', 'Güemes · 18.10 · 12:00', 'Sunday, tables, and one man who will not sell you the record you want.',
       116, '2026-10-18T12:00:00+02:00'::timestamptz, false, '18.10 · 12:00'
from public.cities c
join public.event_types t on t.slug = 'meetup'
where c.slug = 'cordoba'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'rosario-costanera', c.id, t.id, 'Costanera', 'Paraná riverfront · 05.09 · 17:00', 'The river is a kilometre wide here and the sound just keeps going.',
       117, '2026-09-05T17:00:00+02:00'::timestamptz, false, '05.09 · 17:00'
from public.cities c
join public.event_types t on t.slug = 'festival'
where c.slug = 'rosario'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'rosario-casa-chica', c.id, t.id, 'Casa Chica', 'Pichincha · 07.11 · 22:00', 'A small house with too many people in it, which is the entire concept.',
       118, '2026-11-07T22:00:00+02:00'::timestamptz, false, '07.11 · 22:00'
from public.cities c
join public.event_types t on t.slug = 'hausparty'
where c.slug = 'rosario'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'bogota-chapinero-bajo', c.id, t.id, 'Chapinero Bajo', 'Chapinero · 19.09 · 22:30', 'Two thousand six hundred metres up, so pace yourself early.',
       119, '2026-09-19T22:30:00+02:00'::timestamptz, false, '19.09 · 22:30'
from public.cities c
join public.event_types t on t.slug = 'club-night'
where c.slug = 'bogota'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'bogota-bodega-norte', c.id, t.id, 'Bodega Norte', 'Usaquén · 28.11 · 00:00', 'Cold outside, which makes the room feel like a decision.',
       120, '2026-11-28T00:00:00+02:00'::timestamptz, false, '28.11 · 00:00'
from public.cities c
join public.event_types t on t.slug = 'rave'
where c.slug = 'bogota'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'medellin-comuna-abierta', c.id, t.id, 'Comuna Abierta', 'Comuna 13 · 12.09 · 15:00', 'Escalators up the hillside, sound at every landing.',
       121, '2026-09-12T15:00:00+02:00'::timestamptz, false, '12.09 · 15:00'
from public.cities c
join public.event_types t on t.slug = 'festival'
where c.slug = 'medellin'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'medellin-intercambio', c.id, t.id, 'Intercambio', 'Laureles · 01.11 · 17:00', 'Bring something to swap and something to say about it.',
       122, '2026-11-01T17:00:00+02:00'::timestamptz, false, '01.11 · 17:00'
from public.cities c
join public.event_types t on t.slug = 'meetup'
where c.slug = 'medellin'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'cali-salsa-vieja', c.id, t.id, 'Salsa Vieja', 'Barrio Obrero · 17.10 · 21:00', 'Live brass in a room where everyone already knows the steps.',
       123, '2026-10-17T21:00:00+02:00'::timestamptz, false, '17.10 · 21:00'
from public.cities c
join public.event_types t on t.slug = 'konzert'
where c.slug = 'cali'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'cali-terraza', c.id, t.id, 'Terraza', 'San Antonio · 21.11 · 20:00', 'A terrace above the old town, and a hill that keeps the noise local.',
       124, '2026-11-21T20:00:00+02:00'::timestamptz, false, '21.11 · 20:00'
from public.cities c
join public.event_types t on t.slug = 'hausparty'
where c.slug = 'cali'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'sydney-marrickville-warehouse', c.id, t.id, 'Marrickville Warehouse', 'Marrickville · 26.09 · 22:00', 'Industrial estate, one unmarked roller door, and a noise complaint waiting to happen.',
       125, '2026-09-26T22:00:00+02:00'::timestamptz, false, '26.09 · 22:00'
from public.cities c
join public.event_types t on t.slug = 'club-night'
where c.slug = 'sydney'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'sydney-harbour-sunset', c.id, t.id, 'Harbour Sunset', 'Barangaroo · 05.09 · 16:00', 'Finishes at ten because the council says so, and nobody argues.',
       126, '2026-09-05T16:00:00+02:00'::timestamptz, false, '05.09 · 16:00'
from public.cities c
join public.event_types t on t.slug = 'festival'
where c.slug = 'sydney'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'melbourne-laneway-late', c.id, t.id, 'Laneway Late', 'Collingwood · 10.10 · 00:00', 'A lane so narrow the sound has nowhere to go but up.',
       127, '2026-10-10T00:00:00+02:00'::timestamptz, false, '10.10 · 00:00'
from public.cities c
join public.event_types t on t.slug = 'rave'
where c.slug = 'melbourne'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'melbourne-vinyl-sunday', c.id, t.id, 'Vinyl Sunday', 'Fitzroy · 18.10 · 12:00', 'Four hours, no phones on the table, and coffee taken very seriously.',
       128, '2026-10-18T12:00:00+02:00'::timestamptz, false, '18.10 · 12:00'
from public.cities c
join public.event_types t on t.slug = 'meetup'
where c.slug = 'melbourne'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'brisbane-fortitude-hall', c.id, t.id, 'Fortitude Hall', 'Fortitude Valley · 24.10 · 19:30', 'Humid enough that the band and the crowd are equally wet by the third song.',
       129, '2026-10-24T19:30:00+02:00'::timestamptz, false, '24.10 · 19:30'
from public.cities c
join public.event_types t on t.slug = 'konzert'
where c.slug = 'brisbane'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'brisbane-queenslander', c.id, t.id, 'Queenslander', 'West End · 14.11 · 20:00', 'A house on stilts, the party underneath it, and the mosquitos invited.',
       130, '2026-11-14T20:00:00+02:00'::timestamptz, false, '14.11 · 20:00'
from public.cities c
join public.event_types t on t.slug = 'hausparty'
where c.slug = 'brisbane'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'auckland-k-road-basement', c.id, t.id, 'K Road Basement', 'Karangahape Road · 19.09 · 23:00', 'The street has changed hands four times; the basement has not changed at all.',
       131, '2026-09-19T23:00:00+02:00'::timestamptz, false, '19.09 · 23:00'
from public.cities c
join public.event_types t on t.slug = 'club-night'
where c.slug = 'auckland'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'auckland-waterfront-walk', c.id, t.id, 'Waterfront Walk', 'Wynyard Quarter · 27.09 · 17:00', 'An hour along the water, then whoever is left picks a bar.',
       132, '2026-09-27T17:00:00+02:00'::timestamptz, false, '27.09 · 17:00'
from public.cities c
join public.event_types t on t.slug = 'meetup'
where c.slug = 'auckland'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'wellington-cuba-street-cellar', c.id, t.id, 'Cuba Street Cellar', 'Te Aro · 17.10 · 23:30', 'Wind outside that could take the door off, and a room that stays warm anyway.',
       133, '2026-10-17T23:30:00+02:00'::timestamptz, false, '17.10 · 23:30'
from public.cities c
join public.event_types t on t.slug = 'rave'
where c.slug = 'wellington'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'wellington-harbour-stage', c.id, t.id, 'Harbour Stage', 'Oriental Bay · 07.11 · 18:00', 'Played into a southerly, which every band here is prepared for.',
       134, '2026-11-07T18:00:00+02:00'::timestamptz, false, '07.11 · 18:00'
from public.cities c
join public.event_types t on t.slug = 'konzert'
where c.slug = 'wellington'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'christchurch-rebuild-open-air', c.id, t.id, 'Rebuild Open Air', 'Central City · 12.09 · 15:00', 'On a site that has been three different things since 2011.',
       135, '2026-09-12T15:00:00+02:00'::timestamptz, false, '12.09 · 15:00'
from public.cities c
join public.event_types t on t.slug = 'festival'
where c.slug = 'christchurch'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'christchurch-villa-backyard', c.id, t.id, 'Villa Backyard', 'Riccarton · 21.11 · 19:00', 'Long grass, borrowed chairs, and a fire that someone thought about in advance.',
       136, '2026-11-21T19:00:00+02:00'::timestamptz, false, '21.11 · 19:00'
from public.cities c
join public.event_types t on t.slug = 'hausparty'
where c.slug = 'christchurch'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'suva-seawall-sundown', c.id, t.id, 'Seawall Sundown', 'Suva seawall · 26.09 · 17:30', 'Everyone sits facing the same way. The event is the sunset and the talking.',
       137, '2026-09-26T17:30:00+02:00'::timestamptz, false, '26.09 · 17:30'
from public.cities c
join public.event_types t on t.slug = 'meetup'
where c.slug = 'suva'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'suva-victoria-parade', c.id, t.id, 'Victoria Parade', 'Victoria Parade · 24.10 · 22:00', 'Rain most evenings, and the room fills faster when it comes.',
       138, '2026-10-24T22:00:00+02:00'::timestamptz, false, '24.10 · 22:00'
from public.cities c
join public.event_types t on t.slug = 'club-night'
where c.slug = 'suva'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'nadi-reef-open-air', c.id, t.id, 'Reef Open Air', 'Wailoaloa Beach · 05.09 · 16:00', 'Sand, one stage, and a tide that decides how much room there is.',
       139, '2026-09-05T16:00:00+02:00'::timestamptz, false, '05.09 · 16:00'
from public.cities c
join public.event_types t on t.slug = 'festival'
where c.slug = 'nadi'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'nadi-backyard-lovo', c.id, t.id, 'Backyard Lovo', 'Namaka · 14.11 · 18:00', 'Food buried in the ground hours before anyone arrives. Worth the wait.',
       140, '2026-11-14T18:00:00+02:00'::timestamptz, false, '14.11 · 18:00'
from public.cities c
join public.event_types t on t.slug = 'hausparty'
where c.slug = 'nadi'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'lautoka-sugar-city-hall', c.id, t.id, 'Sugar City Hall', 'Lautoka · 17.10 · 19:00', 'The mill smells of molasses for six months a year and tonight is one of them.',
       141, '2026-10-17T19:00:00+02:00'::timestamptz, false, '17.10 · 19:00'
from public.cities c
join public.event_types t on t.slug = 'konzert'
where c.slug = 'lautoka'
on conflict (slug) do nothing;

insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select 'lautoka-mill-yard', c.id, t.id, 'Mill Yard', 'Lautoka Mill · 28.11 · 23:00', 'Cane trains on one side, sound system on the other, both running late.',
       142, '2026-11-28T23:00:00+02:00'::timestamptz, false, '28.11 · 23:00'
from public.cities c
join public.event_types t on t.slug = 'rave'
where c.slug = 'lautoka'
on conflict (slug) do nothing;


-- Stamp the migration log, if it is there (00_migrations.sql).
do $$ begin
  if to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('11_world.sql');
  end if;
end $$;


-- ============================================================
--  PEOPLE PROFILES   (12_profiles.sql)
-- ============================================================

-- afterhours — people profiles
-- In 01 a profile was only "who you are + are you an admin". The real
-- profile, the one that appears after signing up, is defined here.
--
-- Split in two, because the two are not the same thing:
--
--   profiles           the PUBLIC card — handle, name, one line, city.
--                      This is what a friend and a stranger both see.
--   profile_settings   YOURS ALONE — who may see what, whether we may
--                      email you. Not even an admin can read it.
--
-- Without the split, the "everyone reads" rule on profiles would have

-- ------------------------------------------------------- the public card

alter table public.profiles
  add column if not exists bio          text,
  add column if not exists city_id      uuid references public.cities on delete set null,
  -- Registration is not finished yet: the account opens, and choosing a
  -- handle is what finishes it.
  add column if not exists onboarded_at timestamptz,
  add column if not exists last_seen_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_bio_uzunluk;
alter table public.profiles
  drop constraint if exists profiles_bio_length;
alter table public.profiles
  add constraint profiles_bio_length
  check (bio is null or length(btrim(bio)) between 1 and 160);

alter table public.profiles
  drop constraint if exists profiles_ad_uzunluk;
alter table public.profiles
  drop constraint if exists profiles_name_length;
alter table public.profiles
  add constraint profiles_name_length
  check (display_name is null or length(btrim(display_name)) between 1 and 40);

create index if not exists profiles_city_idx on public.profiles (city_id);

-- ------------------------------------------------------ per-person settings

create table if not exists public.profile_settings (
  user_id         uuid primary key references public.profiles on delete cascade,
  -- Who may see what you kept: confirmed friends, or nobody.
  -- What you threw left is shown under no setting at all.
  kept_visibility text not null default 'friends'
                  check (kept_visibility in ('friends', 'private')),
  -- Whether a stranger who knows your handle sees your card. Turn it off
  -- and the card is hidden; but someone who knows the handle can still
  -- send a request, or nobody could ever add you.
  discoverable    boolean not null default true,
  -- For friend requests, the odd reminder about a night, that sort of thing.
  notify_email    boolean not null default true,
  locale          text not null default 'en' check (locale in ('en', 'de', 'tr')),
  updated_at      timestamptz not null default now()
);

alter table public.profile_settings enable row level security;

-- Yours alone. Nobody, admin included, can read another person row.
drop policy if exists settings_read_own on public.profile_settings;
create policy settings_read_own on public.profile_settings for select
  using (user_id = auth.uid());

drop policy if exists settings_write_own on public.profile_settings;
create policy settings_write_own on public.profile_settings for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists settings_insert_own on public.profile_settings;
create policy settings_insert_own on public.profile_settings for insert
  with check (user_id = auth.uid());

drop trigger if exists settings_touch on public.profile_settings;
create trigger settings_touch
  before update on public.profile_settings
  for each row execute function public.touch_updated_at();

-- ------------------------------- signing up: the profile appears by itself

-- This replaces the trigger from 01. Two differences:
--   · the settings row is opened too (without it nobody sees their settings)
--   · if the register form sent a handle/city they are tried; a taken
--     handle is quietly left empty and picked later
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
     or exists (select 1 from public.profiles where handle = wanted) then
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Accounts opened earlier have no settings row; fill them in once.
insert into public.profile_settings (user_id)
select p.id from public.profiles p
left join public.profile_settings s on s.user_id = p.id
where s.user_id is null;

-- ------------------------------------------------ is the handle available

-- The register form asks on every keystroke. The returned values are not
-- shown as they are; the page writes its own sentence.
--   ok · empty · format · taken · yours
create or replace function public.handle_status(p_handle text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when coalesce(btrim(p_handle), '') = ''            then 'empty'
    when lower(btrim(p_handle)) !~ '^[a-z0-9_]{3,20}$' then 'format'
    when exists (select 1 from public.profiles
                 where handle = lower(btrim(p_handle)) and id = auth.uid()) then 'yours'
    when exists (select 1 from public.profiles
                 where handle = lower(btrim(p_handle))) then 'taken'
    else 'ok'
  end;
$$;

-- ------------------------------------------ the step that finishes signup

-- The one thing that must happen after the account opens: a handle. The
-- rest is optional. It all goes in one request so no profile is left half done.
-- security definer, because the direct UPDATE grant on profiles is
-- limited to the four fields a person may edit (see the privileges at
-- the bottom); onboarded_at is stamped only through here.
create or replace function public.profile_setup(
  p_handle       text,
  p_display_name text default null,
  p_city_slug    text default null,
  p_bio          text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  handle_state    text := public.handle_status(p_handle);
  city_uuid uuid;
begin
  if auth.uid() is null then return 'signedout'; end if;
  if handle_state not in ('ok', 'yours') then return handle_state; end if;

  if coalesce(btrim(p_city_slug), '') <> '' then
    select id into city_uuid from public.cities where slug = lower(btrim(p_city_slug));
    if city_uuid is null then return 'nocity'; end if;
  end if;

  update public.profiles set
    handle       = lower(btrim(p_handle)),
    display_name = coalesce(nullif(btrim(p_display_name), ''), display_name),
    city_id      = coalesce(city_uuid, city_id),
    bio          = case when p_bio is null then bio
                        else nullif(btrim(p_bio), '') end,
    onboarded_at = coalesce(onboarded_at, now())
  where id = auth.uid();

  insert into public.profile_settings (user_id)
  values (auth.uid()) on conflict (user_id) do nothing;

  return 'ok';
end;
$$;

-- ------------------------------------------------------------ your profile

-- The one place the settings page and the account page read. The counts
-- are gathered here so the front end does not make three requests.
drop function if exists public.profile_me();
create or replace function public.profile_me()
returns table (
  id              uuid,
  handle          text,
  display_name    text,
  bio             text,
  city_slug       text,
  city_name       text,
  is_admin        boolean,
  onboarded       boolean,
  created_at      timestamptz,
  last_seen_at    timestamptz,
  kept_count      int,
  friend_count    int,
  comment_count   int,
  kept_visibility text,
  discoverable    boolean,
  notify_email    boolean,
  locale          text
)
language sql
stable
as $$
  select p.id, p.handle, p.display_name, p.bio,
         c.slug, c.name,
         p.is_admin, p.onboarded_at is not null,
         p.created_at, p.last_seen_at,
         (select count(*)::int from public.swipes s
           where s.user_id = p.id and s.direction = 'right'),
         (select count(*)::int from public.friendships f
           where f.status = 'accepted'
             and (f.requester_id = p.id or f.addressee_id = p.id)),
         (select count(*)::int from public.comments m
           where m.author_id = p.id and not m.is_hidden),
         coalesce(s.kept_visibility, 'friends'),
         coalesce(s.discoverable, true),
         coalesce(s.notify_email, true),
         coalesce(s.locale, 'en')
  from public.profiles p
  left join public.cities c on c.id = p.city_id
  left join public.profile_settings s on s.user_id = p.id
  where p.id = auth.uid();
$$;

-- ------------------------------------------------------------- privacy

-- In 02 the profile table was "everyone reads": somebody without an
-- an account could pull down the whole member list in one request. The
-- read directly are your own, your confirmed friends, and anyone with a
-- request pending between you. Everything a stranger sees goes through
-- the functions below; each hands back only the field it owes.

-- A friend, or a request pending — in either direction.
create or replace function public.is_linked(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.friendships f
    where (f.requester_id = auth.uid() and f.addressee_id = other)
       or (f.addressee_id = auth.uid() and f.requester_id = other)
  );
$$;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select
  using (
    id = auth.uid()
    or public.is_linked(id)
    or public.is_admin()
  );

-- Identity by handle. The rule now stops a stranger, so the lookup goes
-- through here; the only thing that leaks is whether such a person exists.
create or replace function public.handle_to_id(p_handle text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where handle = lower(btrim(p_handle));
$$;

-- Discoverability from the settings. You always see yourself and a friend.
create or replace function public.card_visible(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select other = auth.uid()
      or public.is_friend(other)
      or coalesce((select s.discoverable from public.profile_settings s
                   where s.user_id = other), true);
$$;

-- The name under a comment. comments_public no longer touches the profile
-- table any more: a signed-out reader should still see who wrote it.
create or replace function public.author_name(p_author uuid, p_fallback text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select coalesce(p.handle, p.display_name) from public.profiles p where p.id = p_author),
    p_fallback);
$$;

-- To read the setting for another person: only the owner can see
-- profile_settings, so this function steps around RLS. The only thing that
-- leaks is the yes or no of "is it visible".
create or replace function public.kept_visible(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select s.kept_visibility from public.profile_settings s
                   where s.user_id = other), 'friends') = 'friends';
$$;


-- --------------------------------------------- the profile of another

-- The card a stranger sees. Even the NUMBER of things you kept is only
-- to friends, and only when the setting allows it.
drop function if exists public.profile_card(text);
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
language sql
stable
security definer
set search_path = public
as $$
  select p.handle, p.display_name, p.bio, c.name, p.created_at,
         -- Last seen goes to friends only, and only as a DAY. The hour and minute
         -- reach nobody: who is awake when should not be worked out from this.
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
$$;

-- ---------------------------------------------------------------- seen

-- For the "already on the app" list in friends&more. A person stamps
-- their own row only: the update is pinned to auth.uid(). Definer,
-- because last_seen_at is not in the direct UPDATE grant — the stamp
-- goes through here or not at all.
create or replace function public.seen()
returns void
language sql
volatile
security definer
set search_path = public
as $$
  update public.profiles set last_seen_at = now() where id = auth.uid();
$$;

-- ------------------------------- what you kept: a rule that obeys the setting

-- The rule in 02 said "a confirmed friend sees the RIGHT swipes". A
-- setting was added: say private and a friend cannot see them either. We
-- rewrite the rule here — run 02 on its own and the old one still applies.
drop policy if exists swipes_read on public.swipes;
create policy swipes_read on public.swipes for select
  using (
    user_id = auth.uid()
    or (direction = 'right'
        and public.is_friend(user_id)
        and public.kept_visible(user_id))
  );

-- ------------------------------ two older definitions the rule broke

-- comments_public used to join the profile table; once that rule closed,
-- table; a signed-out reader was getting an empty author. A definer
-- function hands back the name and the view never reaches for profiles.
create or replace view public.comments_public
with (security_invoker = true) as
select
  c.id,
  c.event_id,
  c.parent_id,
  c.body,
  c.time_text,
  c.created_at,
  public.author_name(c.author_id, c.author_name) as author,
  c.author_id is not null as is_real
from public.comments c
where not c.is_hidden;

-- friend_request looked identity up by handle; that lookup goes through
-- a definer helper. The function itself is NOT definer: it still writes
-- the friendship row with the rights of whoever called it.
create or replace function public.friend_request(p_handle text)
returns text
language plpgsql
as $$
declare
  target uuid;
begin
  target := public.handle_to_id(p_handle);

  if target is null then
    return 'notfound';
  end if;
  if target = auth.uid() then
    return 'yourself';
  end if;

  if exists (select 1 from public.friendships
             where requester_id = target and addressee_id = auth.uid()) then
    update public.friendships set status = 'accepted'
    where requester_id = target and addressee_id = auth.uid();
    return 'accepted';
  end if;

  insert into public.friendships (requester_id, addressee_id)
  values (auth.uid(), target)
  on conflict do nothing;
  return 'sent';
end;
$$;

-- ------------------------------------------------- deleting the account

-- The last button on the settings page. Deleting really deletes: the
-- account, profile, settings, swipes and friendships all cascade away.
--
-- Comments are the EXCEPTION, for two reasons: (1) comments.author_id is
-- "on delete set
-- null" and author_name cannot be empty - deleting without touching it
-- (2) deleting a topic would take the replies of OTHER PEOPLE with it.
-- So the text stays and the name goes: the comment becomes "someone".
-- The settings page says so before you press it.
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'sign in first';
  end if;

  update public.comments
     set author_id = null, author_name = 'someone'
   where author_id = auth.uid();

  delete from auth.users where id = auth.uid();
end;
$$;

-- ----------------------------------------------------------- privileges

-- Supabase does not grant on a new table by itself; by hand, as in 02.
grant select, insert, update on public.profile_settings to authenticated;

-- The direct UPDATE on profiles covers exactly the four fields a person
-- edits about themselves. created_at, last_seen_at and onboarded_at are
-- the record’s own truth — writable only through seen() and
-- profile_setup(), which are definer and set them honestly. The old
-- table-wide grant from 02 is taken back first (grants pile up).
revoke update on public.profiles from authenticated;
grant update (handle, display_name, bio, city_id) on public.profiles to authenticated;

grant execute on function public.handle_status(text)                   to anon, authenticated;
grant execute on function public.profile_card(text)                    to anon, authenticated;
grant execute on function public.is_linked(uuid)                       to anon, authenticated;
grant execute on function public.kept_visible(uuid)                    to authenticated;
grant execute on function public.handle_to_id(text)                    to authenticated;
grant execute on function public.author_name(uuid, text)               to anon, authenticated;

-- The uuid→fact helpers exist for the rules and views that call them,
-- not as a public API — each one is a small oracle on somebody’s data.
-- Two have to stay callable by the browser roles: is_linked runs inside
-- the profiles read rule, author_name inside comments_public (both are
-- invoker, so the caller needs EXECUTE). The rest close: kept_visible
-- only serves the swipes rule (authenticated), handle_to_id only
-- friend_request (authenticated), and card_visible only profile_card,
-- which is definer and needs no grant at all.
revoke execute on function public.card_visible(uuid) from public, anon, authenticated;
revoke execute on function public.kept_visible(uuid) from public, anon;
revoke execute on function public.handle_to_id(text) from public, anon;
grant execute on function public.profile_setup(text, text, text, text) to authenticated;
grant execute on function public.profile_me()                          to authenticated;
grant execute on function public.seen()                                to authenticated;
grant execute on function public.delete_account()                      to authenticated;

-- Stamp the migration log, if it is there. Each numbered file still runs on
-- its own (the tests load them one at a time), so this cannot insist.
do $$ begin
  if to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('12_profiles.sql');
  end if;
end $$;


-- ============================================================
--  FEEDBACK   (13_feedback.sql)
-- ============================================================

-- afterhours — feedback
-- What sits behind the "give feedback → help us" page. One table, two rules:
-- everyone may write, only the admin may read.
--
-- You can write without signing in, because opening an account just to
-- report something broken is absurd. Whoever writes may then leave a
-- way to reach them; if not, what they wrote is still read, they just get
-- no answer.

create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  -- If signed in, who wrote it is filled in automatically; if the account
  -- is deleted the text stays and the name falls away.
  author_id   uuid default auth.uid() references public.profiles on delete set null,
  -- An email or some other way back, left by a signed-out writer. Optional.
  contact     text check (contact is null or length(btrim(contact)) between 3 and 120),
  kind        text not null default 'other'
              check (kind in ('broken', 'idea', 'event', 'other')),
  body        text not null check (length(btrim(body)) between 10 and 2000),
  -- The "this has been dealt with" mark on the admin side.
  handled     boolean not null default false,
  created_at  timestamptz not null default now()
);

drop index if exists public.feedback_yeni_idx;   -- the name from before the code spoke English
create index if not exists feedback_recent_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

-- Everyone writes, signed in or not. One condition: not in another name.
drop policy if exists feedback_write on public.feedback;
create policy feedback_write on public.feedback for insert
  with check (author_id is null or author_id = auth.uid());

-- Only the admin reads. Not even the writer can read their own back:
-- this is an inbox, not a conversation.
drop policy if exists feedback_read on public.feedback;
create policy feedback_read on public.feedback for select
  using (public.is_admin());

drop policy if exists feedback_handle on public.feedback;
create policy feedback_handle on public.feedback for update
  using (public.is_admin()) with check (public.is_admin());

-- The list the admin panel reads: the writer resolved, the newest on top.
drop function if exists public.feedback_list(int);
create or replace function public.feedback_list(p_limit int default 100)
returns table (
  id         uuid,
  kind       text,
  body       text,
  author     text,
  contact    text,
  handled    boolean,
  created_at timestamptz
)
language sql
stable
as $$
  select f.id, f.kind, f.body,
         public.author_name(f.author_id, null),
         f.contact, f.handled, f.created_at
  from public.feedback f
  order by f.created_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;

-- Writers may fill in exactly what the form asks: the subject, the words
-- and a way back. handled belongs to the admin’s PATCH, created_at to the
-- clock — neither is anyone’s to send. (The old broad grants are taken
-- back first; grants pile up on a database that ran an earlier version.)
revoke insert, update on public.feedback from anon, authenticated;
grant insert (author_id, kind, body, contact) on public.feedback to anon, authenticated;
grant update (handled) on public.feedback to authenticated;
grant select on public.feedback to authenticated;
grant execute on function public.feedback_list(int) to authenticated;

-- Stamp the migration log, if it is there. Each numbered file still runs on
-- its own (the tests load them one at a time), so this cannot insist.
do $$ begin
  if to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('13_feedback.sql');
  end if;
end $$;


-- ============================================================
--  TAKE YOUR DATA WITH YOU   (14_export.sql)
-- ============================================================

-- afterhours — everything we hold about one person, in one call
-- The GDPR calls this the right of access (Art. 15) and the right to data
-- portability (Art. 20): a person may ask for their own data, and get it
-- in a form a machine can read. The site says so in datenschutz, so it has
-- to be true.
--
-- One function, and it only ever answers about the caller. There is no
-- argument to point it at somebody else.

create or replace function public.export_me()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'taken_at', now(),
    'about', 'Everything afterhours holds about you. Your account email lives'
             || ' with the sign-in provider, not in this database.',

    'profile', (
      select to_jsonb(x) from (
        select p.handle, p.display_name, p.bio, c.slug as city,
               p.created_at as joined, p.onboarded_at, p.last_seen_at
        from public.profiles p
        left join public.cities c on c.id = p.city_id
        where p.id = auth.uid()
      ) x),

    'settings', (
      select to_jsonb(x) from (
        select s.kept_visibility, s.discoverable, s.notify_email, s.locale
        from public.profile_settings s where s.user_id = auth.uid()
      ) x),

    -- Which nights you swiped, and which way. The event is named by its
    -- slug so the file still means something away from this database.
    'swipes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'event', e.slug, 'title', e.title,
               'direction', w.direction, 'at', w.created_at)
             order by w.created_at)
      from public.swipes w
      join public.events e on e.id = w.event_id
      where w.user_id = auth.uid()
    ), '[]'::jsonb),

    'comments', coalesce((
      select jsonb_agg(jsonb_build_object(
               'event', e.slug, 'body', c.body,
               'reply_to', c.parent_id, 'at', c.created_at)
             order by c.created_at)
      from public.comments c
      join public.events e on e.id = c.event_id
      where c.author_id = auth.uid()
    ), '[]'::jsonb),

    -- Both directions, by handle. Another handle belongs to that person, but
    -- the fact of the friendship is yours as much as theirs.
    'friendships', coalesce((
      select jsonb_agg(jsonb_build_object(
               'handle', p.handle, 'status', f.status,
               'direction', case when f.requester_id = auth.uid()
                                 then 'outgoing' else 'incoming' end,
               'at', f.created_at)
             order by f.created_at)
      from public.friendships f
      join public.profiles p
        on p.id = case when f.requester_id = auth.uid()
                       then f.addressee_id else f.requester_id end
      where f.requester_id = auth.uid() or f.addressee_id = auth.uid()
    ), '[]'::jsonb),

    'feedback', coalesce((
      select jsonb_agg(jsonb_build_object(
               'kind', g.kind, 'body', g.body, 'at', g.created_at)
             order by g.created_at)
      from public.feedback g where g.author_id = auth.uid()
    ), '[]'::jsonb)
  )
  where auth.uid() is not null;
$$;

-- Signed out there is nobody to describe, so this is for accounts only.
grant execute on function public.export_me() to authenticated;

-- Stamp the migration log, if it is there (00_migrations.sql).
do $$ begin
  if to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('14_export.sql');
  end if;
end $$;
