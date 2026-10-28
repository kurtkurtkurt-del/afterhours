/* afterhours — a closed account swipes nothing, a guest befriends nobody (106, audit M-1 M-3 M-4) */

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
await db.exec(await read("../sql/106_ban_and_guest_doors.sql"));
await db.exec(await read("../sql/106_ban_and_guest_doors.sql"));

const id = (c) => `${c.repeat(8)}-6666-6666-6666-666666666666`;
/* ada; bob her friend; fay her friend, banned; hal staff; gia a guest */
const [A, B, F, H, Gi] = ["a", "b", "f", "8", "9"].map(id);
const as = (u) => db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"${u}"}';`);
const asGuest = (u) => db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"${u}","is_anonymous":true}';`);
const asAnon = () => db.exec(`set role anon; set request.jwt.claims = '';`);
const asService = () => db.exec(`reset role; set request.jwt.claims = '';`);
const fails = async (sql) => { try { await db.exec(sql); return null; } catch (e) { return e.message; } };
const count = async (sql) => (await db.query(sql)).rows[0].n;

await asService();
for (const [u, h] of [[A, "ada"], [B, "bob"], [F, "fay"], [H, "hal"], [Gi, "gia"]]) {
  await db.exec(`insert into auth.users (id, email) values ('${u}', '${h}@x')`);
  await db.exec(`update public.profiles set handle = '${h}', display_name = '${h}' where id = '${u}'`);
}
await db.exec(`update public.profiles set is_admin = true, account_type = 'admin' where id = '${H}'`);
await db.exec(`insert into public.events (slug, city_id, type_id, title, meta, starts_at, lat, lng)
  select 'probe-' || g, (select id from public.cities limit 1), (select id from public.event_types limit 1),
         'night ' || g, 'x', now(), 48.1, 11.5 from generate_series(1, 3) g`);
const friends = (a, b) => db.exec(`insert into public.friendships (requester_id, addressee_id, status) values ('${a}', '${b}', 'accepted')`);
await friends(A, B); await friends(F, A); await friends(F, B);
await db.exec(`insert into public.swipes (user_id, event_id, direction) select '${A}', id, 'right' from public.events where slug = 'probe-1'`);
await db.exec(`insert into public.swipes (user_id, event_id, direction) select '${F}', id, 'right' from public.events where slug = 'probe-2'`);
await as(H);
await db.exec(`select public.staff_ban('${F}', 'spam')`);
await asService();
check((await db.query(`select banned_at is not null as b from public.profiles where id = '${F}'`)).rows[0].b, "fay is closed (staff_ban ran)");

console.log("\n— M-1 a closed account —");
await as(F);
check((await fails(`select public.swipe_set('probe-3', 'right')`)) !== null, "swipe_set: refused");
check((await fails(`insert into public.swipes (event_id, direction) select id, 'right' from public.events where slug = 'probe-3'`)) !== null, "a swipe written straight into the table: refused");
check((await fails(`update public.swipes set direction = 'left' where user_id = '${F}'`)) !== null, "changing an old swipe: refused");
check((await fails(`select public.check_in('probe-3', 48.1, 11.5)`)) !== null, "check_in: refused");
check(await count(`select count(*)::int as n from public.swipes where user_id = '${A}'`) === 0, "the swipes of a friend: unreadable once closed");
check((await db.query(`select * from public.person_kept('ada')`)).rows.length === 0, "person_kept of a friend: nothing once closed");
check((await db.query(`select * from public.person_kept('fay')`)).rows.length === 1, "but her own kept nights are still hers to see");
check(await count(`select count(*)::int as n from public.checkins where user_id = '${B}'`) === 0, "the check-ins of a friend: unreadable once closed (bob checks in below, read again after)");

console.log("\n— the friend still open —");
await as(B);
check((await fails(`select public.swipe_set('probe-1', 'right')`)) === null, "bob swipes as before");
check(await count(`select count(*)::int as n from public.swipes where user_id = '${A}'`) === 1, "bob reads what ada kept, as a friend");
check((await db.query(`select * from public.person_kept('ada')`)).rows.length === 1, "person_kept: as before");
check((await fails(`select public.check_in('probe-1', 48.1, 11.5)`)) === null, "bob checks in as before");
await as(A);
check(await count(`select count(*)::int as n from public.checkins where user_id = '${B}'`) === 1, "ada, his friend, sees his check-in");
await as(F);
check(await count(`select count(*)::int as n from public.checkins where user_id = '${B}'`) === 0, "fay, closed, does not");
await as(B);

console.log("\n— M-3 the migration log —");
await asAnon();
check((await fails(`select public.migration_done('99_fake.sql', 'x')`)) !== null, "signed out: cannot write the log (two arguments)");
check((await fails(`select public.migration_done('99_fake.sql')`)) !== null, "signed out: cannot write the log (one argument)");
await as(B);
check((await fails(`select public.migration_done('99_fake.sql', 'x')`)) !== null, "a member cannot write it either");
await asService();
check(await count(`select count(*)::int as n from public.migrations where name = '99_fake.sql'`) === 0, "the log holds no fake row");
check(await count(`select count(*)::int as n from public.migrations where name = '106_ban_and_guest_doors.sql'`) === 1, "the owner still stamps it");

console.log("\n— M-4 a guest —");
await asGuest(Gi);
check((await fails(`select public.friend_request('ada')`)) !== null, "friend_request: refused");
check((await fails(`insert into public.friendships (requester_id, addressee_id) values ('${Gi}', '${A}')`)) !== null, "a request written straight into the table: refused");
check((await fails(`select public.spark_create('derby', 'x', now() + interval '1 day', null, 2)`)) !== null, "spark_create: refused");
check((await fails(`select public.set_account_type('dj', 'dj')`)) !== null, "set_account_type: refused");
check((await fails(`select public.swipe_set('probe-1', 'right')`)) === null, "but a guest still swipes: the deck works before an account");
await asService();
check(await count(`select count(*)::int as n from public.friendships where requester_id = '${Gi}' or addressee_id = '${Gi}'`) === 0, "no friendship row for the guest");
await as(A);
check((await fails(`select public.friend_request('bob')`)) === null, "a member: friend_request as before (already friends, no error)");
check((await fails(`select public.set_account_type('dj', 'dj')`)) === null, "a member: set_account_type as before");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
