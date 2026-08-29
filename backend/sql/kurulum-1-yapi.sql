-- ============================================================
--  afterhours — KURULUM 1 / 2 : YAPI
--
--  Supabase panelinde: SQL Editor → New query → bu dosyanin
--  TAMAMINI yapistir → Run.
--
--  Bittiginde "Success. No rows returned" gormelisin.
--  Sonra kurulum-2-yorumlar.sql'i ayni sekilde calistir.
--
--  URETILMIS DOSYA — kaynak: backend/tools/kurulum-uret.mjs
-- ============================================================


-- ============================================================
--  TABLOLAR   (01_schema.sql)
-- ============================================================

-- afterhours — tablolar
-- Supabase SQL editorunde sirayla calistirilir: 01 → 02 → 03 → ...
-- Kimlik dogrulama Supabase'in auth semasindan gelir; burada sadece
-- ona baglanan public sema var.

-- gen_random_uuid() Postgres 13'ten beri cekirdekte; uzanti gerekmiyor.

-- ---------------------------------------------------------------- sehir

create table if not exists public.cities (
  id      uuid primary key default gen_random_uuid(),
  slug    text unique not null,
  name    text not null,
  -- ana sayfadaki durust sehir listesi: yayinda / yakinda / hedefte
  status  text not null default 'live' check (status in ('live', 'soon', 'planned')),
  sira    int  not null default 0
);

-- ------------------------------------------------------------------ tur

create table if not exists public.event_types (
  id    uuid primary key default gen_random_uuid(),
  slug  text unique not null,
  name  text not null,
  -- spec'in kendi sirasi: rave, club night, konzert, festival, meetup, hausparty
  sira  int  not null
);

-- ----------------------------------------------------------------- mekan

create table if not exists public.venues (
  id          uuid primary key default gen_random_uuid(),
  city_id     uuid not null references public.cities on delete restrict,
  slug        text not null,
  name        text not null,
  -- sehir kuresi/harita icin; footerdaki "kac oda acik" sayaci saatleri kullanir
  map_x       int,
  map_y       int,
  opens_hour  numeric(4,1),
  open_hours  numeric(4,1),
  unique (city_id, slug)
);

-- ------------------------------------------------------------- etkinlik

create table if not exists public.events (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  city_id       uuid not null references public.cities on delete restrict,
  type_id       uuid not null references public.event_types on delete restrict,
  venue_id      uuid references public.venues on delete set null,

  title         text not null,
  -- ekranda birebir gorunen satir. Kaynak burasi; bozulmamali.
  meta          text not null,
  body          text not null default '',

  poster_no     int check (poster_no > 0),
  -- doluysa depodaki dosya, bossa posters/NN.svg kullanilir
  poster_path   text,

  -- Mevcut veride "Sommer 2027", "Mittwochs", "TBA" gibi tarih olmayan
  -- tarihler var; bu yuzden bos olabilir. meta her zaman dogrudur.
  starts_at     timestamptz,
  date_text     text,
  -- Eldeki veride cogu tarihte yil yok ("05.09"). Yil cikarim ile
  -- dolduruldu; bu bayrak "dogrulanmadi" demek. Admin panelinde uyari
  -- olarak gorunur. meta her zaman dogru oldugu icin ekran etkilenmez.
  starts_at_estimated boolean not null default false,

  is_published  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists events_city_idx    on public.events (city_id);
create index if not exists events_type_idx    on public.events (type_id);
create index if not exists events_starts_idx  on public.events (starts_at);
create index if not exists events_published_idx on public.events (is_published);

-- --------------------------------------------------------------- kisiler

-- auth.users gizli kalir (e-posta orada); herkese acik olan kisim burasi.
create table if not exists public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  handle        text unique,
  display_name  text,
  -- etkinlik yazma yetkisi buradan cikiyor. Sadece Ahmet'te true.
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now()
);

-- --------------------------------------------------------------- atislar

