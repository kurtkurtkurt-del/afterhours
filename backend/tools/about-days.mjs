/* afterhours — "who is this?" for every upcoming night in every city, the night agent's
   way (owner, 28.10.2026). Three steps, three callers:

     node backend/tools/about-days.mjs --plan [--city x] [--limit n]
         the agent, at the start of its run (no key: the anon key in config.js reads).
         Every published night from today on, city by city, that has no "who is this?"
         in all three languages and was not tried in the last seven days. For each the
         act's Wikipedia page, behind the guards of lib/wiki.mjs. Writes
           backend/about/<date>/plan/<city>.json   the nights to write, with their extracts
           backend/about/<date>/skips.json         the nights with no usable page, and why
         The plan folder is not committed (backend/.gitignore); skips.json is.

     node backend/tools/about-days.mjs --check [--city x]
         the agent, after writing backend/about/<date>/<city>.json: the shape, the three
         languages, two facts each found in the extract, the name of the page. A night
         that fails is listed; the agent fixes it or moves it to skips.json. Exit 1 on
         any failure.

     node backend/tools/about-days.mjs --apply [--dry] [--day <date>]
         the GitHub action (about.yml), with SUPABASE_SERVICE_ROLE: runs the same check
         on the day's files, upserts event_about (en · de · tr) and event_about_skips,
         removes the skip row of a night that now has a text. Nothing else.

   A night file (what the agent writes), one per city:
     { "city": "berlin", "day": "2026-10-29", "nights": [
         { "id": "<uuid>", "slug": "…", "title": "…", "name": "Page title", "source_url": "https://en.wikipedia.org/wiki/…",
           "extract": "…the first 700 chars of the page extract…",
           "en": { "kicker": "…", "who": "…", "facts": ["…", "…"] }, "de": {…}, "tr": {…} } ] }
   skips.json: { "day": "…", "skips": [ { "id": "<uuid>", "slug": "…", "city": "…", "why": "…" } ] } */
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { act } from "./lib/act.mjs";
import { page, shares } from "./lib/wiki.mjs";

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const PLAN = flag("--plan"), CHECK = flag("--check"), APPLY = flag("--apply"), DRY = flag("--dry");
const CITY = opt("--city"), LIMIT = Number(opt("--limit") || 0);
const LANGS = ["en", "de", "tr"];
const here = new URL("./", import.meta.url);
const root = new URL("../about/", here);
const berlinDay = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
const DAY = opt("--day") || berlinDay();
const dayDir = new URL(`${DAY}/`, root);
if (!PLAN && !CHECK && !APPLY) { console.error("one of --plan, --check, --apply"); process.exit(1); }

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
if (!address || !anon) { console.error("config.js has no address or anon key."); process.exit(1); }
if (APPLY && !DRY && !service) { console.error("--apply needs SUPABASE_SERVICE_ROLE (or --dry)."); process.exit(1); }
const key = APPLY ? service || anon : anon;
const H = { apikey: key, Authorization: "Bearer " + key };

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
const readJson = async (u) => JSON.parse(await readFile(u, "utf8"));
const cityFiles = async () => {
  if (!existsSync(dayDir)) return [];
  return (await readdir(dayDir)).filter((f) => /^[a-z0-9-]+\.json$/.test(f) && f !== "skips.json" && (!CITY || f === `${CITY}.json`)).sort();
};

