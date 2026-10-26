/* afterhours — the sparks of the day, from the agent's files into the database (98, 99).
   A file may hold only some kinds: the week agent writes what it found (99).

   The night agent (a cloud routine, .claude/prompts/spark-night.md) commits one file per
   city and day: backend/sparks/<city>/<YYYY-MM-DD>.json. This puts every file from today
   on into public.spark_days (upsert), so the app's spark_day(city) finds it.

     node backend/tools/spark-days.mjs           every file from today on
     node backend/tools/spark-days.mjs --dry     say what would be written
     node backend/tools/spark-days.mjs --all     also the past days (a rebuild)

   Needs SUPABASE_SERVICE_ROLE (the GitHub action has it; locally backend/.env.local).
   The address comes from config.js like every other tool. The shape of a file:

     { "city": "munchen", "day": "2026-10-27", "sparks": [
         { "kind": "derby", "title": {"en":…,"de":…,"tr":…}, "line": {…}, "place": {…},
           "hour": 18, "minute": 30, "why": "…" }, … ] }                                  */

import { readdir, readFile } from "node:fs/promises";

const DRY = process.argv.includes("--dry");
const ALL = process.argv.includes("--all");
// --city munchen: only that folder (the week agent checks each city as it finishes it)
const ONLY = (() => { const i = process.argv.indexOf("--city"); return i > 0 ? process.argv[i + 1] : null; })();
const ahead = new Date(Date.now() + 8 * 86400_000).toISOString().slice(0, 10);
const root = new URL("../", import.meta.url);

const text = await readFile(new URL("../../config.js", import.meta.url), "utf8");
const box = {};
new Function("window", text)(box);
const address = (box.AH_CONFIG?.url || "").replace(/\/$/, "");

let service = process.env.SUPABASE_SERVICE_ROLE || "";
if (!service) {
  try {
    const env = await readFile(new URL(".env.local", root), "utf8");
    const m = /^\s*SUPABASE_SERVICE_ROLE\s*=\s*"?([^"\n]+)"?\s*$/m.exec(env);
    if (m) service = m[1].trim();
  } catch {}
}
if (!address) { console.error("no address in config.js"); process.exit(1); }
if (!service && !DRY) { console.error("SUPABASE_SERVICE_ROLE is not set (or pass --dry)."); process.exit(1); }

const KINDS = new Set(["derby", "grill", "hike", "sunrise", "breakfast", "rooftop", "swim", "quiz", "newplace", "camera", "festival",
  "karaoke", "vinyl", "openair", "bike", "cinema", "boardgames", "flea", "skate", "cook", "sauna", "openmic", "pingpong", "bouldering", "picnic", "crawl", "stars", "football", "tram", "jazz", "walk"]);
const LANGS = ["en", "de", "tr"];
const today = new Date().toISOString().slice(0, 10);

const words = (v, what) => {
  if (!v || typeof v !== "object") throw new Error(`${what}: needs {en, de, tr}`);
  const out = {};
  for (const l of LANGS) {
    const s = String(v[l] ?? v.en ?? "").trim();
    if (!s) throw new Error(`${what}: no ${l}`);
    out[l] = s.slice(0, what === "line" ? 200 : 80);
  }
  return out;
};

const rows = [];
const cities = (await readdir(new URL("sparks/", root), { withFileTypes: true })).filter((d) => d.isDirectory() && (!ONLY || d.name === ONLY)).map((d) => d.name);
for (const city of cities) {
  const files = (await readdir(new URL(`sparks/${city}/`, root))).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  for (const f of files) {
    const day = f.slice(0, 10);
    if (!ALL && day < today) continue;
    if (day > ahead) console.warn(`${city}/${f}: more than a week ahead; the app reads seven days (99)`);
    let doc;
    try {
      doc = JSON.parse(await readFile(new URL(`sparks/${city}/${f}`, root), "utf8"));
    } catch (e) {
      console.error(`${city}/${f}: not json (${e.message})`);
      process.exitCode = 1;
      continue;
    }
    if (doc.city && doc.city !== city) console.warn(`${city}/${f}: says city ${doc.city}, folder wins`);
    if (doc.day && doc.day !== day) console.warn(`${city}/${f}: says day ${doc.day}, file name wins`);
    for (const s of doc.sparks ?? []) {
      try {
        if (!KINDS.has(s.kind)) throw new Error(`unknown kind ${s.kind}`);
        rows.push({
          city_slug: city, day, kind: s.kind,
          title: words(s.title, "title"), line: words(s.line, "line"), place: words(s.place, "place"),
          hour: Number.isInteger(s.hour) ? s.hour : null, minute: Number.isInteger(s.minute) ? s.minute : null,
          why: s.why ? String(s.why).slice(0, 300) : null, written_at: new Date().toISOString(),
        });
      } catch (e) {
        console.error(`${city}/${f} ${s.kind ?? "?"}: ${e.message}`);
        process.exitCode = 1;
      }
    }
  }
}

console.log(`${rows.length} spark(s) over ${new Set(rows.map((r) => r.city_slug + " " + r.day)).size} city-day(s)${DRY ? " (dry)" : ""}`);
for (const r of rows) console.log(`  ${r.city_slug} ${r.day} ${r.kind.padEnd(10)} ${r.title.en}`);
if (DRY || !rows.length) process.exit(process.exitCode ?? 0);

const res = await fetch(`${address}/rest/v1/spark_days?on_conflict=city_slug,day,kind`, {
  method: "POST",
  headers: { apikey: service, Authorization: "Bearer " + service, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
  body: JSON.stringify(rows),
});
if (!res.ok) {
  console.error(`write failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
  process.exit(1);
}
console.log("written.");
