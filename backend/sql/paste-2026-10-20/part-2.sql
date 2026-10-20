-- afterhours — paste 2 of 5 (20.10.2026): 72_night_changed.sql … 77_reserved_handles.sql
-- Supabase → SQL Editor → New query → paste all → Run. Safe to run twice.

-- ===== 72_night_changed.sql =====
-- afterhours — a changed or cancelled night tells the people on it (72)
--
-- Ticketmaster says when a night is cancelled, postponed or rescheduled
-- (dates.status.code) and the sync never read it; a person with a ticket, a keep or
-- an answer on it found out at the door (F22, 20.10.2026). Now events carries the
-- status the sync writes; a cancelled night leaves the deck (is_published = false)
-- but stays in collections and feeds; and the people on the night get one push:
-- {title} · cancelled / postponed / moved to {when}. The words are three fixed
-- phrases per language (58); the switch is notify_nights, like night_soon.
--
-- push_text() and push_wants() are those of 58 and 59 with the one kind added.

alter table public.events add column if not exists status text not null default 'onsale';
alter table public.events drop constraint if exists events_status_check;
alter table public.events add constraint events_status_check
  check (status in ('onsale', 'offsale', 'cancelled', 'postponed', 'rescheduled'));

alter table public.push_outbox drop constraint if exists push_outbox_kind_check;
alter table public.push_outbox add constraint push_outbox_kind_check check (kind in (
  'friend_request', 'friend_accepted', 'match', 'friend_live',
  'night_soon', 'room_open', 'room_closing', 'room_message', 'reply',
  'digest', 'dj_live', 'wave', 'spark', 'spark_in',
  'group_added', 'group_joined', 'group_match', 'group_round', 'group_won', 'group_plan',
  'group_message', 'group_live', 'group_ticket', 'post',
  'staff', 'post_like', 'post_comment',
  'dm', 'night_changed'));

create or replace function public.push_text(p_kind text, p_lang text, p_data jsonb)
returns table (title text, body text)
language plpgsql
immutable
as $$
declare
  pair record;
