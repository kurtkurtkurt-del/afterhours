/* afterhours — the Ticketmaster sync.

   Pulls real events for every city the database knows and upserts them
   into public.events with source = 'ticketmaster'. Runs daily from
   .github/workflows/sync-events.yml, or by hand:

     TICKETMASTER_KEY=...  SUPABASE_SERVICE_ROLE=...  \
       node backend/tools/sync-ticketmaster.mjs

   --dry fetches and reports but writes nothing (only the TM key needed).

   Three things worth knowing:
   - The upsert conflicts on external_id, so a night keeps its uuid from
     run to run and the swipes people put on it survive.
   - Ticketmaster covers some of our cities and not others (nothing in
     Lagos or Suva). An uncovered city simply comes back empty; the
     filter already shows empty cities faded, so nothing needs hiding.
   - The meta line is composed here once ("Venue · 11.09.26 · 18:30") and
     is the line on screen, word for word — same contract as the seeds.
     starts_at is written from the LOCAL date and time without a zone
     (we do not know the venue offset), so it is roughly right; meta is
     always right. */

import { createHash } from "node:crypto";

const TM_KEY = process.env.TICKETMASTER_KEY || "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE || "";
const DB_URL = (process.env.SUPABASE_URL || "https://elmnnyxgavwjxvwjgjcu.supabase.co").replace(/\/$/, "");
const DRY = process.argv.includes("--dry");

const TM_BASE = "https://app.ticketmaster.com/discovery/v2/events.json";
const PAGE_SIZE = 100;
const MAX_PAGES = 2;
const MAX_PER_CITY = 80;
const PAUSE_MS = 260;               /* the key allows 5 requests a second */

if (!TM_KEY) fail("TICKETMASTER_KEY is not set.");
if (!SERVICE && !DRY) fail("SUPABASE_SERVICE_ROLE is not set (or pass --dry).");

function fail(line) { console.error("sync-ticketmaster: " + line); process.exit(1); }

/* ------------------------------------------------- where to ask for what

   Our city slugs against the names Ticketmaster files things under —
   the same coverage as backend/sql/16_coverage.sql: all of Europe, the
   key Asian countries, North America. The two lists move together.
   Several cities carry two spellings; a spelling that finds a real
   crowd settles it, a near-empty answer lets the next one try. */