-- Biriktirilen kartlar ayri bir tablo degil: yonu 'right' olan atislardir.
create table if not exists public.swipes (
  id          uuid primary key default gen_random_uuid(),
  -- Varsayilan oturumdaki kisi: tarayici kimin adina yazdigini
  -- hic gondermiyor, uydurma sansi da kalmiyor.
  user_id     uuid not null default auth.uid() references public.profiles on delete cascade,
  event_id    uuid not null references public.events on delete cascade,
  direction   text not null check (direction in ('left', 'right')),
  created_at  timestamptz not null default now(),
  unique (user_id, event_id)
);

create index if not exists swipes_event_idx on public.swipes (event_id);
create index if not exists swipes_user_dir_idx on public.swipes (user_id, direction);

-- ----------------------------------------------------------- beforehours

-- Tek tablo, iki seviye: parent_id bossa konu, doluysa cevap.
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events on delete cascade,
  parent_id   uuid references public.comments on delete cascade,
  author_id   uuid default auth.uid() references public.profiles on delete set null,
  -- gercek kullanicisi olmayan ornek yorumlar icin
  author_name text,
  body        text not null check (length(btrim(body)) > 0),
  is_hidden   boolean not null default false,
  created_at  timestamptz not null default now(),
  -- Ornek yorumlarin ekranda gorunen zaman metni ("4 days ago", "Nov 2023").
  -- Gercek yorumlarda bos kalir; o zaman created_at'ten uretilir.
  time_text   text,
  constraint comments_author_var check (author_id is not null or author_name is not null)
);

create index if not exists comments_event_idx on public.comments (event_id, created_at);
create index if not exists comments_parent_idx on public.comments (parent_id);

-- Ucuncu seviye yok (ekran iki seviye gosteriyor) ve cevap, konusuyla
-- ayni etkinlige ait olmak zorunda.
create or replace function public.comments_check_depth()
returns trigger
language plpgsql
as $$
declare
  ust public.comments%rowtype;
begin
  if new.parent_id is null then
    return new;
  end if;

  select * into ust from public.comments where id = new.parent_id;

  if ust.parent_id is not null then
    raise exception 'yoruma verilen cevaba cevap yazilamaz (iki seviye)';
  end if;

  if ust.event_id <> new.event_id then
    raise exception 'cevap, konusuyla ayni etkinlige ait olmali';
  end if;

  return new;
end;
$$;

drop trigger if exists comments_depth on public.comments;
create trigger comments_depth
  before insert or update on public.comments
  for each row execute function public.comments_check_depth();

-- ------------------------------------------------------------ arkadaslik

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

-- ------------------------------------- yeni kullaniciya otomatik profil

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


-- ============================================================
--  KURALLAR — guvenlik burada   (02_rls.sql)
-- ============================================================

-- afterhours — kimin neyi gorebilecegi / yazabilecegi
-- Bu dosya guvenligin kendisi. Sayfayi gizlemek guvenlik degil; kural burada.

-- ------------------------------------------------------------ yardimcilar

-- profiles uzerinde RLS var; policy icinden profiles okumak sonsuz donguye
-- girer. security definer bu yuzden: fonksiyon RLS'i atlar.
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

-- Kimse kendini yonetici yapamasin.
create or replace function public.guard_is_admin()
returns trigger
language plpgsql
as $$
begin
  -- auth.uid() bos ise istek servis rolunden / SQL editorunden geliyor
  -- demektir; ilk yonetici oradan atanir. Anonim buraya hic ulasamaz,
  -- cunku profiles_update_own politikasi onu zaten durdurur.
  if new.is_admin is distinct from old.is_admin
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'is_admin sadece yonetici tarafindan degistirilebilir';
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

-- ------------------------------------------- katalog: herkes okur, admin yazar

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

-- --------------------------------------------------------------- etkinlik

