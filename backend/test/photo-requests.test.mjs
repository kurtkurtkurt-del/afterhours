/* afterhours — the face on a request, and on an open card (115) */

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
/* the whole build, so every later door (bans 52, doors 57, read limits 107) is in force */
for (const d of ["../test/supabase-shim.sql", "../sql/setup-1-structure.sql"]) await db.exec(await read(d));
/* a second run must not trip over the first */
await db.exec(await read("../sql/115_photo_requests.sql"));

const A = "aaaaaaaa-1111-1111-1111-111111111111";   /* asked by C, has a photo */
const C = "cccccccc-3333-3333-3333-333333333333";   /* asks A, has a photo */
const D = "dddddddd-4444-4444-4444-444444444444";   /* a stranger */
const E = "eeeeeeee-5555-5555-5555-555555555555";   /* hidden: not discoverable */
const F = "ffffffff-6666-6666-6666-666666666666";   /* a friend of A, later closed */

const asUser = (id) => db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"${id}"}';`);
const asGuest = (id) => db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"${id}","is_anonymous":true}';`);
const asAnon = () => db.exec(`set role anon; set request.jwt.claims = '';`);
const asService = () => db.exec(`reset role; set request.jwt.claims = '';`);
const fails = async (sql) => { try { await db.exec(sql); return null; } catch (e) { return e.message; } };
const rows = async (sql) => (await db.query(sql)).rows;
const photoOf = async (h) => (await rows(`select public.person_photo('${h}') as p`))[0].p;

await asService();
await db.exec(`
  insert into auth.users (id, email) values
    ('${A}', 'a@x.com'), ('${C}', 'c@x.com'), ('${D}', 'd@x.com'), ('${E}', 'e@x.com'), ('${F}', 'f@x.com');
  update public.profiles set handle = 'ada' where id = '${A}';
  update public.profiles set handle = 'cem' where id = '${C}';
  update public.profiles set handle = 'dora' where id = '${D}';
  update public.profiles set handle = 'eli' where id = '${E}';
  update public.profiles set handle = 'fen' where id = '${F}';
  insert into public.profile_settings (user_id, discoverable) values ('${E}', false)
    on conflict (user_id) do update set discoverable = false;
  insert into public.profile_photos (user_id, path) values
    ('${A}', '${A}/1.jpg'), ('${C}', '${C}/2.jpg'), ('${E}', '${E}/3.jpg'), ('${F}', '${F}/4.jpg');
  insert into public.friendships (requester_id, addressee_id, status) values ('${C}', '${A}', 'pending'), ('${A}', '${F}', 'accepted');
`);

console.log("\n— a request —");
await asUser(A);
{
  const seen = await rows(`select user_id from public.profile_photos where user_id <> '${A}' order by user_id`);
  check(seen.length === 2 && seen.some((r) => r.user_id === C) && seen.some((r) => r.user_id === F), "the one who is asked sees the face of the one who asks (and a friend)", JSON.stringify(seen));
}
await asUser(C);
check((await rows(`select 1 from public.profile_photos where user_id = '${A}'`)).length === 0,
      "the one who asks does not see the face of the one asked");

console.log("\n— the table cannot be browsed —");
await asUser(D);
check((await rows(`select 1 from public.profile_photos`)).length === 0, "a stranger lists no photos");

console.log("\n— an open card —");
check((await photoOf("ada")) === `${A}/1.jpg`, "a discoverable card shows its photo to a member");
check((await photoOf("eli")) === null, "a hidden card shows none");
check((await photoOf("nobody")) === null, "an unknown handle gives nothing");
await asUser(A);
check((await photoOf("cem")) === `${C}/2.jpg`, "the one asked gets it by handle too");

console.log("\n— a guest —");
await asGuest(D);
check((await photoOf("ada")) === null, "a guest gets no face by handle");
check((await rows(`select 1 from public.profile_photos`)).length === 0, "a guest lists no photos");

console.log("\n— a closed account —");
await asService();
await db.exec(`select set_config('afterhours.ban', 'on', false); update public.profiles set banned_at = now() where id = '${F}'; select set_config('afterhours.ban', '', false);`);
await asUser(A);
check((await photoOf("fen")) === null, "a closed account shows no face, not even to a friend");
check((await rows(`select 1 from public.profile_photos where user_id = '${F}'`)).length === 0, "nor in the table");
await asUser(F);
check(Boolean(await fails(`select public.person_photo('ada')`)), "a closed account cannot ask for faces");
check((await rows(`select 1 from public.profile_photos where user_id = '${A}'`)).length === 0, "nor read the table");

console.log("\n— a ceiling —");
await asUser(D);
{
  let stopped = null;
  for (let i = 0; i < 310 && !stopped; i++) stopped = await fails(`select public.person_photo('ada')`);
  check(Boolean(stopped) && /slow down/.test(stopped), "person_photo stops past its hourly ceiling", stopped ?? "never stopped");
}

console.log("\n— a block —");
await asService();
await db.exec(`insert into public.blocks (blocker_id, blocked_id) values ('${A}', '${C}')`);
await asUser(A);
check((await rows(`select 1 from public.profile_photos where user_id = '${C}'`)).length === 0, "blocked: the request face is gone");
await asUser(C);
check((await photoOf("ada")) === null, "blocked: the open card face is gone the other way too");

console.log("\n— signed out —");
await asAnon();
check(Boolean(await fails(`select public.person_photo('ada')`)), "signed out, person_photo is closed");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