const PLACES = {
  /* Europe */
  munchen: { cc: "DE", names: ["Munich", "München"] },
  berlin: { cc: "DE", names: ["Berlin"] },
  koln: { cc: "DE", names: ["Cologne", "Köln"] },
  hamburg: { cc: "DE", names: ["Hamburg"] },
  frankfurt: { cc: "DE", names: ["Frankfurt", "Frankfurt am Main"] },
  stuttgart: { cc: "DE", names: ["Stuttgart"] },
  dusseldorf: { cc: "DE", names: ["Düsseldorf", "Dusseldorf"] },
  leipzig: { cc: "DE", names: ["Leipzig"] },
  istanbul: { cc: "TR", names: ["Istanbul", "İstanbul"] },
  ankara: { cc: "TR", names: ["Ankara"] },
  izmir: { cc: "TR", names: ["Izmir", "İzmir"] },
  wien: { cc: "AT", names: ["Vienna", "Wien"] },
  graz: { cc: "AT", names: ["Graz"] },
  salzburg: { cc: "AT", names: ["Salzburg"] },
  zurich: { cc: "CH", names: ["Zurich", "Zürich"] },
  geneva: { cc: "CH", names: ["Geneva", "Genève"] },
  basel: { cc: "CH", names: ["Basel"] },
  london: { cc: "GB", names: ["London"] },
  manchester: { cc: "GB", names: ["Manchester"] },
  birmingham: { cc: "GB", names: ["Birmingham"] },
  glasgow: { cc: "GB", names: ["Glasgow"] },
  dublin: { cc: "IE", names: ["Dublin"] },
  cork: { cc: "IE", names: ["Cork"] },
  paris: { cc: "FR", names: ["Paris"] },
  lyon: { cc: "FR", names: ["Lyon"] },
  marseille: { cc: "FR", names: ["Marseille"] },
  amsterdam: { cc: "NL", names: ["Amsterdam"] },
  rotterdam: { cc: "NL", names: ["Rotterdam"] },
  utrecht: { cc: "NL", names: ["Utrecht"] },
  brussel: { cc: "BE", names: ["Brussels", "Bruxelles", "Brussel"] },
  antwerpen: { cc: "BE", names: ["Antwerp", "Antwerpen"] },
  gent: { cc: "BE", names: ["Ghent", "Gent"] },
  madrid: { cc: "ES", names: ["Madrid"] },
  barcelona: { cc: "ES", names: ["Barcelona"] },
  valencia: { cc: "ES", names: ["Valencia"] },
  sevilla: { cc: "ES", names: ["Seville", "Sevilla"] },
  milano: { cc: "IT", names: ["Milan", "Milano"] },
  roma: { cc: "IT", names: ["Rome", "Roma"] },
  torino: { cc: "IT", names: ["Turin", "Torino"] },
  bologna: { cc: "IT", names: ["Bologna"] },
  lisboa: { cc: "PT", names: ["Lisbon", "Lisboa"] },
  porto: { cc: "PT", names: ["Porto"] },
  warszawa: { cc: "PL", names: ["Warsaw", "Warszawa"] },
  krakow: { cc: "PL", names: ["Kraków", "Krakow"] },
  wroclaw: { cc: "PL", names: ["Wrocław", "Wroclaw"] },
  praha: { cc: "CZ", names: ["Prague", "Praha"] },
  brno: { cc: "CZ", names: ["Brno"] },
  kobenhavn: { cc: "DK", names: ["Copenhagen", "København"] },
  aarhus: { cc: "DK", names: ["Aarhus"] },
  stockholm: { cc: "SE", names: ["Stockholm"] },
  goteborg: { cc: "SE", names: ["Gothenburg", "Göteborg"] },
  malmo: { cc: "SE", names: ["Malmö", "Malmo"] },
  oslo: { cc: "NO", names: ["Oslo"] },
  bergen: { cc: "NO", names: ["Bergen"] },
  helsinki: { cc: "FI", names: ["Helsinki"] },
  tampere: { cc: "FI", names: ["Tampere"] },
  athina: { cc: "GR", names: ["Athens", "Athina"] },
  thessaloniki: { cc: "GR", names: ["Thessaloniki"] },
  budapest: { cc: "HU", names: ["Budapest"] },
  /* Asia */
  tokyo: { cc: "JP", names: ["Tokyo"] },
  osaka: { cc: "JP", names: ["Osaka"] },
  seoul: { cc: "KR", names: ["Seoul"] },
  busan: { cc: "KR", names: ["Busan"] },
  singapore: { cc: "SG", names: ["Singapore"] },
  dubai: { cc: "AE", names: ["Dubai"] },
  "abu-dhabi": { cc: "AE", names: ["Abu Dhabi"] },
  "hong-kong": { cc: "HK", names: ["Hong Kong"] },
  taipei: { cc: "TW", names: ["Taipei"] },
  /* North America */
  "new-york": { cc: "US", names: ["New York"] },
  "los-angeles": { cc: "US", names: ["Los Angeles"] },
  chicago: { cc: "US", names: ["Chicago"] },
  detroit: { cc: "US", names: ["Detroit"] },
  miami: { cc: "US", names: ["Miami"] },
  "san-francisco": { cc: "US", names: ["San Francisco"] },
  "las-vegas": { cc: "US", names: ["Las Vegas"] },
  seattle: { cc: "US", names: ["Seattle"] },
  austin: { cc: "US", names: ["Austin"] },
  boston: { cc: "US", names: ["Boston"] },
  atlanta: { cc: "US", names: ["Atlanta"] },
  philadelphia: { cc: "US", names: ["Philadelphia"] },
  washington: { cc: "US", names: ["Washington"] },
  denver: { cc: "US", names: ["Denver"] },
  nashville: { cc: "US", names: ["Nashville"] },
  "new-orleans": { cc: "US", names: ["New Orleans"] },
  houston: { cc: "US", names: ["Houston"] },
  dallas: { cc: "US", names: ["Dallas"] },
  toronto: { cc: "CA", names: ["Toronto"] },
  montreal: { cc: "CA", names: ["Montreal", "Montréal"] },
  vancouver: { cc: "CA", names: ["Vancouver"] },
  calgary: { cc: "CA", names: ["Calgary"] },
  ottawa: { cc: "CA", names: ["Ottawa"] },
  "ciudad-de-mexico": { cc: "MX", names: ["Mexico City", "Ciudad de México"] },
  guadalajara: { cc: "MX", names: ["Guadalajara"] },
  monterrey: { cc: "MX", names: ["Monterrey"] },
};

