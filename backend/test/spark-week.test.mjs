/* afterhours — the sparks of the week, for every city (99) */

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
  process.exit(1);
});

const db = new PGlite();
for (const d of ["../test/supabase-shim.sql", "../sql/setup-1-structure.sql", "../sql/99_spark_week.sql", "../sql/99_spark_week.sql"]) {
  await db.exec(await read(d));
}
const asAnon = () => db.exec(`set role anon; set request.jwt.claims = '';`);
const asService = () => db.exec(`reset role; set request.jwt.claims = '';`);
const rows = async (sql) => (await db.query(sql)).rows;
const w = (s) => `'${JSON.stringify({ en: s, de: s, tr: s })}'::jsonb`;

await asService();
const day = (await rows(`select public.spark_here_day('munchen')::text as d`))[0].d;
const plus = async (n) => (await rows(`select ('${day}'::date + ${n})::text as d`))[0].d;
const put = async (n, kind, title, city = "munchen") => db.exec(`insert into public.spark_days (city_slug, day, kind, title, line, place, hour, minute, why)
  values ('${city}', '${await plus(n)}'::date, '${kind}', ${w(title)}, ${w("line")}, ${w("place")}, 18, 30, 'test')`);

console.log("\n— the week —");
{
  await put(5, "derby", "saturday derby");
  await put(2, "grill", "thursday grill");
  await put(6, "grill", "later grill");
  await put(9, "hike", "too far");
  await put(-2, "swim", "past");
  await put(1, "cinema", "berlin cinema", "berlin");
  await asAnon();
  const r = await rows(`select kind, day::text, title from public.spark_week('munchen') order by kind`);
  const by = Object.fromEntries(r.map((x) => [x.kind, x]));
  check(by.derby && by.derby.title.en === "saturday derby" && by.derby.day === await plus(5), "a kind written for a later day of the week comes with that day");
  check(by.grill && by.grill.title.en === "thursday grill", "of two days, the nearest wins");
  check(!by.hike, "more than seven days ahead: not yet");
  check(!by.swim, "a past day: gone");
  check(r.length === 2, "only what the agent found; the rest stays generic", JSON.stringify(r.map((x) => x.kind)));
  check((await rows(`select * from public.spark_week('berlin')`)).length === 1, "each city reads its own");
}

console.log("\n— spark_day no longer reaches into the future —");
{
  await asAnon();
  check((await rows(`select * from public.spark_day('munchen')`)).length === 0 || (await rows(`select day from public.spark_day('munchen')`)).every((x) => x.day <= new Date(Date.parse(day) + 2 * 864e5)),
    "with only far days written, spark_day does not show next week");
  await asService();
  await put(0, "quiz", "today quiz");
  await asAnon();
  const d = await rows(`select kind from public.spark_day('munchen')`);
  check(d.length === 1 && d[0].kind === "quiz", "today's row as before (98)");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
