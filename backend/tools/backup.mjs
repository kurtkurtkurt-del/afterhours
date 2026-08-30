/* afterhours — icerik yedegi.
   What needs backing up is what cannot be made again: the event
   texts, the venues and the comments. The daily backup Supabase takes
   is a separate thing; this is your own copy, independent of the project.

     node tools/backup.mjs                       (config.js'teki adrese)
     node tools/backup.mjs http://localhost:4350 (against another address)

   Cikti: backend/backup/afterhours-YYYY-AA-GG.json  */

import { readFile, writeFile, mkdir } from "node:fs/promises";

async function readConfig() {
  const text = await readFile(new URL("../../config.js", import.meta.url), "utf8");
  const box = {};
  new Function("window", text)(box);
  return box.AH_CONFIG || {};
}

const config = await readConfig();
const address = (process.argv[2] || config.url || "").replace(/\/$/, "");
const key = process.argv[3] || config.anonKey || "local";

if (!address) {
  console.error("No address. Fill in config.js, or pass the address as an argument.");
  process.exit(1);
}

const pull = async (path) => {
  const c = await fetch(address + "/rest/v1" + path, {
    headers: { apikey: key, Authorization: "Bearer " + key },
  });
  if (!c.ok) throw new Error(path + " → " + c.status + " " + (await c.text()).slice(0, 120));
  return c.json();
};

const backup = {
  alindi: new Date().toISOString(),
  source: address,
  cities: await pull("/cities?sort_order=sort_order"),
  event_types: await pull("/event_types?sort_order=sort_order"),
  venues: await pull("/venues?sort_order=name"),
  events: await pull("/events_public?sort_order=poster_no&limit=1000"),
  comments: await pull("/comments_public?sort_order=created_at&limit=5000"),
};

const day = new Date().toISOString().slice(0, 10);
const folder = new URL("../backup/", import.meta.url);
await mkdir(folder, { recursive: true });
const file = new URL("afterhours-" + day + ".json", folder);
await writeFile(file, JSON.stringify(backup, null, 2));

console.log("backup alindi: " + file.pathname);
for (const [name, list] of Object.entries(backup)) {
  if (Array.isArray(list)) console.log(`  ${name.padEnd(14)} ${list.length}`);
}

/* An empty backup is a warning: the published data may be gone, or the
   key is wrong. Quietly writing an empty file is the worst outcome. */
if (!backup.events.length) {
  console.error("\nWARNING: no events came back. Is the address/key right?");
  process.exit(2);
}