/* --------------------------------------------------- what gets refused

   Two house rules, applied on the way in AND swept over what is already
   there (below, after the upsert), so the database converges on them.

   1. Nothing before 18:00 — a 10:00 museum ticket is not a night out.
      Festivals and raves are exempt: real ones start in the afternoon.
   2. No add-on listings. Ticketmaster files upsells as events of their
      own — "VIP Ticket", "Box-Seat", "Parking permit", even "M&G
      Add-On (No Ticket Included)". They are not nights, they are
      receipts. */

const EARLIEST = "18:00";
const LATE_KINDS = new Set(["festival", "rave"]);
const ADDON = new RegExp(
  "parking|park.?and.?ride|box.?seat|\\bvip\\b|premium (package|suite|ticket|aitiolippu|upgrade)|" +
  "platinum|golden circle|meet\\s*[&+]\\s*greet|\\bm&g\\b|add.?on|no ticket included|" +
  "aitiolippu|legazy seat|logen.?seat|ticketmaster suite|upgrade", "i");

function refused(kind, title, time) {
  if (ADDON.test(title)) return "addon";
  if (time && time < EARLIEST && !LATE_KINDS.has(kind)) return "early";
  return null;
}

/* --------------------------------------------------- kind, image, slug */

/* Ticketmaster classifies with segment/genre/subGenre; we file under the
   six kinds of the spec. Sports and family shows are not nights out. */
function kindFor(cls, title, venueName) {
  const seg = (cls && cls.segment && cls.segment.name) || "";
  const blob = [
    seg,
    cls && cls.genre && cls.genre.name,
    cls && cls.subGenre && cls.subGenre.name,
    cls && cls.type && cls.type.name,
    cls && cls.subType && cls.subType.name,
    title, venueName,
  ].filter(Boolean).join(" ").toLowerCase();

  if (/^sports$/i.test(seg) || /^family$/i.test(seg)) return null;

  if (/techno|house music|\bedm\b|trance|drum.?and.?bass|\bdnb\b|hardstyle|psytrance|\brave\b|dj.?set/.test(blob))
    return "rave";
  if (/dance\/electronic|electronic|club|nightlife|afterparty|hip.?hop|\brap\b|urban|afrobeats|reggaeton|garage/.test(blob))
    return "club-night";
  if (/festival|open.?air|multi.?day/.test(blob))
    return "festival";
  if (/^miscellaneous$/i.test(seg))
    return /music|concert|band/.test(blob) ? "konzert" : "meetup";
  if (/^arts\s*&\s*theatre$/i.test(seg))
    return /comedy|variety|circus|spoken|lecture|talk/.test(blob) ? "meetup" : "konzert";
  if (/film/i.test(seg)) return "meetup";
  return "konzert";
}

/* The widest sensible photograph: 16:9 first, no recommendation crops,
   no portraits, ideally 640-2048 wide and as close to 1280 as it gets. */
const BAD_URL = /RECOMENDATION|RECOMMENDATION|PORTRAIT|_SOURCE/i;

function imageFor(images) {
  const usable = (images || []).filter((i) =>
    i.url && !i.fallback && !BAD_URL.test(i.url) && !/portrait/i.test(i.url));
  const score = (i) => {
    const w = i.width || 0;
    let s = i.ratio === "16_9" ? 10000 : (i.width || 0) >= (i.height || 0) * 1.15 ? 4000 : -1;
    if (s < 0 || (w && w < 500)) return -1;
    if (w >= 640 && w <= 2048) s += 3000;
    return s - Math.abs(w - 1280) / 4;
  };
  const best = usable.map((i) => [score(i), i]).filter(([s]) => s >= 0)
    .sort((a, b) => b[0] - a[0])[0];
  /* No last resort. It used to fall back to whatever was left, and what
     was left was a 305px thumbnail that the deck then blew up to twice
     its size on a retina screen. Under 500px wide, a picture is worse
     than no picture: the card is set in type instead. */
  return best ? best[1].url : null;
}

/* The site rule: lowercase, transliterate, $ reads as s, the rest
   becomes hyphens. The tail is a hash of the Ticketmaster id, NOT the id
   lowercased: those ids are case-sensitive, and folding the case made
   two different nights land on one slug (a 409 killed the first run). */
