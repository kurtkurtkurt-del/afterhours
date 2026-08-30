/* afterhours — tohum verisinin dogrulugu.
   Asil soru: veritabanina konan sey, sitenin BUGUN gosterdiginin
   aynisi mi? Ekranda gorunen her metin karsilastiriliyor. */

import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

const oku = (yol) => readFile(new URL(yol, import.meta.url), "utf8");
const okuKok = (yol) => readFile(new URL("../../" + yol, import.meta.url), "utf8");

let gecti = 0, kaldi = 0;
const olmali = (kosul, ad, ek = "") => {
  if (kosul) { gecti++; console.log("  ✓ " + ad); }
  else { kaldi++; console.log("  ✗ " + ad + (ek ? "  → " + ek : "")); }
};

process.on("unhandledRejection", (e) => {
  console.log("\nHATA: " + ((e && e.message) || e));
  if (e && e.where) console.log("  " + e.where);
  process.exit(1);
});

const db = new PGlite();
console.log("\n— sema + tohum —");
for (const d of ["../test/supabase-shim.sql", "../sql/01_schema.sql", "../sql/02_rls.sql",
                 "../sql/03_seed_katalog.sql", "../sql/04_seed_events.sql",
                 "../sql/05_seed_comments.sql"]) {
  await db.exec(await oku(d));
  console.log("  · " + d.split("/").pop());
}

/* on yuzdeki kaynak veri */
const { POSTERS } = new Function(await okuKok("events-data.js") + ";return { POSTERS };")();

console.log("\n— sayilar —");
{
  const say = async (t) => (await db.query(`select count(*)::int as n from public.${t}`)).rows[0].n;
  olmali(await say("events") === POSTERS.length, `${POSTERS.length} etkinlik yuklendi`);
  olmali(await say("cities") === 11, "11 sehir (uc ulke)");
  olmali(await say("event_types") === 6, "6 tur");
  olmali(await say("venues") === 20, "20 mekan");

  const k = await db.query(`select count(*) filter (where parent_id is null)::int as konu,
                                   count(*) filter (where parent_id is not null)::int as cevap
                            from public.comments`);
  olmali(k.rows[0].konu === 180, "180 yorum konusu", `bulunan ${k.rows[0].konu}`);
  olmali(k.rows[0].cevap === 131, "131 cevap", `bulunan ${k.rows[0].cevap}`);
}

console.log("\n— ekranda gorunen metinler birebir mi —");
{
  const r = await db.query(`
    select e.slug, e.title, e.meta, e.body, e.poster_no, t.name as kind
    from public.events e join public.event_types t on t.id = e.type_id
    order by e.poster_no`);

  const farkli = [];
  r.rows.forEach((satir, i) => {
    const kaynak = POSTERS[i];
    if (satir.slug !== kaynak.slug) farkli.push(`${i}: slug ${satir.slug} ≠ ${kaynak.slug}`);
    if (satir.title !== kaynak.title) farkli.push(`${kaynak.slug}: baslik`);
    if (satir.meta !== kaynak.meta) farkli.push(`${kaynak.slug}: meta "${satir.meta}" ≠ "${kaynak.meta}"`);
    if (satir.body !== kaynak.body) farkli.push(`${kaynak.slug}: metin`);
    if (satir.kind !== kaynak.kind) farkli.push(`${kaynak.slug}: tur ${satir.kind} ≠ ${kaynak.kind}`);
    if (satir.poster_no !== i + 1) farkli.push(`${kaynak.slug}: poster no`);
  });

  olmali(r.rows.length === POSTERS.length, "sira poster numarasiyla ayni");
  olmali(farkli.length === 0, "36 kaydin slug/baslik/meta/metin/tur/poster alanlari birebir",
    farkli.slice(0, 3).join(" | "));
}

