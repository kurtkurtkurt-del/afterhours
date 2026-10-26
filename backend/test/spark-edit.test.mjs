/* afterhours — a spark can be changed after it went out (96) */

import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

const read = (y) => readFile(new URL(y, import.meta.url), "utf8");
let passed = 0, failed = 0;
const check = (k, name, extra = "") => {
  if (k) { passed++; console.log("  ✓ " + name); }
  else { failed++; console.log("  ✗ " + name + (extra ? "  → " + extra : "")); }
};
process.on("unhandledRejection", (e) => {
  console.log("\nERROR: " + ((e && e.message) || e));
  if (e && e.where) console.log("  " + e.where);
  process.exit(1);
});

const db = new PGlite();
for (const d of ["../test/supabase-shim.sql", "../sql/setup-1-structure.sql"]) {
  await db.exec(await read(d));
}
/* a second run must not trip over the first */
await db.exec(await read("../sql/96_spark_edit.sql"));

const [A, B, C, D] = ["aaaaaaaa-1111-1111-1111-111111111111", "bbbbbbbb-2222-2222-2222-222222222222", "cccccccc-3333-3333-3333-333333333333", "dddddddd-4444-4444-4444-444444444444"];
const as = (id) => db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"${id}"}';`);
const asService = () => db.exec(`reset role; set request.jwt.claims = '';`);
const fails = async (sql) => { try { await db.exec(sql); return null; } catch (e) { return e.message; } };
const rows = async (sql) => (await db.query(sql)).rows;
const outbox = async (user) => { await asService(); return rows(`select key, data from public.push_outbox where user_id = '${user}' and kind = 'spark_changed' order by created_at`); };
const startsAt = async () => { await asService(); const v = (await rows(`select starts_at from public.sparks where id = '${spark}'`))[0].starts_at.toISOString(); await as(A); return v; };
const sparkRow = async () => { await asService(); return (await rows(`select title, place from public.sparks where id = '${spark}'`))[0]; };
const edit = async (title, when, place) => (await rows(`select public.spark_edit('${spark}', ${title}, ${when}, ${place}) as n`))[0].n;

await asService();
await db.exec(`insert into auth.users (id, email) values ('${A}','a@x'),('${B}','b@x'),('${C}','c@x'),('${D}','d@x')`);
await db.exec(`update public.profiles set handle = 'ada' where id = '${A}'`);
await db.exec(`update public.profiles set handle = 'berk' where id = '${B}'`);
await db.exec(`update public.profiles set handle = 'cansu' where id = '${C}'`);
await db.exec(`update public.profiles set handle = 'deniz' where id = '${D}'`);
await db.exec(`update public.profile_settings set locale = 'tr' where user_id = '${D}'`);
await db.exec(`insert into public.friendships (requester_id, addressee_id, status) values ('${A}','${B}','accepted'), ('${A}','${C}','accepted'), ('${A}','${D}','accepted')`);
await as(A);
const spark = (await rows(`select public.spark_create('grill', 'grill at the river', now() + interval '2 days', 'river', 1) as id`))[0].id;
await as(B);
await db.exec(`select public.spark_answer('${spark}', 'in')`);
await as(C);
await db.exec(`select public.spark_answer('${spark}', 'out')`);
await as(D);
await db.exec(`select public.spark_answer('${spark}', 'in')`);
await asService();
await db.exec(`delete from public.push_outbox`);

console.log("\n— who may change it —");
{
  await as(B);
  check(Boolean(await fails(`select public.spark_edit('${spark}', 'mine now', now() + interval '2 days', 'river')`)), "someone who said in cannot");
  await as(A);
  check(Boolean(await fails(`select public.spark_edit('${spark}', 'grill', now() - interval '3 hours', 'river')`)), "a time that has passed is refused");
  check(Boolean(await fails(`select public.spark_edit('${spark}', '   ', now() + interval '2 days', 'river')`)), "an empty name is refused");
  const same = await startsAt();
  check(await edit(`'grill at the river'`, `'${same}'`, `' river '`) === 0, "nothing changed: nobody is told");
  check((await outbox(B)).length === 0, "and nothing waits in the outbox");
}

console.log("\n— the host moves it —");
{
  await as(A);
  const n = await edit(`'grill at the lake'`, `now() + interval '3 days'`, `'lake'`);
  check(n === 2, "two people said in, two are told", String(n));
  const s = await sparkRow();
  check(s.title === "grill at the lake" && s.place === "lake", "the spark carries the new details");
  const b = await outbox(B);
  check(b.length === 1 && b[0].data.name === "ada" && b[0].data.title === "grill at the lake", "berk hears it, under the new name", JSON.stringify(b));
  check(/^new time \w{3} \d\d:\d\d · new place · new name$/.test(b[0].data.what), "in english: what changed", b[0]?.data.what);
  check(!b[0].data.what.includes("lake"), "the place itself stays off the lock screen");
  check(b[0].data.url === `/spark/grill?invite=${spark}`, "the push opens the spark");
  const d = await outbox(D);
  check(d.length === 1 && d[0].data.what.startsWith("yeni saat ") && d[0].data.what.endsWith("yeni yer · yeni isim"), "deniz hears it in turkish", d[0]?.data.what);
  check((await outbox(C)).length === 0, "the one who said out hears nothing");
  check((await outbox(A)).length === 0, "nor the host");
}

console.log("\n— a second change —");
{
  await as(A);
  await edit(`'grill at the lake'`, `'${await startsAt()}'`, `'lakeside'`);
  const b = await outbox(B);
  check(b.length === 2 && b[1].data.what === "new place", "only the place moved, only the place is said", JSON.stringify(b.map((x) => x.data.what)));
  await as(A);
  await edit(`'grill at the lake'`, `'${await startsAt()}'`, `null`);
  const s = await sparkRow();
  check(s.place === null, "the place can be cleared");
}

console.log("\n— the words —");
{
  const de = await rows(`select * from public.push_text('spark_changed', 'de', '{"name":"ada","title":"grill","what":"neuer ort"}')`);
  check(de[0].title === "grill" && de[0].body === "ada hat es geändert · neuer ort", "in german", JSON.stringify(de));
  const tr = await rows(`select * from public.push_text('spark_changed', 'tr', '{"name":"ada","title":"grill","what":"yeni isim"}')`);
  check(tr[0].body === "ada değiştirdi · yeni isim", "in turkish");
  await asService();
  await db.exec(`update public.profile_settings set notify_sparks = false where user_id = '${B}'`);
  check((await rows(`select public.push_wants('${B}', 'spark_changed') as w`))[0].w === false, "the sparks switch turns it off");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