-- Giris yapmadan gezilebilir: yayindaki etkinlikleri herkes okur.
drop policy if exists events_read on public.events;
create policy events_read on public.events for select
  using (is_published or public.is_admin());

drop policy if exists events_write on public.events;
create policy events_write on public.events for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------- profil

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (true);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ----------------------------------------------------------------- atis

-- Kendi atislarin + onayli arkadaslarinin SAGA attiklari.
-- Arkadasinin sola attigi kimseyi ilgilendirmiyor.
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

-- Yazmak giris ister ve baskasinin adina yazilamaz.
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

-- ------------------------------------------------------------ arkadaslik

drop policy if exists friendships_read on public.friendships;
create policy friendships_read on public.friendships for select
  using (requester_id = auth.uid() or addressee_id = auth.uid());

drop policy if exists friendships_insert on public.friendships;
create policy friendships_insert on public.friendships for insert
  with check (requester_id = auth.uid());

-- Karsi taraf kabul eder, iki taraf da geri alabilir.
drop policy if exists friendships_update on public.friendships;
create policy friendships_update on public.friendships for update
  using (requester_id = auth.uid() or addressee_id = auth.uid())
  with check (requester_id = auth.uid() or addressee_id = auth.uid());

drop policy if exists friendships_delete on public.friendships;
create policy friendships_delete on public.friendships for delete
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- ---------------------------------------------------------------- izinler

grant usage on schema public to anon, authenticated;

grant select on public.cities, public.event_types, public.venues,
                public.events, public.profiles, public.comments to anon, authenticated;

grant insert, update, delete on public.swipes, public.comments, public.friendships to authenticated;
grant select on public.swipes, public.friendships to authenticated;
grant update on public.profiles to authenticated;
grant insert, update, delete on public.cities, public.event_types,
                                 public.venues, public.events to authenticated;


-- ============================================================
--  SEHIR, TUR, MEKAN   (03_seed_katalog.sql)
-- ============================================================

-- URETILMIS DOSYA — elle duzenleme. Kaynak: backend/tools/seed-uret.mjs
-- Sehirler, turler ve mekanlar. Once bu, sonra 04.

insert into public.cities (slug, name, status, sira) values
  ('munchen', 'münchen', 'live', 1),
  ('istanbul', 'istanbul', 'live', 2),
  ('ankara', 'ankara', 'soon', 3),
  ('berlin', 'berlin', 'planned', 4),
  ('wien', 'wien', 'planned', 5),
  ('koln', 'köln', 'planned', 6)
on conflict (slug) do nothing;

insert into public.event_types (slug, name, sira) values
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


-- ============================================================
--  36 ETKINLIK   (04_seed_events.sql)
-- ============================================================

-- URETILMIS DOSYA — kaynak: events-data.js (36 kayit)
-- meta alani ekranda gorunen satirin ta kendisi; degistirilmemeli.

insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select 'asap-rocky', c.id, t.id, v.id,
       'A$AP Rocky', 'Olympiahalle · 11.09.26 · 18:30', $ah$An arena show built around one voice. Doors early, everyone seated until they aren't.$ah$, 1,
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
       'Thirty Seconds to Mars', 'Olympiahalle · 12.04.27', $ah$Stadium rock at hall scale. Bring a voice you don't mind losing.$ah$, 4,
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
       'Zamanand', 'München · 12.09 · 16:00', $ah$Starts in daylight and never quite admits it's a festival. Local bills, no headliner hierarchy.$ah$, 10,
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
       'CFU Open Air', 'Bahnwärter Thiel · 18.07 · 14:00', $ah$Outside while it's warm, inside when it isn't. The same crowd moves between both all afternoon.$ah$, 14,
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
       'Echonomist', 'Pimpernel · 25.09 · 22:00', $ah$Staged inside a former cinema — the screen stays up, the seats don't. Sound follows the room.$ah$, 16,
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
       '3. Stock Links', 'Haidhausen · 05.07 · 20:00', $ah$Balcony party with string lights and a borrowed speaker. Quiet by two, that's the deal with the neighbours.$ah$, 22,
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
       'Kaffee & Karten', 'Westend · Sonntags · 15:00', $ah$Card games and too much coffee. Daylight only — it's over before anything else starts.$ah$, 28,
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
       'Sprechstunde', 'Untergiesing · Mittwochs · 19:30', $ah$An open round table — you talk about what you're making, someone tells you what's wrong with it.$ah$, 30,
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
       'Spiegelsaal', 'P1 · 06.12 · 23:00', $ah$Italo and disco under an actual mirror ball. The most fun you'll have taking nothing seriously.$ah$, 35,
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



