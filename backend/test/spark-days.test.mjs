/* afterhours — the sparks of the day, written by the night agent (98) */

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
for (const d of ["../test/supabase-shim.sql", "../sql/setup-1-structure.sql"]) {
  await db.exec(await read(d));
}
await db.exec(await read("../sql/98_spark_days.sql"));
/* a second run must not trip over the first */
await db.exec(await read("../sql/98_spark_days.sql"));

const asAnon = () => db.exec(`set role anon; set request.jwt.claims = '';`);
const asService = () => db.exec(`reset role; set request.jwt.claims = '';`);
const fails = async (sql) => { try { await db.exec(sql); return null; } catch (e) { return e.message; } };
const rows = async (sql) => (await db.query(sql)).rows;
const words = (s) => `'${JSON.stringify({ en: s, de: s + " de", tr: s + " tr" })}'::jsonb`;

await asService();
// the day in Munich, as the function sees it
const today = (await rows(`select (case when extract(hour from (now() at time zone 'Europe/Berlin')) < 5 then (now() at time zone 'Europe/Berlin')::date - 1 else (now() at time zone 'Europe/Berlin')::date end)::text as d`))[0].d;
const put = (day, kind, title) => db.exec(`insert into public.spark_days (city_slug, day, kind, title, line, place, hour, minute, why)
  values ('munchen', '${day}'::date, '${kind}', ${words(title)}, ${words("line")}, ${words("place")}, 20, 0, 'test')
  on conflict (city_slug, day, kind) do update set title = excluded.title`);

console.log("\n— the day —");
{
  await asAnon();
  check((await rows(`select * from public.spark_day('munchen')`)).length === 0, "nothing written: nothing to say (the generic sparks show)");
  await asService();
  await put(today, "derby", "today derby");
  await asAnon();
  let d = await rows(`select * from public.spark_day('munchen')`);
  check(d.length === 1 && d[0].title.en === "today derby" && d[0].hour === 20, "today's row comes back for anyone, with its words and hour");
  await asService();
  const tomorrow = (await rows(`select ('${today}'::date + 1)::text as d`))[0].d;
  await put(tomorrow, "derby", "tomorrow derby");
  await put(tomorrow, "grill", "tomorrow grill");
  await asAnon();
  d = await rows(`select * from public.spark_day('munchen')`);
  check(d.length === 2 && d.every((r) => r.title.en.startsWith("tomorrow")), "once tomorrow is written, tomorrow wins (the night agent runs at 01:00 for the coming day)");
  await asService();
  await put("2020-01-01", "derby", "old derby");
  await asAnon();
  check((await rows(`select * from public.spark_day('munchen')`)).length === 2, "an old day never shows while a current one exists");
  check((await rows(`select * from public.spark_day('berlin')`)).length === 0, "another city: nothing");
  const r = await fails(`insert into public.spark_days (city_slug, day, kind, title, line, place) values ('munchen', '2030-01-01', 'x', '{}', '{}', '{}')`);
  check(r !== null, "anon cannot write");
  check((await fails(`select * from public.spark_days`)) !== null || (await rows(`select * from public.spark_days`)).length === 0, "nor read the table itself");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
