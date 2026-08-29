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
