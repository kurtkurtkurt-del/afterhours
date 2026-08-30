/* afterhours — the status check.
   Is the database up, is the content in place, which of the SQL files have
   actually been run, and what wants attention.
   A non-zero exit code means something is wrong; a scheduled job can hook onto it.

     node tools/health.mjs [address] [key]  */

import { readFile } from "node:fs/promises";

const text = await readFile(new URL("../../config.js", import.meta.url), "utf8");
const box = {};
new Function("window", text)(box);
const config = box.AH_CONFIG || {};

const address = (process.argv[2] || config.url || "").replace(/\/$/, "");
const key = process.argv[3] || config.anonKey || "local";
if (!address) { console.error("No address."); process.exit(1); }

const headers = {
  apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json",
};
const call = async (fn) => {
  const c = await fetch(`${address}/rest/v1/rpc/${fn}`, {
    method: "POST", headers, body: "{}",
  });
  if (!c.ok) throw new Error(c.status + " " + (await c.text()).slice(0, 120));
  return c.json();
};

const started = Date.now();
let reply;
try {
  reply = (await call("health"))[0];
} catch (e) {
  console.error("UNREACHABLE: " + e.message);
  process.exit(1);
}

const took = Date.now() - started;
const count = (a) => Number(a || 0);

console.log(`\nafterhours · ${address}`);
console.log(`response time       ${took} ms\n`);
console.log(`events              ${count(reply.events)} (${count(reply.published)} published)`);
console.log(`comments            ${count(reply.comments)} (${count(reply.hidden_comments)} hidden)`);
console.log(`people              ${count(reply.people)}`);
console.log(`swipes              ${count(reply.swipes)}`);

const warnings = [];
if (count(reply.events) === 0) warnings.push("no events at all — the data may be gone");
if (count(reply.past_still_up)) warnings.push(`${count(reply.past_still_up)} past events are still published`);
if (count(reply.missing_venue)) warnings.push(`${count(reply.missing_venue)} events have no venue`);
if (count(reply.unverified_date)) warnings.push(`${count(reply.unverified_date)} dates are unconfirmed`);

/* --- which SQL files have been run -------------------------------------
   The setup is pasted in by hand, so a project can sit a file behind
   without anything looking broken: a page just answers PGRST202 because
   the function it wanted was never created. This is the one place that
   says so out loud. 10_countries.sql is not in the list on purpose — a
   clean install gets its columns through 03 and 11 instead. */

const EXPECTED = [
  "00_migrations.sql", "01_schema.sql", "02_rls.sql", "03_seed_catalog.sql",
  "04_seed_events.sql", "05_seed_comments.sql", "06_views.sql", "07_friends.sql",
  "08_storage.sql", "09_jobs.sql", "11_world.sql", "12_profiles.sql",
  "13_feedback.sql",
];

let missing = [], behind = false;
try {
  const rows = await call("migrations_applied");
  const applied = new Set(rows.map((r) => r.name));
  missing = EXPECTED.filter((f) => !applied.has(f));
  console.log(`\nSQL applied         ${applied.size} of ${EXPECTED.length}`);
  if (missing.length) {
    console.log("\nnot run yet:");
    missing.forEach((f) => console.log("  · " + f));
    console.log("  → paste backend/sql/setup-1-structure.sql in the SQL editor");
  }
} catch (e) {
  /* The log itself is one of the files. Before it is run there is nothing
     to ask, and that is the loudest answer of all. */
  if (/PGRST202|does not exist|Searched for the function/i.test(e.message)) {
    behind = true;
    warnings.push("the migration log is missing — this project predates it; " +
                  "run backend/sql/setup-1-structure.sql to find out what else is behind");
  } else {
    warnings.push("could not read the migration log: " + e.message);
  }
}

if (warnings.length) {
  console.log("\nwants attention:");
  warnings.forEach((u) => console.log("  · " + u));
}

/* No events at all is a real fault, and so is a file that never ran — both
   mean the site is not serving what it should. The rest is maintenance. */
process.exit(count(reply.events) === 0 || missing.length || behind ? 1 : 0);