-- ============================================================
--  DESTE, BIRIKTIRILENLER, SAYACLAR   (06_views.sql)
-- ============================================================

-- afterhours — on yuzun kullandigi gorunumler ve fonksiyonlar
-- Sorgu mantigi burada dursun; tarayicidaki JS sadece cagirsin.

-- security_invoker: gorunum, cagirani kimse onun haklariyla calisir.
-- Bu olmazsa gorunum RLS'i atlar ve yayinda olmayan etkinlikler sizar.

-- ------------------------------------------------- etkinlik (okunur hali)

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
  t.sira  as type_sira,
  c.slug  as city_slug,
  c.name  as city_name,
  v.slug  as venue_slug,
  v.name  as venue_name
from public.events e
join public.event_types t on t.id = e.type_id
join public.cities      c on c.id = e.city_id
left join public.venues v on v.id = e.venue_id;

-- ------------------------------------------------------------ yorumlar

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

-- ------------------------------------------------------------- deste

-- Explore'un destesi. Giris yapilmissa daha once atilan kartlar dusuyor;
-- anonimde 36'sinin hepsi geliyor. Sira poster numarasi (bugunku sira).
create or replace function public.deck(
  p_city text default 'munchen',
  p_type text default null,
  p_limit int  default 60
)
returns setof public.events_public
language sql
stable
-- security definer: anonimin swipes tablosunda hicbir yetkisi yok, ama
-- deste "daha once atilmis mi" diye oraya bakmak zorunda. Fonksiyon
-- sahibin haklariyla calisiyor; disari sizmamasi icin yayin filtresi
-- ve kullanici filtresi asagida ELLE yaziliyor.
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

-- ------------------------------------------------------- atis yazma

-- Tarayici etkinligin id'sini bilmek zorunda kalmasin: slug yeter.
-- Bu sayede girissizken biriken atislar, deste yuklenmeden once
-- hesaba tasinabiliyor. user_id yine oturumdan geliyor.
create or replace function public.swipe_set(p_slug text, p_direction text)
returns void
language sql
as $$
  insert into public.swipes (event_id, direction)
  select e.id, p_direction from public.events e where e.slug = p_slug
  on conflict (user_id, event_id)
  do update set direction = excluded.direction, created_at = now();
$$;

-- --------------------------------------------------- biriktirilenler

-- "kept tonight": kendi saga attiklarin, en son ustte.
-- Duz satir donuyor, bilesik tip degil: bilesik tipler REST katmaninda
-- surumden surume farkli seriellesiyor, duz kolonlar her yerde ayni.
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

-- ------------------------------------------- arkadaslarin begendikleri

-- "friends liked swipes" modunun kaynagi. Sadece onayli arkadaslar,
-- sadece saga atilanlar; RLS zaten bunu zorluyor, burada niyet acik olsun.
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

-- --------------------------------------------------------- sayaclar

-- Ana sayfadaki "36 nights in Munich this week · 7 Rave · ..." satirinin
-- kaynagi. Bugun JS'te sayiliyor; ayni sayi buradan da gelebilsin.
create or replace function public.event_counts(p_city text default 'munchen')
returns table (type_slug text, type_name text, sira int, n bigint)
language sql
stable
as $$
  select e.type_slug, e.type_name, e.type_sira, count(*)
  from public.events_public e
  where e.is_published and e.city_slug = p_city
  group by e.type_slug, e.type_name, e.type_sira
  order by e.type_sira;
