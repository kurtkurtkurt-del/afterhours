/* afterhours — the venue desk: community managers run their rooms (97) */

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
await db.exec(await read("../sql/97_venue_desk.sql"));
/* a second run must not trip over the first */
await db.exec(await read("../sql/97_venue_desk.sql"));

const ADMIN = "aaaaaaaa-1111-1111-1111-111111111111";
const CM = "bbbbbbbb-2222-2222-2222-222222222222";
const CM2 = "cccccccc-3333-3333-3333-333333333333";
const U = "dddddddd-4444-4444-4444-444444444444";
const asAnon = () => db.exec(`set role anon; set request.jwt.claims = '';`);
const as = (id) => db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"${id}"}';`);
const asService = () => db.exec(`reset role; set request.jwt.claims = '';`);
const fails = async (sql) => { try { await db.exec(sql); return null; } catch (e) { return e.message; } };
const one = async (sql) => (await db.query(sql)).rows[0];
const rows = async (sql) => (await db.query(sql)).rows;

await asService();
await db.exec(`insert into auth.users (id, email) values ('${ADMIN}','a@x'),('${CM}','b@x'),('${CM2}','c@x'),('${U}','d@x')`);
await db.exec(`update public.profiles set is_admin = true, account_type = 'admin', handle = 'admin' where id = '${ADMIN}'`);
await db.exec(`update public.profiles set account_type = 'community_manager', handle = 'berk' where id = '${CM}'`);
await db.exec(`update public.profiles set account_type = 'community_manager', handle = 'cansu' where id = '${CM2}'`);
await db.exec(`update public.profiles set handle = 'deniz' where id = '${U}'`);
const city = (await one(`select slug from public.cities order by sort_order limit 1`)).slug;
const kind = (await one(`select slug from public.event_types order by sort_order limit 1`)).slug;
const soon = new Date(Date.now() + 5 * 86400_000).toISOString().slice(0, 10);

console.log("\n— who runs what —");
let room, other;
{
  await as(CM);
  room = (await one(`select public.staff_venue_save(null, '${city}', 'Blitz Test', null, null) as id`)).id;
  check(!!room, "a community manager makes a room");
  const mine = await rows(`select * from public.my_venues()`);
  check(mine.length === 1 && mine[0].id === room && mine[0].managers === 1, "and runs it: my_venues lists it with one manager");
  await as(CM2);
  other = (await one(`select public.staff_venue_save(null, '${city}', 'Other Room', null, null) as id`)).id;
  check((await rows(`select * from public.my_venues()`)).length === 1, "another manager sees only their own room");
  const r = await fails(`select public.staff_venue_save('${room}', '${city}', 'Stolen', null, null)`);
  check(r && /not your room/.test(r), "and cannot rename a room they do not run");
  await as(ADMIN);
  check((await rows(`select * from public.my_venues()`)).length === 2, "the admin sees every room with a manager");
  await db.exec(`select public.admin_venue_assign('${room}', 'deniz', true)`);
  await asService();
  check((await one(`select account_type from public.profiles where id = '${U}'`)).account_type === "community_manager", "handing a room to a normal user makes them a community manager");
  await as(U);
  check((await rows(`select * from public.my_venues()`)).length === 1, "and they see the room");
  check((await rows(`select * from public.venue_managers_of('${room}')`)).length === 2, "venue_managers_of names both");
  await as(ADMIN);
  await db.exec(`select public.admin_venue_assign('${room}', 'deniz', false)`);
  await as(U);
  check((await rows(`select * from public.my_venues()`)).length === 0, "taken back: gone from their list");
  await asService();
  check((await one(`select account_type from public.profiles where id = '${U}'`)).account_type === "user", "and with no room left they are a normal user again");
  const r2 = await fails(`select public.admin_venue_assign('${room}', 'berk', false)`);
  check(r2 && /admin/.test(r2), "only the admin assigns");
  await asAnon();
  const badge = await rows(`select * from public.person_venues('berk')`);
  check(badge.length === 1 && badge[0].name === "Blitz Test", "anyone sees the badge: the rooms berk runs");
  await as(CM);
  const book = await rows(`select * from public.venue_people()`);
  check(book.length === 2 && book.some((b) => b.handle === "cansu" && !b.mine) && book.some((b) => b.mine), "the managers' phone book lists every room and who runs it");
  await as(U);
  const r3 = await fails(`select * from public.venue_people()`);
  check((await rows(`select * from public.venue_people()`)).length === 0 || r3, "a normal user gets nothing from it");
}