begin
  select x.title, x.body into title, body
  from (values
    ('friend_request',  'en', 'friend request',                '{name} wants to add you'),
    ('friend_request',  'de', 'freundschaftsanfrage',          '{name} möchte dich hinzufügen'),
    ('friend_request',  'tr', 'arkadaşlık isteği',             '{name} seni eklemek istiyor'),
    ('friend_accepted', 'en', 'you are friends now',           '{name} accepted your request'),
    ('friend_accepted', 'de', 'ihr seid jetzt freunde',        '{name} hat deine anfrage angenommen'),
    ('friend_accepted', 'tr', 'artık arkadaşsınız',            '{name} isteğini kabul etti'),
    ('match',           'en', '{name} is going too',           '{title}'),
    ('match',           'de', '{name} geht auch hin',          '{title}'),
    ('match',           'tr', '{name} de gidiyor',             '{title}'),
    ('friend_live',     'en', '{name} is out now',             '{title}'),
    ('friend_live',     'de', '{name} ist gerade unterwegs',   '{title}'),
    ('friend_live',     'tr', '{name} şu an dışarıda',         '{title}'),
    ('night_soon',      'en', 'tonight · {time}',              '{title}'),
    ('night_soon',      'de', 'heute nacht · {time}',          '{title}'),
    ('night_soon',      'tr', 'bu gece · {time}',              '{title}'),
    ('room_open',       'en', 'your room is open',             '{title} · 48 hours to write'),
    ('room_open',       'de', 'dein raum ist offen',           '{title} · 48 stunden zum schreiben'),
    ('room_open',       'tr', 'odan açık',                     '{title} · 48 saat yazabilirsin'),
    ('room_closing',    'en', 'your room closes soon',         '{title} · the last two hours'),
    ('room_closing',    'de', 'dein raum schließt bald',       '{title} · die letzten zwei stunden'),
    ('room_closing',    'tr', 'odan birazdan kapanıyor',       '{title} · son iki saat'),
    ('room_message',    'en', '{name} in {title}',             'a new line in your room'),
    ('room_message',    'de', '{name} in {title}',             'eine neue zeile in deinem raum'),
    ('room_message',    'tr', '{title} · {name}',              'odanda yeni bir satır'),
    ('reply',           'en', '{name} replied',                'a new reply'),
    ('reply',           'de', '{name} hat geantwortet',        'eine neue antwort'),
    ('reply',           'tr', '{name} cevap verdi',            'yeni bir cevap'),
    ('digest',          'en', 'this weekend in {city}',        '{n} nights · {friends} kept by friends'),
    ('digest',          'de', 'dieses wochenende in {city}',   '{n} nächte · {friends} von freunden behalten'),
    ('digest',          'tr', 'bu hafta sonu {city}',          '{n} gece · {friends} tanesini arkadaşların sakladı'),
    ('dj_live',         'en', '{name} plays soon',             '{where} · {time}'),
    ('dj_live',         'de', '{name} legt bald auf',          '{where} · {time}'),
    ('dj_live',         'tr', '{name} birazdan çalıyor',       '{where} · {time}'),
    ('wave',            'en', '2nd wave',                      'a friend of {via} kept {title}'),
    ('wave',            'de', '2. welle',                      'ein freund von {via} hat {title} behalten'),
    ('wave',            'tr', '2. dalga',                      '{via} üzerinden biri {title} gecesini sakladı'),
    ('spark',           'en', '{name} is starting something',  '{title} · {when}'),
    ('spark',           'de', '{name} startet etwas',          '{title} · {when}'),
    ('spark',           'tr', '{name} bir şey başlatıyor',     '{title} · {when}'),
    ('spark_in',        'en', '{name} is in',                  '{title}'),
    ('spark_in',        'de', '{name} ist dabei',              '{title}'),
    ('spark_in',        'tr', '{name} geliyor',                '{title}'),
    ('group_added',     'en', 'you are in {group}',            '{name} added you · swipe nights together'),
    ('group_added',     'de', 'du bist in {group}',            '{name} hat dich hinzugefügt · wischt zusammen'),
    ('group_added',     'tr', '{group} grubundasın',           '{name} seni ekledi · birlikte gece seçin'),
    ('group_joined',    'en', '{group}',                       '{name} joined'),
    ('group_joined',    'de', '{group}',                       '{name} ist dazugekommen'),
    ('group_joined',    'tr', '{group}',                       '{name} gruba katıldı'),
    ('group_match',     'en', '{group} · everyone is in',      '{title}'),
    ('group_match',     'de', '{group} · alle sind dabei',     '{title}'),
    ('group_match',     'tr', '{group} · herkes var',          '{title}'),
    ('group_round',     'en', '{group} · vote',                '{name} put {title} to a vote'),
    ('group_round',     'de', '{group} · abstimmung',          '{name} lässt abstimmen: {title}'),
    ('group_round',     'tr', '{group} · oylama',              '{name} oylamaya sundu: {title}'),
    ('group_won',       'en', '{group} · the vote is in',      '{title}'),
    ('group_won',       'de', '{group} · abgestimmt',          '{title}'),
    ('group_won',       'tr', '{group} · oylama bitti',        '{title}'),
    ('group_plan',      'en', '{group} · the plan',            '{name}: {title}'),
    ('group_plan',      'de', '{group} · der plan',            '{name}: {title}'),
    ('group_plan',      'tr', '{group} · plan',                '{name}: {title}'),
    ('group_message',   'en', '{group} · {name}',              'a new message'),
    ('group_message',   'de', '{group} · {name}',              'eine neue nachricht'),
    ('group_message',   'tr', '{group} · {name}',              'yeni bir mesaj'),
    ('group_live',      'en', '{group} · live now',            '{name} wants to swipe together, now'),
    ('group_live',      'de', '{group} · gerade live',         '{name} will jetzt zusammen wischen'),
    ('group_live',      'tr', '{group} · şimdi canlı',         '{name} şimdi birlikte kaydırmak istiyor'),
    ('group_ticket',    'en', '{group} · tomorrow',            'you are in for {title} but have no ticket yet'),
    ('group_ticket',    'de', '{group} · morgen',              'du bist bei {title} dabei, hast aber noch kein ticket'),
    ('group_ticket',    'tr', '{group} · yarın',               '{title} için geliyorsun ama henüz biletin yok'),
    ('post',            'en', '{name} posted',                 'a new post'),
    ('post',            'de', '{name} hat gepostet',           'ein neuer post'),
    ('post',            'tr', '{name} paylaştı',               'yeni bir gönderi'),
    ('post_like',       'en', '{name} likes your post',        'open yours to see it'),
    ('post_like',       'de', '{name} gefällt dein post',      'in yours ansehen'),
    ('post_like',       'tr', '{name} gönderini beğendi',      'yours sekmesinde'),
    ('post_comment',    'en', '{name} commented',              'a new comment'),
    ('post_comment',    'de', '{name} hat kommentiert',        'ein neuer kommentar'),
    ('post_comment',    'tr', '{name} yorum yaptı',            'yeni bir yorum'),
    -- 59_dms.sql: a direct message; the name, never the words
    ('dm',              'en', '{name}',                        'a new message'),
    ('dm',              'de', '{name}',                        'eine neue nachricht'),
    ('dm',              'tr', '{name}',                        'yeni bir mesaj'),
    ('staff',           'en', 'the panel',                     '{n} waiting: reports, nights sent in, dj pages'),
    ('staff',           'de', 'das panel',                     '{n} warten: meldungen, eingesandte nächte, dj-seiten'),
    ('staff',           'tr', 'panel',                         '{n} iş bekliyor: şikayetler, gönderilen geceler, dj sayfaları'),
    -- 72_night_changed.sql: a night you kept, answered or hold a ticket for
    ('night_changed',   'en', '{title}',                       '{what}'),
    ('night_changed',   'de', '{title}',                       '{what}'),
    ('night_changed',   'tr', '{title}',                       '{what}')
  ) as x(kind, lang, title, body)
  where x.kind = p_kind and x.lang = coalesce(nullif(p_lang, ''), 'en');

  -- The words of a member never reach a lock screen (the decision of owner, 11.10.2026): what the
  -- triggers still pass as text is dropped here, whatever the caller.
  for pair in select * from jsonb_each_text(coalesce(p_data, '{}') - 'text') loop
    title := replace(title, '{' || pair.key || '}', coalesce(pair.value, ''));
    body  := replace(body,  '{' || pair.key || '}', coalesce(pair.value, ''));
  end loop;
  return next;