function slugify(text, id) {
  const base = String(text)
    .replace(/\$/g, "s").replace(/ß/g, "ss").replace(/&/g, " and ")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 48).replace(/-+$/, "");
  const tail = createHash("md5").update(String(id)).digest("hex").slice(0, 8);
  return (base || "night") + "-" + tail;
}

/* A body a person would read: the promoter text if there is one, tidied
   and cut at a sentence; a plain line when there is none. */
function bodyFor(e, cityName) {
  const raw = String(e.info || e.pleaseNote || "").replace(/\s+/g, " ").trim();
  if (raw.length > 40) {
    if (raw.length <= 300) return raw;
    const cut = raw.slice(0, 300);
    const dot = cut.lastIndexOf(". ");
    return dot > 80 ? cut.slice(0, dot + 1) : cut + "…";
  }
  return "A real night, straight off the listings for " + cityName +
    ". What it turns into is decided at the door, same as always.";
}

/* ---------------------------------------------------------- plumbing */

const wait = (ms) => new Promise((done) => setTimeout(done, ms));

async function tm(params) {
  const search = new URLSearchParams({
    apikey: TM_KEY, size: String(PAGE_SIZE), sort: "date,asc",
    startDateTime: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    includeTBA: "no", includeTBD: "no", ...params,
  });
  const res = await fetch(TM_BASE + "?" + search);
  await wait(PAUSE_MS);
  if (res.status === 401) fail("Ticketmaster refused the key (401).");
  if (!res.ok) {
    console.warn("  ticketmaster answered " + res.status + " — skipping this query");
    return [];
  }
  const body = await res.json();
  return (body._embedded && body._embedded.events) || [];
}

