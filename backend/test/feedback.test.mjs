/* afterhours — geri bildirim: herkes yazar, yalniz yonetici okur */

import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

const oku = (y) => readFile(new URL(y, import.meta.url), "utf8");
let gecti = 0, kaldi = 0;
const olmali = (k, ad, ek = "") => {
  if (k) { gecti++; console.log("  ✓ " + ad); }
  else { kaldi++; console.log("  ✗ " + ad + (ek ? "  → " + ek : "")); }
};
process.on("unhandledRejection", (e) => {
  console.log("\nHATA: " + ((e && e.message) || e));
  if (e && e.where) console.log("  " + e.where);
  process.exit(1);
});

const db = new PGlite();
for (const d of ["../test/supabase-shim.sql", "../sql/01_schema.sql", "../sql/02_rls.sql",
                 "../sql/03_seed_katalog.sql", "../sql/04_seed_events.sql",
                 "../sql/06_views.sql", "../sql/07_friends.sql",
                 "../sql/12_profiles.sql", "../sql/13_feedback.sql"]) {
  await db.exec(await oku(d));
}

const A = "aaaaaaaa-1111-1111-1111-111111111111";   /* yonetici */
const B = "bbbbbbbb-2222-2222-2222-222222222222";   /* siradan kisi */

const kimlik = (id) => db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"${id}"}';`);
const anonim = () => db.exec(`set role anon; set request.jwt.claims = '';`);
const yonetim = () => db.exec(`reset role; set request.jwt.claims = '';`);

await yonetim();
await db.exec(`
  insert into auth.users (id, email) values ('${A}', 'a@x.com'), ('${B}', 'b@x.com');
  update public.profiles set handle = 'ahmet', is_admin = true where id = '${A}';
  update public.profiles set handle = 'lena' where id = '${B}';
`);

console.log("\n— herkes yazabiliyor —");
{
  await anonim();
  await db.exec(`insert into public.feedback (kind, body, contact)
                 values ('broken', 'the deck stops after four cards', 'biri@example.com')`);
  olmali(true, "girissiz biri yazabiliyor");

  await kimlik(B);
  await db.exec(`insert into public.feedback (kind, body)
                 values ('idea', 'let me undo the last swipe, just once')`);
  olmali(true, "girisli biri yazabiliyor");
}

console.log("\n— sinirlar —");
{
  await kimlik(B);
  let kisa = null;
  try { await db.exec(`insert into public.feedback (body) values ('yok')`); }
  catch (e) { kisa = e.message; }
  olmali(Boolean(kisa), "cok kisa mesaj reddediliyor");

  let tur = null;
  try { await db.exec(`insert into public.feedback (kind, body) values ('spam', 'buyurun bir mesaj daha')`); }
  catch (e) { tur = e.message; }
  olmali(Boolean(tur), "tanimsiz tur reddediliyor");

  let sahte = null;
  try {
    await db.exec(`insert into public.feedback (author_id, body)
                   values ('${A}', 'baskasinin adina yazilan bir mesaj')`);
  } catch (e) { sahte = e.message; }
  olmali(Boolean(sahte), "baskasinin adina yazilamiyor");
}

console.log("\n— yalniz yonetici okuyor —");
{
  /* Girissize okuma izni hic VERILMEDI: kural degil, yetki durduruyor.
     Yani hata almasi dogru sonuc. */
  await anonim();
  let anonHata = null, anonSatir = null;
  try {
    const a = await db.query(`select count(*)::int as n from public.feedback`);
    anonSatir = a.rows[0].n;
  } catch (e) { anonHata = e.message; }
  olmali(anonHata !== null || anonSatir === 0, "girissiz hicbir sey goremiyor",
    "gordugu " + anonSatir);

  await kimlik(B);
  const b = await db.query(`select count(*)::int as n from public.feedback`);
  olmali(b.rows[0].n === 0, "yazan kendi yazdigini bile geri okumuyor", "gordugu " + b.rows[0].n);

  await kimlik(A);
  const y = await db.query(`select count(*)::int as n from public.feedback`);
  olmali(y.rows[0].n === 2, "yonetici hepsini goruyor", "gordugu " + y.rows[0].n);
}

console.log("\n— yonetim listesi —");
{
  await kimlik(A);
  const l = await db.query(`select * from public.feedback_list(10)`);
  olmali(l.rows.length === 2, "liste geliyor");
  olmali(l.rows[0].kind === "idea", "yenisi ustte");
  olmali(l.rows[0].author === "lena", "girislinin adi cozuldu");
  olmali(l.rows[1].author === null && l.rows[1].contact === "biri@example.com",
    "girissizin adi yok, biraktigi iletisim var");

  await db.exec(`update public.feedback set handled = true where kind = 'idea'`);
  const s = await db.query(`select count(*)::int as n from public.feedback where handled`);
  olmali(s.rows[0].n === 1, "yonetici isaretleyebiliyor");

  await kimlik(B);
  await db.exec(`update public.feedback set handled = true`);
  const k = await db.query(`select count(*)::int as n from public.feedback where handled`);
  await kimlik(A);
  const t = await db.query(`select count(*)::int as n from public.feedback where handled`);
  olmali(t.rows[0].n === 1, "siradan kisi isaretleyemiyor");
}

console.log("\n— hesap silinince —");
{
  await kimlik(B);
  await db.exec(`select public.delete_account()`);
  await kimlik(A);
  const l = await db.query(`select author, body from public.feedback_list(10)`);
  olmali(l.rows.length === 2, "yazdigi duruyor");
  olmali(l.rows[0].author === null, "adi dustu");
}

console.log(`\n${gecti} gecti, ${kaldi} kaldi\n`);
process.exit(kaldi ? 1 : 0);