end;
$$;

create or replace function public.push_wants(p_user uuid, p_kind text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select case
             when p_kind = 'friend_request'  then s.notify_requests
             when p_kind = 'friend_accepted' then s.notify_accepts
             when p_kind = 'match'           then s.notify_matches
             when p_kind = 'friend_live'     then s.notify_live
             when p_kind in ('night_soon', 'night_changed') then s.notify_nights
             when p_kind in ('room_open', 'room_closing', 'room_message') then s.notify_rooms
             when p_kind = 'reply'           then s.notify_replies
             when p_kind = 'digest'          then s.notify_digest
             when p_kind = 'dj_live'         then s.notify_djs
             when p_kind = 'wave'            then s.notify_waves
             when p_kind in ('spark', 'spark_in') then s.notify_sparks
             when p_kind like 'group\_%' then s.notify_groups
             when p_kind in ('post', 'post_like', 'post_comment') then s.notify_posts
             when p_kind = 'dm'              then s.notify_dms
           end
    from public.profile_settings s where s.user_id = p_user), true);
$$;

-- The three phrases, in the language of the one who receives the push.
create or replace function public.night_change_words(p_what text, p_lang text, p_when text)
returns text
language sql
immutable
as $$
  select case coalesce(nullif(p_lang, ''), 'en')
    when 'de' then case p_what when 'cancelled' then 'abgesagt' when 'postponed' then 'verschoben, neues datum folgt' else 'verlegt auf ' || p_when end
    when 'tr' then case p_what when 'cancelled' then 'iptal edildi' when 'postponed' then 'ertelendi, yeni tarih bekleniyor' else p_when || ' tarihine alındı' end
    else case p_what when 'cancelled' then 'cancelled' when 'postponed' then 'postponed, new date to come' else 'moved to ' || p_when end
  end;
$$;

-- Who is on a night: kept it, answered in, or got a ticket.
create or replace function public.push_on_night_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  what text;
  them record;
begin
  if new.status in ('cancelled', 'postponed') and old.status is distinct from new.status then
    what := new.status;
  elsif new.starts_at is distinct from old.starts_at and not new.starts_at_estimated
        and old.starts_at is not null and new.starts_at is not null
        and new.starts_at > now() then
    what := 'moved';
  else
    return new;
  end if;
  for them in
    select distinct u.user_id from (
      select w.user_id from public.swipes w where w.event_id = new.id and w.direction = 'right'
      union select r.user_id from public.rsvps r where r.event_id = new.id and r.answer = 'in'
      union select t.user_id from public.tickets t where t.event_id = new.id and t.answer = 'got'
    ) u
  loop
    perform public.push_enqueue(them.user_id, 'night_changed',
      format('night_changed:%s:%s:%s:%s', them.user_id, new.id, what, to_char(new.starts_at, 'YYYY-MM-DD-HH24MI')),
      jsonb_build_object(
        'title', new.title,
        'what',  public.night_change_words(what, (select coalesce(nullif(s.locale, ''), 'en') from public.profile_settings s where s.user_id = them.user_id), public.push_when(them.user_id, new.starts_at)),
        'url',   '/night/' || new.slug));
  end loop;
  return new;
