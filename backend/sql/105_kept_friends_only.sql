-- afterhours — what you kept is for your friends only (105, audit H-2 of 28.10.2026)
--
-- 17 opened the two readers of kept nights to everybody, anon included, and said
-- so in its header: "everybody is public for now, by decision". Every later path
-- to the same rows went the other way — the swipes rule in 12, person_kept and
-- kept_count all ask for a confirmed friend first. So the decision, taken on
-- 28.10.2026, is the one the rest of the database already keeps: the nights a
-- person kept, and the people who kept a night, are shown to FRIENDS only. The
-- sentence in the header of 17 no longer holds; this file is where it is corrected.
--
-- Until now, signed out, POST /rpc/profile_kept gave the last sixty nights of
-- anybody by handle, and POST /rpc/event_people the names of everybody who kept a
-- night. Neither asked about friendship, a block, a ban or discoverability.
--
-- Now, same names, same columns, same order:
--   profile_kept(handle)  the caller signed in, and the person is the caller or a
--                         confirmed friend whose kept_visibility is friends (not
--                         private), whose card the caller may see, with no block
--                         between them and no ban on either side (promise 8: a
--                         banned account reads nobody). Otherwise no rows.
--   event_people(slug)    only the people who kept the night AND are confirmed
--                         friends of the caller, under the same gates. Degree is
--                         therefore always 1 and via is null; the columns stay so
--                         the site needs no new shape. Signed out: no rows.
--   grants                authenticated only; anon can no longer call either.
--
-- The gates are the ones the other paths use, by name: is_friend (19),
-- kept_visible (12), card_visible (57, via visible_to), hidden_by_block (70),
-- is_banned (52). card_visible already folds in block and ban; the two are
-- repeated so that this file reads as the rule it is, whatever 57 becomes.

-- ---------------------------------------------------------- the one gate

-- May the caller see what this person kept. Not callable from the browser.
create or replace function public.kept_open_to_me(p_person uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
     and p_person is not null
     and (p_person = auth.uid()
          or (not public.is_banned(auth.uid())
              and public.is_friend(p_person)
              and public.kept_visible(p_person)
              and public.card_visible(p_person)
              and not public.hidden_by_block(p_person)
              and not public.is_banned(p_person)));
$$;
revoke execute on function public.kept_open_to_me(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------- event_people

drop function if exists public.event_people(text);
create or replace function public.event_people(p_slug text)
returns table (
  handle        text,
  display_name  text,
  kept_at       timestamptz,
  degree        int,
  via           text,
  via2          text
)
language sql
stable
security definer
set search_path = public
as $$
  select pr.handle, pr.display_name, s.created_at,
         1 as degree, null::text as via, null::text as via2
  from public.swipes s
  join public.events e on e.id = s.event_id
  join public.profiles pr on pr.id = s.user_id
  where auth.uid() is not null
    and e.slug = p_slug
    and s.direction = 'right'
    and s.user_id <> auth.uid()
    and pr.handle is not null
    and public.kept_open_to_me(s.user_id)
  order by s.created_at desc;
$$;

-- ---------------------------------------------------------- profile_kept

drop function if exists public.profile_kept(text);
create or replace function public.profile_kept(p_handle text)
returns table (
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
  starts_at   timestamptz,
  image_url   text
)
language sql
stable
security definer
set search_path = public
as $$
  select s.created_at,
         e.id, e.slug, e.title, e.meta, e.body, e.poster_no,
         e.type_name, e.venue_name, e.city_slug, e.starts_at, e.image_url
  from public.profiles p
  join public.swipes s on s.user_id = p.id and s.direction = 'right'
  join public.events_public e on e.id = s.event_id
  where auth.uid() is not null
    and p.handle = lower(btrim(p_handle))
    and public.kept_open_to_me(p.id)
  order by s.created_at desc
  limit 60;
$$;

-- --------------------------------------------------------------- keys

revoke execute on function public.event_people(text) from public, anon, authenticated;
revoke execute on function public.profile_kept(text) from public, anon, authenticated;
grant execute on function public.event_people(text) to authenticated;
grant execute on function public.profile_kept(text) to authenticated;

-- Stamp the migration log, if it is there. Each numbered file still runs on
-- its own (the tests load them one at a time), so this cannot insist.
do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('105_kept_friends_only.sql', '4d198b40967e39b7595633790a0e9c655f74c4eb3e66727df463ce3ecc3acb7f');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('105_kept_friends_only.sql');
  end if;
end $$;