console.log("\n— featured —");
let n1, n2, n3, n4, nOther;
{
  await as(CM);
  const make = async (title, venue) => (await one(`select public.staff_event_save(null, '${title}', '${city}', '${kind}', '${venue}', '${soon}', '23:00', '', 'https://t.example/${title}', '', true) as s`)).s;
  n1 = await make("One", room); n2 = await make("Two", room); n3 = await make("Three", room); n4 = await make("Four", room);
  await as(CM2);
  nOther = await make("Elsewhere", other);
  await asService();
  const id = async (slug) => (await one(`select id from public.events where slug = '${slug}'`)).id;
  await as(CM);
  await db.exec(`select public.night_feature('${await id(n1)}', true)`);
  await db.exec(`select public.night_feature('${await id(n2)}', true)`);
  await db.exec(`select public.night_feature('${await id(n3)}', true)`);
  const r = await fails(`select public.night_feature('${await id(n4)}', true)`);
  check(r && /three/.test(r), "at most three on top per room");
  const r2 = await fails(`select public.night_feature('${await id(nOther)}', true)`);
  check(r2 && /not your room/.test(r2), "not a night at someone else's room");
  await asAnon();
  const deck = await rows(`select slug, featured_at from public.deck('${city}', null, 200)`);
  check(deck.length >= 5 && deck[0].featured_at && deck[1].featured_at && deck[2].featured_at, "the deck deals the featured nights first");
  check(deck.slice(0, 3).every((d) => [n1, n2, n3].includes(d.slug)), "and they are the three");
  await as(CM);
  await db.exec(`select public.night_feature('${await id(n1)}', false)`);
  await db.exec(`select public.night_feature('${await id(n4)}', true)`);
  check(!(await fails(`select 1`)), "taking one down makes room for another");
  await as(U);
  const r3 = await fails(`select public.night_feature('${await id(n2)}', false)`);
  check(r3 && /not your room/.test(r3), "a normal user cannot touch it");
}

console.log("\n— the numbers —");
{
  await asService();
  const id1 = (await one(`select id from public.events where slug = '${n1}'`)).id;
  await db.exec(`insert into public.swipes (user_id, event_id, direction) values ('${U}', '${id1}', 'right'), ('${CM2}', '${id1}', 'left')`);
  await db.exec(`insert into public.rsvps (user_id, event_id, answer) values ('${U}', '${id1}', 'in')`);
  await db.exec(`insert into public.tickets (user_id, event_id, answer) values ('${U}', '${id1}', 'got')`);
  await db.exec(`insert into public.comments (event_id, author_id, body) values ('${id1}', '${U}', 'see you there')`);
  await as(CM);
  const nights = await rows(`select * from public.venue_nights('${room}')`);
  const row = nights.find((n) => n.slug === n1);
  check(nights.length === 4 && row && row.kept === 1 && row.letgo === 1 && row.going === 1 && row.tickets === 1 && row.comments === 1, "venue_nights: every night of the room with its counts");
  const stats = (await one(`select public.venue_stats('${room}') as s`)).s;
  check(stats.nights_ahead === 4 && stats.kept_30 === 1 && stats.tickets_30 === 1 && stats.going === 1 && stats.reach === 1, "venue_stats: the room's 30 days", JSON.stringify(stats));
  const cm = await rows(`select * from public.venue_comments('${room}')`);
  check(cm.length === 1 && cm[0].handle === "deniz", "venue_comments: the comments under its nights");
  await db.exec(`select public.staff_comment_hide('${cm[0].id}', true)`);
  check((await rows(`select * from public.venue_comments('${room}')`))[0].is_hidden === true, "the manager hides one (42)");
  await as(CM2);
  check((await rows(`select * from public.venue_nights('${room}')`)).length === 0, "another manager sees none of it");
  const r = await fails(`select public.venue_stats('${room}')`);
  check(r && /not your room/.test(r), "nor the numbers");
}

console.log("\n— the room speaks —");
{
  await as(CM);
  const r = await fails(`select public.venue_push('${room}', 'hi')`);
  check(r && /3 to 140/.test(r), "a line of 3 to 140 characters");
  const n = (await one(`select public.venue_push('${room}', 'doors at 23, free before midnight') as n`)).n;
  check(n === 1, "goes to the people of the room (kept, answered, got a ticket), not the manager", String(n));
  await asService();
  const out = await rows(`select kind, data from public.push_outbox where user_id = '${U}' and kind = 'venue'`);
  check(out.length === 1 && out[0].data.venue === "blitz test" && out[0].data.line === "doors at 23, free before midnight", "one push, kind venue, the room and the line");
  const text = await one(`select * from public.push_text('venue', 'tr', '${JSON.stringify(out[0].data)}'::jsonb)`);
  check(text.title === "blitz test" && text.body === "doors at 23, free before midnight", "the words: the room as title, the line as body");
  check((await one(`select public.push_wants('${U}', 'venue') as w`)).w === true, "under the nights switch, on by default");
  await db.exec(`update public.profile_settings set notify_nights = false where user_id = '${U}'`);
  check((await one(`select public.push_wants('${U}', 'venue') as w`)).w === false, "off with it");
  await as(CM);
  const r2 = await fails(`select public.venue_push('${room}', 'again so soon')`);
  check(r2 && /one a day/.test(r2), "one a day per room");
  await as(CM2);
  const r3 = await fails(`select public.venue_push('${room}', 'not my room though')`);
  check(r3 && /not your room/.test(r3), "only its manager");
  await asService();
  check((await rows(`select * from public.staff_log where action = 'push' and target = 'venue'`)).length === 1, "logged");
}

console.log("\n— deleting —");
{
  await as(ADMIN);
  const adminNight = (await one(`select public.staff_event_save(null, 'Admin Made', '${city}', '${kind}', '${room}', '${soon}', '22:00', '', '', '', true) as s`)).s;
  await asService();
  const id = (await one(`select id from public.events where slug = '${adminNight}'`)).id;
  await as(CM2);
  const r = await fails(`select public.staff_event_delete('${id}')`);
  check(r && /the room/.test(r), "a manager of another room may not delete it");
  await as(CM);
  await db.exec(`select public.staff_event_delete('${id}')`);
  await asService();
  check((await rows(`select 1 from public.events where id = '${id}'`)).length === 0, "the room's manager deletes a night at their room made by anyone here");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
