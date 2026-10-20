/* afterhours — the morning sync keeps what people left on a night (A0)
   sync-ticketmaster.mjs used to DELETE yesterday's Ticketmaster nights, and the
   cascade took the check-in cards, room lines, swipes, comments, rsvps and ticket
   answers with them. It now sends the requests in tools/sync-retire.mjs, which only
   take a night off the deck. This test sends those same requests to PGlite, read the
   way PostgREST reads them, and looks at one person's things afterwards. */

import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { retirePast, retireIds } from "../tools/sync-retire.mjs";

const read = (y) => readFile(new URL(y, import.meta.url), "utf8");
let passed = 0, failed = 0;
const check = (k, name, extra = "") => {
  if (k) { passed++; console.log("  ✓ " + name); }
  else { failed++; console.log("  ✗ " + name + (extra ? "  → " + extra : "")); }
};
process.on("unhandledRejection", (e) => { console.log("\nERROR: " + ((e && e.message) || e)); if (e && e.where) console.log(e.where); process.exit(1); });

const db = new PGlite();
await db.exec(await read("../test/supabase-shim.sql"));
await db.exec(await read("../sql/setup-1-structure.sql"));

const A = "aaaaaaaa-1111-1111-1111-111111111111";
const as = (id) => db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"${id}"}';`);
const asService = () => db.exec(`reset role; set request.jwt.claims = '';`);
const one = async (sql, p) => (await db.query(sql, p)).rows[0];
const rows = async (sql, p) => (await db.query(sql, p)).rows;

/* One PostgREST request onto the events table: the filters the sync uses
   (eq, is, lt, in) and a PATCH body; anything else is refused, so a DELETE
   coming back into sync-retire.mjs fails here first. */
async function send(req) {
  const [path, query] = req.path.split("?");
  if (path !== "/events") throw new Error("unexpected path " + path);
  if (req.method !== "PATCH") throw new Error("the sync sent " + req.method + " to /events");
  const where = [], args = [];
  for (const part of query.split("&")) {
    const [col, rest] = [part.slice(0, part.indexOf("=")), part.slice(part.indexOf("=") + 1)];
    const op = rest.slice(0, rest.indexOf(".")), val = rest.slice(rest.indexOf(".") + 1);
    if (!/^[a-z_]+$/.test(col)) throw new Error("bad column " + col);
    if (op === "eq") { args.push(val); where.push(`${col}::text = $${args.length}`); }
    else if (op === "lt") { args.push(val); where.push(`${col} < $${args.length}`); }
    else if (op === "is" && (val === "true" || val === "false")) where.push(`${col} is ${val}`);
    else if (op === "in") { args.push(val.replace(/^\(|\)$/g, "").split(",")); where.push(`${col}::text = any($${args.length})`); }
    else throw new Error("unexpected filter " + part);
  }
  const sets = Object.keys(req.body).map((k) => { args.push(req.body[k]); return `${k} = $${args.length}`; });
  return (await db.query(`update public.events set ${sets.join(", ")} where ${where.join(" and ")}`, args)).affectedRows;
}

await asService();
await db.exec(`insert into auth.users (id, email) values ('${A}', 'a@x');
  update public.profiles set handle = 'ana' where id = '${A}';`);
const city = await one(`select id, slug from public.cities where slug = 'munchen'`);
const type = (await one(`select id from public.event_types order by sort_order limit 1`)).id;

await db.exec(`
  insert into public.events (slug, city_id, type_id, title, meta, starts_at, image_url, source, external_id) values
    ('tm-yesterday', '${city.id}', '${type}', 'Last night', 'x', current_date - 1 + time '22:00', 'https://img/y.jpg', 'ticketmaster', 'TM1'),
    ('tm-tomorrow',  '${city.id}', '${type}', 'Tomorrow',   'x', current_date + 1 + time '22:00', 'https://img/t.jpg', 'ticketmaster', 'TM2'),
    ('tm-refused',   '${city.id}', '${type}', 'An add-on',  'x', current_date + 2 + time '10:00', 'https://img/r.jpg', 'ticketmaster', 'TM3'),
    ('own-yesterday','${city.id}', '${type}', 'Ours',       'x', current_date - 1 + time '22:00', 'https://img/o.jpg', 'seed', null);`);
