/* afterhours — remove the files the database could not (100_storage_queue.sql).

   Supabase refuses a delete from storage.objects in SQL, so a deleted post, a replaced face
   or a closed account leaves its file in public.storage_leftovers. This removes each one
   through the Storage API with the service key and clears its row.

     node backend/tools/storage-sweep.mjs          sweep
     node backend/tools/storage-sweep.mjs --dry    say what would go

   Needs SUPABASE_SERVICE_ROLE (the daily sync workflow has it; locally backend/.env.local). */

import { readFile } from "node:fs/promises";

const DRY = process.argv.includes("--dry");
const text = await readFile(new URL("../../config.js", import.meta.url), "utf8");
const box = {};
new Function("window", text)(box);
const base = (box.AH_CONFIG?.url || "").replace(/\/$/, "");
let key = process.env.SUPABASE_SERVICE_ROLE || "";
if (!key) {
  try {
    const env = await readFile(new URL("../.env.local", import.meta.url), "utf8");
    key = (/^\s*SUPABASE_SERVICE_ROLE\s*=\s*"?([^"\n]+)"?\s*$/m.exec(env) || [])[1]?.trim() || "";
  } catch {}
}
if (!base || !key) { console.error("needs config.js and SUPABASE_SERVICE_ROLE"); process.exit(1); }
const h = { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" };

const queue = await (await fetch(`${base}/rest/v1/storage_leftovers?select=id,bucket,path,folder&order=id&limit=500`, { headers: h })).json();
if (!Array.isArray(queue)) { console.error("could not read the queue:", JSON.stringify(queue).slice(0, 200)); process.exit(1); }
console.log(`${queue.length} waiting${DRY ? " (dry)" : ""}`);

const list = async (bucket, folder) => {
  const r = await fetch(`${base}/storage/v1/object/list/${bucket}`, { method: "POST", headers: h, body: JSON.stringify({ prefix: folder, limit: 1000 }) });
  const j = await r.json();
  return Array.isArray(j) ? j.filter((x) => x.id).map((x) => `${folder}/${x.name}`) : [];
};

let gone = 0;
for (const row of queue) {
  const paths = row.folder ? await list(row.bucket, row.path) : [row.path];
  console.log(`  ${row.bucket} ${row.folder ? row.path + "/ (" + paths.length + ")" : row.path}`);
  if (DRY) continue;
  if (paths.length) {
    const r = await fetch(`${base}/storage/v1/object/${row.bucket}`, { method: "DELETE", headers: h, body: JSON.stringify({ prefixes: paths }) });
    if (!r.ok) { console.error(`    refused: ${r.status} ${(await r.text()).slice(0, 160)}`); continue; }
  }
  await fetch(`${base}/rest/v1/storage_leftovers?id=eq.${row.id}`, { method: "DELETE", headers: h });
  gone++;
}
if (!DRY) console.log(`${gone} cleared`);
