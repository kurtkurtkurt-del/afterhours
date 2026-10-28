/* afterhours — a room reaches only its own nights and its own people (110) */

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
for (const d of ["../test/supabase-shim.sql", "../sql/setup-1-structure.sql"]) await db.exec(await read(d));
await db.exec(await read("../sql/110_venue_scope.sql"));
/* a second run must not trip over the first */
await db.exec(await read("../sql/110_venue_scope.sql"));

const id = (c) => `${c.repeat(8)}-2222-2222-2222-222222222222`;
const [ADMIN, CM, CM2, U, B, X, Q, S] = ["a", "b", "c", "d", "e", "f", "9", "8"].map(id);
const asAnon = () => db.exec(`set role anon; set request.jwt.claims = '';`);
const as = (u) => db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"${u}"}';`);
const asService = () => db.exec(`reset role; set request.jwt.claims = '';`);
const fails = async (sql) => { try { await db.exec(sql); return null; } catch (e) { return e.message; } };
const one = async (sql) => (await db.query(sql)).rows[0];
const rows = async (sql) => (await db.query(sql)).rows;

await asService();
for (const [u, h] of [[ADMIN, "admin"], [CM, "berk"], [CM2, "cansu"], [U, "ada"], [B, "bea"], [X, "xan"], [Q, "quin"], [S, "sol"]]) {
  await db.exec(`insert into auth.users (id, email) values ('${u}', '${h}@x')`);
  await db.exec(`update public.profiles set handle = '${h}', display_name = '${h}' where id = '${u}'`);
}
await db.exec(`update public.profiles set is_admin = true, account_type = 'admin' where id = '${ADMIN}'`);
await db.exec(`update public.profiles set account_type = 'community_manager' where id in ('${CM}', '${CM2}')`);
const city = (await one(`select slug from public.cities order by sort_order limit 1`)).slug;
const kind = (await one(`select slug from public.event_types order by sort_order limit 1`)).slug;
const soon = new Date(Date.now() + 5 * 86400_000).toISOString().slice(0, 10);
const save = (nid, title, venue, pub = true) =>
  `select public.staff_event_save(${nid ? `'${nid}'` : "null"}, '${title}', '${city}', '${kind}', ${venue ? `'${venue}'` : "null"}, '${soon}', '23:00', '', '', '', ${pub}) as s`;
const nightId = async (slug) => { await asService(); return (await one(`select id from public.events where slug = '${slug}'`)).id; };

await as(CM);
const room = (await one(`select public.staff_venue_save(null, '${city}', 'Blitz Test', null, null) as id`)).id;
await as(CM2);
const other = (await one(`select public.staff_venue_save(null, '${city}', 'Other Room', null, null) as id`)).id;

