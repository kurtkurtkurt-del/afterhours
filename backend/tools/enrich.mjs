/* afterhours — "who is this?" and "listen" for every upcoming night in every city.
   The plan: .claude/prompts/about-listen-flow.md (22.10.2026).

     node tools/enrich.mjs --dry                 the plan only: counts per city, nothing written
     node tools/enrich.mjs                       the run (needs SUPABASE_SERVICE_ROLE; abouts need
                                                 ANTHROPIC_API_KEY too, else --plain)
     node tools/enrich.mjs --city berlin         one city
     node tools/enrich.mjs --only listen|about   one job
     node tools/enrich.mjs --plain               abouts from Wikipedia's own words, no model
     node tools/enrich.mjs --limit 40            at most this many nights (a taste)
     node tools/enrich.mjs --fresh               forget the saved progress, start over
     node tools/enrich.mjs --per-city 12         the first 12 nights of every city (a taste)
     node tools/enrich.mjs --sql                 write a SQL file to paste (backend/sql/enrich-<date>.sql)
                                                 instead of the database: no service key needed

   Keys come from the environment, or from backend/.env.local (gitignored). The anon key
   from config.js is enough to read and to plan; writing needs the service role.

   listen: Apple's search first (exact artist, as previews.mjs), then Deezer. about: the
   act's Wikipedia page (title search → summary) behind three guards — a music act, the
   same name, not a disambiguation — then Claude Haiku writes kicker · who · two facts in
   en, de and tr from that extract only, and every fact must be found in the extract, or
   the night is skipped. --plain writes the extract's own first sentences instead (en from
   the English page, de/tr from the article's own language editions when they exist).

   Idempotent and resumable: nights that already have rows are skipped; progress is saved
   to backend/.enrich-state.json; a report lands in backend/reports/enrich-<date>.md with
   every skip and its reason, so the texts can be spot-checked. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { act, norm } from "./lib/act.mjs";

const here = new URL("./", import.meta.url);
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const DRY = flag("--dry"), FRESH = flag("--fresh"), PLAIN = flag("--plain");
const ONLY = opt("--only"), CITY = opt("--city"), LIMIT = Number(opt("--limit") || 0), PER_CITY = Number(opt("--per-city") || 0), SQL = flag("--sql");
const DO_LISTEN = !ONLY || ONLY === "listen", DO_ABOUT = !ONLY || ONLY === "about";

/* ---------------------------------------------------------------- keys */
const env = { ...process.env };
const local = new URL("../.env.local", here);
if (existsSync(local)) {
  for (const line of (await readFile(local, "utf8")).split("\n")) {
    const m = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !line.startsWith("#") && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const box = {};
new Function("window", await readFile(new URL("../../config.js", here), "utf8"))(box);
const address = (box.AH_CONFIG?.url || "").replace(/\/$/, "");
const anon = box.AH_CONFIG?.anonKey || "";
const service = env.SUPABASE_SERVICE_ROLE || "";
const claudeKey = env.ANTHROPIC_API_KEY || "";
if (!address || !anon) { console.error("config.js has no address or anon key."); process.exit(1); }
if (!DRY && !SQL && !service) { console.error("A run needs SUPABASE_SERVICE_ROLE (environment or backend/.env.local), or --sql to write a file to paste; --dry plans without either."); process.exit(1); }
if (!DRY && DO_ABOUT && !PLAIN && !claudeKey) { console.error("Abouts need ANTHROPIC_API_KEY, or --plain for Wikipedia's own words."); process.exit(1); }
const readKey = service || anon;
const H = { apikey: readKey, Authorization: "Bearer " + readKey };
const UA = { "User-Agent": "afterhours-enrich/1.0 (https://kurtkurtkurt-del.github.io/afterhours/)" };
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
const today = new Date().toISOString().slice(0, 10);

/* ------------------------------------------------------------- collect */
async function rest(path) {
  const r = await fetch(`${address}/rest/v1/${path}`, { headers: H });
  if (!r.ok) throw new Error(`${path.split("?")[0]} ${r.status} ${(await r.text()).slice(0, 120)}`);
  return r.json();
}
async function rpc(fn, body) {
  const r = await fetch(`${address}/rest/v1/rpc/${fn}`, { method: "POST", headers: { ...H, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${fn} ${r.status} ${(await r.text()).slice(0, 120)}`);
  return r.json();
}
const nights = [];
for (let from = 0; ; from += 1000) {
  const page = await rest(`events_public?select=id,slug,title,city_slug,starts_at&starts_at=gte.${today}&order=city_slug,starts_at&limit=1000&offset=${from}${CITY ? `&city_slug=eq.${CITY}` : ""}`);
  nights.push(...page);
  if (page.length < 1000) break;
}
const ids = nights.map((n) => n.id);
const have = { listen: new Set(), about: new Set() };
for (let i = 0; i < ids.length; i += 200) {
  const slice = ids.slice(i, i + 200);
  if (DO_LISTEN) (await rpc("previews_for", { p_events: slice })).forEach((r) => have.listen.add(r.event_id));
  if (DO_ABOUT) {
    const per = {};
    for (const lang of ["en", "de", "tr"]) (await rpc("about_for", { p_events: slice, p_lang: lang })).forEach((r) => { per[r.event_id] = (per[r.event_id] || 0) + 1; });
    Object.entries(per).forEach(([id, n]) => { if (n === 3) have.about.add(id); });
  }
}
const need = nights.filter((n) => (DO_LISTEN && !have.listen.has(n.id)) || (DO_ABOUT && !have.about.has(n.id)));
const byCity = {};
for (const n of nights) {
  const c = (byCity[n.city_slug] ||= { nights: 0, noListen: 0, noAbout: 0 });
  c.nights++;
  if (!have.listen.has(n.id)) c.noListen++;
  if (!have.about.has(n.id)) c.noAbout++;
}
console.log(`\n${nights.length} nights ahead in ${Object.keys(byCity).length} cities · ${nights.length - have.listen.size} without listen · ${nights.length - have.about.size} without who is this`);
console.log("city".padEnd(18) + "nights  no listen  no about");
for (const [c, v] of Object.entries(byCity).sort((a, b) => b[1].nights - a[1].nights)) console.log(c.padEnd(18) + String(v.nights).padStart(6) + String(v.noListen).padStart(11) + String(v.noAbout).padStart(10));
if (DO_ABOUT && !PLAIN) {
  const n = nights.length - have.about.size;
  const inTok = n * 1200, outTok = n * 500;
  console.log(`\nclaude-haiku-5-5 for ${n} abouts: ~${(inTok / 1e6).toFixed(2)}M tokens in, ~${(outTok / 1e6).toFixed(2)}M out ≈ $${(inTok / 1e6 * 0.1 + outTok / 1e6 * 0.5).toFixed(2)} at $0.10/$0.50 per million`);
}
if (DRY) { console.log("\n--dry: nothing written."); process.exit(0); }

/* ---------------------------------------------------------------- state */
const stateFile = new URL("../.enrich-state.json", here);
let state = { done: {} };
// --sql: the file is the result, so no progress is kept between runs (a second run writes a fresh file)
if (!FRESH && !SQL && existsSync(stateFile)) state = JSON.parse(await readFile(stateFile, "utf8"));
const saveState = () => writeFile(stateFile, JSON.stringify(state));
const report = { listen: { apple: 0, deezer: 0 }, about: 0, skips: [] };
const skip = (job, n, why) => report.skips.push({ job, slug: n.slug, title: n.title, why });

/* ------------------------------------------------------------ listen */
async function appleHit(name) {
  const r = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(name)}&entity=song&country=DE&limit=10`, { headers: UA });
  await sleep(1500);
  if (!r.ok) return null;
  const j = await r.json();
  const hit = (j.results || []).find((x) => x.previewUrl && norm(x.artistName) === norm(name));
  return hit ? { track: hit.trackName, artist: hit.artistName, preview_url: hit.previewUrl, link: hit.trackViewUrl || null, source: "apple" } : null;
}
async function deezerHit(name) {
  const r = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(`artist:"${name}"`)}&limit=10`, { headers: UA });
  await sleep(250);
  if (!r.ok) return null;
  const j = await r.json();
  const hit = (j.data || []).find((x) => x.preview && x.artist && norm(x.artist.name) === norm(name));
  return hit ? { track: hit.title, artist: hit.artist.name, preview_url: hit.preview, link: hit.link || null, source: "deezer" } : null;
}
async function listen(n) {
  const name = act(n.title);
  if (!name) return skip("listen", n, "no act in the title");
  const hit = (await appleHit(name)) || (await deezerHit(name));
  if (!hit) return skip("listen", n, "no artist match on apple or deezer");
  await write("event_previews", "event_id", [{ event_id: n.id, ...hit }]);
  report.listen[hit.source]++;
}

/* ------------------------------------------------------------- about */
// A page passes when Wikipedia's own one-line description names a music act. The extract
// is not trusted for this ("a group of former employees" is not a band — MEDUZA the duo
// once landed on Meduza the newspaper, 22.10.2026).
const MUSIC = /\b(band|singer|rapper|dj|disc jockey|musician|producer|duo|music group|musical group|orchestra|composer|trio|quartet|songwriter|vocalist|guitarist|pianist|violinist|drummer|ensemble|choir|musical collective|beatmaker|boy band|girl group|rock group|pop group|hip hop group|music project|musical project)\b/i;
const MUSIC_PAREN = /\((band|musician|singer|rapper|dj|producer|duo|group|composer|songwriter)\)$/i;
async function wiki(path, lang = "en") {
  const r = await fetch(`https://${lang}.wikipedia.org${path}`, { headers: { ...UA, Accept: "application/json" } });
  await sleep(350);
  return r.ok ? r.json() : null;
}
async function page(name) {
  const s = await wiki(`/w/rest.php/v1/search/title?q=${encodeURIComponent(name)}&limit=3`);
  const hits = s?.pages || [];
  // the exact title, or a title that says in brackets that it is the musician ("Meduza (DJs)"),
  // never a title whose brackets say something else ("Meduza (website)")
  const exact = hits.find((p) => norm(p.title) === norm(name));
  const bracketed = hits.find((p) => MUSIC_PAREN.test(p.title) && norm(p.title.replace(/\s*\(.*\)$/, "")) === norm(name));
  const pick = bracketed || exact;
  if (!pick) return { why: hits.length ? `no page of that name (nearest: ${hits[0].title})` : "no page" };
  const sum = await wiki(`/api/rest_v1/page/summary/${encodeURIComponent(pick.key)}`);
  if (!sum || sum.type === "disambiguation") return { why: "disambiguation or no summary" };
  if (!MUSIC.test(sum.description || "")) return { why: `not a music act (${sum.description || "no description"})` };
  return { title: sum.title, key: pick.key, description: sum.description || "", extract: (sum.extract || "").slice(0, 1500), url: sum.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(pick.key)}` };
}
const shares = (fact, extract) => {
  const words = new Set(norm(extract).split(" ").filter((w) => w.length >= 4));
  return norm(fact).split(" ").filter((w) => w.length >= 4 && words.has(w)).length >= 3;
};
async function haiku(p) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": claudeKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-5-5",
      max_tokens: 1200,
      output_config: { effort: "low" },
      system: "You write the short 'who is this?' card of a nightlife app from ONE Wikipedia extract. Use only what the extract says; never add facts. Lower case everywhere except proper names. Answer JSON only.",
      messages: [{ role: "user", content: `Extract (title: ${p.title}; description: ${p.description}):\n\n${p.extract}\n\nReturn {"ok":true,"en":{"kicker":"...","who":"...","facts":["...","..."]},"de":{...},"tr":{...}}. kicker: what they are · year, place (max 60 chars). who: 2–3 plain sentences. facts: two, each one sentence, each stated in the extract. The same content in en, de and tr. If the extract is not about a music act, return {"ok":false}.` }],
    }),
  });
  if (!r.ok) throw new Error(`claude ${r.status} ${(await r.text()).slice(0, 160)}`);
  const j = await r.json();
  const text = (j.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  const m = /\{[\s\S]*\}/.exec(text);
  return m ? JSON.parse(m[0]) : { ok: false };
}
async function plain(p) {
  const two = (t) => (t.match(/[^.!?]+[.!?]+/g) || [t]).slice(0, 2).join("").trim();
  const out = { en: { kicker: p.description.toLowerCase().slice(0, 60), who: two(p.extract), facts: [] } };
  const links = await wiki(`/w/api.php?action=query&prop=langlinks&titles=${encodeURIComponent(p.key)}&lllang=de|tr&format=json`);
  const ll = Object.values(links?.query?.pages || {})[0]?.langlinks || [];
  for (const lang of ["de", "tr"]) {
    const t = ll.find((l) => l.lang === lang)?.["*"];
    const s = t ? await wiki(`/api/rest_v1/page/summary/${encodeURIComponent(t)}`, lang) : null;
    out[lang] = s ? { kicker: (s.description || out.en.kicker).toLowerCase().slice(0, 60), who: two(s.extract || ""), facts: [] } : out.en;
  }
  return { ok: true, ...out };
}
async function about(n) {
  const name = act(n.title);
  if (!name) return skip("about", n, "no act in the title");
  const p = await page(name);
  if (p.why) return skip("about", n, p.why);
  const a = PLAIN ? await plain(p) : await haiku(p);
  if (!a.ok) return skip("about", n, "the model says not a music act");
  for (const lang of ["en", "de", "tr"]) {
    const x = a[lang];
    if (!x?.kicker || !x?.who) return skip("about", n, `no ${lang} text`);
    if (!PLAIN && (!Array.isArray(x.facts) || x.facts.length !== 2)) return skip("about", n, `${lang}: not two facts`);
  }
  if (!PLAIN && !a.en.facts.every((f) => shares(f, p.extract))) return skip("about", n, "fact not in source");
  await write("event_about", "event_id,lang", ["en", "de", "tr"].map((lang) => ({
    event_id: n.id, lang, name: p.title, kicker: a[lang].kicker.slice(0, 80), who: a[lang].who, facts: a[lang].facts || [], source_url: p.url,
  })));
  report.about++;
}

/* --------------------------------------------------------------- write */
const sqlRows = { event_previews: [], event_about: [] };
const q = (v) => (v == null ? "null" : "'" + String(v).replace(/'/g, "''") + "'");
async function write(table, key, rows) {
  if (SQL) { sqlRows[table].push(...rows); return; }
  const r = await fetch(`${address}/rest/v1/${table}?on_conflict=${key}`, {
    method: "POST", headers: { ...H, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" }, body: JSON.stringify(rows),
  });
  if (!r.ok) throw new Error(`${table} write ${r.status} ${(await r.text()).slice(0, 160)}`);
}

/* ----------------------------------------------------------------- run */
const perCity = {};
const todo = need
  .filter((n) => !state.done[n.id])
  .filter((n) => !PER_CITY || (perCity[n.city_slug] = (perCity[n.city_slug] || 0) + 1) <= PER_CITY)
  .slice(0, LIMIT || undefined);
console.log(`\n${todo.length} nights to do${state.done && Object.keys(state.done).length ? ` (${Object.keys(state.done).length} already done in a previous run)` : ""}\n`);
// two lanes, each in order: listen (apple/deezer) and about (wikipedia/claude) never wait for each other
const lane = async (job, fn) => {
  for (const n of todo) {
    const done = state.done[n.id] || {};
    if (done[job]) continue;
    if (job === "listen" && have.listen.has(n.id)) continue;
    if (job === "about" && have.about.has(n.id)) continue;
    try { await fn(n); } catch (e) { skip(job, n, "error: " + String(e.message).slice(0, 120)); await sleep(2000); }
    state.done[n.id] = { ...done, [job]: true };
    process.stderr.write(job === "listen" ? "." : "+");
  }
};
await Promise.all([DO_LISTEN ? lane("listen", listen) : null, DO_ABOUT ? lane("about", about) : null]);
if (!SQL) await saveState();

/* -------------------------------------------------------------- report */
await mkdir(new URL("../reports/", here), { recursive: true });
const lines = [`# enrich — ${new Date().toISOString().slice(0, 16).replace("T", " ")}`, "", `${todo.length} nights looked at · listen: ${report.listen.apple} apple + ${report.listen.deezer} deezer · who is this: ${report.about}${PLAIN ? " (plain, Wikipedia's words)" : ""}`, "", "## skipped", ""];
for (const s of report.skips) lines.push(`- ${s.job} · ${s.slug} · ${s.title.replace(/\|/g, "/")} · ${s.why}`);
const out = new URL(`../reports/enrich-${today}.md`, here);
await writeFile(out, lines.join("\n") + "\n");
if (SQL) {
  // one file to paste in the Supabase SQL editor (Run without RLS); safe to run twice
  const sq = [`-- afterhours — who is this + listen, written by tools/enrich.mjs on ${today}${PLAIN ? " (plain: Wikipedia s own words)" : ""}`, "--", `-- ${sqlRows.event_previews.length} previews, ${sqlRows.event_about.length / 3} abouts. Paste in the Supabase SQL editor, Run. Rows that exist are updated.`, ""];
  if (sqlRows.event_previews.length) {
    sq.push("insert into public.event_previews (event_id, track, artist, preview_url, link, source) values");
    sq.push(sqlRows.event_previews.map((r) => `  (${q(r.event_id)}, ${q(r.track)}, ${q(r.artist)}, ${q(r.preview_url)}, ${q(r.link)}, ${q(r.source)})`).join(",\n"));
    sq.push("on conflict (event_id) do update set track = excluded.track, artist = excluded.artist, preview_url = excluded.preview_url, link = excluded.link, source = excluded.source, made_at = now();", "");
  }
  if (sqlRows.event_about.length) {
    sq.push("insert into public.event_about (event_id, lang, name, kicker, who, facts, source_url) values");
    sq.push(sqlRows.event_about.map((r) => `  (${q(r.event_id)}, ${q(r.lang)}, ${q(r.name)}, ${q(r.kicker)}, ${q(r.who)}, array[${r.facts.map(q).join(", ")}]::text[], ${q(r.source_url)})`).join(",\n"));
    sq.push("on conflict (event_id, lang) do update set name = excluded.name, kicker = excluded.kicker, who = excluded.who, facts = excluded.facts, source_url = excluded.source_url, made_at = now();", "");
  }
  const sqlOut = new URL(`../sql/enrich-${today}.sql`, here);
  await writeFile(sqlOut, sq.join("\n"));
  console.log(`sql to paste: ${sqlOut.pathname}`);
}
console.log(`\n\nwritten: ${report.listen.apple + report.listen.deezer} previews, ${report.about} abouts · ${report.skips.length} skipped · report: ${out.pathname}`);
