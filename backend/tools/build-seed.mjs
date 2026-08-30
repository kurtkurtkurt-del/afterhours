/* afterhours — turns the front-end data into SQL.
   Sources: events-data.js (36 events), VENUES in venues.js,
   explore/comment-pools.js (the sample comments).
   Output: sql/03_seed_catalog.sql, 04_seed_events.sql, 05_seed_comments.sql

   Generated so the hand-written data lives in exactly one place: when
   events-data.js changes, this script is run again.  */

import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

/* ---- load the sources (no DOM, plain eval) --------------------------- */

const eventsJs = await read("events-data.js");
const { POSTERS } = new Function(eventsJs + "\n;return { POSTERS };")();

/* VENUES used to sit inside app.js and moved to venues.js (the maps page
   needs the same coordinates). */
const venuesJs = await read("venues.js");
const { VENUES } = new Function("window", venuesJs + "\n;return { VENUES };")({});

const commentsJs = await read("explore/comment-pools.js");
const { COMMENT_POOL, COMMENTS_FOR } =
  new Function(commentsJs + "\n;return { COMMENT_POOL, COMMENTS_FOR };")();

/* ---- helpers --------------------------------------------------------- */

/* Text values.

   We use the escaped quote (''): correct for Postgres, and BALANCED for
   the simple parsers that walk along counting quotes (two marks = two
   crossings). Dollar quoting was tried and was worse: a single
   apostrophe inside it ("aren't") shifts the count and turns the rest of
   the text into code. */
const q = (v) => {
  if (v === null || v === undefined) return "null";
  return "'" + String(v).replace(/'/g, "''") + "'";
};

const slugify = (s) =>
  s.toLowerCase()
    .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ä/g, "a").replace(/ß/g, "ss")
    .replace(/ş/g, "s").replace(/ç/g, "c").replace(/ı/g, "i").replace(/ğ/g, "g")
    .replace(/\$/g, "s")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* The site's "today". The year of a year-less date is inferred from it. */
const TODAY = new Date("2026-08-29T00:00:00+02:00");

/* meta = "Olympiahalle · 11.09.26 · 18:30"
   The venue name can be in any of the parts (some metas start with the
   date). The date arrives in three shapes:
     dd.mm.yy          → certain
     dd.mm  /  dd—dd.mm → no year, inferred (estimated)
     "Sommer 2027", "Mittwochs", "TBA" → no date at all, only date_text  */
function parseMeta(meta) {
  const parts = meta.split("·").map((p) => p.trim()).filter(Boolean);

  const clock = meta.match(/\b(\d{2}):(\d{2})\b/);
  const hh = clock ? clock[1] : "20";
  const mi = clock ? clock[2] : "00";

  const full = meta.match(/\b(\d{2})\.(\d{2})\.(\d{2})\b/);
  if (full) {
    const [, dd, mm, yy] = full;
    return {
      parts,
      startsAt: `20${yy}-${mm}-${dd}T${hh}:${mi}:00+02:00`,
      estimated: false,
      dateText: parts.slice(1).join(" · ") || null,
    };
  }

  /* "15—16.09" → 15.09 ; "19.11 — 23.12" → 19.11 ; "05.09" → 05.09 */
  const range = meta.match(/\b(\d{2})\s*[—–-]\s*(\d{2})\.(\d{2})\b/);
  const yearless = range
    ? { dd: range[1], mm: range[3] }
    : (() => {
        const m = meta.match(/\b(\d{2})\.(\d{2})\b(?!\.)/);
        return m ? { dd: m[1], mm: m[2] } : null;
      })();

  if (yearless) {
    // Pick the year that does not leave the date far behind today.
    let year = TODAY.getFullYear();
    const build = (y) => new Date(`${y}-${yearless.mm}-${yearless.dd}T${hh}:${mi}:00+02:00`);
    if (build(year) < new Date(TODAY.getTime() - 30 * 864e5)) year += 1;
    return {
      parts,
      startsAt: build(year).toISOString(),
      estimated: true,
      dateText: parts.slice(1).join(" · ") || null,
    };
  }

  return { parts, startsAt: null, estimated: false,
           dateText: parts.slice(1).join(" · ") || null };
}

