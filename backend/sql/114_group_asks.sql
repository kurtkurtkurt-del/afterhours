-- afterhours — a group invites, it does not grab (114)
--
-- Until now the one who made a group put their friends straight into it (44: group_create,
-- group_add), and the friends woke up as members. The owner asked for the other way
-- (28.10.2026): a friend is *invited*. The group shows on their groups shelf as "invited",
-- with yes and no; yes makes them a member, no removes the invitation. Nothing in the
-- group happens for them before yes.
--
--   group_asks (group_id, user_id)   the open invitations: who asked, when
--   group_create / group_add          now leave an ask for every friend instead of a row
--                                     in group_members (the code link, group_join, is unchanged)
--   group_accept(id) / group_decline(id)
--   my_group_asks()                   the groups waiting for your answer, for the shelf
--   push kind group_ask               "{group} · {name} invites you"
--
-- The tables stay closed; everything goes through the functions.

create table if not exists public.group_asks (
  group_id   uuid not null references public.groups on delete cascade,
  user_id    uuid not null references public.profiles on delete cascade,
  asked_by   uuid references public.profiles on delete set null,
  asked_at   timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists group_asks_user_idx on public.group_asks (user_id);
alter table public.group_asks enable row level security;
revoke all on public.group_asks from public, anon, authenticated;

-- ------------------------------------------------------------ inviting

create or replace function public.group_ask_one(p_group uuid, p_user uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user = auth.uid() then return false; end if;
  if exists (select 1 from public.group_members where group_id = p_group and user_id = p_user) then return false; end if;
  if exists (select 1 from public.group_asks where group_id = p_group and user_id = p_user) then return false; end if;
  if not public.is_friend(p_user) then raise exception 'only friends can be invited; send the others a link'; end if;
  if (select count(*) from public.group_members where group_id = p_group)
     + (select count(*) from public.group_asks where group_id = p_group) >= 12 then
    raise exception 'at most 12 in a group';
  end if;
  insert into public.group_asks (group_id, user_id, asked_by) values (p_group, p_user, auth.uid());
  return true;
end;
$$;
revoke all on function public.group_ask_one(uuid, uuid) from public, anon, authenticated;

-- group_create as in 44, but the friends are invited, not put in.
create or replace function public.group_create(p_name text, p_emoji text, p_color text, p_kind text,
                                               p_city text, p_from date, p_to date, p_members uuid[])
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  g uuid;
  m uuid;
  others uuid[] := array(select x from unnest(coalesce(p_members, '{}')) with ordinality as u(x, i)
                         where x <> auth.uid() group by x order by min(i));
begin
  perform public.need_account();
  perform public.group_check(p_name, p_emoji, p_color, p_kind, p_city, p_from, p_to);
  if cardinality(others) > 11 then raise exception 'at most 12 in a group'; end if;
  if (select count(*) from public.group_members where user_id = auth.uid()) >= 30 then
    raise exception 'at most 30 groups';
  end if;
  foreach m in array others loop
    if not public.is_friend(m) then raise exception 'only friends can be invited; send the others a link'; end if;
  end loop;
  insert into public.groups (name, emoji, color, kind, city_slug, date_from, date_to, created_by)
  values (btrim(p_name), p_emoji, coalesce(p_color, 'red'), coalesce(p_kind, 'lasting'), p_city, p_from, p_to, auth.uid())
  returning id into g;
  insert into public.group_members (group_id, user_id, role) values (g, auth.uid(), 'owner');
  foreach m in array others loop
    perform public.group_ask_one(g, m);
  end loop;
  return g;
end;
$$;

-- A member invites their own friends.
create or replace function public.group_add(p_id uuid, p_users uuid[])
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  m uuid;
  n int := 0;
begin
  perform public.need_member(p_id);
  foreach m in array coalesce(p_users, '{}') loop
    if public.group_ask_one(p_id, m) then n := n + 1; end if;
  end loop;
  return n;
end;
$$;

-- ------------------------------------------------------------ answering

create or replace function public.group_accept(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.need_account();
  if not exists (select 1 from public.group_asks where group_id = p_id and user_id = auth.uid()) then
    raise exception 'no invitation' using errcode = '42501';
  end if;
  if (select count(*) from public.group_members where user_id = auth.uid()) >= 30 then
    raise exception 'at most 30 groups';
  end if;
  delete from public.group_asks where group_id = p_id and user_id = auth.uid();
  insert into public.group_members (group_id, user_id) values (p_id, auth.uid())
  on conflict do nothing;
end;
$$;
grant execute on function public.group_accept(uuid) to authenticated;

create or replace function public.group_decline(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.group_asks where group_id = p_id and user_id = auth.uid();
$$;
grant execute on function public.group_decline(uuid) to authenticated;

-- ------------------------------------------------------------ the shelf

-- The invited groups, beside my_groups() (whose row shape stays as 109 left it: a changed
-- return type would break the second run of the setup). The app draws them on the shelf
-- as "invited", with yes and no; nothing else of the group is open before yes.
create or replace function public.my_group_asks()
returns table (id uuid, name text, emoji text, color text, cover_path text, kind text, city_slug text,
               date_from date, date_to date, members int, faces uuid[], asked_by text, asked_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select g.id, g.name, g.emoji, g.color, g.cover_path, g.kind, g.city_slug, g.date_from, g.date_to,
         (select count(*)::int from public.group_members m where m.group_id = g.id),
         array(select m.user_id from public.group_members m where m.group_id = g.id
                 and not public.hidden_by_block(m.user_id) order by m.joined_at limit 4),
         (select coalesce(p.display_name, p.handle) from public.profiles p where p.id = a.asked_by and not public.hidden_by_block(p.id)),
         a.asked_at
  from public.groups g join public.group_asks a on a.group_id = g.id and a.user_id = auth.uid()
  where not public.hidden_by_block(coalesce(a.asked_by, g.created_by))
  order by a.asked_at desc;
$$;
grant execute on function public.my_group_asks() to authenticated;

-- ------------------------------------------------------------ push

alter table public.push_outbox drop constraint if exists push_outbox_kind_check;
alter table public.push_outbox add constraint push_outbox_kind_check check (kind in (
  'friend_request', 'friend_accepted', 'match', 'friend_live',
  'night_soon', 'room_open', 'room_closing', 'room_message', 'reply',
  'digest', 'dj_live', 'wave', 'spark', 'spark_in',
  'group_added', 'group_joined', 'group_match', 'group_round', 'group_won', 'group_plan',
  'group_message', 'group_live', 'group_ticket', 'post',
  'staff', 'post_like', 'post_comment',
  'dm', 'night_changed', 'spark_off', 'spark_changed', 'venue', 'group_ask'));

-- The invited one hears it (push_wants: the groups switch, like every group_ kind).
create or replace function public.push_on_group_ask()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.groups%rowtype;
begin
  select * into g from public.groups where id = new.group_id;
  perform public.push_enqueue(new.user_id, 'group_ask', format('group_ask:%s:%s', g.id, new.user_id),
    jsonb_build_object('group', g.emoji || ' ' || g.name, 'name', public.push_name(coalesce(new.asked_by, g.created_by)), 'url', '/groups'));
  return new;
exception when others then
  raise warning 'group push skipped: %', sqlerrm;
  return new;
end;
$$;
drop trigger if exists push_group_ask on public.group_asks;
create trigger push_group_ask after insert on public.group_asks
  for each row execute function public.push_on_group_ask();

-- push_text() is that of 97 with the one kind added.
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
    ('group_ask',       'en', '{group}',                       '{name} invites you · say yes or no in groups'),
    ('group_ask',       'de', '{group}',                       '{name} lädt dich ein · ja oder nein unter gruppen'),
    ('group_ask',       'tr', '{group}',                       '{name} seni davet ediyor · gruplarda evet ya da hayır de'),
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
    ('spark_off',       'tr', '{name} iptal etti',              '{title}'),
    -- 96_spark_edit.sql: a spark you said in to was changed by its host
    ('spark_changed',   'en', '{title}',                        '{name} changed it · {what}'),
    ('spark_changed',   'de', '{title}',                        '{name} hat es geändert · {what}'),
    ('spark_changed',   'tr', '{title}',                        '{name} değiştirdi · {what}'),
    -- 97_venue_desk.sql: a word from a room you keep nights at (the own line of the manager)
    ('venue',           'en', '{venue}',                        '{line}'),
    ('venue',           'de', '{venue}',                        '{line}'),
    ('venue',           'tr', '{venue}',                        '{line}')
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

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('114_group_asks.sql', '882aee9bc27e5a7aed2b0e2ed89e71fed55d8ecab7894f9040d1c49901a785f0');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('114_group_asks.sql');
  end if;
end $$;
