/* afterhours — ask for an intro: what the circle around someone already shows (116) */

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
await db.exec(await read("../sql/116_intro_hints.sql"));
/* a second run must not trip over the first */
await db.exec(await read("../sql/116_intro_hints.sql"));

/* ada — bob — cem — dan, ada — kai — cem, gus blocks ada and knows bob, hal hidden and knows bob,
   kai keeps his nights private */
const id = (c) => `${c.repeat(8)}-3333-3333-3333-333333333333`;
const [A, B, C, D, K, G, H] = ["a", "b", "c", "d", "e", "9", "8"].map(id);
const as = (u) => db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"${u}"}';`);
const asAnon = () => db.exec(`set role anon; set request.jwt.claims = '';`);
const asService = () => db.exec(`reset role; set request.jwt.claims = '';`);
const fails = async (sql) => { try { await db.exec(sql); return null; } catch (e) { return e.message; } };
const one = async (sql) => (await db.query(sql)).rows[0];
const hints = async (code, lines = false) => (await one(`select public.intro_hints('${code}', ${lines}) as h`)).h;

await asService();
for (const [u, h] of [[A, "ada"], [B, "bob"], [C, "cem"], [D, "dan"], [K, "kai"], [G, "gus"], [H, "hal"]]) {
  await db.exec(`insert into auth.users (id, email) values ('${u}', '${h}@x')`);
  await db.exec(`update public.profiles set handle = '${h}', display_name = '${h}' where id = '${u}'`);
}
const friends = (a, b) => db.exec(`insert into public.friendships (requester_id, addressee_id, status) values ('${a}', '${b}', 'accepted')`);
await friends(A, B); await friends(A, K); await friends(B, C); await friends(K, C); await friends(C, D);
await friends(G, B); await friends(H, B);
await db.exec(`insert into public.blocks (blocker_id, blocked_id) values ('${G}', '${A}')`);
await db.exec(`insert into public.profile_settings (user_id, discoverable) values ('${H}', false) on conflict (user_id) do update set discoverable = false`);
await db.exec(`insert into public.profile_settings (user_id, kept_visibility) values ('${K}', 'private') on conflict (user_id) do update set kept_visibility = 'private'`);

const city = await one(`select id, slug, name from public.cities order by sort_order limit 1`);
await db.exec(`update public.profiles set city_id = '${city.id}' where id in ('${A}', '${C}')`);
const type = (slug) => `(select id from public.event_types where slug = '${slug}')`;
await db.exec(`insert into public.venues (city_id, slug, name) values ('${city.id}', 'room-one', 'Room One')`);
const night = (slug, title, kind) => db.exec(`insert into public.events (slug, city_id, type_id, venue_id, title, meta, source, is_published)
  values ('${slug}', '${city.id}', ${type(kind)}, (select id from public.venues where slug = 'room-one'), '${title}', 'x', 'staff', true)`);
await night("both-kept", "Both Kept", "rave");
await night("bob-only", "Bob Only", "club-night");
await night("kai-only", "Kai Only", "konzert");
await night("cem-only", "Cem Only", "festival");
const kept = (u, slug) => db.exec(`insert into public.swipes (user_id, event_id, direction) values ('${u}', (select id from public.events where slug = '${slug}'), 'right')`);
await kept(A, "both-kept"); await kept(B, "both-kept"); await kept(B, "bob-only");
await kept(K, "kai-only"); await kept(K, "both-kept"); await kept(C, "cem-only");

await as(A);
const map = (await one(`select public.people_map() as m`)).m;
const crowd = (w) => map.nodes.filter((n) => n.w === w);
const cem = crowd(2)[0].id, dan = crowd(3)[0].id;

console.log("\n— a friend of a friend —");
{
  const h = await hints(cem);
  check(h && h.steps === 2, "two steps from her");
  check(h.ties === 2, "two of her friends know him (bob and kai)", JSON.stringify(h));
  check(JSON.stringify(h.via.map((v) => v.h).sort()) === JSON.stringify(["bob", "kai"]), "via: her own friends, by name");
  check(h.city === city.name && h.same_city === true, "his city, and that it is hers");
  check(h.kinds.length === 2 && h.kinds.every((k) => ["rave", "club-night"].includes(k.k)), "kinds: only what bob keeps, kai keeps his private", JSON.stringify(h.kinds));
  check(JSON.stringify(h.rooms) === JSON.stringify(["Room One"]), "the room the circle keeps nights at");
  check(h.shared.length === 1 && h.shared[0].t === "Both Kept" && h.shared_n === 1, "the night she and bob both kept");
  const s = JSON.stringify(h);
  check(!s.includes("Cem Only") && !s.includes("festival"), "nothing cem kept leaves the database");
  check(!s.includes("Kai Only") && !s.includes("konzert"), "nothing kai keeps private leaves it either");
  check(!s.includes(C) && !s.includes("cem"), "no id, handle or name of cem");
}