end;
$$;
revoke execute on function public.push_on_night_change() from public, anon, authenticated;

drop trigger if exists push_night_change on public.events;
create trigger push_night_change
  after update of status, starts_at on public.events
  for each row execute function public.push_on_night_change();

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('72_night_changed.sql', '2f0213a3c58fb78ba0811d26a5a5d0b47ebce9fd9ccdac4b17613e9c5821bb7a');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('72_night_changed.sql');
  end if;
end $$;


-- ===== 73_messages_go.sql =====
-- afterhours — the messages of a deleted account go with it (73)
--
-- A comment on a night stays as someone (12): it is part of the night. A line in a
-- room or a group chat is not; it is the person talking, and the owner decided on
-- 20.10.2026 (F32) that it goes when the account goes. room_posts kept the line with
-- user_id null; group_messages cascaded already. delete_account() is that of 65 with
-- the room lines removed first.

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

  delete from auth.users where id = me;
end;
$$;
grant execute on function public.delete_account() to authenticated;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('73_messages_go.sql', '8403802a781af964daf6be7c4ae1896aafcd02abee3078a7288039d4b0df63ea');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('73_messages_go.sql');
  end if;
end $$;


-- ===== 74_ban_stays.sql =====
-- afterhours — a ban stays (74)
--
-- A banned person could delete the account, sign up again with the same address, take
-- the same handle and be back in ten minutes; and the room lines of a banned account
-- stayed on the wall (F13, 20.10.2026). Three things:
--   banned_marks   a hash of the email (md5, lowercased) and the handle of a banned
--                  account that deleted itself; closed table, written only by
--                  delete_account(), read only by the two below
--   ban_returns    a new profile whose email is marked is banned at birth
--   handle_status  a handle in the marks is taken
-- and room_list leaves out what a banned account wrote, as comments and posts
-- already do (52). delete_account() is that of 73 with the mark written.

create table if not exists public.banned_marks (
  mark    text primary key,
  handle  text,
  at      timestamptz not null default now()
);
alter table public.banned_marks enable row level security;
revoke all on public.banned_marks from public, anon, authenticated;

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

-- The profile is made by handle_new_user (12) on the auth row; this runs right after.
create or replace function public.ban_returns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  mail text;
begin
  select u.email into mail from auth.users u where u.id = new.id;
  if mail is not null and exists (select 1 from public.banned_marks where mark = md5(lower(mail))) then
    perform set_config('afterhours.ban', 'on', true);
    update public.profiles
       set banned_at = now(), banned_reason = 'banned before', banned_by = null
     where id = new.id;
    perform set_config('afterhours.ban', '', true);
  end if;
  return new;
end;
$$;
revoke execute on function public.ban_returns() from public, anon, authenticated;
drop trigger if exists ban_returns on public.profiles;
create trigger ban_returns
  after insert on public.profiles
  for each row execute function public.ban_returns();

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
    when exists (select 1 from public.banned_marks
                 where handle = lower(btrim(p_handle))) then 'taken'
    else 'ok'
  end;
$$;

