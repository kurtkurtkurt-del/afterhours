-- afterhours — kisi profilleri
-- 01’de profil sadece "kimlik + yonetici mi" idi. Kayittan sonra ortaya
-- cikan gercek profil burada tanimlaniyor.
--
-- Ikiye ayirdik, cunku ikisi ayni sey degil:
--
--   profiles           HERKESE ACIK kart — handle, ad, bir satir, sehir.
--                      Arkadasin gordugu, yabancinin gordugu sey bu.
--   profile_settings   YALNIZ SANA ait — kim ne gorebilir, e-posta
--                      isteyip istemedigin. Yonetici bile okuyamaz.
--
-- Ayirmasaydik profiles’in "herkes okur" kurali ayarlari da acardi.

-- --------------------------------------------------- herkese acik kart

alter table public.profiles
  add column if not exists bio          text,
  add column if not exists city_id      uuid references public.cities on delete set null,
  -- Kayit bitmis sayilmiyor: hesap acilir, handle secilince biter.
  add column if not exists onboarded_at timestamptz,
  add column if not exists last_seen_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_bio_uzunluk;
alter table public.profiles
  add constraint profiles_bio_uzunluk
  check (bio is null or length(btrim(bio)) between 1 and 160);

alter table public.profiles
  drop constraint if exists profiles_ad_uzunluk;
alter table public.profiles
  add constraint profiles_ad_uzunluk
  check (display_name is null or length(btrim(display_name)) between 1 and 40);

create index if not exists profiles_city_idx on public.profiles (city_id);

-- ------------------------------------------------------- kisiye ozel ayarlar

create table if not exists public.profile_settings (
  user_id         uuid primary key references public.profiles on delete cascade,
  -- Sakladiklarini kim gorsun: onayli arkadaslar mi, hic kimse mi.
  -- Sola attiklarin zaten hicbir secenekte gorunmuyor.
  kept_visibility text not null default 'friends'
                  check (kept_visibility in ('friends', 'private')),
  -- Adini bilen bir yabanci kartini gorsun mu. Kapatirsan kart
  -- gorunmez; ama adini bilen yine arkadaslik istegi gonderebilir,
  -- yoksa kimse seni hic ekleyemezdi.
  discoverable    boolean not null default true,
  -- Arkadaslik istegi, gecenin hatirlatmasi gibi seyler icin.
  notify_email    boolean not null default true,
  locale          text not null default 'en' check (locale in ('en', 'de', 'tr')),
  updated_at      timestamptz not null default now()
);

alter table public.profile_settings enable row level security;

-- Sadece kendin. Yonetici de dahil kimse baskasininkini goremez.
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

-- --------------------------------------------- kayit: profil kendiliginden

-- 01’deki tetikleyicinin yerine geciyor. Iki fark var:
--   · ayar satiri da aciliyor (yoksa kisi ayarlarini hic goremiyor)
--   · kayit formu handle/sehir gonderdiyse deneniyor; handle doluysa
--     sessizce bos birakiliyor, kisi sonra secer
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  istenen text := lower(btrim(coalesce(new.raw_user_meta_data ->> 'handle', '')));
  sehir   text := lower(btrim(coalesce(new.raw_user_meta_data ->> 'city', '')));
  sehir_id uuid;
