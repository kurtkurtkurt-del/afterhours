/* afterhours — a group invites, it does not grab (114) */

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
await db.exec(await read("../test/supabase-shim.sql"));
await db.exec(await read("../sql/setup-1-structure.sql"));
await db.exec(await read("../sql/114_group_asks.sql"));
/* a second run must not trip over the first */
await db.exec(await read("../sql/114_group_asks.sql"));

const [A, B, C, D] = ["aaaaaaaa-1111-1111-1111-111111111111", "bbbbbbbb-2222-2222-2222-222222222222",
  "cccccccc-3333-3333-3333-333333333333", "dddddddd-4444-4444-4444-444444444444"];
const as = (id) => db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"${id}"}';`);
const asService = () => db.exec(`reset role; set request.jwt.claims = '';`);
const fails = async (sql) => { try { await db.exec(sql); return null; } catch (e) { return e.message; } };
const one = async (sql) => (await db.query(sql)).rows[0];
const rows = async (sql) => (await db.query(sql)).rows;

await asService();
await db.exec(`insert into auth.users (id, email) values ('${A}','a@x'),('${B}','b@x'),('${C}','c@x'),('${D}','d@x')`);
for (const [id, h] of [[A, "a"], [B, "b"], [C, "c"], [D, "d"]]) {
  await db.exec(`insert into public.profiles (id, handle, display_name) values ('${id}', 'ask_${h}', '${h}') on conflict (id) do update set handle = excluded.handle, display_name = excluded.display_name`);
}
for (const x of [B, C]) await db.exec(`insert into public.friendships (requester_id, addressee_id, status) values ('${A}', '${x}', 'accepted') on conflict do nothing`);
await db.exec(`delete from public.push_outbox`);

console.log("\n— making a group invites —");
let g;
{
  await as(A);
  g = (await one(`select public.group_create('cuma', '🪩', 'red', 'lasting', null, null, null, array['${B}', '${C}']::uuid[]) as id`)).id;
  check(Boolean(g), "a group with two friends is made");
  await asService();
  const members = await rows(`select user_id, role from public.group_members where group_id = '${g}'`);
  check(members.length === 1 && members[0].user_id === A && members[0].role === "owner", "only the maker is in it", JSON.stringify(members));
  const asks = await rows(`select user_id, asked_by from public.group_asks where group_id = '${g}' order by user_id`);
  check(asks.length === 2 && asks.every((a) => a.asked_by === A), "the two friends are invited, not in", JSON.stringify(asks));
  const pushes = await rows(`select user_id, kind, data from public.push_outbox where kind = 'group_ask' order by user_id`);
  check(pushes.length === 2 && pushes[0].data.group === "🪩 cuma" && pushes[0].data.name, "each invited one hears it", JSON.stringify(pushes));
  const t = await one(`select * from public.push_text('group_ask', 'tr', '{"group":"🪩 cuma","name":"a"}')`);
  check(/davet/.test(t.body) && t.title === "🪩 cuma", "the words of the push, in turkish", JSON.stringify(t));
  await as(A);
  check(/friends/.test(await fails(`select public.group_create('x', '🎧', 'red', 'lasting', null, null, null, array['${D}']::uuid[])`) ?? ""), "a stranger cannot be invited");
}

console.log("\n— the shelf —");
{
  await as(B);
  const asks = await rows(`select id, members, asked_by from public.my_group_asks()`);
  check(asks.length === 1 && asks[0].id === g && asks[0].members === 1 && asks[0].asked_by === "a", "the invited one sees the group as invited, and who asked", JSON.stringify(asks));
  check((await rows(`select 1 from public.my_groups()`)).length === 0, "not among their groups yet");
  check(Boolean(await fails(`select public.group_get('${g}')`)), "and cannot open it");
  await as(A);
  check((await rows(`select 1 from public.my_groups()`)).length === 1 && (await rows(`select 1 from public.my_group_asks()`)).length === 0, "the maker sees it as theirs");
  await as(D);
  check((await rows(`select 1 from public.my_groups()`)).length === 0 && (await rows(`select 1 from public.my_group_asks()`)).length === 0, "a stranger sees nothing");
}

console.log("\n— yes and no —");
{
  await as(D);
  check(Boolean(await fails(`select public.group_accept('${g}')`)), "no invitation, no yes");
  await as(B);
  await db.exec(`select public.group_accept('${g}')`);
  await asService();
  check((await rows(`select 1 from public.group_members where group_id = '${g}' and user_id = '${B}'`)).length === 1, "yes: in the group");
  check((await rows(`select 1 from public.group_asks where group_id = '${g}' and user_id = '${B}'`)).length === 0, "and the invitation is gone");
  await as(B);
  check((await rows(`select 1 from public.my_groups()`)).length === 1 && (await rows(`select 1 from public.my_group_asks()`)).length === 0, "the shelf shows it as theirs now");
  check((await fails(`select public.group_get('${g}')`)) === null, "and it opens");
  await as(C);
  await db.exec(`select public.group_decline('${g}')`);
  await asService();
  check((await rows(`select 1 from public.group_asks where group_id = '${g}' and user_id = '${C}'`)).length === 0, "no: the invitation is gone");
  check((await rows(`select 1 from public.group_members where group_id = '${g}' and user_id = '${C}'`)).length === 0, "and they are not in");
  await as(C);
  check((await rows(`select 1 from public.my_group_asks()`)).length === 0, "nor on their shelf");
}

console.log("\n— a member invites —");
{
  await asService();
  await db.exec(`insert into public.friendships (requester_id, addressee_id, status) values ('${B}', '${C}', 'accepted') on conflict do nothing`);
  await as(B);
  const n = (await one(`select public.group_add('${g}', array['${C}']::uuid[]) as n`)).n;
  check(n === 1, "a member invites their friend");
  check((await one(`select public.group_add('${g}', array['${C}']::uuid[]) as n`)).n === 0, "twice changes nothing");
  await asService();
  check((await rows(`select 1 from public.group_asks where group_id = '${g}' and user_id = '${C}'`)).length === 1, "the invitation waits");
  check(Boolean(await fails(`set role authenticated; select * from public.group_asks`)), "the table itself is closed");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
