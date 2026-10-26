-- afterhours — a spark can be changed after it went out (96)
--
-- The owner, 22.10.2026: the details of a spark can be edited later from the
-- profile, and the people who said in hear about it. spark_edit(id, title, starts_at,
-- place) is for the host only and keeps the rules of spark_create (28): a time that
-- has not passed, the title and the place within the table checks. Nothing changed,
-- nothing sent. Otherwise each person who answered in gets one push, in their own
-- language: {title} · {name} changed it · new time fri 21:00 · new place. The place
-- itself is not written on the lock screen, only that it moved. The switch is
-- notify_sparks, as for the other spark pushes. The word watch (79) and the ban
-- guard (52) already look at every update of sparks.
--
-- push_text() is that of 75 and push_wants() that of 81, each with the one kind added.

alter table public.push_outbox drop constraint if exists push_outbox_kind_check;
alter table public.push_outbox add constraint push_outbox_kind_check check (kind in (
  'friend_request', 'friend_accepted', 'match', 'friend_live',
  'night_soon', 'room_open', 'room_closing', 'room_message', 'reply',
  'digest', 'dj_live', 'wave', 'spark', 'spark_in',
  'group_added', 'group_joined', 'group_match', 'group_round', 'group_won', 'group_plan',
  'group_message', 'group_live', 'group_ticket', 'post',
  'staff', 'post_like', 'post_comment',
  'dm', 'night_changed', 'spark_off', 'spark_changed'));

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
    ('spark_off',       'tr', '{name} iptal etti',              '{title}'),
    -- 96_spark_edit.sql: a spark you said in to was changed by its host
    ('spark_changed',   'en', '{title}',                        '{name} changed it · {what}'),
    ('spark_changed',   'de', '{title}',                        '{name} hat es geändert · {what}'),
    ('spark_changed',   'tr', '{title}',                        '{name} değiştirdi · {what}')
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
             when p_kind in ('spark', 'spark_in', 'spark_off', 'spark_changed') then s.notify_sparks
             when p_kind like 'group\_%' then s.notify_groups
             when p_kind in ('post', 'post_like', 'post_comment') then false
             when p_kind = 'dm'              then s.notify_dms
           end
    from public.profile_settings s where s.user_id = p_user), true);
$$;

-- What changed, in the language of the one who receives it; the parts joined by a dot.
create or replace function public.spark_change_words(p_lang text, p_title boolean, p_when text, p_place boolean)
returns text
language sql
immutable
as $$
  select array_to_string(array_remove(array[
    case when p_when is not null then
      case coalesce(nullif(p_lang, ''), 'en') when 'de' then 'neue zeit ' when 'tr' then 'yeni saat ' else 'new time ' end || p_when
    end,
    case when p_place then
      case coalesce(nullif(p_lang, ''), 'en') when 'de' then 'neuer ort' when 'tr' then 'yeni yer' else 'new place' end
    end,
    case when p_title then
      case coalesce(nullif(p_lang, ''), 'en') when 'de' then 'neuer name' when 'tr' then 'yeni isim' else 'new name' end
    end
  ], null), ' · ');
$$;

-- The host changes the name, the time or the place. Returns how many people were told.
create or replace function public.spark_edit(
  p_spark     uuid,
  p_title     text,
  p_starts_at timestamptz,
  p_place     text
)
returns int
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  s        public.sparks%rowtype;
  t        text := btrim(coalesce(p_title, ''));
  pl       text := nullif(btrim(coalesce(p_place, '')), '');
  title_ch boolean;
  when_ch  boolean;
  place_ch boolean;
  told     int := 0;
  them     record;
  lang     text;
begin
  select * into s from public.sparks where id = p_spark and host_id = auth.uid();
  if s.id is null then
    raise exception 'not yours' using errcode = '42501';
  end if;
  if p_starts_at is null or p_starts_at < now() - interval '1 hour' then
    raise exception 'that time has passed' using errcode = '22023';
  end if;
  title_ch := t is distinct from s.title;
  when_ch  := p_starts_at is distinct from s.starts_at;
  place_ch := pl is distinct from s.place;
  if not (title_ch or when_ch or place_ch) then
    return 0;
  end if;

  update public.sparks set title = t, starts_at = p_starts_at, place = pl where id = s.id;

  for them in
    select i.user_id from public.spark_invites i
    where i.spark_id = s.id and i.answer = 'in' and i.user_id <> s.host_id
  loop
    lang := (select coalesce(nullif(x.locale, ''), 'en') from public.profile_settings x where x.user_id = them.user_id);
    perform public.push_enqueue(them.user_id, 'spark_changed',
      format('spark_changed:%s:%s:%s', s.id, them.user_id, md5(concat_ws('|', t, p_starts_at::text, pl))),
      jsonb_build_object(
        'name',  public.push_name(s.host_id),
        'title', t,
        'what',  public.spark_change_words(lang, title_ch,
                   case when when_ch then public.push_when(them.user_id, p_starts_at) end, place_ch),
        'url',   '/spark/' || s.kind || '?invite=' || s.id));
    told := told + 1;
  end loop;
  return told;
end;
$$;
revoke execute on function public.spark_edit(uuid, text, timestamptz, text) from public, anon;
grant execute on function public.spark_edit(uuid, text, timestamptz, text)  to authenticated;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('96_spark_edit.sql', '8c2bba2ca9b60b9bb5d1d1bb87d456881ff58871f5a94e8a946046bb766c856f');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('96_spark_edit.sql');
  end if;
end $$;
