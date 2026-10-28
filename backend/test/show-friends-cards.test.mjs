/* afterhours — a hidden check-in stays hidden on every card (108) */

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
await db.exec(await read("../sql/108_show_friends_cards.sql"));
await db.exec(await read("../sql/108_show_friends_cards.sql"));

const id = (c) => `${c.repeat(8)}-3333-3333-3333-333333333333`;
const [A, B, C, D, S, Y, Z] = ["a", "b", "c", "d", "5", "7", "9"].map(id);
const as = (u) => db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"${u}"}';`);
const asAnon = () => db.exec(`set role anon; set request.jwt.claims = '';`);
const asService = () => db.exec(`reset role; set request.jwt.claims = '';`);
const rows = async (sql) => (await db.query(sql)).rows;
const fails = async (sql) => { try { await db.exec(sql); return null; } catch (e) { return e.message; } };

await asService();
for (const [u, h] of [[A, "ada"], [B, "bob"], [C, "cem"], [D, "dan"], [S, "sam"], [Y, "yan"], [Z, "zed"]]) {
  await db.exec(`insert into auth.users (id, email) values ('${u}', '${h}@x')`);
  await db.exec(`update public.profiles set handle = '${h}', display_name = '${h}', city_id = null where id = '${u}'`);
}
const friends = (a, b) => db.exec(`insert into public.friendships (requester_id, addressee_id, status) values ('${a}', '${b}', 'accepted')`);
/* ada is friends with bob, cem and dan; nobody else is friends with anybody */
await friends(A, B); await friends(A, C); await friends(A, D);
const ev = (await rows(`select id from public.events order by slug limit 5`)).map((r) => r.id);
const checkin = (u, e, show = true) => db.exec(`insert into public.checkins (user_id, event_id, show_friends) values ('${u}', '${ev[e]}', ${show})`);
const post = (u, e, body) => db.exec(`insert into public.room_posts (event_id, user_id, body) values ('${ev[e]}', '${u}', '${body}')`);

/* night 0: bob and cem, cem says something. night 1: bob, hidden from friends.
   night 2: bob and ada, bob says something. night 3: bob and dan. night 4: ada, and bob hidden. */
await checkin(B, 0); await checkin(C, 0); await post(C, 0, "cem in room zero");
await checkin(B, 1, false);
await checkin(B, 2); await checkin(A, 2); await post(B, 2, "bob in room two");
await checkin(B, 3); await checkin(D, 3);
await checkin(A, 4); await checkin(B, 4, false);

console.log("\n— person_cards: a friend looks at bob (M-5) —");
await as(A);
{
  const cards = await rows(`select * from public.person_cards('bob')`);
  const slugs = await rows(`select id, slug from public.events where id = any(array['${ev.join("','")}']::uuid[])`);
  const slug = (e) => slugs.find((s) => s.id === ev[e]).slug;
  const card = (e) => cards.find((c) => c.slug === slug(e));
  check(cards.length === 3, "three cards: the two nights he hid are not there", String(cards.length));
  check(!card(1) && !card(4), "a check-in hidden from friends is not a card, not even in a room ada was in");
  check(card(0) && card(0).q1_body === null && card(0).q1_who === null && card(0).q2_body === null, "a room ada never entered gives no line", JSON.stringify(card(0)));
  check(card(0) && card(0).post_count === 1, "only how many there are, so an open room still reads as a night begun");
  check(card(0) && card(0).crew.length === 0 && card(0).crew_more === 0, "and no initials of the crew");
  check(card(2) && card(2).q1_body === "bob in room two" && card(2).post_count === 1, "a room ada was in too gives its lines");
  check(card(2) && card(2).crew.includes("a"), "and its initials");
  check(card(3) && card(3).who_count === 2, "the night still says how many were there");
}

console.log("\n— person_cards: bob on his own page —");
await as(B);
{
  const cards = await rows(`select * from public.person_cards('bob')`);
  check(cards.length === 5, "all five of his cards, the hidden ones too", String(cards.length));
  check(cards.some((c) => c.q1_body === "cem in room zero"), "with the lines of every room he was in");
}

console.log("\n— person_cards: no friend —");
await as(S);
check((await rows(`select * from public.person_cards('bob')`)).length === 0, "a stranger gets no card");
await as(C);
check((await rows(`select * from public.person_cards('bob')`)).length === 0, "nor does a group mate who is not a friend");

