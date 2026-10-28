/* afterhours — a guest is taken over only with its own secret (112) */

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
await db.exec(await read("../sql/112_guest_merge_secret.sql"));

const [A, B, G, H] = ["aaaaaaaa-1111-1111-1111-111111111111", "bbbbbbbb-2222-2222-2222-222222222222", "99999999-9999-9999-9999-999999999999", "88888888-8888-8888-8888-888888888888"];
const as = (id) => db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"${id}"}';`);
const asGuest = (id) => db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"${id}","is_anonymous":true}';`);
const asAnon = () => db.exec(`set role anon; set request.jwt.claims = '';`);
const asService = () => db.exec(`reset role; set request.jwt.claims = '';`);
const fails = async (sql) => { try { await db.exec(sql); return null; } catch (e) { return e.message; } };
const rows = async (sql) => (await db.query(sql)).rows;

await asService();
await db.exec(`insert into auth.users (id, email) values ('${A}','a@x'),('${B}','b@x')`);
await db.exec(`insert into auth.users (id, email, is_anonymous) values ('${G}', null, true), ('${H}', null, true)`);
const nights = (await rows(`select id from public.events where is_published order by slug limit 2`)).map((r) => r.id);
await db.exec(`insert into public.swipes (user_id, event_id, direction) values ('${G}', '${nights[0]}', 'right'), ('${G}', '${nights[1]}', 'right')`);

const S = "5ec7e75ec7e75ec7e75ec7e75ec7e75ec7e75ec7e75ec7e75ec7e75ec7e75ec7";
const T = "7777777777777777777777777777777777777777777777777777777777777777";

console.log("\n— the old door is gone —");
{
  await asService();
  check((await rows(`select to_regprocedure('public.guest_merge(uuid)') as p`))[0].p === null, "guest_merge(uuid) without a secret no longer exists");
  await as(A);
  check(Boolean(await fails(`select public.guest_merge('${G}'::uuid)`)), "calling it with the id alone fails");
}

console.log("\n— leaving the secret —");
{
  await as(A);
  check(Boolean(await fails(`select public.guest_secret_set('${S}')`)), "an account cannot leave a guest secret");
  await asAnon();
  check(Boolean(await fails(`select public.guest_secret_set('${S}')`)), "nor can a visitor without a session");
  await asGuest(G);
  check(Boolean(await fails(`select public.guest_secret_set('short')`)), "a short secret is refused");
  check(!(await fails(`select public.guest_secret_set('${T}')`)), "a guest leaves a secret");
  check(!(await fails(`select public.guest_secret_set('${S}')`)), "and may replace it");
  await asGuest(H);
  await db.exec(`select public.guest_secret_set('${T}')`);
  await asService();
  const kept = await rows(`select user_id, hash from public.guest_secrets order by user_id`);
  check(kept.length === 2, "one row per guest");
  check(kept.every((r) => r.hash !== S && r.hash !== T && /^[0-9a-f]{64}$/.test(r.hash)), "only the hash is kept, never the secret");
}

console.log("\n— nobody reads the hash —");
{
  await as(A);
  check(Boolean(await fails(`select hash from public.guest_secrets`)), "an account cannot read guest_secrets");
  check(Boolean(await fails(`update public.guest_secrets set hash = repeat('0', 64)`)), "nor change it");
  check(Boolean(await fails(`insert into public.guest_secrets (user_id, hash) values ('${G}', repeat('0', 64))`)), "nor write one for a guest");
  await asGuest(G);
  check(Boolean(await fails(`select hash from public.guest_secrets`)), "not even the guest reads its own");
  await asGuest(H);
  check(Boolean(await fails(`delete from public.guest_secrets`)), "another guest cannot remove it");
  await asAnon();
  check(Boolean(await fails(`select hash from public.guest_secrets`)), "a visitor cannot read it");
}

console.log("\n— the merge —");
{
  await as(A);
  check(Boolean(await fails(`select public.guest_merge('${G}', null)`)), "no secret → refused");
  check(Boolean(await fails(`select public.guest_merge('${G}', '${T}')`)), "the old (replaced) secret → refused");
  check(Boolean(await fails(`select public.guest_merge('${G}', '${T.replace(/7/g, "8")}')`)), "a wrong secret → refused");
  check(Boolean(await fails(`select public.guest_merge('${H}', '${S}')`)), "the secret of one guest does not open another");
  await asService();
  check((await rows(`select 1 from public.guest_secrets where user_id = '${G}'`)).length === 1, "a refused try does not use the secret up");
  check((await rows(`select 1 from public.swipes where user_id = '${A}'`)).length === 0, "and moves nothing");
  await asGuest(G);
  check(Boolean(await fails(`select public.guest_merge('${G}', '${S}')`)), "a guest cannot merge, even with the secret");
  await as(A);
  check((await rows(`select public.guest_merge('${G}', '${S}') as n`))[0].n === 2, "the right secret → the swipes come along");
  await asService();
  check((await rows(`select 1 from auth.users where id = '${G}'`)).length === 0, "the guest user is gone");
  check((await rows(`select 1 from public.guest_secrets where user_id = '${G}'`)).length === 0, "and its secret is used up");
  await as(B);
  check(Boolean(await fails(`select public.guest_merge('${G}', '${S}')`)), "the same secret a second time → refused");
  await as(A);
  check(Boolean(await fails(`select public.guest_merge('${G}', '${S}')`)), "also for the account that used it");
}

console.log("\n— a guest without a secret —");
{
  await asService();
  await db.exec(`delete from public.guest_secrets where user_id = '${H}'`);
  await as(B);
  check(Boolean(await fails(`select public.guest_merge('${H}', '${T}')`)), "a guest that never left a secret cannot be taken");
  await asService();
  check((await rows(`select 1 from auth.users where id = '${H}'`)).length === 1, "and stays");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
