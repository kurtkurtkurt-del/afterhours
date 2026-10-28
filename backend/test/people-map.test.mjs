/* afterhours — your people as a map: friends by name, the crowd as codes (101) */

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
await db.exec(await read("../sql/101_people_map.sql"));
await db.exec(await read("../sql/101_people_map.sql"));

/* A — B — C — D — E, B — X — C, A — F pending, G blocks A and knows B, H hidden and knows B */
const id = (c) => `${c.repeat(8)}-1111-1111-1111-111111111111`;
const [A, B, C, D, E, F, G, H, X] = ["a", "b", "c", "d", "e", "f", "9", "8", "7"].map(id);
const as = (u) => db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"${u}"}';`);
const asAnon = () => db.exec(`set role anon; set request.jwt.claims = '';`);
const asService = () => db.exec(`reset role; set request.jwt.claims = '';`);
const map = async () => (await db.query(`select public.people_map() as m`)).rows[0].m;

await asService();
for (const [u, h] of [[A, "ada"], [B, "bob"], [C, "cem"], [D, "dan"], [E, "eli"], [F, "fay"], [G, "gus"], [H, "hal"], [X, "xia"]]) {
  await db.exec(`insert into auth.users (id, email) values ('${u}', '${h}@x')`);
  await db.exec(`update public.profiles set handle = '${h}', display_name = '${h}' where id = '${u}'`);
}
const friends = (a, b, st = "accepted") => db.exec(`insert into public.friendships (requester_id, addressee_id, status) values ('${a}', '${b}', '${st}')`);
await friends(A, B); await friends(B, C); await friends(C, D); await friends(D, E); await friends(B, X); await friends(X, C);
await friends(A, F, "pending"); await friends(G, B); await friends(H, B);
await db.exec(`insert into public.blocks (blocker_id, blocked_id) values ('${G}', '${A}')`);
await db.exec(`insert into public.profile_settings (user_id, discoverable) values ('${H}', false) on conflict (user_id) do update set discoverable = false`);

console.log("\n— what ada sees —");
await as(A);
const m = await map();
const by = (w) => m.nodes.filter((n) => n.w === w);
check(by(0).length === 1 && by(0)[0].id === "me", "herself, as me");
check(by(1).length === 1 && by(1)[0].h === "bob" && by(1)[0].id === B, "her one confirmed friend, by name");
check(!m.nodes.some((n) => n.h === "fay"), "a pending request is not a friend");
check(by(2).length === 2 && by(2).every((n) => /^x[0-9a-f]{12}$/.test(n.id) && !n.h && !n.n), "friends of friends as codes only (cem, xia)");
check(by(3).length === 1 && !by(3)[0].h, "one step further as a code (dan)");
check(!JSON.stringify(m).includes("eli"), "four steps away is not on the map");
check(m.nodes.length === 5, "the blocked one and the hidden one are not there", JSON.stringify(m.nodes.map((n) => n.w)));
const codes = new Set(m.nodes.map((n) => n.id));
check(m.edges.length > 0 && m.edges.every(([a, b]) => codes.has(a) && codes.has(b)), "every line joins two people on the map");
check(m.edges.some(([a, b]) => [a, b].includes("me") && [a, b].includes(B)), "a line from her to bo");
const two = by(2).map((n) => n.id);
check(m.edges.some(([a, b]) => two.includes(a) && two.includes(b)), "cem and xia know each other: a line in the crowd");
check(!JSON.stringify(m).includes(C) && !JSON.stringify(m).includes(D), "no id of the crowd leaves the database");
const again = await map();
check(JSON.stringify(again.nodes.map((n) => n.id).sort()) === JSON.stringify(m.nodes.map((n) => n.id).sort()), "the same person keeps the same code");

console.log("\n— someone else, and nobody —");
await as(C);
const mc = await map();
check(!mc.nodes.some((n) => two.includes(n.id)), "the codes differ from one viewer to the next");
await asAnon();
const fails = async (sql) => { try { await db.exec(sql); return null; } catch (e) { return e.message; } };
check((await fails(`select public.people_map()`)) !== null, "signed out cannot call it");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