create or replace function public.room_list(p_slug text)
returns table (
  id          uuid,
  body        text,
  who         text,
  mine        boolean,
  created_at  timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.body, lower(left(coalesce(p.display_name, p.handle, 's'), 1)), r.user_id = auth.uid(), r.created_at
  from public.room_posts r
  join public.events e on e.id = r.event_id
  left join public.profiles p on p.id = r.user_id
  where e.slug = p_slug and public.checked_in(e.id)
    and not public.hidden_by_block(r.user_id)
    and not public.is_banned(r.user_id)
  order by r.created_at;
$$;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('74_ban_stays.sql', '4a96d6ee01aed02a6fa04804d57c7446838fa3ca7cfc4d88f00caca26d26268a');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('74_ban_stays.sql');
  end if;
end $$;


-- ===== 75_spark_off.sql =====
-- afterhours — a spark taken back tells the people who said in (75)
--
-- spark_cancel (27) deleted the spark and the ones who had said in walked into
-- nothing (F23, 20.10.2026). Now, before it goes, each of them gets one push:
-- {name} took it back · {title}, on the sparks switch. The words come from 58 via
-- 72, with the one kind added; push_wants likewise.

alter table public.push_outbox drop constraint if exists push_outbox_kind_check;
alter table public.push_outbox add constraint push_outbox_kind_check check (kind in (
  'friend_request', 'friend_accepted', 'match', 'friend_live',
  'night_soon', 'room_open', 'room_closing', 'room_message', 'reply',
  'digest', 'dj_live', 'wave', 'spark', 'spark_in',
  'group_added', 'group_joined', 'group_match', 'group_round', 'group_won', 'group_plan',
  'group_message', 'group_live', 'group_ticket', 'post',
  'staff', 'post_like', 'post_comment',
  'dm', 'night_changed', 'spark_off'));

create or replace function public.push_text(p_kind text, p_lang text, p_data jsonb)
returns table (title text, body text)
language plpgsql
immutable
as $$
declare
  pair record;
begin
  select x.title, x.body into title, body
  from (values
    ('friend_request',  'en', 'friend request',                '{name} wants to add you'),
    ('friend_request',  'de', 'freundschaftsanfrage',          '{name} möchte dich hinzufügen'),
    ('friend_request',  'tr', 'arkadaşlık isteği',             '{name} seni eklemek istiyor'),
    ('friend_accepted', 'en', 'you are friends now',           '{name} accepted your request'),
    ('friend_accepted', 'de', 'ihr seid jetzt freunde',        '{name} hat deine anfrage angenommen'),
    ('friend_accepted', 'tr', 'artık arkadaşsınız',            '{name} isteğini kabul etti'),
    ('match',           'en', '{name} is going too',           '{title}'),
    ('match',           'de', '{name} geht auch hin',          '{title}'),
    ('match',           'tr', '{name} de gidiyor',             '{title}'),
    ('friend_live',     'en', '{name} is out now',             '{title}'),
    ('friend_live',     'de', '{name} ist gerade unterwegs',   '{title}'),
    ('friend_live',     'tr', '{name} şu an dışarıda',         '{title}'),
    ('night_soon',      'en', 'tonight · {time}',              '{title}'),
    ('night_soon',      'de', 'heute nacht · {time}',          '{title}'),
    ('night_soon',      'tr', 'bu gece · {time}',              '{title}'),
    ('room_open',       'en', 'your room is open',             '{title} · 48 hours to write'),
    ('room_open',       'de', 'dein raum ist offen',           '{title} · 48 stunden zum schreiben'),
    ('room_open',       'tr', 'odan açık',                     '{title} · 48 saat yazabilirsin'),
    ('room_closing',    'en', 'your room closes soon',         '{title} · the last two hours'),
    ('room_closing',    'de', 'dein raum schließt bald',       '{title} · die letzten zwei stunden'),
    ('room_closing',    'tr', 'odan birazdan kapanıyor',       '{title} · son iki saat'),
    ('room_message',    'en', '{name} in {title}',             'a new line in your room'),
    ('room_message',    'de', '{name} in {title}',             'eine neue zeile in deinem raum'),
    ('room_message',    'tr', '{title} · {name}',              'odanda yeni bir satır'),
    ('reply',           'en', '{name} replied',                'a new reply'),
    ('reply',           'de', '{name} hat geantwortet',        'eine neue antwort'),
    ('reply',           'tr', '{name} cevap verdi',            'yeni bir cevap'),
    ('digest',          'en', 'this weekend in {city}',        '{n} nights · {friends} kept by friends'),
    ('digest',          'de', 'dieses wochenende in {city}',   '{n} nächte · {friends} von freunden behalten'),
    ('digest',          'tr', 'bu hafta sonu {city}',          '{n} gece · {friends} tanesini arkadaşların sakladı'),
    ('dj_live',         'en', '{name} plays soon',             '{where} · {time}'),
    ('dj_live',         'de', '{name} legt bald auf',          '{where} · {time}'),
    ('dj_live',         'tr', '{name} birazdan çalıyor',       '{where} · {time}'),
    ('wave',            'en', '2nd wave',                      'a friend of {via} kept {title}'),
    ('wave',            'de', '2. welle',                      'ein freund von {via} hat {title} behalten'),
    ('wave',            'tr', '2. dalga',                      '{via} üzerinden biri {title} gecesini sakladı'),
    ('spark',           'en', '{name} is starting something',  '{title} · {when}'),
    ('spark',           'de', '{name} startet etwas',          '{title} · {when}'),
    ('spark',           'tr', '{name} bir şey başlatıyor',     '{title} · {when}'),
    ('spark_in',        'en', '{name} is in',                  '{title}'),
    ('spark_in',        'de', '{name} ist dabei',              '{title}'),
    ('spark_in',        'tr', '{name} geliyor',                '{title}'),
    ('group_added',     'en', 'you are in {group}',            '{name} added you · swipe nights together'),
    ('group_added',     'de', 'du bist in {group}',            '{name} hat dich hinzugefügt · wischt zusammen'),
    ('group_added',     'tr', '{group} grubundasın',           '{name} seni ekledi · birlikte gece seçin'),
    ('group_joined',    'en', '{group}',                       '{name} joined'),
    ('group_joined',    'de', '{group}',                       '{name} ist dazugekommen'),
    ('group_joined',    'tr', '{group}',                       '{name} gruba katıldı'),
    ('group_match',     'en', '{group} · everyone is in',      '{title}'),
    ('group_match',     'de', '{group} · alle sind dabei',     '{title}'),
    ('group_match',     'tr', '{group} · herkes var',          '{title}'),
    ('group_round',     'en', '{group} · vote',                '{name} put {title} to a vote'),
    ('group_round',     'de', '{group} · abstimmung',          '{name} lässt abstimmen: {title}'),
    ('group_round',     'tr', '{group} · oylama',              '{name} oylamaya sundu: {title}'),
    ('group_won',       'en', '{group} · the vote is in',      '{title}'),
    ('group_won',       'de', '{group} · abgestimmt',          '{title}'),
    ('group_won',       'tr', '{group} · oylama bitti',        '{title}'),
    ('group_plan',      'en', '{group} · the plan',            '{name}: {title}'),
    ('group_plan',      'de', '{group} · der plan',            '{name}: {title}'),
    ('group_plan',      'tr', '{group} · plan',                '{name}: {title}'),
    ('group_message',   'en', '{group} · {name}',              'a new message'),
    ('group_message',   'de', '{group} · {name}',              'eine neue nachricht'),
    ('group_message',   'tr', '{group} · {name}',              'yeni bir mesaj'),
    ('group_live',      'en', '{group} · live now',            '{name} wants to swipe together, now'),
    ('group_live',      'de', '{group} · gerade live',         '{name} will jetzt zusammen wischen'),
    ('group_live',      'tr', '{group} · şimdi canlı',         '{name} şimdi birlikte kaydırmak istiyor'),
    ('group_ticket',    'en', '{group} · tomorrow',            'you are in for {title} but have no ticket yet'),
    ('group_ticket',    'de', '{group} · morgen',              'du bist bei {title} dabei, hast aber noch kein ticket'),
    ('group_ticket',    'tr', '{group} · yarın',               '{title} için geliyorsun ama henüz biletin yok'),
    ('post',            'en', '{name} posted',                 'a new post'),
    ('post',            'de', '{name} hat gepostet',           'ein neuer post'),
    ('post',            'tr', '{name} paylaştı',               'yeni bir gönderi'),
    ('post_like',       'en', '{name} likes your post',        'open yours to see it'),
    ('post_like',       'de', '{name} gefällt dein post',      'in yours ansehen'),
    ('post_like',       'tr', '{name} gönderini beğendi',      'yours sekmesinde'),
    ('post_comment',    'en', '{name} commented',              'a new comment'),
    ('post_comment',    'de', '{name} hat kommentiert',        'ein neuer kommentar'),
    ('post_comment',    'tr', '{name} yorum yaptı',            'yeni bir yorum'),
    -- 59_dms.sql: a direct message; the name, never the words
    ('dm',              'en', '{name}',                        'a new message'),
    ('dm',              'de', '{name}',                        'eine neue nachricht'),
    ('dm',              'tr', '{name}',                        'yeni bir mesaj'),
    ('staff',           'en', 'the panel',                     '{n} waiting: reports, nights sent in, dj pages'),
    ('staff',           'de', 'das panel',                     '{n} warten: meldungen, eingesandte nächte, dj-seiten'),
    ('staff',           'tr', 'panel',                         '{n} iş bekliyor: şikayetler, gönderilen geceler, dj sayfaları'),
    -- 72_night_changed.sql: a night you kept, answered or hold a ticket for
    ('night_changed',   'en', '{title}',                       '{what}'),
    ('night_changed',   'de', '{title}',                       '{what}'),
    ('night_changed',   'tr', '{title}',                       '{what}'),
    -- 75_spark_off.sql: a spark you said in to was taken back by its host
    ('spark_off',       'en', '{name} took it back',            '{title}'),
    ('spark_off',       'de', '{name} hat es abgesagt',         '{title}'),
    ('spark_off',       'tr', '{name} iptal etti',              '{title}')
  ) as x(kind, lang, title, body)
  where x.kind = p_kind and x.lang = coalesce(nullif(p_lang, ''), 'en');

  -- The words of a member never reach a lock screen (the decision of owner, 11.10.2026): what the
  -- triggers still pass as text is dropped here, whatever the caller.
  for pair in select * from jsonb_each_text(coalesce(p_data, '{}') - 'text') loop
    title := replace(title, '{' || pair.key || '}', coalesce(pair.value, ''));
    body  := replace(body,  '{' || pair.key || '}', coalesce(pair.value, ''));
  end loop;
  return next;
end;
$$;

create or replace function public.push_wants(p_user uuid, p_kind text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select case
             when p_kind = 'friend_request'  then s.notify_requests
             when p_kind = 'friend_accepted' then s.notify_accepts
             when p_kind = 'match'           then s.notify_matches
             when p_kind = 'friend_live'     then s.notify_live
             when p_kind in ('night_soon', 'night_changed') then s.notify_nights
             when p_kind in ('room_open', 'room_closing', 'room_message') then s.notify_rooms
             when p_kind = 'reply'           then s.notify_replies
             when p_kind = 'digest'          then s.notify_digest
             when p_kind = 'dj_live'         then s.notify_djs
             when p_kind = 'wave'            then s.notify_waves
             when p_kind in ('spark', 'spark_in', 'spark_off') then s.notify_sparks
             when p_kind like 'group\_%' then s.notify_groups
             when p_kind in ('post', 'post_like', 'post_comment') then s.notify_posts
             when p_kind = 'dm'              then s.notify_dms
           end
    from public.profile_settings s where s.user_id = p_user), true);
