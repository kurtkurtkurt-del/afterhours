-- afterhours — a pending request opens no profile row (104, audit H-1 of 28.10.2026)
--
-- 12 let the profiles rule through for "a friend, or a request pending — in either
-- direction": is_linked() counted every friendship row, whatever its status. So an
-- account that sent a request to a handle it knew could read the whole profile
-- row of that person through the REST table path: the exact last_seen_at,
-- is_admin, account_type, banned_reason, the terms columns, all of them fields
-- profile_card() hides on purpose.
--
-- Now:
--   is_linked(other)      only a CONFIRMED friendship counts. The profiles rule is
--                         unchanged in text and now means what 12 says it means.
--   has_any_link(other)   the old meaning (friend or pending, either way), for the
--                         suggestion list only: somebody you already asked should not
--                         be suggested again. Not callable from the browser.
--   people_suggested()    as in 57, on has_any_link instead of is_linked.
--   friends_list()        same columns, same order, now definer: it reads only the
--                         friendship rows of the caller and takes nothing but handle
--                         and display_name from the other side, so a pending request
--                         still shows who it is without a profile row being open.

-- ------------------------------------------------------------- is_linked

create or replace function public.is_linked(other uuid)
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

-- Friend or request pending, either direction: the meaning is_linked had until now.
-- Only the suggestion list below needs it; it stays closed to the browser roles.
create or replace function public.has_any_link(other uuid)
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
revoke execute on function public.has_any_link(uuid) from public, anon, authenticated;

-- The rule from 12, rewritten so a database that ran 12 picks up the new meaning
-- of is_linked right away (the text is the same; the policy is rebuilt for clarity).
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select
  using (
    id = auth.uid()
    or public.is_linked(id)
    or public.is_admin()
  );

-- ------------------------------------------------------- people_suggested

-- As in 57, minus anyone you already have a row with — accepted or pending.
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
           (p.city_id is not null and p.city_id = (select city_id from mine)) as same_city,
           p.last_seen_at
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
  order by pool.mutual desc, pool.same_city desc, pool.last_seen_at desc nulls last, pool.handle
  limit least(greatest(coalesce(p_limit, 3), 1), 12);
end;
$$;

-- ------------------------------------------------------------ friends_list

-- Same shape as 07. Definer, because the other side of a pending request is no
-- longer a row the caller may read; the function reads only rows the caller is
-- on and hands back the two naming fields the card would give anyway.
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
security definer
set search_path = public
as $$
  select f.addressee_id, p.handle, p.display_name, f.status, 'outgoing'
  from public.friendships f
  join public.profiles p on p.id = f.addressee_id
  where auth.uid() is not null
    and f.requester_id = auth.uid()
  union all
  select f.requester_id, p.handle, p.display_name, f.status, 'incoming'
  from public.friendships f
  join public.profiles p on p.id = f.requester_id
  where auth.uid() is not null
    and f.addressee_id = auth.uid()
  order by 4, 2;
$$;
revoke execute on function public.friends_list() from public, anon;
grant execute on function public.friends_list() to authenticated;

-- Stamp the migration log, if it is there. Each numbered file still runs on
-- its own (the tests load them one at a time), so this cannot insist.
do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('104_pending_request_privacy.sql', 'a6b8a30cd68988333a9ac3ea4baa2d70d057865ab5768884d557a1a2176105f6');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('104_pending_request_privacy.sql');
  end if;
end $$;