/* Look a venue up in VENUES by name: "Olympiahalle" → OLYMPIAHALLE,
   "Bahnwärter Thiel" → BAHNWÄRTER THIEL, "Milla Club" → MILLA */
function findVenue(rawCandidate) {
  if (!rawCandidate) return null;
  const candidate = rawCandidate.toUpperCase().trim();
  let m = VENUES.find((x) => x.name === candidate);
  if (m) return m;
  m = VENUES.find((x) => candidate.startsWith(x.name) || x.name.startsWith(candidate));
  if (m) return m;
  // Spellings with a prefix, such as "ab Isartor"
  m = VENUES.find((x) => candidate.includes(x.name));
  return m || null;
}

/* Turn a written time into a real one: "3 days ago", "Nov 2023", "6 h ago" */
function parseWhen(text) {
  const now = new Date("2026-08-29T21:00:00+02:00");
  let m;
  if (/^yesterday$/i.test(text)) return new Date(now - 864e5);
  if ((m = text.match(/^(\d+)\s*h ago$/i)))     return new Date(now - m[1] * 36e5);
  if ((m = text.match(/^(\d+)\s*days? ago$/i))) return new Date(now - m[1] * 864e5);
  if ((m = text.match(/^([A-Za-z]{3,9})\s+(\d{4})$/))) {
    const months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
    const i = months.indexOf(m[1].slice(0, 3).toLowerCase());
    if (i >= 0) return new Date(Date.UTC(+m[2], i, 15, 20, 0, 0));
  }
  return now;                    // if it will not parse, now; time_text is right anyway
}

/* ---- 03: cities, types, venues --------------------------------------- */

/* slug, name, status, sort_order, country, country code */
const cities = [
  ["munchen", "münchen", "live", 1, "Deutschland", "de"],
  ["istanbul", "istanbul", "live", 2, "Türkiye", "tr"],
  ["ankara", "ankara", "soon", 3, "Türkiye", "tr"],
  ["berlin", "berlin", "planned", 4, "Deutschland", "de"],
  ["wien", "wien", "planned", 5, "Österreich", "at"],
  ["koln", "köln", "planned", 6, "Deutschland", "de"],
  ["hamburg", "hamburg", "planned", 7, "Deutschland", "de"],
  ["frankfurt", "frankfurt", "planned", 8, "Deutschland", "de"],
  ["leipzig", "leipzig", "planned", 9, "Deutschland", "de"],
  ["izmir", "izmir", "planned", 10, "Türkiye", "tr"],
  ["graz", "graz", "planned", 11, "Österreich", "at"],
];

/* the order the spec itself uses */
const kinds = ["Rave", "Club Night", "Konzert", "Festival", "Meetup", "Hausparty"];

let sql = `-- GENERATED FILE - do not edit by hand. Source: backend/tools/build-seed.mjs
-- Cities, types and venues. This first, then 04.

insert into public.cities (slug, name, status, sort_order, country, country_slug) values
${cities.map(([s, n, st, i, c, cc]) =>
  `  (${q(s)}, ${q(n)}, ${q(st)}, ${i}, ${q(c)}, ${q(cc)})`).join(",\n")}
on conflict (slug) do nothing;

insert into public.event_types (slug, name, sort_order) values
${kinds.map((t, i) => `  (${q(slugify(t))}, ${q(t)}, ${i + 1})`).join(",\n")}
on conflict (slug) do nothing;

`;

for (const v of VENUES) {
  sql += `insert into public.venues (city_id, slug, name, map_x, map_y, opens_hour, open_hours)
select id, ${q(slugify(v.name))}, ${q(v.name)}, ${v.x}, ${v.y}, ${v.opensAt}, ${v.hours}
from public.cities where slug = 'munchen'
on conflict (city_id, slug) do nothing;
`;
}

