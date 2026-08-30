/* afterhours — guncelleme dosyasi.
   Buradaki asil mesele SU: one goc dosyasini GUNCEL semaya karsi test
   etmek hicbir sey kanitlamiyor. Ilk denemede tam bu oldu — guncelleme
   bende passed, Ahmet'in projesinde "column c.continent does not exist"
   ile durdu, cunku onun semasinda o sutun yoktu.

   Bu yuzden burada once semayi ESKI haline dusuruyoruz.  */

import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

const read = (y) => readFile(new URL(y, import.meta.url), "utf8");
let passed = 0, failed = 0;
const check = (k, name, extra = "") => {
  if (k) { passed++; console.log("  ✓ " + name); }
  else { failed++; console.log("  ✗ " + name + (extra ? "  → " + extra : "")); }
};
process.on("unhandledRejection", (e) => {
  console.log("\nHATA: " + ((e && e.message) || e)); process.exit(1);
});

const db = new PGlite();
for (const d of ["../test/supabase-shim.sql", "../sql/01_schema.sql", "../sql/02_rls.sql",
                 "../sql/03_seed_katalog.sql", "../sql/04_seed_events.sql",
                 "../sql/06_views.sql", "../sql/07_friends.sql"]) {
  await db.exec(await read(d));
}

console.log("\n— sema dunya oncesine dusuruluyor —");
await db.exec(`
  drop function if exists public.city_counts();
  alter table public.cities drop column if exists country;
  alter table public.cities drop column if exists country_slug;
  alter table public.cities drop column if exists continent;
  alter table public.cities drop column if exists continent_slug;
  delete from public.cities where slug in ('hamburg','frankfurt','leipzig','izmir','graz');
`);
{
  const r = await db.query(`select count(*)::int as n from public.cities`);
  check(r.rows[0].n === 6, "eski hal: 6 sehir, ulke/kita sutunu yok");
}

console.log("\n— guncelleme uygulaniyor —");
{
  let hata = null;
  try { await db.exec(await read("../sql/guncelleme-dunya.sql")); }
  catch (e) { hata = e.message; }
  check(!hata, "guncelleme eski semada calisiyor", hata);
}

{
  const r = await db.query(`
    select (select count(*) from public.cities) s,
           (select count(*) from public.events) e,
           (select count(distinct continent_slug) from public.cities) k,
           (select count(distinct country_slug) from public.cities) u`);
  check(Number(r.rows[0].s) === 54, "54 sehir", "found " + r.rows[0].s);
  check(Number(r.rows[0].e) === 142, "142 etkinlik (36 Munih + 106 dunya)", "found " + r.rows[0].e);
  check(Number(r.rows[0].k) === 6, "6 kita");
  check(Number(r.rows[0].u) === 18, "18 ulke");

  const c = await db.query(`select count(*)::int as n from public.city_counts()`);
  check(c.rows[0].n === 54, "city_counts calisiyor");

  /* Her ulkede tam uc sehir check — filtre buna gore kuruluyor */
  const ucer = await db.query(`
    select count(*)::int as n from (
      select country_slug from public.cities
      group by country_slug having count(*) <> 3
    ) x`);
  check(ucer.rows[0].n === 0, "her ulkede tam uc sehir var");

  /* Poster numaralari cakismasin: her etkinlik kendi posterini gostersin */
  const cakisan = await db.query(`
    select count(*)::int as n from (
      select poster_no from public.events
      where poster_no is not null group by poster_no having count(*) > 1
    ) x`);
  check(cakisan.rows[0].n === 0, "hicbir poster iki etkinlikte kullanilmiyor");
}

console.log("\n— ikinci kez calistirmak —");
{
  await db.exec(await read("../sql/guncelleme-dunya.sql"));
  const r = await db.query(`
    select (select count(*) from public.cities) s, (select count(*) from public.events) e`);
  check(Number(r.rows[0].s) === 54 && Number(r.rows[0].e) === 142,
    "sayilar degismedi", r.rows[0].s + " / " + r.rows[0].e);
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