$$;

-- Bir etkinligi kac kisi biriktirmis. Kimin biriktirdigi gorunmez —
-- security definer sadece SAYIYI disari veriyor.
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

grant execute on function public.deck(text, text, int)  to anon, authenticated;
grant execute on function public.swipe_set(text, text)  to authenticated;
grant execute on function public.kept()                 to authenticated;
grant execute on function public.friends_kept(int)      to authenticated;
grant execute on function public.event_counts(text)     to anon, authenticated;
grant execute on function public.keep_counts()          to anon, authenticated;

grant select on public.events_public, public.comments_public to anon, authenticated;


-- ============================================================
--  ARKADASLIK   (07_friends.sql)
-- ============================================================

-- afterhours — arkadaslik islemleri
-- Tablo ve kurallar 01/02'de; burasi gunluk islerin fonksiyonlari.

-- Kullanici adi: arkadaslik bunun uzerinden kuruluyor, o yuzden
-- bicimi zorunlu. Kucuk harf, rakam, alt cizgi; 3-20 karakter.
alter table public.profiles
  drop constraint if exists profiles_handle_bicim;
alter table public.profiles
  add constraint profiles_handle_bicim
  check (handle is null or handle ~ '^[a-z0-9_]{3,20}$');

-- Kendi arkadaslarin ve bekleyen istekler, tek listede.
-- yon: 'giden' = sen istedin, 'gelen' = sana geldi.
create or replace function public.friends_list()
returns table (
  other_id      uuid,
  handle        text,
  display_name  text,
  status        text,
  yon           text
)
language sql
stable
as $$
  select f.addressee_id, p.handle, p.display_name, f.status, 'giden'
  from public.friendships f
  join public.profiles p on p.id = f.addressee_id
  where f.requester_id = auth.uid()
  union all
  select f.requester_id, p.handle, p.display_name, f.status, 'gelen'
  from public.friendships f
  join public.profiles p on p.id = f.requester_id
  where f.addressee_id = auth.uid()
  order by 4, 2;
$$;

-- Kullanici adiyla istek gonder. Karsi taraf zaten sana istek
-- gonderdiyse istegi kabul etmis olursun — iki kere sormaya gerek yok.
create or replace function public.friend_request(p_handle text)
returns text
language plpgsql
as $$
declare
  hedef uuid;
begin
  select id into hedef from public.profiles where handle = lower(btrim(p_handle));

  if hedef is null then
    return 'bulunamadi';
  end if;
  if hedef = auth.uid() then
    return 'kendine';
  end if;

  -- Karsi yonde bekleyen bir istek varsa onu kabul et
  if exists (select 1 from public.friendships
             where requester_id = hedef and addressee_id = auth.uid()) then
    update public.friendships set status = 'accepted'
    where requester_id = hedef and addressee_id = auth.uid();
    return 'kabul';
  end if;

  insert into public.friendships (requester_id, addressee_id)
  values (auth.uid(), hedef)
  on conflict (requester_id, addressee_id) do nothing;

  return 'gonderildi';
end;
$$;

-- Sana gelen istegi kabul et.
create or replace function public.friend_accept(p_other uuid)
returns boolean
language sql
as $$
  update public.friendships set status = 'accepted'
  where requester_id = p_other and addressee_id = auth.uid()
  returning true;
$$;

-- Arkadasligi bitir / istegi geri al. Iki yon de calisir.
create or replace function public.friend_remove(p_other uuid)
returns boolean
language sql
as $$
  with silinen as (
    delete from public.friendships
    where (requester_id = auth.uid() and addressee_id = p_other)
       or (addressee_id = auth.uid() and requester_id = p_other)
    returning 1
  )
  select exists (select 1 from silinen);
$$;