/* ----------------------------------------------------------------- plan */
if (PLAN) {
  const today = new Date().toISOString().slice(0, 10);
  const nights = [];
  for (let from = 0; ; from += 1000) {
    const pg = await rest(`events_public?select=id,slug,title,city_slug,starts_at&is_published=eq.true&starts_at=gte.${today}&order=city_slug,starts_at&limit=1000&offset=${from}${CITY ? `&city_slug=eq.${CITY}` : ""}`);
    nights.push(...pg);
    if (pg.length < 1000) break;
  }
  const have = new Set(), tried = new Set();
  const week = Date.now() - 7 * 86400_000;
  for (let i = 0; i < nights.length; i += 200) {
    const slice = nights.slice(i, i + 200).map((n) => n.id);
    const per = {};
    for (const lang of LANGS) (await rpc("about_for", { p_events: slice, p_lang: lang })).forEach((r) => { per[r.event_id] = (per[r.event_id] || 0) + 1; });
    Object.entries(per).forEach(([id, n]) => { if (n === 3) have.add(id); });
    // 113_about_skips.sql not live yet: no notes, every night is looked up (said once)
    try { (await rpc("about_skips_for", { p_events: slice })).forEach((r) => { if (new Date(r.tried_at).getTime() > week) tried.add(r.event_id); }); }
    catch (e) { if (!/404/.test(e.message)) throw e; if (i === 0) console.warn("about_skips_for is not in the database yet (113_about_skips.sql): nothing is remembered as tried"); }
  }
  const need = nights.filter((n) => !have.has(n.id) && !tried.has(n.id)).slice(0, LIMIT || undefined);
  console.log(`${nights.length} nights ahead · ${have.size} have a text · ${tried.size} tried this week · ${need.length} to look up`);
  await mkdir(new URL("plan/", dayDir), { recursive: true });
  const plan = {}, skips = [];
  let i = 0;
  for (const n of need) {
    const name = act(n.title);
    let p = name ? await page(name) : { why: "no act in the title" };
    if (p.why) { skips.push({ id: n.id, slug: n.slug, city: n.city_slug, why: p.why }); }
    else (plan[n.city_slug] ||= []).push({ id: n.id, slug: n.slug, title: n.title, act: name, name: p.title.replace(/\s*\(.*\)$/, ""), description: p.description, source_url: p.url, extract: p.extract });
    if (++i % 25 === 0) process.stderr.write(`${i}/${need.length}\n`);
  }
  for (const [city, list] of Object.entries(plan)) await writeFile(new URL(`plan/${city}.json`, dayDir), JSON.stringify({ city, day: DAY, nights: list }, null, 1));
  // skips.json: what was found before tonight stays (the agent and the check add to it)
  const skipFile = new URL("skips.json", dayDir);
  const old = existsSync(skipFile) ? (await readJson(skipFile)).skips || [] : [];
  const seen = new Set(skips.map((s) => s.id));
  await writeFile(skipFile, JSON.stringify({ day: DAY, skips: [...old.filter((s) => !seen.has(s.id)), ...skips] }, null, 1));
  const cities = Object.keys(plan).sort();
  console.log(`\n${Object.values(plan).reduce((a, l) => a + l.length, 0)} nights with a page in ${cities.length} cities · ${skips.length} without (skips.json)`);
  for (const c of cities) console.log(`  ${c.padEnd(18)} ${plan[c].length}`);
  console.log(`\nplan: backend/about/${DAY}/plan/<city>.json`);
}