console.log("\n— yorumlarin sitedeki secimle ayni oldugu —");
{
  const { COMMENTS_FOR } = new Function(
    await okuKok("explore/comment-pools.js") + ";return { COMMENTS_FOR };")();

  const ornek = POSTERS[0];
  const { older, recent } = COMMENTS_FOR(ornek);
  const r = await db.query(`
    select c.body, c.author_name, c.time_text
    from public.comments c join public.events e on e.id = c.event_id
    where e.slug = $1 and c.parent_id is null
    order by c.created_at desc`, [ornek.slug]);

  const beklenen = [...recent, ...older].map((k) => k.body).sort();
  const gelen = r.rows.map((x) => x.body).sort();
  olmali(JSON.stringify(beklenen) === JSON.stringify(gelen),
    `${ornek.slug}: konular sitedekiyle ayni (${gelen.length} konu)`);

  const z = await db.query(`select count(*)::int as n from public.comments where time_text is null`);
  olmali(z.rows[0].n === 0, "her ornek yorumun ekran zamani duruyor");

  const oksuz = await db.query(`
    select count(*)::int as n from public.comments c
    where c.parent_id is not null
      and not exists (select 1 from public.comments p
                      where p.id = c.parent_id and p.parent_id is null)`);
  olmali(oksuz.rows[0].n === 0, "her cevap bir konuya bagli");
}

console.log("— SQL editorlerinde ayristirilabilirlik —");
{
  /* Asil tuzak buydu: Supabase panelinin ayristiricisi tirnaklari
     sayarak ilerliyor ve YORUMLARIN icindeki kesme isaretini de sayiyor.
     "Supabase'in" gibi tek bir isaret sayimi cevirince, ileride gecen
     "...condensed into one night..." metni KOD olarak okunuyor ve
     "relation \"one\" does not exist" hatasi cikiyor.
     Yorumlarda ASCII kesme isareti olmamali; tipografik ’ kullaniyoruz. */
  for (const d of ["../sql/kurulum-1-yapi.sql", "../sql/kurulum-2-yorumlar.sql"]) {
    const metin = await oku(d);

    const yorumlu = metin.split("\n").filter((r) => {
      const i = r.indexOf("--");
      return i >= 0 && r.slice(i).includes("'");
    });
    olmali(yorumlu.length === 0,
      d.split("/").pop() + ": yorumlarda kesme isareti yok",
      yorumlu[0] && yorumlu[0].trim().slice(0, 60));

    /* Naif ayristiriciyi taklit et: dosya sonunda dize icinde kalmamali */
    let tirnakta = false;
    for (const c of metin) if (c === "'") tirnakta = !tirnakta;
    olmali(!tirnakta, d.split("/").pop() + ": tirnak sayimi dengeli bitiyor");
  }
}

console.log("\n— iliskiler —");
{
  const eksik = await db.query(`
    select count(*)::int as n from public.events
    where city_id is null or type_id is null`);
  olmali(eksik.rows[0].n === 0, "her etkinligin sehri ve turu var");

  const mekansiz = await db.query(`select count(*)::int as n from public.events where venue_id is null`);
  olmali(mekansiz.rows[0].n === 8,
    "8 etkinligin mekani bos (meta'da mekan degil semt/sehir yaziyor)", `bulunan ${mekansiz.rows[0].n}`);

  const tahmin = await db.query(`select count(*)::int as n from public.events where starts_at_estimated`);
  olmali(tahmin.rows[0].n === 24, "24 tarih 'dogrulanmadi' olarak isaretli", `bulunan ${tahmin.rows[0].n}`);

  /* Ulke alanlari dolu mu: filtre once ulkeye gore ayiriyor */
  const ulkesiz = await db.query(
    `select count(*)::int as n from public.cities where country_slug is null`);
  olmali(ulkesiz.rows[0].n === 0, "her sehrin ulkesi var");

  const ulkeler = await db.query(
    `select count(distinct country_slug)::int as n from public.cities`);
  olmali(ulkeler.rows[0].n === 3, "uc ulke", "bulunan " + ulkeler.rows[0].n);

  const turDagilim = await db.query(`
    select t.name, count(*)::int as n from public.events e
    join public.event_types t on t.id = e.type_id group by t.name order by t.name`);
  const beklenen = { "Club Night": 7, "Festival": 5, "Hausparty": 6, "Konzert": 5, "Meetup": 6, "Rave": 7 };
  const gelen = Object.fromEntries(turDagilim.rows.map((r) => [r.name, r.n]));
  olmali(JSON.stringify(gelen) === JSON.stringify(beklenen),
    "tur dagilimi ana sayfadaki sayacla ayni", JSON.stringify(gelen));
}

console.log(`\n${gecti} gecti, ${kaldi} kaldi\n`);
process.exit(kaldi ? 1 : 0);
