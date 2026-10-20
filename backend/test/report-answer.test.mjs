/* afterhours — the one who reported hears back (67, B1)
   The staff settle a report in the panel (keep, remove, ban the author); the author
   was told already (53). Now the reporter gets a notice too, saying the staff
   looked, and nothing about what was decided. */

import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

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

const [A, B, C, CM] = ["aaaaaaaa-1111-1111-1111-111111111111", "bbbbbbbb-2222-2222-2222-222222222222",
  "cccccccc-3333-3333-3333-333333333333", "dddddddd-4444-4444-4444-444444444444"];
const as = (id) => db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"${id}"}';`);
const asService = () => db.exec(`reset role; set request.jwt.claims = '';`);
const one = async (sql) => (await db.query(sql)).rows[0];
const rows = async (sql) => (await db.query(sql)).rows;
const notices = async (id) => { await as(id); const r = await rows(`select kind, data from public.my_notices()`); await asService(); return r; };

await asService();
await db.exec(`insert into auth.users (id, email) values ('${A}','a@x'),('${B}','b@x'),('${C}','c@x'),('${CM}','cm@x');
  update public.profiles set handle = 'ana' where id = '${A}';
  update public.profiles set handle = 'berk' where id = '${B}';
  update public.profiles set handle = 'cem' where id = '${C}';
  update public.profiles set account_type = 'community_manager' where id = '${CM}';
  insert into public.friendships (requester_id, addressee_id, status) values ('${A}', '${B}', 'accepted');`);
const night = (await one(`select id from public.events where is_published limit 1`)).id;
const comment = (await one(`insert into public.comments (event_id, author_id, body) values ('${night}', '${B}', 'rude') returning id`)).id;
const kept = (await one(`insert into public.comments (event_id, author_id, body) values ('${night}', '${B}', 'fine') returning id`)).id;
const post = (await one(`insert into public.posts (author_id, body) values ('${B}', 'a post') returning id`)).id;

console.log("\n— a report waits —");
{
  await as(A);
  await db.exec(`select public.report('comment', '${comment}', 'insults')`);
  await db.exec(`select public.report('comment', '${kept}', null)`);
  await db.exec(`select public.post_report('${post}', 'not ok')`);
  await as(C);
  await db.exec(`select public.report('comment', '${comment}', 'yes')`);
  await asService();
  check((await notices(A)).length === 0, "nothing is told while it waits");
}

console.log("\n— the staff settle it —");
{
  await as(CM);
  await db.exec(`select public.staff_report_settle('comment', '${comment}', true)`);
  await asService();
  const a = await notices(A), c = await notices(C);
  check(a.length === 1 && a[0].kind === "report_settled" && a[0].data.about === "comment", "the reporter hears that the staff looked", JSON.stringify(a));
  check(c.length === 1 && c[0].kind === "report_settled", "every reporter of the same thing does");
  check(!("removed" in a[0].data) && !("text" in a[0].data), "what was decided, and the words, are not in it", JSON.stringify(a[0].data));
  const b = await notices(B);
  check(b.some((n) => n.kind === "comment_hidden") && !b.some((n) => n.kind === "report_settled"), "the author is told as before, and not as a reporter");

  await as(CM);
  await db.exec(`select public.staff_report_settle('comment', '${kept}', false)`);
  await asService();
  check((await notices(A)).filter((n) => n.kind === "report_settled").length === 2, "kept is settled too: the reporter hears back");

  await as(CM);
  await db.exec(`select public.staff_report_settle('comment', '${kept}', false)`);
  await asService();
  check((await notices(A)).filter((n) => n.kind === "report_settled").length === 2, "settling again tells nobody twice");
}

console.log("\n— a reported post —");
{
  await as(CM);
  await db.exec(`select public.staff_post_hide('${post}', true)`);
  await asService();
  const a = await notices(A);
  check(a.some((n) => n.kind === "report_settled" && n.data.about === "post"), "a post report is answered the same way", JSON.stringify(a));
}

console.log("\n— the notices stay closed —");
{
  await as(A);
  let refused = false;
  try { await db.query(`select public.notice_report_settled()`); } catch { refused = true; }
  check(refused, "nobody calls the trigger function by hand");
  await db.exec(`select public.notices_seen()`);
  check((await rows(`select * from public.my_notices()`)).length === 0, "seen: gone");
  await asService();
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
