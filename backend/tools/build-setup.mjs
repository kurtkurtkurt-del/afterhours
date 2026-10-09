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
  ["14_export.sql", "TAKE YOUR DATA WITH YOU"],
  ["15_ticketmaster.sql", "REAL EVENTS — TICKETMASTER COLUMNS, WORLDWIDE DECK"],
  ["16_coverage.sql", "THE COVERAGE — EUROPE, KEY ASIA, NORTH AMERICA"],
  ["17_real_people.sql", "REAL PEOPLE — WHO KEPT A NIGHT, AND THE WAY YOU REACH THEM"],
  ["18_geo.sql", "THE MAP — WHERE A NIGHT IS, AND WHAT IS NEAR YOU"],
  ["19_checkins.sql", "CHECK-IN, THE CARD, THE ROOM"],
  ["20_djs.sql", "DJS, SETS, FOLLOWS"],
  ["21_sound.sql", "THE SOUND STORE"],
  ["22_hardening.sql", "HARDENING — WHAT THE REVIEW CLOSED"],
  ["23_checkin_open.sql", "CHECK-IN, OPEN — NO DOOR TEST, NO WINDOW"],
  ["24_photos.sql", "THE PHOTOGRAPH — YOURS TO SET, YOUR FRIENDS TO SEE"],
  ["25_people.sql", "FINDING PEOPLE — SEARCH AND SUGGESTIONS"],
  ["26_push.sql", "PUSH NOTIFICATIONS — REQUESTS, ACCEPTS, MATCHES, OUT NOW"],
  ["27_sparks.sql", "SPARKS — NIGHTS YOU START, INVITES TO FRIENDS"],
  ["28_spark_waves.sql", "SPARKS REACH A WAVE — FRIENDS, THEIR FRIENDS, ONE STEP FURTHER"],
  ["29_profile_more.sql", "MORE OF YOU — LONGER BIO, ABOUT, LINKS TO OTHER NETWORKS"],
  ["30_spark_map.sql", "SPARKS ON THE MAP — A SPOT, BLURRED FOR STRANGERS"],
  ["31_past_feed.sql", "THE PAST FEED — PHOTOS OF NIGHTS THAT HAPPENED"],
  ["32_rsvp.sql", "WHO IS COMING — IN, MAYBE, OUT, FOR FRIENDS"],
  ["33_waves.sql", "THE WAVES — NIGHTS KEPT BY FRIENDS OF FRIENDS"],
  ["34_spark_push.sql", "SPARKS SAY SO — A PUSH WHEN ONE REACHES YOU, AND WHEN SOMEONE IS IN"],
  ["35_spark_people.sql", "WHO ANSWERED A SPARK — NAMES FOR THE HOST AND FOR WHOEVER IS IN"],
  ["36_person_cards.sql", "THE COLLECTION OF A FRIEND, ON THEIR PROFILE"],
  ["37_offline.sql", "WRITES MADE OFFLINE — A SECOND TRY CHANGES NOTHING"],
  ["38_profile_lists.sql", "WHATSAPP AMONG THE LINKS, AND THE LISTS UNDER A PROFILE"],
  ["39_spark_kinds.sql", "EIGHT MORE SPARKS"],
  ["40_event_about.sql", "WHO IS THIS — A FEW LINES ABOUT THE ACT ON A NIGHT"],
  ["41_account_types.sql", "ACCOUNT TYPES — USER, DJ, COMMUNITY MANAGER, ADMIN"],
  ["42_staff.sql", "THE STAFF — ADMIN PANEL, COMMUNITY MANAGERS, DJ PAGES, THE LOG"],
  ["43_event_submit.sql", "NIGHTS SENT IN BY PEOPLE, LET THROUGH BY THE STAFF"],
  ["44_groups.sql", "GROUPS — FRIENDS WHO FIND A NIGHT TOGETHER"],
  ["45_posts.sql", "POSTS — A PHOTO AND A FEW WORDS FOR YOUR FRIENDS"],
  ["46_group_plans.sql", "A GROUP DECIDES — VOTES, THE PLAN, TICKETS, THE CHAT"],
  ["47_group_nights.sql", "THE NIGHT AND AFTER — GROUP NIGHTS, THE ALBUM, NUMBERS, ALSO THERE"],
  ["48_group_push.sql", "GROUPS AND POSTS SAY SO — PUSH NOTIFICATIONS"],
  ["49_design_reads.sql", "WHAT THE NEW DESIGNS READ — JOIN FACES, THE PHOTO WALL, PEOPLE BY ROLE"],
  ["50_blocks.sql", "BLOCKING SOMEONE — NO CARD, NO REQUEST, NO WAVE"],
  ["51_safety.sql", "WHAT THE STORES REQUIRE — THE TERMS, REPORTS, CLIENT ERRORS"],
  ["52_bans.sql", "CLOSING AN ACCOUNT — THE STAFF BAN, THE DATABASE REFUSES"],
  ["53_trust.sql", "TRUST — DJ PAGES CHECKED, ADMINS, NOTICES, LIMITS, BLOCKS IN GROUPS"],
  ["54_upkeep.sql", "UPKEEP — OLD GUESTS GO, THE STAFF ARE ALERTED"],
  ["55_post_social.sql", "LIKES AND COMMENTS ON POSTS"],
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
