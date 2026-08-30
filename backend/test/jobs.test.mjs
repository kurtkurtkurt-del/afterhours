/* afterhours — arka plan isleri */

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
                 "../sql/03_seed_catalog.sql", "../sql/04_seed_events.sql",
                 "../sql/06_views.sql", "../sql/09_jobs.sql"]) {
  await db.exec(await read(d));
}

console.log("\n— gecmisi dusurme —");
{
  /* Once butun tohumu gelecege itiyoruz. Yoksa test takvime bagli
     kaliyor: tohumdaki one gecenin tarihi gercekten gecince (29.08.26,
     rote-sonne-bahnwarter) is onu da dusuruyor ve sayilar kayiyor.
     Testin olctugu sey tarih degil, kuralin kendisi. */
  await db.exec(`
    update public.events set starts_at = now() + interval '30 days'
      where starts_at is not null;
  `);

  /* Dort status kuruyoruz: gecmis+dogrulanmis, gecmis+tahmin, gelecek,
     ve daha gece bitmemis olan */
  await db.exec(`
    update public.events set starts_at = now() - interval '3 days',
                             starts_at_estimated = false
      where slug = 'asap-rocky';
    update public.events set starts_at = now() - interval '3 days',
                             starts_at_estimated = true
      where slug = 'nick-cave';
    update public.events set starts_at = now() + interval '3 days',
                             starts_at_estimated = false
      where slug = 'blitz';
    update public.events set starts_at = now() - interval '2 hours',
                             starts_at_estimated = false
      where slug = 'strobo';
  `);

  const n = await db.query(`select public.hide_past_events() as n`);
  check(n.rows[0].n === 1, "sadece one etkinlik dusuruldu", "dusen " + n.rows[0].n);

  const d = await db.query(`select slug, is_published from public.events
                            where slug in ('asap-rocky','nick-cave','blitz','strobo')
                            order by slug`);
  const status = Object.fromEntries(d.rows.map((r) => [r.slug, r.is_published]));
  check(status["asap-rocky"] === false, "gecmis + dogrulanmis tarih → dusuruldu");
  check(status["nick-cave"] === true,
    "gecmis ama DOGRULANMAMIS tarih → dokunulmadi (yanlis olabilir)");
  check(status["blitz"] === true, "gelecekteki etkinlik duruyor");
  check(status["strobo"] === true, "2 saat once baslayan hala duruyor (gece bitmedi)");

  const tekrar = await db.query(`select public.hide_past_events() as n`);
  check(tekrar.rows[0].n === 0, "ikinci calisma one sey degistirmiyor");
}

console.log("\n— health ozeti —");
{
  const h = await db.query(`select * from public.health()`);
  const s = h.rows[0];
  check(Number(s.events) === 36, "36 etkinlik sayildi");
  check(Number(s.published) === 35, "biri dusurulmus olarak gorunuyor");
  check(Number(s.unverified_date) > 0, "dogrulanmamis tarihler raporlaniyor");
  check(Number(s.missing_venue) === 8, "mekansizlar raporlaniyor");
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
