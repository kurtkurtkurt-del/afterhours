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
