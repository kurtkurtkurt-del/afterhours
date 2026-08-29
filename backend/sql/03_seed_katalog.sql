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