console.log("\n— M-8: a manager writes only at their own room —");
{
  await as(CM);
  const mine = (await one(save(null, "Mine", room))).s;
  check(!!mine, "a manager makes a night at their room");
  const r1 = await fails(save(null, "Theirs", other));
  check(r1 && /not your room/.test(r1), "not at a room someone else runs", r1);
  const r2 = await fails(save(null, "Nowhere", null));
  check(r2 && /not your room/.test(r2), "nor a night with no room", r2);
  const mineId = await nightId(mine);
  await as(CM);
  const r3 = await fails(save(mineId, "Moved", other));
  check(r3 && /not your room/.test(r3), "nor moves their night to another room", r3);
  await as(CM2);
  const r4 = await fails(save(mineId, "Hijack", other));
  check(r4 && /not your room/.test(r4), "another manager cannot edit it, even moving it to their own room", r4);
  const r5 = await fails(`select public.staff_event_delete('${mineId}')`);
  check(r5 && /the room/.test(r5), "nor delete it", r5);

  /* a night sent in by a person, at the room of berk */
  await asService();
  await db.exec(`insert into public.events (slug, city_id, type_id, venue_id, title, meta, source, created_by, is_published)
    values ('sent-in', (select id from public.cities where slug = '${city}'), (select id from public.event_types where slug = '${kind}'),
            '${room}', 'Sent In', 'x', 'user', '${U}', true)`);
  const sentId = await nightId("sent-in");
  await as(CM2);
  const r6 = await fails(`select public.staff_event_delete('${sentId}')`);
  check(r6 && /the room/.test(r6), "a night sent in by someone is no longer deletable from another room", r6);
  const r7 = await fails(save(sentId, "Sent In", other, false));
  check(r7 && /not your room/.test(r7), "nor editable from another room", r7);
  await as(CM);
  check((await fails(save(sentId, "Sent In!", room, false))) === null, "the room of the night may edit it");

  await as(ADMIN);
  const adminNight = (await one(save(null, "Admin Nowhere", null))).s;
  check(!!adminNight, "the admin still makes a night with no room");
  const adminId = await nightId(adminNight);
  await as(CM);
  const r8 = await fails(save(adminId, "Grab", room));
  check(r8 && /not your room/.test(r8), "a manager cannot pull a roomless night into their room");
  await as(ADMIN);
  check((await fails(save(mineId, "Admin Edit", other))) === null, "the admin edits and moves any night");
  check((await fails(`select public.staff_event_delete('${sentId}')`)) === null, "and deletes any");
  await as(CM);
  const r9 = await fails(`select public.staff_event_delete('${mineId}')`);
  check(r9 && /the room/.test(r9), "once moved away, the night is out of reach of the first room", r9);
  await as(CM2);
  check((await fails(`select public.staff_event_delete('${mineId}')`)) === null, "and in reach of the room it went to");
  /* waiting nights sent in by a person: one at the room of berk, one with no room */
  await asService();
  const ins = (slug, venue) => db.exec(`insert into public.events (slug, city_id, type_id, venue_id, title, meta, source, created_by, is_published, review)
    values ('${slug}', (select id from public.cities where slug = '${city}'), (select id from public.event_types where slug = '${kind}'),
            ${venue ? `'${venue}'` : "null"}, '${slug}', 'x', 'user', '${U}', false, 'pending')`);
  await ins("wait-room", room); await ins("wait-none", null);
  const waitRoom = await nightId("wait-room"), waitNone = await nightId("wait-none");
  await as(CM2);
  const r10 = await fails(`select public.staff_review('${waitRoom}', true, null)`);
  check(r10 && /not your room/.test(r10), "another manager cannot let a waiting night through", r10);
  const r11 = await fails(`select public.staff_review('${waitRoom}', false, 'no')`);
  check(r11 && /not your room/.test(r11), "nor turn it down", r11);
  const r12 = await fails(`select public.staff_review('${waitNone}', true, null)`);
  check(r12 && /not your room/.test(r12), "a waiting night with no room is for the admin", r12);
  await as(CM);
  check((await fails(`select public.staff_review('${waitRoom}', true, null)`)) === null, "the room lets its own waiting night through");
  await as(ADMIN);
  check((await fails(`select public.staff_review('${waitNone}', false, 'no')`)) === null, "the admin reviews any");
  await as(U);
  check(/staff/.test((await fails(save(null, "Plain", room))) ?? ""), "a normal user is not staff at all");
}

