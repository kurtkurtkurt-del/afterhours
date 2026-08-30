/* afterhours — is the setup repeatable.
   The two files in sql/setup-*.sql are what a person pastes into the
   Supabase editor. Pasting one twice is an ordinary mistake — a lost
   connection, a page reload, a second look at the same tab. If that
   doubles the content, the mistake is expensive and silent.

   So this runs the whole setup twice on a clean database and insists that
   nothing changed the second time.  */

import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

let passed = 0, failed = 0;
const check = (condition, name, extra = "") => {
  if (condition) { passed++; console.log("  ✓ " + name); }
  else { failed++; console.log("  ✗ " + name + (extra ? "  → " + extra : "")); }
};
process.on("unhandledRejection", (e) => {
  console.error("\nERROR: " + (e && e.message ? e.message : e));
  process.exit(1);
});

const db = new PGlite();

const FILES = [
  "../test/supabase-shim.sql",
  "../sql/setup-1-structure.sql",
  "../sql/setup-2-comments.sql",
];

async function runSetup(pass) {
  for (const f of FILES) {
    try { await db.exec(await read(f)); }
    catch (e) {
      check(false, `pass ${pass}: ${f.split("/").pop()} runs`, String(e.message).slice(0, 120));
      return false;
    }
  }
  check(true, `pass ${pass}: both setup files run through`);
  return true;
}

const tally = async () => {
  const one = async (t) =>
    (await db.query(`select count(*)::int as n from public.${t}`)).rows[0].n;
  return {
    cities: await one("cities"), events: await one("events"),
    venues: await one("venues"), types: await one("event_types"),
    comments: await one("comments"), profiles: await one("profiles"),
  };
};

console.log("\n— first run —");
await runSetup(1);
const first = await tally();
check(first.events === 142, "142 events", String(first.events));
check(first.comments === 311, "311 comments", String(first.comments));

console.log("\n— the same files again —");
await runSetup(2);
const second = await tally();

for (const key of Object.keys(first)) {
  check(first[key] === second[key],
    `${key} unchanged (${first[key]})`, `${first[key]} → ${second[key]}`);
}

/* A real comment must survive the repeat. The sample rows are cleared by
   their time_text; a comment written through the site has none, and one
   whose author deleted their account keeps none either. */
console.log("\n— a real comment is not swept away —");
{
  await db.exec(`
    insert into auth.users (id, email)
    values ('99999999-9999-9999-9999-999999999999', 'someone@example.com')
    on conflict do nothing;`);
  await db.exec(`
    insert into public.comments (event_id, author_id, body)
    select id, '99999999-9999-9999-9999-999999999999', 'i was actually there'
    from public.events where slug = 'blitz';`);

  await db.exec(await read("../sql/setup-2-comments.sql"));

  const kept = await db.query(
    `select count(*)::int as n from public.comments where body = 'i was actually there'`);
  check(kept.rows[0].n === 1, "a comment written through the site is still there");

  const samples = await db.query(
    `select count(*)::int as n from public.comments where time_text is not null`);
  check(samples.rows[0].n === 311, "the sample set was replaced, not added to",
    String(samples.rows[0].n));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
