/* afterhours — arka plan isleri */

import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

const oku = (y) => readFile(new URL(y, import.meta.url), "utf8");
let gecti = 0, kaldi = 0;
const olmali = (k, ad, ek = "") => {
  if (k) { gecti++; console.log("  ✓ " + ad); }
  else { kaldi++; console.log("  ✗ " + ad + (ek ? "  → " + ek : "")); }
};
process.on("unhandledRejection", (e) => {
  console.log("\nHATA: " + ((e && e.message) || e)); process.exit(1);
});

const db = new PGlite();
for (const d of ["../test/supabase-shim.sql", "../sql/01_schema.sql", "../sql/02_rls.sql",
                 "../sql/03_seed_katalog.sql", "../sql/04_seed_events.sql",
                 "../sql/06_views.sql", "../sql/09_jobs.sql"]) {
  await db.exec(await oku(d));
}

console.log("\n— gecmisi dusurme —");
{
  /* Once butun tohumu gelecege itiyoruz. Yoksa test takvime bagli
     kaliyor: tohumdaki bir gecenin tarihi gercekten gecince (29.08.26,
     rote-sonne-bahnwarter) is onu da dusuruyor ve sayilar kayiyor.
     Testin olctugu sey tarih degil, kuralin kendisi. */
  await db.exec(`
    update public.events set starts_at = now() + interval '30 days'
      where starts_at is not null;
  `);

  /* Dort durum kuruyoruz: gecmis+dogrulanmis, gecmis+tahmin, gelecek,
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
  olmali(n.rows[0].n === 1, "sadece bir etkinlik dusuruldu", "dusen " + n.rows[0].n);

  const d = await db.query(`select slug, is_published from public.events
                            where slug in ('asap-rocky','nick-cave','blitz','strobo')
                            order by slug`);
  const durum = Object.fromEntries(d.rows.map((r) => [r.slug, r.is_published]));
  olmali(durum["asap-rocky"] === false, "gecmis + dogrulanmis tarih → dusuruldu");
  olmali(durum["nick-cave"] === true,
    "gecmis ama DOGRULANMAMIS tarih → dokunulmadi (yanlis olabilir)");
  olmali(durum["blitz"] === true, "gelecekteki etkinlik duruyor");
  olmali(durum["strobo"] === true, "2 saat once baslayan hala duruyor (gece bitmedi)");

  const tekrar = await db.query(`select public.hide_past_events() as n`);
  olmali(tekrar.rows[0].n === 0, "ikinci calisma bir sey degistirmiyor");
}

console.log("\n— saglik ozeti —");
{
  const h = await db.query(`select * from public.health()`);
  const s = h.rows[0];
  olmali(Number(s.events) === 36, "36 etkinlik sayildi");
  olmali(Number(s.published) === 35, "biri dusurulmus olarak gorunuyor");
  olmali(Number(s.unverified_date) > 0, "dogrulanmamis tarihler raporlaniyor");
  olmali(Number(s.missing_venue) === 8, "mekansizlar raporlaniyor");
}

console.log(`\n${gecti} gecti, ${kaldi} kaldi\n`);
process.exit(kaldi ? 1 : 0);
