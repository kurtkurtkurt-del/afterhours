/* afterhours — what you kept is for your friends only (105, audit H-2) */

import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

const read = (y) => readFile(new URL(y, import.meta.url), "utf8");
let passed = 0, failed = 0;
const check = (k, name, extra = "") => {
  if (k) { passed++; console.log("  ✓ " + name); }
  else { failed++; console.log("  ✗ " + name + (extra ? "  → " + extra : "")); }
};
process.on("unhandledRejection", (e) => { console.log("\nERROR: " + ((e && e.message) || e)); process.exit(1); });

const db = new PGlite();
for (const d of ["../test/supabase-shim.sql", "../sql/setup-1-structure.sql"]) await db.exec(await read(d));
await db.exec(await read("../sql/105_kept_friends_only.sql"));
await db.exec(await read("../sql/105_kept_friends_only.sql"));

const id = (c) => `${c.repeat(8)}-5555-5555-5555-555555555555`;
/* ada; bob her friend; cem a stranger; dan a friend who set kept to private;
   eli a friend who blocked her; fay a friend who got banned; gus a friend
   who is not discoverable (a friend still sees a friend) */
const [A, B, C, D, E, F, G] = ["a", "b", "c", "d", "e", "f", "9"].map(id);
const as = (u) => db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"${u}"}';`);
const asAnon = () => db.exec(`set role anon; set request.jwt.claims = '';`);
const asService = () => db.exec(`reset role; set request.jwt.claims = '';`);
const fails = async (sql) => { try { await db.exec(sql); return null; } catch (e) { return e.message; } };
const kept = async (h) => (await db.query(`select slug from public.profile_kept('${h}')`)).rows.map((r) => r.slug);
const people = async (slug) => (await db.query(`select handle, degree, via from public.event_people('${slug}') order by handle`)).rows;

await asService();
for (const [u, h] of [[A, "ada"], [B, "bob"], [C, "cem"], [D, "dan"], [E, "eli"], [F, "fay"], [G, "gus"]]) {
  await db.exec(`insert into auth.users (id, email) values ('${u}', '${h}@x')`);
  await db.exec(`update public.profiles set handle = '${h}', display_name = '${h}' where id = '${u}'`);
}
await db.exec(`insert into public.events (slug, city_id, type_id, title, meta, starts_at)
  select 'probe-' || g, (select id from public.cities limit 1), (select id from public.event_types limit 1),
         'night ' || g, 'x', now() + interval '1 day' from generate_series(1, 2) g`);
const friends = (a, b) => db.exec(`insert into public.friendships (requester_id, addressee_id, status) values ('${a}', '${b}', 'accepted')`);
await friends(A, B); await friends(D, A); await friends(A, E); await friends(F, A); await friends(A, G);
await db.exec(`insert into public.friendships (requester_id, addressee_id, status) values ('${C}', '${A}', 'pending')`);
/* everybody kept night 1; bob also night 2 */
for (const u of [A, B, C, D, E, F, G]) {
  await db.exec(`insert into public.swipes (user_id, event_id, direction) select '${u}', id, 'right' from public.events where slug = 'probe-1'`);
}
await db.exec(`insert into public.swipes (user_id, event_id, direction) select '${B}', id, 'right' from public.events where slug = 'probe-2'`);
await db.exec(`insert into public.profile_settings (user_id, kept_visibility) values ('${D}', 'private') on conflict (user_id) do update set kept_visibility = 'private'`);
await db.exec(`insert into public.profile_settings (user_id, discoverable) values ('${G}', false) on conflict (user_id) do update set discoverable = false`);
await db.exec(`insert into public.blocks (blocker_id, blocked_id) values ('${E}', '${A}')`);
/* the ban goes the way staff ban: through staff_ban, by an admin */
const H = id("8");
await db.exec(`insert into auth.users (id, email) values ('${H}', 'hal@x')`);
await db.exec(`update public.profiles set handle = 'hal', display_name = 'hal', is_admin = true, account_type = 'admin' where id = '${H}'`);
await as(H);
await db.exec(`select public.staff_ban('${F}', 'spam')`);
await asService();
check((await db.query(`select banned_at is not null as b from public.profiles where id = '${F}'`)).rows[0].b, "the ban is in place (staff_ban ran)");

console.log("\n— nobody signed in —");
await asAnon();
check((await fails(`select * from public.profile_kept('bob')`)) !== null, "signed out cannot ask what somebody kept");
check((await fails(`select * from public.event_people('probe-1')`)) !== null, "signed out cannot ask who kept a night");

console.log("\n— cem, a stranger (his request to ada is still pending) —");
await as(C);
check((await kept("bob")).length === 0, "a stranger sees nothing of what bob kept");
check((await kept("ada")).length === 0, "a pending request opens nothing either");
check((await people("probe-1")).length === 0, "a stranger sees nobody on the night, not even the six who kept it");
check((await kept("cem")).length === 1, "but everybody sees their own kept nights");
check((await fails(`select public.kept_open_to_me('${A}')`)) !== null, "the gate itself is not callable from the browser");

console.log("\n— ada —");
await as(A);
check(JSON.stringify(await kept("bob")) === JSON.stringify(["probe-2", "probe-1"]), "a friend sees what bob kept, newest first", JSON.stringify(await kept("bob")));
check((await kept("ada")).length === 1, "and her own");
check((await kept("gus")).length === 1, "a friend who is not discoverable is still her friend");
check((await kept("dan")).length === 0, "a friend who set kept to private: nothing, friend or not");
check((await kept("eli")).length === 0, "a friend who blocked her: nothing");
check((await kept("fay")).length === 0, "a friend who got banned: nothing");
check((await kept("cem")).length === 0, "a stranger: nothing");
check((await kept("nobody")).length === 0, "an unknown handle: nothing, no error");
const p = await people("probe-1");
check(JSON.stringify(p.map((r) => r.handle)) === JSON.stringify(["bob", "gus"]), "on the night: only her friends who may be seen, not herself", JSON.stringify(p));
check(p.every((r) => r.degree === 1 && r.via === null), "each of them a friend, degree 1, no via");

console.log("\n— the ones who closed the door —");
await as(D);
check((await kept("dan")).length === 1, "dan still sees his own kept nights though they are private");
await as(E);
check((await kept("ada")).length === 0, "eli, who blocked ada, does not see hers either");
check((await people("probe-1")).map((r) => r.handle).join() === "", "and nobody on the night but friends he can see (ada is blocked)");
await as(F);
check((await kept("ada")).length === 0, "fay, banned, is a friend on paper and still sees nothing");
check((await people("probe-1")).length === 0, "and nobody on the night");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