await writeFile(new URL("../sql/03_seed_catalog.sql", import.meta.url), sql);

/* ---- 04: the 36 events ----------------------------------------------- */

let eventSql = `-- GENERATED FILE - source: events-data.js (${POSTERS.length} records)
-- The meta field is the very line shown on screen; it must not be changed.

`;
let dated = 0, venued = 0, estimatedCount = 0;

POSTERS.forEach((e, i) => {
  const { parts, startsAt, estimated, dateText } = parseMeta(e.meta);
  const venue = parts.map(findVenue).find(Boolean) || null;
  if (startsAt) dated++;
  if (estimated) estimatedCount++;
  if (venue) venued++;

  eventSql += `insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select ${q(e.slug)}, c.id, t.id, ${venue ? `v.id` : `null`},
       ${q(e.title)}, ${q(e.meta)}, ${q(e.body)}, ${i + 1},
       ${startsAt ? `${q(startsAt)}::timestamptz` : "null"}, ${estimated}, ${q(dateText)}
from public.cities c
join public.event_types t on t.slug = ${q(slugify(e.kind))}
${venue ? `join public.venues v on v.city_id = c.id and v.slug = ${q(slugify(venue.name))}\n` : ""}where c.slug = 'munchen'
on conflict (slug) do nothing;

`;
});

await writeFile(new URL("../sql/04_seed_events.sql", import.meta.url), eventSql);

/* ---- 05: the sample comments ----------------------------------------- */

let commentSql = `-- GENERATED FILE - source: explore/comment-pools.js
-- Sample comments: no real user behind them, they carry an author_name.
-- The same selection the site shows today (same seed, same cards).

-- Running this file twice used to double every conversation. The sample
-- rows are exactly the ones carrying time_text ("4 days ago", "Nov 2023"):
-- nothing in the app ever writes that column, only this file does. So we
-- clear the previous sample set first and the file becomes repeatable.
-- A real comment whose author deleted their account keeps time_text null,
-- so it is never touched here.
delete from public.comments where time_text is not null;

`;
let topicCount = 0, replyCount = 0;

for (const e of POSTERS) {
  const { older, recent } = COMMENTS_FOR(e);
  for (const topic of [...recent, ...older]) {
    topicCount++;
    const when = parseWhen(topic.when).toISOString();
    commentSql += `with topic as (
  insert into public.comments (event_id, author_name, body, time_text, created_at)
  select id, ${q(topic.who)}, ${q(topic.body)}, ${q(topic.when)}, ${q(when)}::timestamptz
  from public.events where slug = ${q(e.slug)}
  returning id, event_id
)
`;
    if (topic.replies && topic.replies.length) {
      const rows = topic.replies.map((c) => {
        replyCount++;
        return `  select topic.event_id, topic.id, ${q(c.who)}, ${q(c.body)}, ${q(c.when)}, ${q(parseWhen(c.when).toISOString())}::timestamptz from topic`;
      }).join("\n  union all\n");
      commentSql += `insert into public.comments (event_id, parent_id, author_name, body, time_text, created_at)
${rows};

`;
    } else {
      commentSql += `select 1 from topic;\n\n`;
    }
  }
}

await writeFile(new URL("../sql/05_seed_comments.sql", import.meta.url), commentSql);

console.log(`events        : ${POSTERS.length}`);
console.log(`  with a date : ${dated}  (${estimatedCount} of them a guessed year - to confirm in admin)`);
console.log(`  venue found : ${venued} / ${POSTERS.length}`);
console.log(`comments      : ${topicCount} topics, ${replyCount} replies`);
console.log(`venues        : ${VENUES.length}`);
console.log(`kinds         : ${kinds.length}, cities: ${cities.length}`);