console.log("\n— M-15: the room speaks only to people who still listen —");
{
  await as(CM);
  const n = (await one(save(null, "Push Night", room))).s;
  const nid = await nightId(n);
  await asService();
  /* ada, bea, xan, quin and sol all kept the night */
  await db.exec(`insert into public.swipes (user_id, event_id, direction) values
    ('${U}', '${nid}', 'right'), ('${B}', '${nid}', 'right'), ('${X}', '${nid}', 'right'), ('${Q}', '${nid}', 'right'), ('${S}', '${nid}', 'right')`);
  /* bea blocked the manager, the manager blocked xan, quin turned nights off, sol is closed */
  await db.exec(`insert into public.blocks (blocker_id, blocked_id) values ('${B}', '${CM}'), ('${CM}', '${X}')`);
  await db.exec(`insert into public.profile_settings (user_id, notify_nights) values ('${Q}', false)
    on conflict (user_id) do update set notify_nights = false`);
  await as(ADMIN);
  await db.exec(`select public.staff_ban('${S}', 'spam')`);
  await db.exec(`select public.watch_add('zzfoulword')`);

  await as(CM);
  const r1 = await fails(`select public.venue_push('${room}', 'free entry at https://evil.example/x')`);
  check(r1 && /no links/.test(r1), "a line with a link is refused", r1);
  const r2 = await fails(`select public.venue_push('${room}', 'tickets at evil.example now')`);
  check(r2 && /no links/.test(r2), "so is a bare domain", r2);
  for (const bad of ["visit evil.example, see you", "see evil.example.", "(evil.example)", "evil.example?x=1", "evil\u3002example now", "evil\u2024example", "go 192.168.1.1 now", "\u043f\u0440\u0438\u043c\u0435\u0440.\u0440\u0444", "exampl\u0435.\u0441\u043em"]) {
    const r = await fails(`select public.venue_push('${room}', '${bad}')`);
    check(r && /no links/.test(r), `refused as a link: ${bad}`, r);
  }
  for (const inv of ["\u2066", "\u202E", "\u034F", "\uFE0F", "\u061C"]) {
    const r = await fails(`select public.venue_push('${room}', 'evil${inv}.example now')`);
    check(r && /invisible/.test(r), `refused as invisible: U+${inv.codePointAt(0).toString(16)}`, r);
  }
  const rz = await fails(`select public.venue_push('${room}', 'evil.e\u200Bxample now')`);
  check(rz && /invisible/.test(rz), "an invisible character inside a word is refused", rz);
  const r3 = await fails(`select public.venue_push('${room}', 'you zzfoulword come tonight')`);
  check(r3 && /watch/.test(r3), "and a line with a watched word", r3);
  await asService();
  check((await one(`select count(*)::int as c from public.staff_log where action = 'push' and target = 'venue'`)).c === 0, "a refused line does not use up the day");
  await as(CM);

  const sent = (await one(`select public.venue_push('${room}', 'doors at 23.30, free before midnight') as n`)).n;
  await asService();
  const got = (await rows(`select user_id from public.push_outbox where kind = 'venue'`)).map((r) => r.user_id);
  check(sent === 1 && got.length === 1 && got[0] === U, "only ada gets it", JSON.stringify({ sent, got }));
  check(!got.includes(B), "not someone who blocked the manager");
  check(!got.includes(X), "not someone the manager blocked");
  check(!got.includes(Q), "not someone with the nights switch off");
  check(!got.includes(S), "not a closed account");

  /* plain lines pass the filters and stop only at the one a day rule */
  await as(CM);
  for (const ok of ["doors 23.30 tonight", "1.5k people last time", "Ok. Bye", "doors 23h. come"]) {
    const r = await fails(`select public.venue_push('${room}', '${ok}')`);
    check(r && /one a day/.test(r), `not a link: ${ok}`, r);
  }
  /* staff cannot be banned (52), so a closed sender never runs a room; venue_push still asks assert_member */
}

console.log("\n— L-10: remove on a reported DM deletes it —");
{
  await asService();
  const [a, b] = [U, B].sort();
  const t = (await one(`insert into public.dm_threads (a, b) values ('${a}', '${b}') returning id`)).id;
  const m = (await one(`insert into public.dm_messages (thread_id, user_id, body) values ('${t}', '${B}', 'nasty') returning id`)).id;
  await db.exec(`insert into public.reports (reporter_id, kind, target, reason) values ('${U}', 'dm_message', '${m}', 'abuse')`);
  await as(ADMIN);
  check((await fails(`select public.staff_report_settle('dm_message', '${m}', true)`)) === null, "remove is accepted for a DM");
  await asService();
  check((await rows(`select 1 from public.dm_messages where id = ${m}`)).length === 0, "the message is gone");
  check((await rows(`select 1 from public.reports where kind = 'dm_message' and target = '${m}' and not handled`)).length === 0, "and the report is closed");
}

console.log("\n— L-3: a closed account no longer reads its people —");
{
  await asService();
  await db.exec(`insert into public.friendships (requester_id, addressee_id, status) values ('${U}', '${X}', 'accepted')`);
  await as(U);
  check((await one(`select public.people_map() as m`)).m.nodes.length === 2, "a member sees their map");
  check((await one(`select public.people_places() as m`)).m !== null, "and their places");
  await as(ADMIN);
  await db.exec(`select public.staff_ban('${U}', 'spam')`);
  await as(U);
  const r1 = await fails(`select public.people_map()`);
  check(r1 && /closed/.test(r1), "closed: people_map refuses", r1);
  const r2 = await fails(`select public.people_places()`);
  check(r2 && /closed/.test(r2), "closed: people_places refuses", r2);
  await asAnon();
  check((await fails(`select public.people_map()`)) !== null, "signed out cannot call it");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
