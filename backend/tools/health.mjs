/* afterhours — the status check.
   Is the database up, is the content in place, what wants attention.
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

const basla = Date.now();
let reply;
try {
  const c = await fetch(address + "/rest/v1/rpc/health", {
    method: "POST",
    headers: { apikey: key, Authorization: "Bearer " + key,
               "Content-Type": "application/json" },
    body: "{}",
  });
  if (!c.ok) throw new Error(c.status + " " + (await c.text()).slice(0, 120));
  reply = (await c.json())[0];
} catch (e) {
  console.error("ULASILAMADI: " + e.message);
  process.exit(1);
}

const took = Date.now() - basla;
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

if (warnings.length) {
  console.log("\nwants attention:");
  warnings.forEach((u) => console.log("  · " + u));
}

/* Only "no events at all" is a real fault; the rest is maintenance. */
process.exit(count(reply.events) === 0 ? 1 : 0);
