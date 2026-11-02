-- afterhours — the face on a request, and on an open card (115, owner 03.11.2026)
--
-- 24 showed a photograph to confirmed friends only. Two places stayed faceless:
--
--   * a friend request. The one who is asked could not see who asks; the request page
--     drew an initial. Now the one who is ASKED sees the photograph of the one who asks,
--     for as long as the request is open. The one who asks still sees nothing more than
--     before (promise 5: a request you sent opens nothing until it is accepted).
--   * an open card. A person who leaves discoverable on already shows a named card to a
--     member who knows the handle (visible_to, 57). person_photo(handle) adds the
--     photograph to that card, by the owner decision of 03.11.2026: an open profile shows
--     its face. Turning discoverable off hides it again. One handle, one path: the table
--     still lists only friends and requests to you, so members cannot be browsed by face.
--
-- The same doors as the cards (separate eye, 03.11.2026): a closed account neither sees
-- nor is seen (reachable, assert_member), a block in either direction hides the face, a
-- guest gets none, and person_photo counts against an hourly ceiling like profile_card.
-- What it cannot take back: the photos bucket is public, so an address someone already
-- has keeps working until the photograph is changed (24 and M-14: the address is the lock).
--
--   photo_friend(other)     a confirmed friend, or an open request from other to you;
--                           both accounts open, no block between you
--   person_photo(handle)    the path for a card you may see, else null; members only

create or replace function public.photo_friend(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
     and not public.is_guest()
     and not public.is_banned(auth.uid())
     and public.reachable(auth.uid(), other)
     and exists (
       select 1 from public.friendships f
       where (f.status = 'accepted'
              and ((f.requester_id = auth.uid() and f.addressee_id = other)
                or (f.addressee_id = auth.uid() and f.requester_id = other)))
          or (f.status = 'pending' and f.requester_id = other and f.addressee_id = auth.uid())
     );
$$;
revoke execute on function public.photo_friend(uuid) from public, anon;
grant execute on function public.photo_friend(uuid) to authenticated;

drop function if exists public.person_photo(text);
create or replace function public.person_photo(p_handle text)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me uuid := public.assert_member();
  found text;
begin
  if public.is_guest() then return null; end if;
  perform public.read_rate('person_photo', 300);
  select ph.path into found
  from public.profiles p
  join public.profile_photos ph on ph.user_id = p.id
  where p.handle = lower(btrim(p_handle))
    and (public.visible_to(me, p.id) or public.photo_friend(p.id));
  return found;
end;
$$;
revoke execute on function public.person_photo(text) from public, anon;
grant execute on function public.person_photo(text) to authenticated;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('115_photo_requests.sql', '1d28b965e53c43041cd353217992a75f90a7385590da314882c72aaea8859e79');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('115_photo_requests.sql');
  end if;
end $$;
