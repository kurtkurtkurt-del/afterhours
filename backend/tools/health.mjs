/* afterhours — the status check.
   Is the database up, is the content in place, which of the SQL files have
   actually been run, and what wants attention.
   A non-zero exit code means something is wrong; a scheduled job can hook onto it.

     node tools/health.mjs [address] [key]  */

import { readFile } from "node:fs/promises";
import { EXPECTED_SQL } from "./expected-sql.mjs";

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
console.log(`friendships         ${count(reply.friendships)}`);

/* Since 71: when the sync last brought a night, and whether pushes are leaving.
   These go RED, not amber: a quiet failure here is exactly what went unseen for a week. */
const synced = reply.newest_synced ? new Date(reply.newest_synced) : null;
const syncedDays = synced ? (Date.now() - synced.getTime()) / 86400000 : null;
console.log(`newest synced night ${synced ? synced.toISOString().slice(0, 16).replace("T", " ") + ` (${syncedDays.toFixed(1)} days ago)` : "none / before 71"}`);
if (reply.outbox_stuck !== undefined) console.log(`pushes stuck        ${count(reply.outbox_stuck)}`);

/* Since 87: pg_cron itself. Six jobs hang off it; a last good run older than two
   hours means every one of them is dead. Before 87 the call fails and is skipped. */
let clock = null;
try { clock = (await call("cron_health"))[0]; } catch { clock = null; }
const lastOk = clock?.last_ok ? new Date(clock.last_ok) : null;
const okHours = lastOk ? (Date.now() - lastOk.getTime()) / 3600000 : null;
if (clock) console.log(`cron                ${count(clock.jobs)} jobs · last good run ${lastOk ? okHours.toFixed(1) + " h ago" : "never"} · ${count(clock.failed_24h)} failed today`);

const warnings = [];
const failures = [];
if (count(reply.events) === 0) failures.push("no events at all — the data may be gone");
if (count(reply.past_still_up) > 50) failures.push(`${count(reply.past_still_up)} past events are still published — the sync or hide_past_events is not running`);
else if (count(reply.past_still_up)) warnings.push(`${count(reply.past_still_up)} past events are still published`);
if (syncedDays !== null && syncedDays > 3) failures.push(`the newest synced night is ${syncedDays.toFixed(1)} days old — sync-events.yml is not running or writes nothing`);
if (clock && count(clock.jobs) === 0) failures.push("pg_cron has no active afterhours job — the schedules in 09/26/48/51/54 did not run or the extension is off");
else if (clock && (okHours === null || okHours > 2)) failures.push(`pg_cron's last good run was ${okHours === null ? "never" : okHours.toFixed(1) + " hours ago"} — pushes, hiding, pruning are all stopped`);
if (clock && count(clock.failed_24h)) warnings.push(`${count(clock.failed_24h)} cron runs failed in the last day`);
if (count(reply.outbox_stuck)) warnings.push(`${count(reply.outbox_stuck)} pushes older than six hours are still unsent — pg_net / pg_cron?`);
if (count(reply.missing_venue)) warnings.push(`${count(reply.missing_venue)} events have no venue`);
if (count(reply.unverified_date)) warnings.push(`${count(reply.unverified_date)} dates are unconfirmed`);

/* --- which SQL files have been run -------------------------------------
   The setup is pasted in by hand, so a project can sit a file behind
   without anything looking broken: a page just answers PGRST202 because
   the function it wanted was never created. This is the one place that
   says so out loud. The list itself lives in tools/expected-sql.mjs. */


let missing = [], behind = false;
try {
  const rows = await call("migrations_applied");
  const applied = new Set(rows.map((r) => r.name));
  missing = EXPECTED_SQL.filter((f) => !applied.has(f));
  /* Since 91: a file edited after it was pasted, or an old copy pasted over a newer one. */
  try {
    const hashes = JSON.parse(await readFile(new URL("./sql-hashes.json", import.meta.url), "utf8"));
    const edited = rows.filter((r) => r.hash && hashes[r.name] && hashes[r.name] !== r.hash).map((r) => r.name);
    if (edited.length) warnings.push("applied but no longer the same text — paste again: " + edited.join(", "));
  } catch {}
  console.log(`\nSQL applied         ${applied.size} of ${EXPECTED_SQL.length}`);
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

if (failures.length) {
  console.log("\nRED:");
  failures.forEach((u) => console.log("  · " + u));
}
if (warnings.length) {
  console.log("\nwants attention:");
  warnings.forEach((u) => console.log("  · " + u));
}

/* No events at all is a real fault, and so is a file that never ran — both
   mean the site is not serving what it should. The rest is maintenance. */
process.exit(failures.length || missing.length || behind ? 1 : 0);
