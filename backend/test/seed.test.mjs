/* afterhours — seed verisinin dogrulugu.
   Asil soru: veritabanina konan sey, sitenin BUGUN gosterdiginin
   aynisi mi? Ekranda gorunen her text karsilastiriliyor. */

import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const okuKok = (path) => readFile(new URL("../../" + path, import.meta.url), "utf8");

let passed = 0, failed = 0;
const check = (kosul, name, extra = "") => {
  if (kosul) { passed++; console.log("  ✓ " + name); }
  else { failed++; console.log("  ✗ " + name + (extra ? "  → " + extra : "")); }
};

process.on("unhandledRejection", (e) => {
  console.log("\nHATA: " + ((e && e.message) || e));
  if (e && e.where) console.log("  " + e.where);
  process.exit(1);
});

const db = new PGlite();
console.log("\n— sema + seed —");
for (const d of ["../test/supabase-shim.sql", "../sql/01_schema.sql", "../sql/02_rls.sql",
                 "../sql/03_seed_katalog.sql", "../sql/04_seed_events.sql",
                 "../sql/05_seed_comments.sql"]) {
  await db.exec(await read(d));
  console.log("  · " + d.split("/").pop());
}

/* on yuzdeki source veri */
const { POSTERS } = new Function(await okuKok("events-data.js") + ";return { POSTERS };")();

console.log("\n— sayilar —");
{
  const count = async (t) => (await db.query(`select count(*)::int as n from public.${t}`)).rows[0].n;
  check(await count("events") === POSTERS.length, `${POSTERS.length} etkinlik yuklendi`);
  check(await count("cities") === 11, "11 sehir (uc ulke)");
  check(await count("event_types") === 6, "6 kind");
  check(await count("venues") === 20, "20 mekan");

  const k = await db.query(`select count(*) filter (where parent_id is null)::int as topic,
                                   count(*) filter (where parent_id is not null)::int as reply
                            from public.comments`);
  check(k.rows[0].topic === 180, "180 yorum konusu", `found ${k.rows[0].topic}`);
  check(k.rows[0].reply === 131, "131 reply", `found ${k.rows[0].reply}`);
}

console.log("\n— ekranda gorunen metinler birebir mi —");
{
  const r = await db.query(`
    select e.slug, e.title, e.meta, e.body, e.poster_no, t.name as kind
    from public.events e join public.event_types t on t.id = e.type_id
    order by e.poster_no`);

  const different = [];
  r.rows.forEach((satir, i) => {
    const source = POSTERS[i];
    if (satir.slug !== source.slug) different.push(`${i}: slug ${satir.slug} ≠ ${source.slug}`);
    if (satir.title !== source.title) different.push(`${source.slug}: heading`);
    if (satir.meta !== source.meta) different.push(`${source.slug}: meta "${satir.meta}" ≠ "${source.meta}"`);
    if (satir.body !== source.body) different.push(`${source.slug}: text`);
    if (satir.kind !== source.kind) different.push(`${source.slug}: kind ${satir.kind} ≠ ${source.kind}`);
    if (satir.poster_no !== i + 1) different.push(`${source.slug}: poster no`);
  });

  check(r.rows.length === POSTERS.length, "sort_order poster numarasiyla ayni");
  check(different.length === 0, "36 kaydin slug/heading/meta/text/kind/poster alanlari birebir",
    different.slice(0, 3).join(" | "));
}

