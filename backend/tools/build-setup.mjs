/* afterhours — joins the 9 SQL files into two pasteable parts.
   Instead of opening each file in the Supabase panel one by one, two
   presses of Run are enough.

     node tools/build-setup.mjs                                        */

import { readFile, writeFile } from "node:fs/promises";

const read = (d) => readFile(new URL("../sql/" + d, import.meta.url), "utf8");

const structure = [
  ["00_migrations.sql", "THE MIGRATION LOG — which files have been run"],
  ["01_schema.sql", "TABLES"],
  ["02_rls.sql", "RULES — the security lives here"],
  ["03_seed_catalog.sql", "CITIES, TYPES, VENUES"],
  ["04_seed_events.sql", "36 EVENTS"],
  ["06_views.sql", "DECK, KEPT, COUNTERS"],
  ["07_friends.sql", "FRIENDSHIP"],
  ["08_storage.sql", "POSTER STORE"],
  ["09_jobs.sql", "BACKGROUND JOBS"],
  ["11_world.sql", "THE WORLD — 54 CITIES, 106 NIGHTS"],
  ["12_profiles.sql", "PEOPLE PROFILES"],
  ["13_feedback.sql", "FEEDBACK"],
];

/* A visible version stamp goes at the top of the file, so one look at the
   editor tells you which copy is sitting there. The clipboard has proven
   unreliable. */
const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");

let one = `-- ============================================================
--  afterhours — SETUP 1 / 2 : THE STRUCTURE
--  VERSION: ${stamp}   ← if the editor shows this line, it is the right copy
--
--  In the Supabase panel: SQL Editor → New query → paste this file
--  IN FULL → Run.
--
--  When it finishes you should see "Success. No rows returned".
--  Then run setup-2-comments.sql the same way.
--
--  GENERATED FILE — source: backend/tools/build-setup.mjs
-- ============================================================
`;

for (const [file, heading] of structure) {
  one += `\n\n-- ============================================================\n`;
  one += `--  ${heading}   (${file})\n`;
  one += `-- ============================================================\n\n`;
  one += await read(file);
}

const two = `-- ============================================================
--  afterhours — SETUP 2 / 2 : SAMPLE COMMENTS
--  VERSION: ${stamp}
--
--  Run setup-1-structure.sql first.
--  The sample conversations in the beforehours panel: 180 topics, 131
--  replies. This is MADE-UP sample data; the site works without it, the
--  comment area simply looks empty.
--
--  GENERATED FILE — source: backend/tools/build-setup.mjs
-- ============================================================

` + await read("05_seed_comments.sql");

await writeFile(new URL("../sql/setup-1-structure.sql", import.meta.url), one);
await writeFile(new URL("../sql/setup-2-comments.sql", import.meta.url), two);

console.log("setup-1-structure.sql  " + Buffer.byteLength(one).toLocaleString() + " bytes");
console.log("setup-2-comments.sql   " + Buffer.byteLength(two).toLocaleString() + " bytes");
