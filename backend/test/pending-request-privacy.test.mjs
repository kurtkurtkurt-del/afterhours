/* afterhours — a pending request opens no profile row (104, audit H-1) */

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
await db.exec(await read("../sql/104_pending_request_privacy.sql"));
await db.exec(await read("../sql/104_pending_request_privacy.sql"));

const id = (c) => `${c.repeat(8)}-4444-4444-4444-444444444444`;
const [A, B, C, D, E] = ["a", "b", "c", "d", "e"].map(id);
const as = (u) => db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"${u}"}';`);
const asAnon = () => db.exec(`set role anon; set request.jwt.claims = '';`);
const asService = () => db.exec(`reset role; set request.jwt.claims = '';`);
const fails = async (sql) => { try { await db.exec(sql); return null; } catch (e) { return e.message; } };
const rowsOf = async (me, other) =>
  (await db.query(`select count(*)::int as n from public.profiles where id = '${other}'`)).rows[0].n;

await asService();
for (const [u, h] of [[A, "ada"], [B, "bob"], [C, "cem"], [D, "dan"], [E, "eli"]]) {
  await db.exec(`insert into auth.users (id, email) values ('${u}', '${h}@x')`);
  await db.exec(`update public.profiles set handle = '${h}', display_name = '${h}', last_seen_at = now() where id = '${u}'`);
}
/* eli is staff (she bans dan later); bob is an ordinary member */
await db.exec(`update public.profiles set is_admin = true where id = '${E}'`);

console.log("\n— a request sent is not a friend made —");
await as(A);
const sent = (await db.query(`select public.friend_request('bob') as s`)).rows[0].s;
check(sent === "sent", "ada asks bob", sent);
check((await rowsOf(A, B)) === 0, "ada cannot read bob's profile row while the request is pending");
check((await rowsOf(A, A)) === 1, "ada still reads her own row");
check(!(await db.query(`select public.is_linked('${B}') as l`)).rows[0].l, "is_linked says no for a pending request");
const list = await db.query(`select * from public.friends_list()`);
check(list.rows.length === 1 && list.rows[0].handle === "bob" && list.rows[0].display_name === "bob"
  && list.rows[0].status === "pending" && list.rows[0].direction === "outgoing" && list.rows[0].other_id === B,
  "her list shows the pending request with bob's handle and name", JSON.stringify(list.rows));
check(Object.keys(list.rows[0]).sort().join() === "direction,display_name,handle,other_id,status",
  "and nothing else: no last_seen_at, no is_admin, no banned_reason", Object.keys(list.rows[0]).join());

await as(B);
check((await rowsOf(B, A)) === 0, "nor does bob read ada's row because she asked him");
const incoming = await db.query(`select handle, status, direction from public.friends_list()`);
check(incoming.rows.length === 1 && incoming.rows[0].handle === "ada" && incoming.rows[0].direction === "incoming",
  "bob's list shows ada's incoming request by handle");
check((await db.query(`select public.people_relation('${A}') as r`)).rows[0].r === "incoming",
  "people_relation still says incoming");

console.log("\n— the card is what a stranger gets, as before —");
await as(A);
const card = (await db.query(`select * from public.profile_card('bob')`)).rows[0];
check(card && card.handle === "bob" && card.is_friend === false && card.last_seen_day === null && card.kept_count === null,
  "profile_card names bob, hides last seen and the count", JSON.stringify(card));
check(!("is_admin" in card) && !("banned_reason" in card), "the card carries no role and no moderation note");

console.log("\n— the suggestion list still knows about the request —");
{
  const sug = await db.query(`select handle from public.people_suggested(12)`);
  check(!sug.rows.some((r) => r.handle === "bob"), "bob, already asked, is not suggested to ada again", JSON.stringify(sug.rows));
  check(sug.rows.some((r) => r.handle === "cem"), "cem, a stranger, still is");
  check((await fails(`select public.has_any_link('${B}')`)) !== null, "has_any_link is not callable from the browser");
}

console.log("\n— accepted, the row opens —");
await as(B);
check((await db.query(`select public.friend_accept('${A}') as ok`)).rows[0].ok === true, "bob accepts");
check((await rowsOf(B, A)) === 1, "bob now reads ada's row");
await as(A);
check((await rowsOf(A, B)) === 1, "and ada reads bob's");
check((await db.query(`select public.is_linked('${B}') as l`)).rows[0].l === true, "is_linked says yes");
const after = await db.query(`select handle, status from public.friends_list()`);
check(after.rows.length === 1 && after.rows[0].status === "accepted", "the list shows one accepted friend");
const fcard = (await db.query(`select is_friend, last_seen_day from public.profile_card('bob')`)).rows[0];
check(fcard.is_friend === true && fcard.last_seen_day !== null, "a friend's card gives the day");

console.log("\n— the block and the ban behave as before —");
await as(C);
await db.exec(`select public.friend_request('ada')`);
await as(A);
check((await db.query(`select count(*)::int as n from public.friends_list() where handle = 'cem'`)).rows[0].n === 1, "cem's request is on ada's list");
await db.exec(`select public.block_user('${C}')`);
check((await db.query(`select count(*)::int as n from public.friends_list() where handle = 'cem'`)).rows[0].n === 0, "a block takes the request off the list");
check((await rowsOf(A, C)) === 0, "and opens no row");
await as(C);
check((await db.query(`select public.friend_request('ada') as s`)).rows[0].s === "notfound", "across the block the handle does not exist");

await as(D);
await db.exec(`select public.friend_request('ada')`);
await asService();
await db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"${E}"}'; select public.staff_ban('${D}', 'spam');`);
await as(A);
check((await db.query(`select count(*)::int as n from public.friends_list() where handle = 'dan'`)).rows[0].n === 0, "a ban takes the banned side's pending request away");
check((await rowsOf(A, D)) === 0, "and opens no row");

console.log("\n— nobody signed in —");
await asAnon();
check((await fails(`select * from public.friends_list()`)) !== null, "signed out cannot call friends_list");
check((await rowsOf(null, B)) === 0, "signed out reads no row");

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