console.log("\n— group nights (L-12) —");
await asService();
const g = (await rows(`insert into public.groups (name, emoji, color, kind, created_by) values ('Cuma', '🪩', 'red', 'lasting', '${A}') returning id`))[0].id;
for (const u of [A, B, C, D]) await db.exec(`insert into public.group_members (group_id, user_id, role) values ('${g}', '${u}', '${u === A ? "owner" : "member"}')`);
const nights = async (u) => { await as(u); return (await rows(`select id, people from public.group_nights('${g}')`)); };
{
  const a = await nights(A);
  check(a.length === 3 && [0, 2, 3].every((e) => a.some((n) => n.id === ev[e])), "ada sees the nights of her friends", JSON.stringify(a.map((n) => ev.indexOf(n.id))));
  check(!a.some((n) => n.id === ev[4]), "not the night bob hid, though she was there");
  const c = await nights(C);
  check(c.length === 1 && c[0].id === ev[0], "cem sees only the night he was in the room", JSON.stringify(c.map((n) => ev.indexOf(n.id))));
  check(!c.some((n) => n.id === ev[3]), "not bob and dan, who are not his friends");
  const d = await nights(D);
  check(d.length === 1 && d[0].id === ev[3], "dan sees only his own night with bob");
  check(!JSON.stringify(c).includes(D) && !JSON.stringify(d).includes(C), "no name or card of someone you may not see");
  await as(C);
  const st = (await rows(`select public.group_stats('${g}') as s`))[0].s;
  check(st.nights === 1, "the numbers count only what you may see", JSON.stringify(st));
  check(/only nights/.test(await fails(`select public.group_photo_add('${g}', '${ev[3]}', '${C}/x.jpg')`) ?? ""), "and the album opens only on those nights");
  await as(D);
  await db.exec(`select public.group_photo_add('${g}', '${ev[3]}', '${D}/n3.jpg')`);
  await as(C);
  await db.exec(`select public.group_photo_add('${g}', '${ev[0]}', '${C}/n0.jpg')`);
  const wall = await rows(`select event_id, path, mine from public.group_wall('${g}')`);
  check(wall.length === 1 && wall[0].path === `${C}/n0.jpg`, "the wall leaves out the photo of a night cem may not see", JSON.stringify(wall));
  check((await rows(`select * from public.group_album('${g}', '${ev[3]}')`)).length === 0, "and so does the album, asked by event id");
  check((await rows(`select public.group_stats('${g}') as s`))[0].s.photos === 1, "the photo count agrees with the nights");
  await as(A);
  check((await rows(`select * from public.group_wall('${g}')`)).length === 2, "ada, who may see both nights, sees both photos");
  await asService();
  await db.exec(`update public.checkins set show_friends = false where user_id = '${B}' and event_id = '${ev[3]}'`);
  await as(D);
  check((await rows(`select * from public.group_nights('${g}')`)).length === 0, "bob hides night 3: dan has no group night left");
  check((await rows(`select * from public.group_wall('${g}')`)).some((x) => x.path === `${D}/n3.jpg` && x.mine), "but his own photo of it stays his to see");
  await asService();
  await db.exec(`update public.checkins set show_friends = true where user_id = '${B}' and event_id = '${ev[3]}'`);
}

console.log("\n— people_suggested (L-8) —");
await asService();
await db.exec(`update public.profiles set last_seen_at = now() where id = '${Z}'`);
await db.exec(`update public.profiles set last_seen_at = null where id = '${Y}'`);
await as(A);
const order = async () => (await rows(`select handle from public.people_suggested(12)`)).map((r) => r.handle).filter((h) => h === "yan" || h === "zed");
check(JSON.stringify(await order()) === '["yan","zed"]', "the one online just now is not put first", JSON.stringify(await order()));
await asService();
await db.exec(`update public.profiles set last_seen_at = now() where id = '${Y}'; update public.profiles set last_seen_at = now() - interval '30 days' where id = '${Z}'`);
await as(A);
check(JSON.stringify(await order()) === '["yan","zed"]', "and the order does not move when they come and go");
const src = await read("../sql/108_show_friends_cards.sql");
const body = src.slice(src.indexOf("function public.people_suggested"));
check(!/last_seen_at/.test(body.slice(0, body.indexOf("$$;"))), "the function does not read last_seen_at at all");
check(/has_any_link/.test(body), "it keeps the pending-request rule of 104");

console.log("\n— nobody signed in —");
await asAnon();
check((await fails(`select * from public.person_cards('bob')`)) !== null, "signed out cannot call person_cards");
check((await fails(`select * from public.group_night_rows('${g}')`)) !== null, "group_night_rows stays closed");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
