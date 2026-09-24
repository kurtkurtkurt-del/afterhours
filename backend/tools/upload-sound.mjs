/* afterhours — put the background music into the sound bucket (21_sound.sql).
   Reads <dir>/<genre>/NN.m4a and uploads each as sound/<genre>/NN.m4a.
   The service key goes into the environment and nowhere else.

     SUPABASE_SERVICE_ROLE=... node tools/upload-sound.mjs ../../afterhours/sound
*/
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const dir = process.argv[2];
const SERVICE = process.env.SUPABASE_SERVICE_ROLE;
if (!dir || !SERVICE) {
  console.error("usage: SUPABASE_SERVICE_ROLE=... node tools/upload-sound.mjs <dir>");
  process.exit(1);
}
const text = await readFile(new URL("../../config.js", import.meta.url), "utf8");
const box = {}; new Function("window", text)(box);
const URL_ = box.AH_CONFIG.url;

let n = 0;
for (const genre of await readdir(dir)) {
  const files = (await readdir(join(dir, genre))).filter((f) => f.endsWith(".m4a")).sort();
  for (const f of files) {
    const body = await readFile(join(dir, genre, f));
    const res = await fetch(`${URL_}/storage/v1/object/sound/${genre}/${f}`, {
      method: "POST",
      headers: { Authorization: "Bearer " + SERVICE, apikey: SERVICE, "Content-Type": "audio/mp4", "x-upsert": "true" },
      body,
    });
    if (!res.ok) { console.error(genre + "/" + f + " → " + res.status + " " + (await res.text()).slice(0, 120)); continue; }
    n += 1; console.log("up: " + genre + "/" + f + " (" + (body.length / 1024 | 0) + " kb)");
  }
}
console.log(n + " files in the sound bucket");
