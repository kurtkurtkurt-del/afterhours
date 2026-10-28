-- afterhours — the terms on the server, and a fresh sign-in to delete (111)
--
-- Security review 28.10.2026, M-10 and M-11.
--
-- M-10  The terms and the 18+ answer lived only in the app (TermsGate, 51): nothing in
--       the database asked for them before a person wrote something others read, and
--       accept_terms(2147483647, true) answered every future version in advance.
--         terms_now()      the version in force, the same number as TERMS_VERSION in
--                          app/src/data/safety.ts and the site register/ page
--         accept_terms     that of 51, refusing a version above terms_now()
--         need_terms()     true while the caller has not accepted terms_now() as an adult
--         terms_gate       before insert on what others read (comments, post comments,
--                          posts, room posts, group messages, direct messages, sparks,
--                          groups, profile photos and links, group photos) and before a
--                          body is edited (comments, post comments, posts): a signed in
--                          caller who needs the terms is refused. The service role and
--                          the cron jobs (no auth.uid()) pass, and so does a line nobody
--                          wrote (no author: the won line of a group plan, 46).
--       Members who already said yes in the app (version 1) write on as before; a member
--       who never did is asked by the app TermsGate on the next start, and nothing is
--       accepted for them here. The site writes none of these tables today (register/
--       accepts version 1 at sign up). Not gated: the words of the profile row itself
--       (bio, name, handle), since accept_terms writes that same row.
--
-- M-11  delete_account() asked only for auth.uid(): a stolen access or refresh token
--       deleted the account for good. Now the session must come from a sign-in in the
--       last ten minutes. The token says when: every entry of its amr list carries the
--       time that sign-in method was used, and a refresh keeps that time (a refreshed
--       iat would not do). A password, a Google or Apple sign-in, the email link of
--       delete/ all count; a guest (anonymous) account has no sign-in to repeat and may
--       go as it is.
--         signed_in_recently()   true when the newest amr time is ten minutes old or less
--         delete_account()       that of 74, asking signed_in_recently() first

-- ------------------------------------------------------------ the terms

create or replace function public.terms_now()
returns int
language sql
immutable
as $$ select 1 $$;

