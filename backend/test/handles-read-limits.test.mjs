/* afterhours — a handle obeys the rules on every road, reads have a ceiling (107) */

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
/* a second run must not trip over the first */
await db.exec(await read("../sql/107_handles_and_read_limits.sql"));

const id = (c) => `${c.repeat(8)}-4444-4444-4444-444444444444`;
const [A, B, C, CM, W, X] = ["a", "b", "c", "d", "e", "f"].map(id);
const as = (u) => db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"${u}"}';`);
const asAnon = () => db.exec(`set role anon; set request.jwt.claims = '';`);
const asService = () => db.exec(`reset role; set request.jwt.claims = '';`);
const rows = async (sql) => (await db.query(sql)).rows;
const fails = async (sql) => { try { await db.exec(sql); return null; } catch (e) { return e.message; } };

await asService();
for (const [u, h] of [[A, "ada"], [B, "bob"], [C, "cem"], [CM, "cmx"]]) {
  await db.exec(`insert into auth.users (id, email) values ('${u}', '${h}@x')`);
  await db.exec(`update public.profiles set handle = '${h}', display_name = '${h}' where id = '${u}'`);
}
await db.exec(`update public.profiles set account_type = 'community_manager' where id = '${CM}'`);
await db.exec(`insert into public.friendships (requester_id, addressee_id, status) values ('${A}', '${B}', 'accepted')`);
await db.exec(`insert into public.banned_marks (mark, handle) values ('m1', 'gone_one')`);

console.log("\n— M-2 the handle, written straight to the table —");
{
  await as(A);
  const mine = `update public.profiles set handle = '%h' where id = '${A}'`;
  check((await fails(mine.replace("%h", "admin"))) !== null, "a member cannot PATCH themselves to @admin");
  check((await fails(mine.replace("%h", "afterhours_team"))) !== null, "nor to the afterhours family");
  check((await fails(mine.replace("%h", "gone_one"))) !== null, "nor to the handle of a banned account that left");
  check((await fails(mine.replace("%h", "bob"))) !== null, "nor to a handle somebody has");
  check((await fails(mine.replace("%h", "Ada X"))) !== null, "nor to one outside the format");
  check((await fails(mine.replace("%h", "ada"))) === null, "keeping your own handle passes");
  check((await fails(`update public.profiles set display_name = 'Ada' where id = '${A}'`)) === null, "an edit that leaves the handle alone passes");
  check((await fails(mine.replace("%h", "ada_two"))) === null, "an ordinary new handle passes");
  check((await rows(`select public.profile_setup('ada_three', 'Ada', null, null) as r`))[0].r === "ok", "profile_setup still works");
  check((await rows(`select public.profile_setup('support', 'Ada', null, null) as r`))[0].r === "taken", "and still refuses a reserved one");
  await as(CM);
  check((await fails(`update public.profiles set handle = 'support' where id = '${CM}'`)) === null, "the staff may take a reserved name");
  await asService();
  check((await fails(`update public.profiles set handle = 'team' where id = '${C}'`)) === null, "the server itself may too");
  check((await fails(`update public.profiles set handle = 'gone_one' where id = '${C}'`)) !== null, "but not a banned mark");
  await db.exec(`update public.profiles set handle = 'cem' where id = '${C}'`);
}

console.log("\n— M-2 at sign-up —");
{
  await asService();
  check((await fails(`insert into auth.users (id, email, raw_user_meta_data) values ('${W}', 'w@x', '{"handle":"gone_one"}')`)) === null, "a sign-up wishing a banned mark does not fail");
  check((await rows(`select handle from public.profiles where id = '${W}'`))[0].handle === null, "the wish is dropped, the handle step asks again");
  await db.exec(`insert into auth.users (id, email, raw_user_meta_data) values ('${X}', 'x@x', '{"handle":"xena"}')`);
  check((await rows(`select handle from public.profiles where id = '${X}'`))[0].handle === "xena", "an ordinary wish is kept");
}

console.log("\n— L-5 a ceiling on reads —");
{
  await as(A);
  let refusedAt = 0;
  for (let i = 1; i <= 201; i++) {
    const e = await fails(`select * from public.people_search('bo', 12)`);
    if (e) { refusedAt = i; check(/slow down/.test(e), "the refusal says why", e); break; }
  }
  check(refusedAt === 201, "200 searches an hour pass, the next is refused", String(refusedAt));
  check((await fails(`select * from public.people_search('b', 12)`)) === null, "a one-letter query costs nothing");
  for (let i = 1; i <= 300; i++) await db.query(`select * from public.profile_card('bob')`);
  check((await fails(`select * from public.profile_card('bob')`)) !== null, "the 301st card in an hour is refused");
  await as(B);
  check((await rows(`select * from public.profile_card('ada_three')`)).length === 1, "another member is not touched by it");
  await asService();
  await db.exec(`update public.read_counts set hour = hour - interval '1 hour' where user_id = '${A}'`);
  await as(A);
  check((await rows(`select * from public.profile_card('bob')`)).length === 1, "the next hour starts again");
  await as(CM);
  for (let i = 1; i <= 210; i++) await db.query(`select * from public.people_search('ad', 12)`);
  check(true, "staff are not counted");
  await asAnon();
  for (let i = 1; i <= 310; i++) await db.query(`select * from public.profile_card('bob')`);
  check(true, "a signed-out card is not counted (no address to count by)");
  check((await fails(`select * from public.read_counts`)) !== null, "the counts table is closed to the browser");
  check((await fails(`select public.read_rate('x', 1)`)) !== null, "and the counter cannot be called");
}

