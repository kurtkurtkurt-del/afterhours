/* afterhours — turn a backup back into SQL.
   A backup nobody has ever restored is not a backup, it is a file. This is
   the other half of tools/backup.mjs: it takes one of those JSON files and
   writes the SQL that puts the content back.

     node tools/restore.mjs backup/afterhours-2026-08-30.json
     → backup/restore-2026-08-30.sql   (paste it in the SQL editor)

   What it restores is what cannot be made again: the cities, the kinds,
   the venues, the events and the comments. It does NOT restore accounts,
   swipes or friendships — those belong to people, they are not content,
   and a backup taken with the public key never saw them anyway.

   Every statement is `on conflict do nothing`, so running it against a
   database that still has its content changes nothing. It fills gaps; it
   never overwrites.  */

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

/* A timestamp arrives as an ISO string over REST but as a Date when the
   rows come straight from a driver. String(date) gives "Fri Sep 11 2026
   18:30:00 GMT+0200 (…)", which Postgres refuses — so a Date is written in
   ISO before it is quoted. */
const q = (v) => {
  if (v === null || v === undefined) return "null";
  const text = v instanceof Date ? v.toISOString() : String(v);
  return "'" + text.replace(/'/g, "''") + "'";
};
const n = (v) => (v === null || v === undefined || v === "") ? "null" : Number(v);
const b = (v) => (v === null || v === undefined) ? "null" : (v ? "true" : "false");

export function restoreSql(backup) {
  const at = String(backup.taken_at || "").slice(0, 16).replace("T", " ");
  let sql = `-- ============================================================
--  afterhours — RESTORE
--  From the backup taken ${at} at ${backup.source || "an unknown address"}
--
--  GENERATED FILE — source: backend/tools/restore.mjs
--
--  Paste the whole thing into the SQL editor and Run. Every statement is
--  on conflict do nothing, so it only fills gaps: content that is still
--  there is left exactly as it is. Run it twice and nothing changes.
--
--  It needs the structure to exist first (setup-1-structure.sql).
-- ============================================================

`;

  sql += "-- cities -----------------------------------------------------\n";
  for (const c of backup.cities || []) {
    sql += `insert into public.cities (slug, name, status, sort_order, country, country_slug, continent, continent_slug)
values (${q(c.slug)}, ${q(c.name)}, ${q(c.status)}, ${n(c.sort_order)}, ${q(c.country)}, ${q(c.country_slug)}, ${q(c.continent)}, ${q(c.continent_slug)})
on conflict (slug) do nothing;\n`;
  }

  sql += "\n-- kinds ------------------------------------------------------\n";
  for (const t of backup.event_types || []) {
    sql += `insert into public.event_types (slug, name, sort_order)
values (${q(t.slug)}, ${q(t.name)}, ${n(t.sort_order)})
on conflict (slug) do nothing;\n`;
  }

  /* The venue rows carry a city_id from the database they came from, and
     those ids do not survive a restore into a different project. The city
     is looked up by slug instead — which is why the backup keeps slugs. */
  sql += "\n-- venues -----------------------------------------------------\n";
  const cityById = new Map((backup.cities || []).map((c) => [c.id, c.slug]));
  for (const v of backup.venues || []) {
    const citySlug = cityById.get(v.city_id);
    if (!citySlug) continue;
    sql += `insert into public.venues (city_id, slug, name, map_x, map_y, opens_hour, open_hours)
select id, ${q(v.slug)}, ${q(v.name)}, ${n(v.map_x)}, ${n(v.map_y)}, ${n(v.opens_hour)}, ${n(v.open_hours)}
from public.cities where slug = ${q(citySlug)}
on conflict (city_id, slug) do nothing;\n`;
  }

  /* events_public hands back the city, kind and venue as slugs already, so
     an event can be rebuilt without knowing any of the old ids. */
  sql += "\n-- events -----------------------------------------------------\n";
  for (const e of backup.events || []) {
    const venueJoin = e.venue_slug
      ? `\njoin public.venues v on v.city_id = c.id and v.slug = ${q(e.venue_slug)}`
      : "";
    sql += `insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no, poster_path,
   starts_at, starts_at_estimated, date_text, is_published)
select ${q(e.slug)}, c.id, t.id, ${e.venue_slug ? "v.id" : "null"},
       ${q(e.title)}, ${q(e.meta)}, ${q(e.body)}, ${n(e.poster_no)}, ${q(e.poster_path)},
       ${e.starts_at ? `${q(e.starts_at)}::timestamptz` : "null"}, ${b(e.starts_at_estimated)},
       ${q(e.date_text)}, ${b(e.is_published)}
from public.cities c
join public.event_types t on t.slug = ${q(e.type_slug)}${venueJoin}
where c.slug = ${q(e.city_slug)}
on conflict (slug) do nothing;\n`;
  }

  /* Comments come back by their own id, which keeps a reply attached to its
     topic. A comment whose author had an account is skipped: that account
     does not exist here, and inventing one would be worse than the gap. */
  sql += "\n-- comments (the sample conversations) ------------------------\n";
  const eventById = new Map((backup.events || []).map((e) => [e.id, e.slug]));
  let skipped = 0;
  const rows = (backup.comments || []).slice()
    .sort((a, c) => (a.parent_id ? 1 : 0) - (c.parent_id ? 1 : 0));
  for (const c of rows) {
    if (c.is_real) { skipped++; continue; }
    const eventSlug = eventById.get(c.event_id);
    if (!eventSlug) { skipped++; continue; }
    sql += `insert into public.comments (id, event_id, parent_id, author_name, body, time_text, created_at)
select ${q(c.id)}::uuid, id, ${c.parent_id ? `${q(c.parent_id)}::uuid` : "null"}, ${q(c.author)}, ${q(c.body)}, ${q(c.time_text)}, ${q(c.created_at)}::timestamptz
from public.events where slug = ${q(eventSlug)}
on conflict (id) do nothing;\n`;
  }

  sql += `\n-- ${skipped} comment(s) skipped: written by a real account, which a
-- backup taken with the public key never carried.\n`;
  return sql;
}

/* --- run --------------------------------------------------------------- */

if (import.meta.url === `file://${process.argv[1]}`) {
  const path = process.argv[2];
  if (!path) {
    console.error("Which backup? e.g. node tools/restore.mjs backup/afterhours-2026-08-30.json");
    process.exit(1);
  }
  /* The path comes from a person at a shell, so it is theirs, not the
     module's: resolve it against the working directory. */
  const from = resolve(process.cwd(), path);
  const backup = JSON.parse(await readFile(from, "utf8"));
  const sql = restoreSql(backup);
  const out = from.replace(/afterhours-(.*)\.json$/, "restore-$1.sql");
  await writeFile(out, sql);
  console.log("restore written: " + out);
  for (const k of ["cities", "event_types", "venues", "events", "comments"]) {
    console.log(`  ${k.padEnd(14)} ${(backup[k] || []).length}`);
  }
}