create or replace function public.accept_terms(p_version int, p_adult boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if not coalesce(p_adult, false) then raise exception 'eighteen or older only'; end if;
  if p_version is null or p_version < 1 then raise exception 'which terms?'; end if;
  if p_version > public.terms_now() then raise exception 'those terms do not exist yet'; end if;
  update public.profiles
     set terms_version = greatest(coalesce(terms_version, 0), p_version), terms_at = now(), adult = true
   where id = auth.uid();
end;
$$;

-- An answer given before the ceiling, above the version in force, is brought back to it:
-- the next version of the terms must be asked again.
update public.profiles set terms_version = public.terms_now() where terms_version > public.terms_now();

create or replace function public.need_terms()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
     and not exists (select 1 from public.profiles p
                      where p.id = auth.uid() and p.adult
                        and coalesce(p.terms_version, 0) >= public.terms_now());
$$;

create or replace function public.terms_gate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  j jsonb := to_jsonb(new);
begin
  if coalesce(j ->> 'user_id', j ->> 'author_id', j ->> 'host_id', j ->> 'created_by') is not null
     and public.need_terms() then
    raise exception 'accept the terms first';
  end if;
  return new;
end;
$$;

drop trigger if exists terms_gate on public.comments;
create trigger terms_gate before insert on public.comments for each row execute function public.terms_gate();
drop trigger if exists terms_gate on public.post_comments;
create trigger terms_gate before insert on public.post_comments for each row execute function public.terms_gate();
drop trigger if exists terms_gate on public.posts;
create trigger terms_gate before insert on public.posts for each row execute function public.terms_gate();
drop trigger if exists terms_gate on public.room_posts;
create trigger terms_gate before insert on public.room_posts for each row execute function public.terms_gate();
drop trigger if exists terms_gate on public.group_messages;
create trigger terms_gate before insert on public.group_messages for each row execute function public.terms_gate();
drop trigger if exists terms_gate on public.dm_messages;
create trigger terms_gate before insert on public.dm_messages for each row execute function public.terms_gate();
drop trigger if exists terms_gate on public.sparks;
create trigger terms_gate before insert on public.sparks for each row execute function public.terms_gate();
drop trigger if exists terms_gate on public.groups;
create trigger terms_gate before insert on public.groups for each row execute function public.terms_gate();
drop trigger if exists terms_gate on public.profile_photos;
create trigger terms_gate before insert on public.profile_photos for each row execute function public.terms_gate();
drop trigger if exists terms_gate on public.profile_links;
create trigger terms_gate before insert on public.profile_links for each row execute function public.terms_gate();
drop trigger if exists terms_gate on public.group_photos;
create trigger terms_gate before insert on public.group_photos for each row execute function public.terms_gate();
drop trigger if exists terms_gate_edit on public.comments;
create trigger terms_gate_edit before update of body on public.comments for each row execute function public.terms_gate();
drop trigger if exists terms_gate_edit on public.post_comments;
create trigger terms_gate_edit before update of body on public.post_comments for each row execute function public.terms_gate();
drop trigger if exists terms_gate_edit on public.posts;
create trigger terms_gate_edit before update of body on public.posts for each row execute function public.terms_gate();

revoke execute on function public.terms_gate() from public, anon, authenticated;
revoke execute on function public.terms_now()  from public;
revoke execute on function public.need_terms() from public, anon;
grant execute on function public.terms_now()   to anon, authenticated;
grant execute on function public.need_terms()  to authenticated;

-- ------------------------------------------------------------ a fresh sign-in to delete

create or replace function public.signed_in_recently()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    exists (select 1 from auth.users u where u.id = auth.uid() and u.is_anonymous)
    or coalesce((
      select max((a ->> 'timestamp')::bigint)
        from jsonb_array_elements(
               case when jsonb_typeof(auth.jwt() -> 'amr') = 'array' then auth.jwt() -> 'amr' else '[]'::jsonb end
             ) a
       where jsonb_typeof(a) = 'object' and (a ->> 'timestamp') ~ '^[0-9]{1,12}$'
    ), 0) >= extract(epoch from now() - interval '10 minutes')
  );
$$;

revoke execute on function public.signed_in_recently() from public, anon;
grant execute on function public.signed_in_recently()  to authenticated;

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  g  uuid;
begin
  if me is null then
    raise exception 'sign in first';
  end if;

  if not public.signed_in_recently() then
    raise exception 'sign in again first';
  end if;

  if exists (select 1 from public.profiles where id = me and is_admin)
     and not exists (select 1 from public.profiles where is_admin and id <> me) then
    raise exception 'the last admin stays an admin';
  end if;

  for g in select group_id from public.group_members where user_id = me loop
    delete from public.group_members where group_id = g and user_id = me;
    if not exists (select 1 from public.group_members where group_id = g) then
      delete from public.groups where id = g;
    elsif not exists (select 1 from public.group_members where group_id = g and role = 'owner') then
      update public.group_members set role = 'owner'
       where group_id = g and user_id = (select user_id from public.group_members
                                          where group_id = g order by joined_at, user_id limit 1);
    end if;
  end loop;

  -- what the person said in rooms and groups leaves with them
  delete from public.room_posts where user_id = me;
  delete from public.group_messages where user_id = me;

  update public.comments
     set author_id = null, author_name = 'someone'
   where author_id = me;

  -- a banned person who deletes their account is remembered by a hash of the email
  -- and keeps their handle: the same address comes back banned, the name stays taken
  if exists (select 1 from public.profiles where id = me and banned_at is not null) then
    insert into public.banned_marks (mark, handle)
    select md5(lower(u.email)), p.handle from auth.users u join public.profiles p on p.id = u.id
    where u.id = me and u.email is not null
    on conflict (mark) do nothing;
  end if;

  delete from auth.users where id = me;
end;
$$;

revoke execute on function public.delete_account() from public, anon;
grant execute on function public.delete_account()  to authenticated;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('111_terms_and_delete_reauth.sql', 'f1bd29a4539df00610ddd700ec5d7109fe2eac4448a4d72e591a1d3e8407eab9');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('111_terms_and_delete_reauth.sql');
  end if;
end $$;
