/* afterhours — the files a finished database has run.
   Kept in one place because three things ask the same question: the health
   check, the setup test, and whoever is reading to find out what is meant
   to be in there.

   10_countries.sql is deliberately absent. It is a one-shot for a project
   that was set up before the world data existed; a clean install gets the
   same columns through 03 and 11. */

export const EXPECTED_SQL = [
  "00_migrations.sql",
  "01_schema.sql",
  "02_rls.sql",
  "03_seed_catalog.sql",
  "04_seed_events.sql",
  "05_seed_comments.sql",
  "06_views.sql",
  "07_friends.sql",
  "08_storage.sql",
  "09_jobs.sql",
  "11_world.sql",
  "12_profiles.sql",
  "13_feedback.sql",
  "14_export.sql",
  "15_ticketmaster.sql",
  "16_coverage.sql",
  "17_real_people.sql",
  "18_geo.sql",
  "19_checkins.sql",
  "20_djs.sql",
  "21_sound.sql",
  "22_hardening.sql",
  "23_checkin_open.sql",
  "24_photos.sql",
  "25_people.sql",
  "26_push.sql",
  "27_sparks.sql",
  "28_spark_waves.sql",
  "29_profile_more.sql",
  "30_spark_map.sql",
  "31_past_feed.sql",
  "32_rsvp.sql",
  "33_waves.sql",
  "34_spark_push.sql",
];