const ev = Object.fromEntries((await rows(`select slug, id from public.events where slug like 'tm-%' or slug = 'own-yesterday'`)).map((r) => [r.slug, r.id]));

/* everything a person leaves on a night */
await db.exec(`
  insert into public.checkins (user_id, event_id) values ('${A}', '${ev["tm-yesterday"]}');
  insert into public.room_posts (event_id, user_id, body) values ('${ev["tm-yesterday"]}', '${A}', 'what a set');
  insert into public.swipes (user_id, event_id, direction) values ('${A}', '${ev["tm-yesterday"]}', 'right'), ('${A}', '${ev["tm-refused"]}', 'right');
  insert into public.comments (event_id, author_id, body) values ('${ev["tm-yesterday"]}', '${A}', 'see you there');
  insert into public.rsvps (user_id, event_id, answer) values ('${A}', '${ev["tm-yesterday"]}', 'in');
  insert into public.tickets (user_id, event_id, answer) values ('${A}', '${ev["tm-yesterday"]}', 'got');`);
const traces = async (id) => (await one(`select
  (select count(*) from public.checkins   where event_id = $1)::int +
  (select count(*) from public.room_posts where event_id = $1)::int +
  (select count(*) from public.swipes     where event_id = $1)::int +
  (select count(*) from public.comments   where event_id = $1)::int +
  (select count(*) from public.rsvps      where event_id = $1)::int +
  (select count(*) from public.tickets    where event_id = $1)::int as n`, [id])).n;
const before = await traces(ev["tm-yesterday"]);

console.log("\n— the requests —");
{
  const today = new Date().toISOString().slice(0, 10);
  check(retirePast(today).method === "PATCH" && retireIds(["x"]).method === "PATCH", "both requests are a PATCH, not a DELETE");
  const src = await read("../tools/sync-ticketmaster.mjs");
  check(!/DELETE/.test(src), "sync-ticketmaster.mjs sends no DELETE at all");
  check(/retirePast\(today\)/.test(src) && /retireIds\(/.test(src), "the sync sends the requests this test proves");
}

console.log("\n— the morning sync, past nights —");
{
  const n = await send(retirePast(new Date().toISOString().slice(0, 10)));
  check(n === 1, "one night is taken off the deck", `got ${n}`);
  const y = await one(`select is_published from public.events where id = $1`, [ev["tm-yesterday"]]);
  check(y && y.is_published === false, "last night is still a row, unpublished");
  check(await traces(ev["tm-yesterday"]) === before && before === 6, "the card, the room line, the swipe, the comment, the rsvp and the ticket answer stay", `${before} → ${await traces(ev["tm-yesterday"])}`);
  const t = await one(`select is_published from public.events where id = $1`, [ev["tm-tomorrow"]]);
  check(t.is_published === true, "tomorrow is still up");
  const o = await one(`select is_published from public.events where id = $1`, [ev["own-yesterday"]]);
  check(o.is_published === true, "a night that is not from Ticketmaster is not the sync's to touch");
  const again = await send(retirePast(new Date().toISOString().slice(0, 10)));
  check(again === 0, "a second run touches nothing", `got ${again}`);
}

console.log("\n— what people see afterwards —");
{
  await as(A);
  const cards = await rows(`select slug from public.my_cards()`);
  check(cards.some((c) => c.slug === "tm-yesterday"), "the check-in card is still in the collection");
  const past = await rows(`select slug, mine from public.past_feed('${city.slug}', null, null, 30)`);
  check(past.some((p) => p.slug === "tm-yesterday" && p.mine), "the past feed still shows last night, as yours");
  const deck = await rows(`select slug from public.deck('${city.slug}', null, 200)`);
  check(!deck.some((d) => d.slug === "tm-yesterday"), "the deck does not");
  check(deck.some((d) => d.slug === "tm-tomorrow"), "tomorrow is in the deck");
  await asService();
}

console.log("\n— the house-rule sweep —");
{
  const n = await send(retireIds([ev["tm-refused"]]));
  check(n === 1, "a refused night is taken off the deck", `got ${n}`);
  const s = await one(`select count(*)::int as n from public.swipes where event_id = $1`, [ev["tm-refused"]]);
  check(s.n === 1, "the swipe on it stays");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