begin
  if istenen !~ '^[a-z0-9_]{3,20}$'
     or exists (select 1 from public.profiles where handle = istenen) then
    istenen := null;
  end if;

  if sehir <> '' then
    select id into sehir_id from public.cities where slug = sehir;
  end if;

  insert into public.profiles (id, display_name, handle, city_id, onboarded_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    istenen,
    sehir_id,
    case when istenen is null then null else now() end
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

-- Once acilmis hesaplarda ayar satiri yok; bir kerelik tamamla.
insert into public.profile_settings (user_id)
select p.id from public.profiles p
left join public.profile_settings s on s.user_id = p.id
where s.user_id is null;

-- ----------------------------------------------------- handle musait mi

-- Kayit formu her tusa basista soruyor. Donen degerler ekranda birebir
-- kullanilmiyor; on yuz kendi cumlesini yaziyor.
--   ok · bos · bicim · dolu · senin
create or replace function public.handle_status(p_handle text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when coalesce(btrim(p_handle), '') = ''            then 'bos'
    when lower(btrim(p_handle)) !~ '^[a-z0-9_]{3,20}$' then 'bicim'
    when exists (select 1 from public.profiles
                 where handle = lower(btrim(p_handle)) and id = auth.uid()) then 'senin'
    when exists (select 1 from public.profiles
                 where handle = lower(btrim(p_handle))) then 'dolu'
    else 'ok'
  end;
$$;

-- ------------------------------------------------ kaydi tamamlayan adim

-- Hesap acildiktan sonraki tek zorunlu adim: handle. Digerleri istege
-- bagli. Hepsi tek istekte gidiyor ki yarim kalmis profil olmasin.
create or replace function public.profile_setup(
  p_handle       text,
  p_display_name text default null,
  p_city_slug    text default null,
  p_bio          text default null
)
returns text
language plpgsql
as $$
declare
  durum    text := public.handle_status(p_handle);
  sehir_id uuid;
begin
  if auth.uid() is null then return 'giris'; end if;
  if durum not in ('ok', 'senin') then return durum; end if;

  if coalesce(btrim(p_city_slug), '') <> '' then
    select id into sehir_id from public.cities where slug = lower(btrim(p_city_slug));
    if sehir_id is null then return 'sehir'; end if;
  end if;

  update public.profiles set
    handle       = lower(btrim(p_handle)),
    display_name = coalesce(nullif(btrim(p_display_name), ''), display_name),
    city_id      = coalesce(sehir_id, city_id),
    bio          = case when p_bio is null then bio
                        else nullif(btrim(p_bio), '') end,
    onboarded_at = coalesce(onboarded_at, now())
  where id = auth.uid();

  insert into public.profile_settings (user_id)
  values (auth.uid()) on conflict (user_id) do nothing;

  return 'ok';
end;
$$;

-- --------------------------------------------------------- kendi profilin

-- Ayar sayfasinin ve hesap sayfasinin okudugu tek yer. Sayilar burada
-- toplaniyor ki on yuz uc ayri istek atmasin.
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

-- ------------------------------------------------------------ gizlilik

-- 02’de profil tablosu "herkes okur" idi: hesabi olmayan biri tek
-- istekle butun uye listesini indirebiliyordu. Artik tabloyu dogrudan
-- yalniz kendini, onayli arkadaslarini ve aranizda bekleyen istek
-- olanlari okuyabiliyorsun. Yabancinin gordugu her sey asagidaki
-- fonksiyonlardan geciyor; her biri sadece gerekli alani veriyor.

-- Arkadas ya da bekleyen istek — iki yonde de.
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

-- Ada gore kimlik. Kural artik yabanciyi durdurdugu icin ad aramasi
-- buradan geciyor; disari sizan tek sey "boyle biri var mi".
create or replace function public.handle_to_id(p_handle text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where handle = lower(btrim(p_handle));
$$;

-- Ayarindaki bulunabilirlik. Kendini ve arkadasini her zaman gorursun.
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

-- Yorumun altindaki isim. comments_public artik profil tablosuna
-- dokunmuyor: girissiz okuyucu da yazarin adini gorebilmeli.
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

-- Ayari baskasi adina okuyabilmek icin: profile_settings’i yalniz sahibi
-- gorebiliyor, o yuzden bu fonksiyon RLS’i atliyor. Disari sizan tek sey
-- "gorunur mu" sorusunun evet/hayiri.
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


-- ------------------------------------------------- baskasinin profili

-- Yabancinin gordugu kart. Sakladiklarinin SAYISI bile ancak onayli
-- arkadaslara ve ayar izin veriyorsa gorunuyor.
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
         -- Son gorulme yalniz arkadasa, yalniz GUN olarak. Saat/dakika
         -- kimseye gitmiyor: kimin ne zaman ayakta oldugu cikarilmasin.
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

-- ------------------------------------------------------------- goruldu

-- friends&more’daki "already on the app" listesi icin. Kisi kendi
-- satirini damgaliyor; baskasininkine dokunamaz (RLS).
create or replace function public.seen()
returns void
language sql
volatile
as $$
  update public.profiles set last_seen_at = now() where id = auth.uid();
$$;

-- ------------------------------------- sakladiklarin: ayara saygi duyan kural

-- 02’deki kural "onayli arkadas SAGA attiklarini gorur" diyordu. Ayar
-- eklendi: kisi gizli dediyse arkadas da goremez. Kurali burada
-- yeniden yaziyoruz — 02 tek basina calistirildiginda eski hali gecerli.
drop policy if exists swipes_read on public.swipes;
create policy swipes_read on public.swipes for select
  using (
    user_id = auth.uid()
    or (direction = 'right'
        and public.is_friend(user_id)
        and public.kept_visible(user_id))
  );

-- ----------------------------------- kurala takilan iki eski tanim

-- comments_public profil tablosuna join ediyordu; kural kapaninca
-- girissiz okuyucuya yazar adi bos donuyordu. Artik adi definer bir
-- fonksiyon veriyor, gorunum profile hic dokunmuyor.
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

-- friend_request ada gore kimlik ariyordu; o arama artik yardimcidan
-- geciyor. Fonksiyonun kendisi definer DEGIL: arkadaslik satirini yine
-- cagiranin haklariyla yaziyor.
create or replace function public.friend_request(p_handle text)
returns text
language plpgsql
as $$
declare
  hedef uuid;
begin
  hedef := public.handle_to_id(p_handle);

  if hedef is null then
    return 'bulunamadi';
  end if;
  if hedef = auth.uid() then
    return 'kendine';
  end if;

  if exists (select 1 from public.friendships
             where requester_id = hedef and addressee_id = auth.uid()) then
    update public.friendships set status = 'accepted'
    where requester_id = hedef and addressee_id = auth.uid();
    return 'kabul';
  end if;

  insert into public.friendships (requester_id, addressee_id)
  values (auth.uid(), hedef)
  on conflict do nothing;
  return 'gonderildi';
end;
$$;

-- ---------------------------------------------------------- hesabi silme

-- Ayar sayfasindaki son dugme. Silmek gercekten silmek: hesap, profil,
-- ayarlar, atislar ve arkadasliklar zincirle gidiyor.
--
-- Yorumlar ISTISNA. Iki sebep: (1) comments.author_id "on delete set
-- null" ve author_name bos olamaz — dokunmadan silersek kisit patlar;
-- (2) bir konuyu silmek ona gelen BASKALARININ cevaplarini da goturur.
-- O yuzden metin kaliyor, isim dusuyor: yorum "someone"a gecmis oluyor.
-- Ayar sayfasi bunu silmeden once yaziyor.
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'giris gerekli';
  end if;

  update public.comments
     set author_id = null, author_name = 'someone'
   where author_id = auth.uid();

  delete from auth.users where id = auth.uid();
end;
$$;

-- ------------------------------------------------------------- izinler

-- Supabase yeni tabloya kendiliginden izin vermiyor; 02’deki gibi elle.
grant select, insert, update on public.profile_settings to authenticated;

grant execute on function public.handle_status(text)                   to anon, authenticated;
grant execute on function public.profile_card(text)                    to anon, authenticated;
grant execute on function public.kept_visible(uuid)                    to anon, authenticated;
grant execute on function public.is_linked(uuid)                       to anon, authenticated;
grant execute on function public.card_visible(uuid)                    to anon, authenticated;
grant execute on function public.handle_to_id(text)                    to anon, authenticated;
grant execute on function public.author_name(uuid, text)               to anon, authenticated;
grant execute on function public.profile_setup(text, text, text, text) to authenticated;
grant execute on function public.profile_me()                          to authenticated;
grant execute on function public.seen()                                to authenticated;
grant execute on function public.delete_account()                      to authenticated;
