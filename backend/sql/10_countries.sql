-- afterhours — sehirlere ulke
-- Kurulumdan sonra eklendi; mevcut projede bir kez calistirilir.
-- (03_seed_katalog.sql yeniden uretildigi icin temiz kurulumda zaten var.)

alter table public.cities add column if not exists country text;
alter table public.cities add column if not exists country_slug text;

-- Kita alanlari da burada aciliyor. 11_dunya.sql onlari dolduruyor ama
-- ARADAKI 06_views.sql city_counts icinde onlara BAKIYOR — sutunlar
-- burada olmazsa guncelleme ortasinda "column c.continent does not
-- exist" ile duruyor. (Tam olarak bu yasandi.)
alter table public.cities add column if not exists continent text;
alter table public.cities add column if not exists continent_slug text;

update public.cities set country = 'Deutschland', country_slug = 'de'
  where slug in ('munchen', 'berlin', 'koln');
update public.cities set country = 'Türkiye', country_slug = 'tr'
  where slug in ('istanbul', 'ankara');
update public.cities set country = 'Österreich', country_slug = 'at'
  where slug in ('wien');

-- Listeyi biraz genislet. Hicbirinde henuz gece yok; filtrede sayilariyla
-- gorunuyorlar, yani bos olduklari sakli degil.
insert into public.cities (slug, name, status, sort_order, country, country_slug) values
  ('hamburg',   'hamburg',   'planned', 7,  'Deutschland', 'de'),
  ('frankfurt', 'frankfurt', 'planned', 8,  'Deutschland', 'de'),
  ('leipzig',   'leipzig',   'planned', 9,  'Deutschland', 'de'),
  ('izmir',     'izmir',     'planned', 10, 'Türkiye',     'tr'),
  ('graz',      'graz',      'planned', 11, 'Österreich',  'at')
on conflict (slug) do nothing;

create index if not exists cities_country_idx on public.cities (country_slug, sort_order);

-- Filtrede her sehrin yanindaki sayi. Bos sehirler bos gorunsun diye
-- yayindaki etkinlikler sayiliyor.
-- Once dusur: donus tipi degisirse create or replace yetmiyor.
drop function if exists public.city_counts();
create or replace function public.city_counts()
returns table (
  slug          text,
  name          text,
  status        text,
  sort_order          int,
  country       text,
  country_slug  text,
  n             bigint
)
language sql
stable
as $$
  select c.slug, c.name, c.status, c.sort_order, c.country, c.country_slug,
         count(e.id) filter (where e.is_published)
  from public.cities c
  left join public.events e on e.city_id = c.id
  group by c.slug, c.name, c.status, c.sort_order, c.country, c.country_slug
  order by c.sort_order;
$$;

grant execute on function public.city_counts() to anon, authenticated;
