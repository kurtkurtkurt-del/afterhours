/* afterhours — arkadaslik akisi */

import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

const read = (y) => readFile(new URL(y, import.meta.url), "utf8");
let passed = 0, failed = 0;
const check = (k, name, extra = "") => {
  if (k) { passed++; console.log("  ✓ " + name); }
  else { failed++; console.log("  ✗ " + name + (extra ? "  → " + extra : "")); }
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
  await db.exec(await read(d));
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

const asUser = (id) => db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"${id}"}';`);
const asService = () => db.exec(`reset role; set request.jwt.claims = '';`);

console.log("\n— user adi —");
{
  await asService();
  let hata = null;
  try { await db.exec(`update public.profiles set handle = 'Büyük Harf' where id = '${A}'`); }
  catch (e) { hata = e.message; }
  check(Boolean(hata), "bicime uymayan user adi reddediliyor");

  await db.exec(`update public.profiles set handle = 'ahmet' where id = '${A}'`);
  let ikinci = null;
  try { await db.exec(`update public.profiles set handle = 'ahmet' where id = '${B}'`); }
  catch (e) { ikinci = e.message; }
  check(Boolean(ikinci), "ayni user adi iki kiside olamiyor");
  await db.exec(`update public.profiles set handle = 'lena' where id = '${B}'`);
}

console.log("\n— req gonderme —");
{
  await asUser(A);
  const r = await db.query(`select public.friend_request('lena') as s`);
  check(r.rows[0].s === "sent", "req gonderildi");

  const y = await db.query(`select public.friend_request('yokboyle') as s`);
  check(y.rows[0].s === "notfound", "olmayan kullaniciya req gitmiyor");

  const k = await db.query(`select public.friend_request('ahmet') as s`);
  check(k.rows[0].s === "yourself", "kendine req gonderilemiyor");

  const l = await db.query(`select other_id, status, yon from public.friends_list()`);
  check(l.rows.length === 1 && l.rows[0].status === "pending" && l.rows[0].yon === "giden",
    "kendi listesinde giden one req gorunuyor");
}

console.log("\n— karsi taraf —");
{
  await asUser(B);
  const l = await db.query(`select handle, status, yon from public.friends_list()`);
  check(l.rows.length === 1 && l.rows[0].yon === "gelen" && l.rows[0].handle === "ahmet",
    "req karsi tarafta 'gelen' olarak gorunuyor");

  /* Ayni kisiye ters yonde req gondermek = kabul etmek */
  const r = await db.query(`select public.friend_request('ahmet') as s`);
  check(r.rows[0].s === "accepted", "ters yonde req, bekleyeni kabul ediyor");

  const s = await db.query(`select status from public.friends_list()`);
  check(s.rows[0].status === "accepted", "arkadaslik onaylandi");
}

console.log("\n— arkadasin begendikleri —");
{
  await asUser(B);
  await db.exec(`select public.swipe_set('asap-rocky', 'right')`);
  await db.exec(`select public.swipe_set('nick-cave', 'left')`);

  await asUser(A);
  const r = await db.query(`select slug, friend from public.friends_kept()`);
  check(r.rows.length === 1 && r.rows[0].slug === "asap-rocky",
    "arkadasin saga attigi geliyor, sola attigi gelmiyor");
  check(r.rows[0].friend === "lena", "kimin begendigi yaziyor");

  await asUser(C);
  const y = await db.query(`select count(*)::int as n from public.friends_kept()`);
  check(y.rows[0].n === 0, "arkadas olmayan hicbir sey gormuyor");
}

console.log("\n— arkadasligi bitirme —");
{
  await asUser(C);
  const y = await db.query(`select public.friend_remove('${A}') as s`);
  check(y.rows[0].s === false, "olmayan arkadasligi silmek one sey yapmiyor");

  await asUser(A);
  const r = await db.query(`select public.friend_remove('${B}') as s`);
  check(r.rows[0].s === true, "arkadaslik bitirildi");

  const l = await db.query(`select count(*)::int as n from public.friends_list()`);
  check(l.rows[0].n === 0, "list bosaldi");

  const k = await db.query(`select count(*)::int as n from public.friends_kept()`);
  check(k.rows[0].n === 0, "eski arkadasin begendikleri artik gorunmuyor");
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