/* ---------------------------------------------------------------- check */
const problems = [];
function checkFile(doc, file) {
  const bad = (n, why) => problems.push(`${file} · ${n.slug || n.id || "?"} · ${why}`);
  if (!doc || !Array.isArray(doc.nights)) { problems.push(`${file} · not a night file`); return []; }
  const ok = [];
  for (const n of doc.nights) {
    if (!/^[0-9a-f-]{36}$/.test(n.id || "")) { bad(n, "no id"); continue; }
    if (!n.name || !/^https:\/\/[a-z]+\.wikipedia\.org\//.test(n.source_url || "")) { bad(n, "no name or source_url is not a wikipedia page"); continue; }
    if (!n.extract || n.extract.length < 80) { bad(n, "no extract"); continue; }
    let fine = true;
    for (const lang of LANGS) {
      const x = n[lang];
      if (!x || typeof x.kicker !== "string" || !x.kicker.trim() || typeof x.who !== "string" || !x.who.trim()) { bad(n, `no ${lang} kicker/who`); fine = false; break; }
      if (x.kicker.length > 80) { bad(n, `${lang} kicker over 80 chars`); fine = false; break; }
      if (!Array.isArray(x.facts) || x.facts.length !== 2 || !x.facts.every((f) => typeof f === "string" && f.trim())) { bad(n, `${lang}: not two facts`); fine = false; break; }
      if (/[!]|[\u{1F300}-\u{1FAFF}]/u.test(x.kicker + x.who + x.facts.join(""))) { bad(n, `${lang}: exclamation mark or emoji`); fine = false; break; }
    }
    if (!fine) continue;
    if (!n.en.facts.every((f) => shares(f, n.extract))) { bad(n, "an english fact is not found in the extract"); continue; }
    ok.push(n);
  }
  return ok;
}
async function checkedDay() {
  const out = [];
  for (const f of await cityFiles()) {
    let doc;
    try { doc = await readJson(new URL(f, dayDir)); } catch (e) { problems.push(`${f} · not json (${e.message})`); continue; }
    out.push({ file: f, city: f.slice(0, -5), nights: checkFile(doc, f) });
  }
  return out;
}
if (CHECK) {
  const files = await checkedDay();
  const n = files.reduce((a, f) => a + f.nights.length, 0);
  console.log(`${files.length} file(s) for ${DAY} · ${n} night(s) pass`);
  for (const p of problems) console.log("  ✗ " + p);
  if (!files.length) console.log("  (no city file yet: backend/about/" + DAY + "/<city>.json)");
  process.exit(problems.length ? 1 : 0);
}

/* ---------------------------------------------------------------- apply */
if (APPLY) {
  const files = await checkedDay();
  if (problems.length) { for (const p of problems) console.log("  ✗ " + p); console.error("a file fails the check; nothing written"); process.exit(1); }
  const rows = [];
  for (const f of files) for (const n of f.nights) for (const lang of LANGS) rows.push({
    event_id: n.id, lang, name: String(n.name).slice(0, 120), kicker: n[lang].kicker.trim().slice(0, 80), who: n[lang].who.trim(), facts: n[lang].facts.map((x) => x.trim()), source_url: n.source_url,
  });
  const skipFile = new URL("skips.json", dayDir);
  const skips = existsSync(skipFile) ? (await readJson(skipFile)).skips || [] : [];
  const written = new Set(rows.map((r) => r.event_id));
  const skipRows = skips.filter((s) => /^[0-9a-f-]{36}$/.test(s.id || "") && !written.has(s.id)).map((s) => ({ event_id: s.id, why: String(s.why || "?").slice(0, 200), tried_at: new Date().toISOString() }));
  console.log(`${DAY}: ${rows.length / 3} night(s) with a text in ${files.length} city file(s) · ${skipRows.length} skip(s)${DRY ? " (dry)" : ""}`);
  if (DRY) process.exit(0);
  const post = async (path, body, prefer) => {
    const r = await fetch(`${address}/rest/v1/${path}`, { method: "POST", headers: { ...H, "Content-Type": "application/json", Prefer: prefer }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`${path.split("?")[0]} ${r.status} ${(await r.text()).slice(0, 200)}`);
  };
  for (let i = 0; i < rows.length; i += 300) await post("event_about?on_conflict=event_id,lang", rows.slice(i, i + 300), "resolution=merge-duplicates,return=minimal");
  // a night that now has a text is no longer a skip; a night that is still a skip counts its try
  // (113_about_skips.sql not live yet: the texts are in, the notes wait; said, not fatal)
  const probe = await fetch(`${address}/rest/v1/event_about_skips?select=event_id&limit=1`, { headers: H });
  if (probe.status === 404) { console.warn("event_about_skips is not in the database yet (113_about_skips.sql): texts written, skips not noted"); process.exit(0); }
  if (written.size) {
    const ids = [...written];
    for (let i = 0; i < ids.length; i += 200) {
      const r = await fetch(`${address}/rest/v1/event_about_skips?event_id=in.(${ids.slice(i, i + 200).join(",")})`, { method: "DELETE", headers: H });
      if (!r.ok) throw new Error(`skips delete ${r.status}`);
    }
  }
  if (skipRows.length) {
    const ids = skipRows.map((s) => s.event_id);
    const old = new Map();
    for (let i = 0; i < ids.length; i += 200) (await rest(`event_about_skips?select=event_id,tries&event_id=in.(${ids.slice(i, i + 200).join(",")})`)).forEach((r) => old.set(r.event_id, r.tries));
    for (const s of skipRows) s.tries = (old.get(s.event_id) || 0) + 1;
    for (let i = 0; i < skipRows.length; i += 300) await post("event_about_skips?on_conflict=event_id", skipRows.slice(i, i + 300), "resolution=merge-duplicates,return=minimal");
  }
  console.log("written.");
}
