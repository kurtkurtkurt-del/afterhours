/* afterhours — turns the world data into SQL.
   Output: backend/sql/11_world.sql  (54 cities, 106 nights)

   Run once against an existing project; on a clean install it already
   arrives inside the combined setup file.                             */

import { readFile, writeFile } from "node:fs/promises";

const record = JSON.parse(
  await readFile(new URL("./world-record.json", import.meta.url), "utf8"));
const { CONTINENTS } = await import("./world-data.mjs");

/* Escaped quote: balanced, for the sake of SQL editors that parse it */
const q = (v) => (v === null || v === undefined)
  ? "null" : "'" + String(v).replace(/'/g, "''") + "'";

const slugify = (s) => s.toLowerCase()
  .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ä/g, "a").replace(/ß/g, "ss")
  .replace(/ş/g, "s").replace(/ç/g, "c").replace(/ı/g, "i").replace(/ğ/g, "g")
  .replace(/é|è|ê/g, "e").replace(/á|à|â/g, "a").replace(/í|ì/g, "i")
  .replace(/ó|ò|ô/g, "o").replace(/ú|ù|û/g, "u").replace(/ñ/g, "n")
  .replace(/\$/g, "s")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* "12.09" + "23:30" → 2026-09-12T23:30:00+02:00 */
function toTimestamp(day, time) {
  const [dd, mm] = day.split(".");
  return `2026-${mm}-${dd}T${time}:00+02:00`;
}

let sql = `-- ============================================================
--  afterhours — THE WORLD: 6 continents, 18 countries, 54 cities, 106 nights
--
--  GENERATED FILE — source: backend/tools/world-sql.mjs
--  The content is invented but written by hand; the posters were
--  generated alongside it (posters/37.svg … 142.svg).
-- ============================================================

-- Continent fields on the cities
alter table public.cities add column if not exists continent text;
alter table public.cities add column if not exists continent_slug text;

-- Drop the cities with no nights that broke the shape (three per country).
delete from public.cities
where slug in ('hamburg', 'frankfurt', 'leipzig')
  and not exists (select 1 from public.events e where e.city_id = cities.id);

`;

/* --- cities --- */

let sort_order = 0;
const rows = [];
for (const k of CONTINENTS) {
  for (const u of k.countries) {
    for (const s of u.cities) {
      sort_order++;
      const status = s.nights.length || s.slug === "munchen" ? "live" : "planned";
      rows.push(`  (${q(s.slug)}, ${q(s.name)}, ${q(status)}, ${sort_order}, ` +
        `${q(u.name)}, ${q(u.code)}, ${q(k.continent)}, ${q(k.continentSlug)})`);
    }
  }
}

sql += `insert into public.cities
  (slug, name, status, sort_order, country, country_slug, continent, continent_slug)
values
${rows.join(",\n")}
on conflict (slug) do update set
  name = excluded.name,
  status = excluded.status,
  sort_order = excluded.sort_order,
  country = excluded.country,
  country_slug = excluded.country_slug,
  continent = excluded.continent,
  continent_slug = excluded.continent_slug;

create index if not exists cities_continent_idx
  on public.cities (continent_slug, country_slug, sort_order);

`;

/* --- nights --- */

for (const g of record) {
  const slug = slugify(g.city + "-" + g.title);
  const meta = `${g.venue} · ${g.day} · ${g.time}`;
  sql += `insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select ${q(slug)}, c.id, t.id, ${q(g.title)}, ${q(meta)}, ${q(g.body)},
       ${g.no}, ${q(toTimestamp(g.day, g.time))}::timestamptz, false, ${q(g.day + " · " + g.time)}
from public.cities c
join public.event_types t on t.slug = ${q(slugify(g.kind))}
where c.slug = ${q(g.city)}
on conflict (slug) do nothing;

`;
}

await writeFile(new URL("../sql/11_world.sql", import.meta.url), sql);
console.log("11_world.sql written: " + rows.length + " cities, " + record.length + " nights, " +
            Buffer.byteLength(sql).toLocaleString() + " bytes");