console.log("\n— yorumlarin sitedeki secimle ayni oldugu —");
{
  const { COMMENTS_FOR } = new Function(
    await okuKok("explore/comment-pools.js") + ";return { COMMENTS_FOR };")();

  const sample = POSTERS[0];
  const { older, recent } = COMMENTS_FOR(sample);
  const r = await db.query(`
    select c.body, c.author_name, c.time_text
    from public.comments c join public.events e on e.id = c.event_id
    where e.slug = $1 and c.parent_id is null
    order by c.created_at desc`, [sample.slug]);

  const expected = [...recent, ...older].map((k) => k.body).sort();
  const gelen = r.rows.map((x) => x.body).sort();
  check(JSON.stringify(expected) === JSON.stringify(gelen),
    `${sample.slug}: konular sitedekiyle ayni (${gelen.length} topic)`);

  const z = await db.query(`select count(*)::int as n from public.comments where time_text is null`);
  check(z.rows[0].n === 0, "her sample yorumun ekran zamani duruyor");

  const oksuz = await db.query(`
    select count(*)::int as n from public.comments c
    where c.parent_id is not null
      and not exists (select 1 from public.comments p
                      where p.id = c.parent_id and p.parent_id is null)`);
  check(oksuz.rows[0].n === 0, "her reply one konuya bagli");
}

console.log("— SQL editorlerinde ayristirilabilirlik —");
{
  /* Asil tuzak buydu: Supabase panelinin ayristiricisi tirnaklari
     sayarak ilerliyor ve YORUMLARIN icindeki kesme isaretini de sayiyor.
     "Supabase'in" gibi tek one isaret sayimi cevirince, ileride gecen
     "...condensed into one night..." metni KOD olarak okunuyor ve
     "relation \"one\" does not exist" hatasi cikiyor.
     Yorumlarda ASCII kesme isareti olmamali; tipografik ’ kullaniyoruz. */
  for (const d of ["../sql/setup-1-structure.sql", "../sql/setup-2-yorumlar.sql"]) {
    const text = await read(d);

    const yorumlu = text.split("\n").filter((r) => {
      const i = r.indexOf("--");
      return i >= 0 && r.slice(i).includes("'");
    });
    check(yorumlu.length === 0,
      d.split("/").pop() + ": yorumlarda kesme isareti yok",
      yorumlu[0] && yorumlu[0].trim().slice(0, 60));

    /* Naif ayristiriciyi taklit et: file sonunda dize icinde kalmamali */
    let tirnakta = false;
    for (const c of text) if (c === "'") tirnakta = !tirnakta;
    check(!tirnakta, d.split("/").pop() + ": quote sayimi dengeli bitiyor");
  }
}

console.log("\n— iliskiler —");
{
  const eksik = await db.query(`
    select count(*)::int as n from public.events
    where city_id is null or type_id is null`);
  check(eksik.rows[0].n === 0, "her etkinligin sehri ve turu var");

  const mekansiz = await db.query(`select count(*)::int as n from public.events where venue_id is null`);
  check(mekansiz.rows[0].n === 8,
    "8 etkinligin mekani empty (meta'da mekan degil semt/sehir yaziyor)", `found ${mekansiz.rows[0].n}`);

  const tahmin = await db.query(`select count(*)::int as n from public.events where starts_at_estimated`);
  check(tahmin.rows[0].n === 24, "24 tarih 'dogrulanmadi' olarak isaretli", `found ${tahmin.rows[0].n}`);

  /* Ulke alanlari taken mu: filtre once ulkeye gore ayiriyor */
  const ulkesiz = await db.query(
    `select count(*)::int as n from public.cities where country_slug is null`);
  check(ulkesiz.rows[0].n === 0, "her sehrin ulkesi var");

  const ulkeler = await db.query(
    `select count(distinct country_slug)::int as n from public.cities`);
  check(ulkeler.rows[0].n === 3, "uc ulke", "found " + ulkeler.rows[0].n);

  const turDagilim = await db.query(`
    select t.name, count(*)::int as n from public.events e
    join public.event_types t on t.id = e.type_id group by t.name order by t.name`);
  const expected = { "Club Night": 7, "Festival": 5, "Hausparty": 6, "Konzert": 5, "Meetup": 6, "Rave": 7 };
  const gelen = Object.fromEntries(turDagilim.rows.map((r) => [r.name, r.n]));
  check(JSON.stringify(gelen) === JSON.stringify(expected),
    "kind dagilimi main sayfadaki sayacla ayni", JSON.stringify(gelen));
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