console.log("\n— one step further —");
{
  const h = await hints(dan);
  check(h && h.steps === 3, "three steps from her");
  check(h.ties === 1, "one person before him knows him (cem)");
  check(JSON.stringify(h.via.map((v) => v.h).sort()) === JSON.stringify(["bob", "kai"]), "via: her friends on the way");
  check(h.city === null && h.same_city === false, "no city set: none given");
  check(!JSON.stringify(h).includes(D) && !JSON.stringify(h).includes("dan"), "no id, handle or name of dan");
}

console.log("\n— nobody she can see —");
{
  check((await hints("x000000000000")) === null, "a code that is nobody: null");
  check((await one(`select public.intro_hints('bob') as h`)).h === null, "not a code: null");
  check((await one(`select public.intro_hints(null) as h`)).h === null, "no code: null");
  await asService();
  const gus = (await one(`select public.crowd_code('${A}', '${G}') as c`)).c;
  const hal = (await one(`select public.crowd_code('${A}', '${H}') as c`)).c;
  await as(A);
  check((await hints(gus)) === null, "across a block: null");
  check((await hints(hal)) === null, "not findable: null");
  await as(B);
  check((await hints(cem)) === null, "her code means nothing to someone else");
}

console.log("\n— the separate eye of 03.11.2026 —");
{
  /* 1: both ids can be known (people_search gives out an id), so the old code could be made by hand */
  await asService();
  const made = (await one(`select 'x' || substr(md5('${A}' || '${C}'), 1, 12) as c`)).c;
  await as(A);
  check(!(await one(`select public.people_map() as m`)).m.nodes.some((n) => n.id === made), "the map no longer uses a code anyone can make");
  check((await hints(made)) === null, "a code made from two known ids answers nothing");
  await asService();
  check((await fails(`set role authenticated; set request.jwt.claims = '{"sub":"${A}"}'; select * from public.crowd_secret`)) !== null, "the secret cannot be read");
  check((await fails(`set role authenticated; set request.jwt.claims = '{"sub":"${A}"}'; select public.crowd_code('${A}', '${C}')`)) !== null, "nor a code made from the browser");

  /* 2: the map draws 80 at step 2; someone past that has no code that answers */
  await asService();
  const many = Array.from({ length: 85 }, (_, i) => `${String(i).padStart(8, "0")}-4444-4444-4444-444444444444`);
  for (const [i, u] of many.entries()) {
    await db.exec(`insert into auth.users (id, email) values ('${u}', 'm${i}@x')`);
    await friends(B, u);
  }
  await as(A);
  const drawn = new Set((await one(`select public.people_map() as m`)).m.nodes.map((n) => n.id));
  await asService();
  const codes = (await db.query(`select u, public.crowd_code('${A}', u) as c from unnest(array[${many.map((u) => `'${u}'::uuid`).join(",")}]) u`)).rows;
  const off = codes.filter((r) => !drawn.has(r.c));
  await as(A);
  check(off.length > 0 && drawn.has(cem), "past the 80, people are not drawn (cem, best tied, still is)", String(off.length));
  check((await hints(off[0].c)) === null, "and someone not drawn answers nothing");
  check((await hints(codes.find((r) => drawn.has(r.c)).c))?.steps === 2, "someone drawn still answers");
  await asService();
  for (const u of many) await db.exec(`delete from public.friendships where addressee_id = '${u}' or requester_id = '${u}'`);

  /* 3: a closed account in the crowd */
  const ADMIN = "aaaaaaaa-5555-5555-5555-555555555555";
  await db.exec(`insert into auth.users (id, email) values ('${ADMIN}', 'admin@x')`);
  await db.exec(`update public.profiles set handle = 'admin', is_admin = true, account_type = 'admin' where id = '${ADMIN}'`);
  await as(ADMIN);
  await db.exec(`select public.staff_ban('${D}', 'spam')`);
  await as(A);
  check(!(await one(`select public.people_map() as m`)).m.nodes.some((n) => n.w === 3), "a closed account is not drawn");
  check((await hints(dan)) === null, "nor answered");
}

console.log("\n— the ceilings —");
{
  await as(K);
  const map2 = (await one(`select public.people_map() as m`)).m;
  const near2 = map2.nodes.find((n) => n.w === 2).id;
  let first = null;
  for (let i = 0; i < 12 && !first; i++) first = await fails(`select public.intro_hints('${near2}', true)`);
  check(first === null, "twelve icebreaker asks in an hour go through", first);
  const r = await fails(`select public.intro_hints('${near2}', true)`);
  check(r && /slow down/.test(r), "the thirteenth is refused", r);
  check((await fails(`select public.intro_hints('${near2}')`)) === null, "plain hints still answer");
  await asAnon();
  check((await fails(`select public.intro_hints('${cem}')`)) !== null, "signed out cannot call it");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