$$;

create or replace function public.spark_cancel(p_spark uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  s    public.sparks%rowtype;
  them record;
begin
  select * into s from public.sparks where id = p_spark and host_id = auth.uid();
  if s.id is null then
    raise exception 'not yours' using errcode = '42501';
  end if;
  for them in select i.user_id from public.spark_invites i where i.spark_id = s.id and i.answer = 'in' loop
    perform public.push_enqueue(them.user_id, 'spark_off',
      format('spark_off:%s:%s', s.id, them.user_id),
      jsonb_build_object('name', public.push_name(s.host_id), 'title', s.title, 'url', '/connect'));
  end loop;
  delete from public.sparks where id = s.id;
end;
$$;
revoke execute on function public.spark_cancel(uuid) from public, anon;
grant execute on function public.spark_cancel(uuid)  to authenticated;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('75_spark_off.sql', 'fe74781c189f738a245bb740adb7e31b872f355d7b50cbec940c32acabf97960');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('75_spark_off.sql');
  end if;
end $$;


-- ===== 76_sent_nights.sql =====
-- afterhours — a night sent in: the sender hears, can take it back, and the stale
-- ones leave the queue (76)
--
-- Someone sent a night in (43) and then nothing: no word when the staff let it through
-- or turned it down, no way to take it back, and a night whose date had passed sat in
-- the queue forever, counting against the five a person may have waiting (F24,
-- 20.10.2026). Three things:
--   staff_review     the same as 43, plus a notice to the sender: night_ok / night_no
--                    (with the note the staff wrote, if any)
--   event_withdraw   the sender takes a waiting night back
--   submissions_expire  a waiting night whose date has passed is turned down with the
--                    note "the date passed"; the staff queue runs it first, so it
--                    never needs a clock job, and the five-limit counts only the live ones

alter table public.notices drop constraint if exists notices_kind_check;
alter table public.notices add constraint notices_kind_check
  check (kind in ('comment_hidden', 'post_hidden', 'removed', 'profile_cleared',
                  'role', 'dj_verified', 'dj_hidden', 'report_removed', 'report_kept',
                  'night_ok', 'night_no'));

create or replace function public.staff_review(p_id uuid, p_ok boolean, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  e public.events%rowtype;
begin
  perform public.need_staff();
  select * into e from public.events where id = p_id and review = 'pending';
  if e.id is null then raise exception 'nothing waiting with that id'; end if;
  if p_ok then
    update public.events set review = null, review_note = null, is_published = true, updated_at = now() where id = p_id;
  else
    update public.events set review = 'rejected', review_note = left(nullif(btrim(p_note), ''), 300), is_published = false, updated_at = now() where id = p_id;
  end if;
  perform public.notice(e.created_by, case when p_ok then 'night_ok' else 'night_no' end,
                        jsonb_build_object('title', e.title, 'slug', e.slug,
                                           'note', coalesce(left(nullif(btrim(p_note), ''), 300), '')));
  perform public.staff_note(case when p_ok then 'approve' else 'reject' end, 'night', e.slug, e.title);
end;
$$;

-- The sender takes a waiting night back. Only theirs, only while it waits.
create or replace function public.event_withdraw(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.events
   where id = p_id and created_by = auth.uid() and source = 'user' and review = 'pending';
  if not found then
    raise exception 'nothing of yours waiting with that id' using errcode = '42501';
  end if;
end;
$$;
revoke execute on function public.event_withdraw(uuid) from public, anon;
grant execute on function public.event_withdraw(uuid) to authenticated;

-- A waiting night whose date has passed: turned down, with a note, and the sender told.
create or replace function public.submissions_expire()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  e record;
  n int := 0;
begin
  for e in select id, created_by, title, slug from public.events
           where review = 'pending' and starts_at is not null and starts_at < now() loop
    update public.events set review = 'rejected', review_note = 'the date passed', is_published = false, updated_at = now()
     where id = e.id;
    perform public.notice(e.created_by, 'night_no', jsonb_build_object('title', e.title, 'slug', e.slug, 'note', 'the date passed'));
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke execute on function public.submissions_expire() from public, anon, authenticated;

-- The staff queue, with the stale ones cleared first. The return type is that of 43.
create or replace function public.staff_pending()
returns table (id uuid, slug text, title text, city_slug text, type_slug text, venue_name text,
               starts_at timestamptz, body text, ticket_url text, image_url text, maker text, handle text, sent_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_staff() then
    perform public.submissions_expire();
  end if;
  return query
    select e.id, e.slug, e.title, c.slug, t.slug, v.name, e.starts_at, e.body, e.ticket_url, e.image_url,
           p.display_name, p.handle, e.created_at
    from public.events e
    join public.cities c on c.id = e.city_id
    join public.event_types t on t.id = e.type_id
    left join public.venues v on v.id = e.venue_id
    left join public.profiles p on p.id = e.created_by
    where e.review = 'pending' and public.is_staff()
    order by e.created_at;
end;
$$;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('76_sent_nights.sql', '6083e440d0d3933f27cc25255c38e079b8d251c5e3994c4741ba85b8eeccb3e8');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('76_sent_nights.sql');
  end if;
end $$;


-- ===== 77_reserved_handles.sql =====
-- afterhours — some names belong to nobody (77)
--
-- Anyone could take @admin, @afterhours or @support and write to people as the team
-- (F15, 20.10.2026). A short list of reserved words, and anything that starts with
-- afterhours, is now taken for everyone who is not staff: handle_status says so on
-- every keystroke, handle_new_user drops the wish at sign-up, and profile_setup (12)
-- goes through handle_status and so refuses it too. The staff keep the right to use
-- them (the panel accounts). Both functions are those of 74 / 12 with the one check.

create or replace function public.handle_reserved(p_handle text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not coalesce(public.is_staff(), false)
     and (p_handle in ('admin', 'administrator', 'afterhours', 'support', 'help', 'staff', 'team',
                       'moderator', 'mod', 'official', 'security', 'root', 'system', 'info', 'contact',
                       'ticketmaster', 'supabase', 'apple', 'google', 'null', 'undefined', 'someone')
          or p_handle like 'afterhours%'
          or p_handle like 'admin\_%'
          or p_handle like 'support\_%');
$$;
grant execute on function public.handle_reserved(text) to anon, authenticated;

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
    when public.handle_reserved(lower(btrim(p_handle))) then 'taken'
    when exists (select 1 from public.profiles
                 where handle = lower(btrim(p_handle)) and id = auth.uid()) then 'yours'
    when exists (select 1 from public.profiles
                 where handle = lower(btrim(p_handle))) then 'taken'
    when exists (select 1 from public.banned_marks
                 where handle = lower(btrim(p_handle))) then 'taken'
    else 'ok'
  end;
$$;

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
     or public.handle_reserved(wanted)
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

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('77_reserved_handles.sql', 'fa5b62cfc06e366950440065eed78c7d055bf325bc82226489865c81cae07c2e');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('77_reserved_handles.sql');
  end if;
end $$;