console.log("\n— L-5 feedback —");
{
  const fb = `insert into public.feedback (kind, body) values ('idea', 'a long enough line')`;
  await as(B);
  for (let i = 1; i <= 10; i++) await db.exec(fb);
  check((await fails(fb)) !== null, "the 11th signed-in note in an hour is refused");
  check((await fails(`insert into public.feedback (author_id, kind, body) values (null, 'idea', 'a long enough line')`)) !== null, "sending author_id empty does not slip into the signed-out bucket");
  await asAnon();
  for (let i = 1; i <= 60; i++) await db.exec(fb);
  check(/slow down/.test(await fails(fb) || ""), "past 60 signed-out notes an hour, the signed-out form waits");
  await as(C);
  check((await fails(fb)) === null, "a signed-in member can still write");
}

console.log("\n— L-11 a night never public —");
{
  await asService();
  const city = (await rows(`select id from public.cities limit 1`))[0].id;
  const type = (await rows(`select id from public.event_types limit 1`))[0].id;
  const night = (slug, pub, review, ago) => db.exec(`insert into public.events (slug, city_id, type_id, title, meta, is_published, review, starts_at)
    values ('${slug}', '${city}', '${type}', 'x', 'x', ${pub}, ${review ? `'${review}'` : "null"}, now() ${ago})`);
  await night("sent-in", false, "pending", "+ interval '3 days'");
  await night("draft", false, null, "+ interval '3 days'");
  await night("retired", false, null, "- interval '3 days'");
  await night("taken-down", false, null, "+ interval '5 days'");
  await night("turned-down", false, "rejected", "- interval '2 days'");
  await night("open", true, null, "+ interval '1 day'");
  for (const s of ["sent-in", "draft", "retired", "open", "taken-down", "turned-down"]) {
    await db.exec(`insert into public.swipes (user_id, event_id, direction) select '${B}', id, 'right' from public.events where slug = '${s}'`);
    await db.exec(`insert into public.checkins (user_id, event_id) select '${C}', id from public.events where slug = '${s}'`);
  }
  await as(A);
  const kept = (await rows(`select slug from public.person_kept('bob')`)).map((r) => r.slug);
  check(!kept.includes("sent-in") && !kept.includes("turned-down"), "a friend does not see a night in review or turned down", kept.join());
  check(kept.includes("retired") && kept.includes("open") && kept.includes("taken-down"), "a retired night, a taken-down one and an open one stay in the list", kept.join());
  await asService();
  await db.exec(`update public.events set image_url = 'https://x/y.jpg' where slug in ('turned-down', 'retired')`);
  const slug = (await rows(`select c.slug from public.cities c join public.events e on e.city_id = c.id where e.slug = 'retired'`))[0].slug;
  await as(A);
  const past = (await rows(`select slug from public.past_feed('${slug}', null, null, 30)`)).map((r) => r.slug);
  check(past.includes("retired") && !past.includes("turned-down"), "the past feed shows a retired night, not one turned down (57 read events with no rule)", past.join());
  await asAnon();
  check((await rows(`select * from public.room_info('sent-in')`)).length === 0, "room_info gives nothing for a night never public");
  check((await rows(`select * from public.room_info('retired')`))[0]?.who_count === 1, "a retired night still has its count");
  check((await rows(`select * from public.room_info('open')`))[0]?.who_count === 1, "and an open one");
  await as(C);
  check((await rows(`select * from public.room_info('draft')`)).length === 1, "who was in the room still sees it");
}

console.log("\n— B-2 the word list —");
{
  await as(A);
  check((await fails(`select public.watch_hit('hello')`)) !== null, "a member cannot ask the watch list");
  await asAnon();
  check((await fails(`select public.watch_hit('hello')`)) !== null, "nor can the signed-out");
  await as(B);
  await db.exec(`update public.profiles set bio = 'a bio with kys in it' where id = '${B}'`);
  await asService();
  check((await rows(`select count(*)::int n from public.reports where target = '${B}' and reason like 'filter:%'`))[0].n >= 1, "the watch still fires inside its trigger");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
