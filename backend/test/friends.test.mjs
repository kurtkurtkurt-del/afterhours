/* afterhours — arkadaslik akisi */

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
                 "../sql/06_views.sql", "../sql/07_friends.sql"]) {
  await db.exec(await oku(d));
}

const A = "aaaaaaaa-1111-1111-1111-111111111111";
const B = "bbbbbbbb-2222-2222-2222-222222222222";
const C = "cccccccc-3333-3333-3333-333333333333";

await db.exec(`
  insert into auth.users (id, email) values
    ('${A}', 'a@x.com'), ('${B}', 'b@x.com'), ('${C}', 'c@x.com');
  update public.profiles set handle = 'ahmet' where id = '${A}';
  update public.profiles set handle = 'lena'  where id = '${B}';
  update public.profiles set handle = 'tobi'  where id = '${C}';
`);

const kimlik = (id) => db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"${id}"}';`);
const yonetim = () => db.exec(`reset role; set request.jwt.claims = '';`);

console.log("\n— kullanici adi —");
{
  await yonetim();
  let hata = null;
  try { await db.exec(`update public.profiles set handle = 'Büyük Harf' where id = '${A}'`); }
  catch (e) { hata = e.message; }
  olmali(Boolean(hata), "bicime uymayan kullanici adi reddediliyor");

  await db.exec(`update public.profiles set handle = 'ahmet' where id = '${A}'`);
  let ikinci = null;
  try { await db.exec(`update public.profiles set handle = 'ahmet' where id = '${B}'`); }
  catch (e) { ikinci = e.message; }
  olmali(Boolean(ikinci), "ayni kullanici adi iki kiside olamiyor");
  await db.exec(`update public.profiles set handle = 'lena' where id = '${B}'`);
}

console.log("\n— istek gonderme —");
{
  await kimlik(A);
  const r = await db.query(`select public.friend_request('lena') as s`);
  olmali(r.rows[0].s === "sent", "istek gonderildi");

  const y = await db.query(`select public.friend_request('yokboyle') as s`);
  olmali(y.rows[0].s === "notfound", "olmayan kullaniciya istek gitmiyor");

  const k = await db.query(`select public.friend_request('ahmet') as s`);
  olmali(k.rows[0].s === "yourself", "kendine istek gonderilemiyor");

  const l = await db.query(`select other_id, status, yon from public.friends_list()`);
  olmali(l.rows.length === 1 && l.rows[0].status === "pending" && l.rows[0].yon === "giden",
    "kendi listesinde giden bir istek gorunuyor");
}

console.log("\n— karsi taraf —");
{
  await kimlik(B);
  const l = await db.query(`select handle, status, yon from public.friends_list()`);
  olmali(l.rows.length === 1 && l.rows[0].yon === "gelen" && l.rows[0].handle === "ahmet",
    "istek karsi tarafta 'gelen' olarak gorunuyor");

  /* Ayni kisiye ters yonde istek gondermek = kabul etmek */
  const r = await db.query(`select public.friend_request('ahmet') as s`);
  olmali(r.rows[0].s === "accepted", "ters yonde istek, bekleyeni kabul ediyor");

  const s = await db.query(`select status from public.friends_list()`);
  olmali(s.rows[0].status === "accepted", "arkadaslik onaylandi");
}

console.log("\n— arkadasin begendikleri —");
{
  await kimlik(B);
  await db.exec(`select public.swipe_set('asap-rocky', 'right')`);
  await db.exec(`select public.swipe_set('nick-cave', 'left')`);

  await kimlik(A);
  const r = await db.query(`select slug, friend from public.friends_kept()`);
  olmali(r.rows.length === 1 && r.rows[0].slug === "asap-rocky",
    "arkadasin saga attigi geliyor, sola attigi gelmiyor");
  olmali(r.rows[0].friend === "lena", "kimin begendigi yaziyor");

  await kimlik(C);
  const y = await db.query(`select count(*)::int as n from public.friends_kept()`);
  olmali(y.rows[0].n === 0, "arkadas olmayan hicbir sey gormuyor");
}

console.log("\n— arkadasligi bitirme —");
{
  await kimlik(C);
  const y = await db.query(`select public.friend_remove('${A}') as s`);
  olmali(y.rows[0].s === false, "olmayan arkadasligi silmek bir sey yapmiyor");

  await kimlik(A);
  const r = await db.query(`select public.friend_remove('${B}') as s`);
  olmali(r.rows[0].s === true, "arkadaslik bitirildi");

  const l = await db.query(`select count(*)::int as n from public.friends_list()`);
  olmali(l.rows[0].n === 0, "liste bosaldi");

  const k = await db.query(`select count(*)::int as n from public.friends_kept()`);
  olmali(k.rows[0].n === 0, "eski arkadasin begendikleri artik gorunmuyor");
}

console.log(`\n${gecti} gecti, ${kaldi} kaldi\n`);
process.exit(kaldi ? 1 : 0);