grant execute on function public.friends_list()          to authenticated;
grant execute on function public.friend_request(text)    to authenticated;
grant execute on function public.friend_accept(uuid)     to authenticated;
grant execute on function public.friend_remove(uuid)     to authenticated;


-- ============================================================
--  POSTER DEPOSU   (08_storage.sql)
-- ============================================================

-- afterhours — poster deposu (Supabase Storage)
-- storage semasi yalnizca Supabase'de var; yerel testlerde bu blok
-- kendiliginden atlanir. Bu yuzden butun ifadeler dinamik (execute).

do $$
begin
  if not exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    raise notice 'storage semasi yok — poster deposu atlandi (yerel calisma)';
    return;
  end if;

  -- Herkese acik kova: posterler zaten sitede gorunuyor, gizli degiller.
  execute $q$
    insert into storage.buckets (id, name, public)
    values ('posters', 'posters', true)
    on conflict (id) do nothing
  $q$;

  -- Okuma herkese acik
  execute $q$ drop policy if exists "posters okunur" on storage.objects $q$;
  execute $q$
    create policy "posters okunur" on storage.objects
      for select using (bucket_id = 'posters')
  $q$;

  -- Yazma yalniz yoneticide. public.is_admin() 02_rls.sql'de tanimli.
  execute $q$ drop policy if exists "posters yonetici yazar" on storage.objects $q$;
  execute $q$
    create policy "posters yonetici yazar" on storage.objects
      for insert with check (bucket_id = 'posters' and public.is_admin())
  $q$;

  execute $q$ drop policy if exists "posters yonetici gunceller" on storage.objects $q$;
  execute $q$
    create policy "posters yonetici gunceller" on storage.objects
      for update using (bucket_id = 'posters' and public.is_admin())
      with check (bucket_id = 'posters' and public.is_admin())
  $q$;

  execute $q$ drop policy if exists "posters yonetici siler" on storage.objects $q$;
  execute $q$
    create policy "posters yonetici siler" on storage.objects
      for delete using (bucket_id = 'posters' and public.is_admin())
  $q$;
end
$$;


-- ============================================================
--  ARKA PLAN ISLERI   (09_jobs.sql)
-- ============================================================

-- afterhours — arka planda calisan isler
-- pg_cron uzantisi Supabase'de Database → Extensions altindan acilir.
-- Uzanti yoksa fonksiyonlar yine calisir, sadece kendiliginden
-- tetiklenmez; elle de cagirabilirsin.

-- Gecmis etkinlikleri listeden dusur.
-- ONEMLI: sadece tarihi DOGRULANMIS olanlara dokunuyor. Yil cikarimiyla
-- doldurulmus 24 tarih yanlis olabilir; onlari kendiliginden gizlemek
-- gercek bir etkinligi siteden silmek olurdu.
create or replace function public.hide_past_events()
returns integer
language sql
security definer
set search_path = public
as $$
  with kapatilan as (
    update public.events
    set is_published = false
    where is_published
      and starts_at is not null
      and not starts_at_estimated
      and starts_at < now() - interval '12 hours'   -- gece bitsin, sonra dussun
    returning 1
  )
  select count(*)::int from kapatilan;
$$;

-- Bakim ozeti: neyin ilgi bekledigini tek satirda soyler.
-- Yonetim panelindeki uyarilarin veritabanindaki karsiligi.
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
  swipes            bigint
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
    (select count(*) from public.swipes);
$$;

grant execute on function public.health() to anon, authenticated;

-- Zamanlama. pg_cron acik degilse bu blok sessizce atlanir.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('afterhours-gecmisi-dusur')
      where exists (select 1 from cron.job where jobname = 'afterhours-gecmisi-dusur');
    perform cron.schedule(
      'afterhours-gecmisi-dusur',
      '30 5 * * *',                       -- her gun 05:30 UTC, gece bittikten sonra
      $job$ select public.hide_past_events(); $job$
    );
  end if;
end
$$;
