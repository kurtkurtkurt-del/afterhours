/* afterhours — listen to the artist: match the upcoming nights of a city to a 30 second
   preview on Apple and write them as a SQL file to paste (event_previews, 63).

     node tools/previews.mjs [city-slug] [address] [key]
     node tools/previews.mjs --all          every city with nights, written straight into the
                                            database with SUPABASE_SERVICE_ROLE (the sync job runs this)

   The act is the part of the title before " - ", ":" or "|". Apple is searched for songs
   by that name (country DE); the first result whose artist name is the act, letter for
   letter after lowercasing and stripping accents, wins. No match, no row: a wrong
   artist is worse than no button. Writes sql/previews-<city>.sql. */

import { readFile, writeFile } from "node:fs/promises";

const text = await readFile(new URL("../../config.js", import.meta.url), "utf8");
const box = {};
new Function("window", text)(box);
const config = box.AH_CONFIG || {};
const all = process.argv[2] === "--all";
const address = ((all ? "" : process.argv[3]) || config.url || "").replace(/\/$/, "");
const service = process.env.SUPABASE_SERVICE_ROLE || "";
const key = all ? service : (process.argv[4] || config.anonKey || "");
if (!address || !key) { console.error("No address or key."); process.exit(1); }
const today = new Date().toISOString().slice(0, 10);
const headers = { apikey: key, Authorization: "Bearer " + key };

/* --all: one pass over every city that has a night ahead, rows upserted by REST instead of
   a file to paste; a night that already has a preview is left alone (F29, 20.10.2026). */
const cities = all
  ? [...new Set((await (await fetch(`${address}/rest/v1/events_public?select=city_slug&is_published=eq.true&starts_at=gte.${today}&limit=10000`, { headers })).json()).map((r) => r.city_slug))]
  : [process.argv[2] || "munchen"];
const have = all
  ? new Set((await (await fetch(`${address}/rest/v1/event_previews?select=event_id&limit=100000`, { headers })).json()).map((r) => r.event_id))
  : new Set();
for (const city of cities) {
const res = await fetch(`${address}/rest/v1/events_public?select=id,slug,title,starts_at,type_name&city_slug=eq.${city}&is_published=eq.true&starts_at=gte.${today}&order=starts_at.asc&limit=1000`,
  { headers: { apikey: key, Authorization: "Bearer " + key } });
if (!res.ok) { console.error("events:", res.status); process.exit(1); }
const events = (await res.json()).filter((e) => !have.has(e.id));
if (all) console.log(`\n${city}: ${events.length} nights without a preview`);

const act = (t) => t.replace(/^[A-ZÄÖÜ]+ \| /, "").split(/ - | – | — |: | \| /)[0].replace(/\s+(Live in .*|Live auf Tour.*|Tour.*)$/i, "").trim();
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";

const rows = [];
const skipped = [];
for (const e of events) {
  const name = act(e.title);
  const r = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(name)}&entity=song&country=DE&limit=10`, { headers: { "User-Agent": "afterhours-app/1.0" } });
  if (!r.ok) { skipped.push([name, "apple " + r.status]); continue; }
  const j = await r.json();
  const hit = (j.results || []).find((x) => x.previewUrl && norm(x.artistName) === norm(name));
  if (!hit) { skipped.push([name, "no artist match"]); continue; }
  rows.push({ slug: e.slug, track: hit.trackName, artist: hit.artistName, url: hit.previewUrl, link: hit.trackViewUrl || null });
  process.stderr.write(".");
  await new Promise((ok) => setTimeout(ok, 1500)); // Apple limits the search to about 20 calls a minute, so 1.5 s between calls
}
console.log(`\n${rows.length} matched, ${skipped.length} skipped`);
for (const [n, why] of skipped) console.log("  - " + n + " · " + why);

if (all) {
  if (rows.length) {
    const bySlug = new Map(events.map((e) => [e.slug, e.id]));
    const body = rows.map((r) => ({ event_id: bySlug.get(r.slug), track: r.track, artist: r.artist, preview_url: r.url, link: r.link, source: "apple" }));
    const w = await fetch(`${address}/rest/v1/event_previews?on_conflict=event_id`, {
      method: "POST", headers: { ...headers, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" }, body: JSON.stringify(body),
    });
    console.log(w.ok ? `${city}: ${rows.length} previews written` : `${city}: write failed ${w.status} ${(await w.text()).slice(0, 120)}`);
  }
  continue;
}
const sql = `-- afterhours — listen to the artist for ${city} (${today}, ${rows.length} nights)
--
-- Made by tools/previews.mjs: the most played track of each act on Apple, 30 seconds.
-- Only nights whose act is the artist letter for letter; the others have no button.
-- In the Supabase panel: SQL Editor → New query → paste → Run. A row that exists is replaced.

insert into public.event_previews (event_id, track, artist, preview_url, link, source)
select e.id, v.track, v.artist, v.url, v.link, 'apple'
from (values
${rows.map((r) => `  (${q(r.slug)}, ${q(r.track)}, ${q(r.artist)}, ${q(r.url)}, ${r.link ? q(r.link) : "null"})`).join(",\n")}
) as v(slug, track, artist, url, link)
join public.events e on e.slug = v.slug
on conflict (event_id) do update
  set track = excluded.track, artist = excluded.artist, preview_url = excluded.preview_url, link = excluded.link, source = excluded.source, made_at = now();
`;
await writeFile(new URL(`../sql/previews-${city}.sql`, import.meta.url), sql);
console.log(`sql/previews-${city}.sql written`);
}
