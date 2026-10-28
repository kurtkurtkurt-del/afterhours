/* afterhours — "who is this?" that was looked for and not found (113) */

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
for (const d of ["../test/supabase-shim.sql", "../sql/01_schema.sql", "../sql/02_rls.sql",
                 "../sql/03_seed_catalog.sql", "../sql/04_seed_events.sql", "../sql/06_views.sql",
                 "../sql/40_event_about.sql", "../sql/113_about_skips.sql"]) {
  await db.exec(await read(d));
}
/* a second run must not trip over the first */
await db.exec(await read("../sql/113_about_skips.sql"));

const asAnon = () => db.exec(`set role anon; set request.jwt.claims = '';`);
const asUser = () => db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"aaaaaaaa-1111-1111-1111-111111111111"}';`);
const asService = () => db.exec(`reset role; set request.jwt.claims = '';`);
const fails = async (sql) => { try { await db.exec(sql); return null; } catch (e) { return e.message; } };
const rows = async (sql) => (await db.query(sql)).rows;

await asService();
const [a, b] = await rows(`select id from public.events where is_published order by slug limit 2`);

console.log("\n— a night that was looked for —");
{
  await db.exec(`insert into public.event_about_skips (event_id, why) values ('${a.id}', 'no page')`);
  await asAnon();
  const got = await rows(`select event_id, tried_at from public.about_skips_for(array['${a.id}', '${b.id}']::uuid[])`);
  check(got.length === 1 && got[0].event_id === a.id && got[0].tried_at, "the planner, signed out, sees which night was tried and when");
  check(Boolean(await fails(`select why from public.event_about_skips`)), "the reason itself stays closed");
  await asUser();
  check(Boolean(await fails(`insert into public.event_about_skips (event_id, why) values ('${b.id}', 'x')`)), "nobody but the service writes");
  await asService();
  await db.exec(`insert into public.event_about_skips (event_id, why, tries) values ('${a.id}', 'still no page', 2)
    on conflict (event_id) do update set why = excluded.why, tried_at = now(), tries = public.event_about_skips.tries + 1`);
  const again = await rows(`select tries, why from public.event_about_skips where event_id = '${a.id}'`);
  check(again[0].tries === 2 && again[0].why === "still no page", "a second try counts up and keeps the newest reason");
  await db.exec(`delete from public.events where id = '${a.id}'`);
  check((await rows(`select 1 from public.event_about_skips where event_id = '${a.id}'`)).length === 0, "a night that is gone takes its note with it");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
