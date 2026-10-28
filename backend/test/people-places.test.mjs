/* afterhours — where your people are: friends by city, the waves as counts (102) */

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
await db.exec(await read("../sql/102_people_places.sql"));
await db.exec(await read("../sql/102_people_places.sql"));

const id = (c) => `${c.repeat(8)}-2222-2222-2222-222222222222`;
const [A, B, C, D, E, G, H] = ["a", "b", "c", "d", "e", "9", "8"].map(id);
const as = (u) => db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"${u}"}';`);
const asAnon = () => db.exec(`set role anon; set request.jwt.claims = '';`);
const asService = () => db.exec(`reset role; set request.jwt.claims = '';`);
const places = async () => (await db.query(`select public.people_places() as m`)).rows[0].m;

await asService();
/* two cities with nights that have a place */
const [c1, c2] = (await db.query(`select id, slug from public.cities order by slug limit 2`)).rows;
await db.exec(`insert into public.events (slug, city_id, type_id, title, meta, lat, lng)
  select 'probe-a' || g, '${c1.id}', (select id from public.event_types limit 1), 'x', 'x', 48.1, 11.5 from generate_series(1, 3) g`);
await db.exec(`insert into public.events (slug, city_id, type_id, title, meta, lat, lng)
  select 'probe-' || g, '${c2.id}', (select id from public.event_types limit 1), 'x', 'x', 52.5, 13.4 from generate_series(1, 3) g`);
for (const [u, h, city] of [[A, "ada", c1.id], [B, "bob", c2.id], [C, "cem", c1.id], [D, "dan", c2.id], [E, "eli", null], [G, "gus", c1.id], [H, "hal", c1.id]]) {
  await db.exec(`insert into auth.users (id, email) values ('${u}', '${h}@x')`);
  await db.exec(`update public.profiles set handle = '${h}', display_name = '${h}', city_id = ${city ? `'${city}'` : "null"} where id = '${u}'`);
}
const friends = (a, b) => db.exec(`insert into public.friendships (requester_id, addressee_id, status) values ('${a}', '${b}', 'accepted')`);
/* A — B; B — C, B — G, B — H, B — E; C — D */
await friends(A, B); await friends(B, C); await friends(C, D); await friends(B, G); await friends(B, H); await friends(B, E);
await db.exec(`insert into public.blocks (blocker_id, blocked_id) values ('${G}', '${A}')`);
await db.exec(`insert into public.profile_settings (user_id, discoverable) values ('${H}', false) on conflict (user_id) do update set discoverable = false`);

console.log("\n— what ada sees —");
await as(A);
const m = await places();
check(m.friends.length === 1 && m.friends[0].h === "bob" && m.friends[0].city === c2.slug, "her friend, in his city");
check(Math.abs(m.friends[0].lat - 52.5) < 0.01 && Math.abs(m.friends[0].lng - 13.4) < 0.01, "the city sits where its nights are");
const w2 = m.crowd.filter((x) => x.w === 2), w3 = m.crowd.filter((x) => x.w === 3);
check(w2.length === 1 && w2[0].city === c1.slug && w2[0].n === 1, "the second wave as a count per city (cem; eli has no city)", JSON.stringify(w2));
check(w3.length === 1 && w3[0].city === c2.slug && w3[0].n === 1, "the third wave as a count (dan)", JSON.stringify(w3));
check(!JSON.stringify(m.crowd).match(/cem|dan|gus|hal|[0-9a-f]{8}-/), "nobody in the waves is named or given an id");
check(m.crowd.reduce((a, x) => a + x.n, 0) === 2, "the blocked one and the hidden one are not counted");

console.log("\n— nobody signed in —");
await asAnon();
const fails = async (sql) => { try { await db.exec(sql); return null; } catch (e) { return e.message; } };
check((await fails(`select public.people_places()`)) !== null, "signed out cannot call it");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