async function db(path, options = {}) {
  const res = await fetch(DB_URL + "/rest/v1" + path, {
    ...options,
    headers: {
      apikey: SERVICE, Authorization: "Bearer " + SERVICE,
      "Content-Type": "application/json", ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(path + " → " + res.status + " " + (await res.text()).slice(0, 200));
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/* ------------------------------------------------------- one TM event */

function rowFor(e, city, types) {
  const venue = (e._embedded && e._embedded.venues && e._embedded.venues[0]) || {};
  const cls = (e.classifications && e.classifications[0]) || {};
  const venueName = (venue.name || "").trim();
  const kind = kindFor(cls, e.name || "", venueName);
  if (!kind || !types[kind]) return null;

  const date = e.dates && e.dates.start && e.dates.start.localDate;
  if (!date) return null;
  const time = ((e.dates.start.localTime || "") + "").slice(0, 5);
  if (refused(kind, e.name || "", time)) return null;

  const [y, mo, d] = date.split("-");
  const shortDate = d + "." + mo + "." + y.slice(2);
  const meta = [venueName || city.name, shortDate, time].filter(Boolean).join(" · ");

  return {
    slug: slugify(e.name || "night", e.id),
    city_id: city.id,
    type_id: types[kind],
    title: (e.name || "").trim().slice(0, 120),
    meta,
    body: bodyFor(e, city.name),
    starts_at: date + "T" + (e.dates.start.localTime || "20:00:00"),
    starts_at_estimated: false,
    date_text: [shortDate, time].filter(Boolean).join(" · "),
    is_published: true,
    source: "ticketmaster",
    external_id: e.id,
    image_url: imageFor(e.images),
    ticket_url: e.url || null,
  };
}

/* --------------------------------------------------------------- run */

const cities = DRY && !SERVICE
  ? Object.keys(PLACES).map((slug) => ({ id: slug, slug, name: slug }))
  : await db("/cities?select=id,slug,name");
const typeRows = DRY && !SERVICE
  ? ["rave", "club-night", "konzert", "festival", "meetup"].map((slug) => ({ id: slug, slug }))
  : await db("/event_types?select=id,slug");
const types = Object.fromEntries(typeRows.map((t) => [t.slug, t.id]));

const rows = [];
const seen = new Set();
const report = [];

for (const city of cities) {
  const place = PLACES[city.slug];
  if (!place) { report.push(city.slug + ": not on the Ticketmaster map"); continue; }

  const cityRows = [];
  for (const name of place.names) {
    for (let page = 0; page < MAX_PAGES && cityRows.length < MAX_PER_CITY; page++) {
      const events = await tm({ city: name, countryCode: place.cc, page: String(page) });
      for (const e of events) {
        if (!e.id || seen.has(e.id) || cityRows.length >= MAX_PER_CITY) continue;
        const row = rowFor(e, city, types);
        if (!row) continue;
        seen.add(e.id);
        cityRows.push(row);
      }
      if (events.length < PAGE_SIZE) break;
    }
    /* A spelling that found a real crowd settles it; one or two hits may
       just be a mislabeled venue, so the other spelling still gets asked
       (Mexico City vs Ciudad de México was exactly this). */
    if (cityRows.length >= 15) break;
  }
  /* A show that repeats — one title, many dates — is ONE package: the
     soonest night stands for the whole run, and its meta line carries
     the span ("Venue · 20.11.26 → 23.12.26 · 20:00"). The queries come
     back date-ascending, so the first of a title is the soonest. */
  const runs = new Map();
  for (const row of cityRows) {
    const key = row.title.toLowerCase();
    const kept = runs.get(key);
    if (!kept) runs.set(key, row);
    else kept._runEnd = row.starts_at.slice(0, 10);
  }
  const packaged = [...runs.values()].map((row) => {
    if (row._runEnd) {
      const [ry, rm, rd] = row._runEnd.split("-");
      const endShort = rd + "." + rm + "." + ry.slice(2);
      const startShort = row.date_text.split(" · ")[0];
      const span = startShort + " → " + endShort;
      row.meta = row.meta.replace(startShort, span);
      row.date_text = row.date_text.replace(startShort, span);
    }
    delete row._runEnd;
    return row;
  });

  rows.push(...packaged);
  report.push(city.slug + ": " + packaged.length +
    (packaged.length < cityRows.length ? " (" + cityRows.length + " dates)" : ""));
}

console.log("ticketmaster → " + rows.length + " events\n  " + report.join("\n  "));

if (DRY) {
  console.log("(dry run — nothing written)");
  process.exit(0);
}

/* Upsert in slices; on_conflict keeps the uuid of a night that is
   already there, so swipes on it stay attached. One bad slice must not
   cost the whole day, so a failure is reported and the rest continues. */
const bySlug = new Map();
for (const row of rows) if (!bySlug.has(row.slug)) bySlug.set(row.slug, row);
const unique = [...bySlug.values()];

let written = 0, turnedAway = 0;
for (let i = 0; i < unique.length; i += 100) {
  const slice = unique.slice(i, i + 100);
  try {
    await db("/events?on_conflict=external_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(slice),
    });
    written += slice.length;
  } catch (e) {
    turnedAway += slice.length;
    console.warn("  a slice of " + slice.length + " was refused: " + e.message);
  }
}

/* Nights that have passed leave the deck for good. Only our own rows:
   the seeds and the admin-written events are not this script's to touch. */
const today = new Date().toISOString().slice(0, 10);
await db("/events?source=eq.ticketmaster&starts_at=lt." + today, { method: "DELETE" });

/* The house rules, swept over what is ALREADY there — add-ons, early
   starts and repeated dates that arrived before the rules did. The
   database converges on the style instead of only new rows obeying it. */
const held = [];
for (let from = 0; ; from += 1000) {
  const page = await db("/events_public?select=id,title,type_slug,city_slug,starts_at" +
    "&source=eq.ticketmaster&order=starts_at&limit=1000&offset=" + from);
  held.push(...page);
  if (page.length < 1000) break;
}
const kill = [];
const runsSeen = new Set();
for (const r of held) {
  const time = (r.starts_at || "").slice(11, 16);
  if (refused(r.type_slug, r.title, time)) { kill.push(r.id); continue; }
  const key = r.city_slug + "|" + r.title.toLowerCase();
  if (runsSeen.has(key)) kill.push(r.id);      /* date order: the soonest stays */
  else runsSeen.add(key);
}
for (let i = 0; i < kill.length; i += 60) {
  await db("/events?source=eq.ticketmaster&id=in.(" + kill.slice(i, i + 60).join(",") + ")",
    { method: "DELETE" });
}
if (kill.length) console.log("swept: " + kill.length + " rows against the house rules");

console.log("written: " + written + " upserted"
  + (turnedAway ? ", " + turnedAway + " refused (see above)" : "")
  + ", past ticketmaster nights pruned before " + today);
if (turnedAway && !written) process.exit(1);
