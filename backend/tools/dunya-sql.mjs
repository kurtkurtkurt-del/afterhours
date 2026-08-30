/* afterhours — dunya verisinden SQL uretir.
   Cikti: backend/sql/11_dunya.sql  (54 sehir, 106 gece)

   Mevcut projede one kez calistirilir; temiz kurulumda birlestirilmis
   dosyanin icinde zaten geliyor.                                      */

import { readFile, writeFile } from "node:fs/promises";

const record = JSON.parse(
  await readFile(new URL("./dunya-record.json", import.meta.url), "utf8"));
const { KITALAR } = await import("./dunya-veri.mjs");

/* Kacisli quote: SQL editorlerinin ayristiricisi icin dengeli */
const q = (v) => (v === null || v === undefined)
  ? "null" : "'" + String(v).replace(/'/g, "''") + "'";

const slugla = (s) => s.toLowerCase()
  .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ä/g, "a").replace(/ß/g, "ss")
  .replace(/ş/g, "s").replace(/ç/g, "c").replace(/ı/g, "i").replace(/ğ/g, "g")
  .replace(/é|è|ê/g, "e").replace(/á|à|â/g, "a").replace(/í|ì/g, "i")
  .replace(/ó|ò|ô/g, "o").replace(/ú|ù|û/g, "u").replace(/ñ/g, "n")
  .replace(/\$/g, "s")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* "12.09" + "23:30" → 2026-09-12T23:30:00+02:00 */
function anaCevir(gun, saat) {
  const [gg, aa] = gun.split(".");
  return `2026-${aa}-${gg}T${saat}:00+02:00`;
}

let sql = `-- ============================================================
--  afterhours — DUNYA: 6 kita, 18 ulke, 54 sehir, 106 gece
--
--  URETILMIS DOSYA — source: backend/tools/dunya-sql.mjs
--  Icerik uydurma ama elle yazildi; posterleri de uretildi
--  (posters/37.svg … 142.svg).
-- ============================================================

-- Sehirlere kita alanlari
alter table public.cities add column if not exists continent text;
alter table public.cities add column if not exists continent_slug text;

-- Yapiyi bozan, gecesi olmayan sehirleri kaldir (her ulkeye uc sehir).
delete from public.cities
where slug in ('hamburg', 'frankfurt', 'leipzig')
  and not exists (select 1 from public.events e where e.city_id = cities.id);

`;

/* --- cities --- */

let sort_order = 0;
const rows = [];
for (const k of KITALAR) {
  for (const u of k.ulkeler) {
    for (const s of u.cities) {
      sort_order++;
      const status = s.nights.length || s.slug === "munchen" ? "live" : "planned";
      rows.push(`  (${q(s.slug)}, ${q(s.name)}, ${q(status)}, ${sort_order}, ` +
        `${q(u.name)}, ${q(u.code)}, ${q(k.kita)}, ${q(k.kitaKod)})`);
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
  const slug = slugla(g.city + "-" + g.title);
  const meta = `${g.venue} · ${g.gun} · ${g.saat}`;
  sql += `insert into public.events
  (slug, city_id, type_id, title, meta, body, poster_no, starts_at,
   starts_at_estimated, date_text)
select ${q(slug)}, c.id, t.id, ${q(g.title)}, ${q(meta)}, ${q(g.body)},
       ${g.no}, ${q(anaCevir(g.gun, g.saat))}::timestamptz, false, ${q(g.gun + " · " + g.saat)}
from public.cities c
join public.event_types t on t.slug = ${q(slugla(g.kind))}
where c.slug = ${q(g.city)}
on conflict (slug) do nothing;

`;
}

await writeFile(new URL("../sql/11_dunya.sql", import.meta.url), sql);
console.log("11_dunya.sql yazildi: " + rows.length + " sehir, " + record.length + " gece, " +
            Buffer.byteLength(sql).toLocaleString() + " bayt");
