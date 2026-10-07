# afterhours — backend

The database, the rules, the admin panel, and the tests that put them
through their paces. The site (the folder above) works without any of it:
as long as `config.js` is empty the data is read from `events-data.js` and
nothing changes.

## The files

```
sql/00_migrations.sql    which of these files has been run
sql/01_schema.sql        the tables
sql/02_rls.sql           who may read and write what   ← the security lives here
sql/03_seed_catalog.sql  cities, types, venues        (generated)
sql/04_seed_events.sql   36 events                    (generated)
sql/05_seed_comments.sql the sample beforehours comments (generated)
sql/06_views.sql         the deck, the kept cards, the counters
sql/07_friends.sql       the friendship calls
sql/08_storage.sql       the poster store (Supabase only)
sql/09_jobs.sql          dropping the past + the health summary
sql/10_countries.sql     a country and a continent for every city
sql/11_world.sql         54 cities, 106 nights
sql/12_profiles.sql      people profiles: the card + the settings + the signup step
sql/13_feedback.sql      feedback: everyone writes, the admin reads
sql/14_export.sql        everything we hold about one person, in one call
sql/15_ticketmaster.sql  real events: source/external_id/image_url/ticket_url + the worldwide deck
sql/16_coverage.sql      the service area: all of Europe, key Asia, North America (94 cities)
sql/18_geo.sql           lat/lng on events and venues + nights_near(): the map in the app
sql/19_checkins.sql      check-in, the afterhours card (my_cards), the room (room_*), friends_live
sql/20_djs.sql           djs, dj_sets, dj_follows + eight seed djs
sql/21_sound.sql         the sound bucket: background music streams from here
sql/22_hardening.sql     what the review closed: column grants, guests, door test, follow counts
sql/23_checkin_open.sql  check-in without the door test and the time window
sql/24_photos.sql        the photograph on a profile: profile_photos + photo_set() + the photos bucket; yours and your confirmed friends only
sql/25_people.sql        finding people: people_search() by handle or name, people_suggested() friends of friends then your city; discoverable people only
sql/26_push.sql          push notifications: push_tokens + push_register() (language, time zone); ten switches on profile_settings; triggers on friendships / swipes / checkins / room_posts / comments and the hourly push_hourly() job fill push_outbox; pg_net sends to Expo, push_flush() every 5 min sends what quiet hours held back and push_prune() forgets gone phones. Needs pg_net and pg_cron
sql/27_sparks.sql        sparks: nights you start yourself (derby, grill, hike). sparks + spark_invites, closed tables; spark_create() invites confirmed friends only, spark_inbox() / spark_answer() for the invited, spark_mine() / spark_cancel() for the host
sql/28_spark_waves.sql   sparks reach a wave instead of a ticked list: sparks.reach (1 friends · 2 their friends · 3 one step further), spark_waves() walks confirmed friendships up to three steps, spark_audience() counts each wave, spark_create(…, reach) needs no list, spark_inbox() / spark_answer() also serve everyone inside the wave; 27-style named sparks keep working
sql/29_profile_more.sql  more of you on your page: bio 160 → 300, profiles.about (≤1500), profile_links (instagram · tiktok · spotify · soundcloud · x · website; closed table, friends only); profile_about_set(), profile_links_set(jsonb), profile_extra(handle)
sql/30_spark_map.sql     sparks on the map: sparks.lat/lng (where the host was when creating), spark_create(…, reach, lat, lng), sparks_near(lat, lng, km), spark_get(id); the spot is sharp for the host and their friends, rounded to ~1 km for the 2nd/3rd wave
sql/31_past_feed.sql     the past feed on yours: past_feed(city, before, before_id, limit) — past nights with a photo, newest first, a year back, in your city plus wherever you or friends went; names who of yours checked in (show_friends) or kept it (kept_visible); paged by (starts_at, id)
sql/32_rsvp.sql          who is coming: rsvps (in · maybe · out per person and night, closed table), rsvp_set(event, answer) (empty takes it back), rsvp_for(events[]) — yours and confirmed friends' answers only
sql/33_waves.sql         the waves on yours: waves_kept(limit) — upcoming nights kept in the 2nd and 3rd wave (confirmed friendships, shortest chain, via = handles from your friend to the keeper); anyone with kept_visibility private is neither shown nor named on a chain
sql/34_spark_push.sql    push for sparks: spark (a spark reaches you, by name or inside its wave; the 2nd and 3rd wave count against the ten a day) and spark_in (someone is in on yours); kinds, words and notify_sparks live in 26_push.sql
sql/35_spark_people.sql  spark_people(spark) — names and answers: the host sees in and out, someone who is in sees the others who are in, nobody else sees anything
sql/36_person_cards.sql  person_cards(handle) — a friend's collection for their profile page, same shape as my_cards; you and friends only
sql/37_offline.sql       writes made offline: client_id on comments and room_posts, room_post(slug, body, client_id) and check_in(…, at) so a job the app sends twice is stored once; the card keeps the time the button was pressed (at most 12 h back)
sql/38_profile_lists.sql whatsapp among the links (digits, country code first); person_kept(handle) and person_people(handle), the nights and friends lists under a profile: yours, and those of confirmed friends (kept nights only when they show them)
sql/39_spark_kinds.sql   eight more spark kinds: sunrise, breakfast, rooftop, swim, quiz, newplace, camera, festival
sql/40_event_about.sql   "who is this?": event_about (a night, a language: name, kicker, who, facts, source), about_for(ids, lang) for anyone; written only by the service
sql/41_account_types.sql profiles.account_type (user · dj · community_manager · admin), set_account_type(type, code)
sql/42_staff.sql         the staff: is_staff(), my_role(), staff_* (nights, rooms, djs, comments), dj_save_mine and sets, admin_* (people, types, numbers, log), staff_log
sql/43_event_submit.sql  nights sent in by people: event_submit, event_submissions (yours), staff_pending, staff_review; night_write is the one writer
sql/44_groups.sql        groups: groups, members, invites (codes), group_swipes, live session; group_create … group_join, my_groups, group_deck (sorted by the group's taste), group_matches, live state, group_suggest
sql/45_posts.sql         posts for friends: post_create, post_delete, posts_feed, post_report; staff_posts_reported, staff_post_hide
sql/46_group_plans.sql   a group decides: round_start/vote/close, plan_set, plan_ticket, group_plan (one read for the plan tab), group_say/unsay/thread
sql/47_group_nights.sql  after the night: group_nights (two or more members checked in), the album (group_photo_add/remove, group_album), group_stats (numbers and the vibe), group_set_visible, group_also_there
sql/48_group_push.sql    push for groups and posts: switches notify_groups and notify_posts, ten kinds, triggers on members, swipes, the thread, live and posts, group_push_hourly (tickets, cron :15)
sql/49_design_reads.sql  reads for the chosen designs: group_peek with faces and plan, group_wall, admin_people_by, admin_role_counts
sql/about-munich.sql     ONE-SHOT: the texts for 18 Munich nights in en · de · tr, from Wikipedia summaries, by slug
sql/cleanup-seed-events.sql  ONE-SHOT for the live project: drops the invented nights and the out-of-coverage cities

tools/build-seed.mjs     builds 03/04/05 from the front-end data
tools/build-setup.mjs    joins the SQL files into two pasteable parts
tools/build-posters.mjs  generates the posters for the new cities
tools/local-server.mjs   an imitation of Supabase — for development
tools/world-sql.mjs      turns the world data into 11_world.sql
tools/backup.mjs         backs the content up to JSON
tools/restore.mjs        turns a backup back into SQL
tools/health.mjs         the status check
tools/sync-ticketmaster.mjs  the daily Ticketmaster pull (GitHub Action; --dry to look without writing)
tools/upload-sound.mjs   puts the 30 music excerpts into the sound bucket (service key, once)

test/                    278 checks, all on a real Postgres (PGlite)
```

## Day to day

```bash
npm test           # schema, seed, views, friendship, profiles, feedback, jobs,
                   # update, setup, backup, export, upgrade
npm run server     # http://localhost:4350 — development without Supabase
npm run seed       # rebuild the SQL after events-data.js changed
npm run setup      # rebuild the two combined setup files
npm run health     # the state of the published database, and which SQL is in
npm run backup     # take a copy of the content
npm run restore    # turn one of those copies back into SQL
```

```bash
# the Ticketmaster sync, by hand (the Action runs it daily at 04:10 UTC)
TICKETMASTER_KEY=... SUPABASE_SERVICE_ROLE=... node tools/sync-ticketmaster.mjs
TICKETMASTER_KEY=... node tools/sync-ticketmaster.mjs --dry   # look, do not write
```

To try the site against the local server: start the server, then open a
page with `?backend=http://localhost:4350`. That shortcut only works on
localhost. The sign-in link is written to the server's console instead of
being emailed.

## WHAT YOU HAVE TO DO YOURSELF

The things I cannot do: open an account, take a key, change a setting in
the panel. In order:

**1 · Open a Supabase project** — supabase.com, new project, region
Frankfurt (the closest one to Munich). The free plan is enough.

**2 · Run the SQL in order** — SQL Editor in the Supabase panel. Running
either file twice is harmless: the structure uses `on conflict do nothing`
and the comment seed clears its own previous sample set before inserting.

> **Important:** keep the role/RLS option next to the Run button
> **off** ("run without RLS"). With role impersonation on, the editor does
> not send the script as it stands; it wraps and rewrites it, and on a
> long setup file that translation breaks and gives a meaningless error
> like `relation "one" does not exist`. The fault is not in the file, it
> is in that mode. (This is exactly what happened on 29.08.2026.)

In order:
`sql/setup-1-structure.sql` → `sql/setup-2-comments.sql`. Those two are
the joined form of `01..13` (rebuilt with `npm run setup`); you can also
run the numbered files one at a time. 08 (the store) and the schedule
lines in 09 only mean anything on Supabase, and skip themselves anywhere
else.

If pasting from the clipboard gives you trouble, take the file straight
from its source:
`raw.githubusercontent.com/kurtkurtkurt-del/afterhours/main/backend/sql/setup-1-structure.sql`

Line 3 of each file carries a VERSION stamp; that is how you tell which
copy is sitting in the editor.

**3 · Make yourself an admin** — sign in on the site first (after step 5
below), then in the SQL Editor:

```sql
update public.profiles set is_admin = true, handle = 'ahmet'
where id = (select id from auth.users where email = 'your@email');
```

You have to run this line from the SQL Editor: nobody can make themselves
an admin from a browser, the rule stops it.

**4 · Take the keys** — Project Settings → API. There are two values:
- `Project URL` and `anon public` → these go into `config.js`. They are
  public, everyone can see them, and that is fine.
- `service_role` → **never written anywhere.** That key steps around every
  rule. Put it in a browser and the database is open to everyone.

**5 · Fill in `config.js`** (in the folder above):

```js
window.AH_CONFIG = {
  url: "https://xxxxxxxx.supabase.co",
  anonKey: "eyJhbGciOi...",
  city: "munchen",
};
```

**6 · Register the addresses the sign-in links come back to** —
Authentication → URL Configuration → Redirect URLs:
`https://kurtkurtkurt-del.github.io/afterhours/**`, and for development
`http://localhost:4340/**`. If that list is missing an entry, the sign-in
link does not work.

**7 · Switch pg_cron on** (optional) — Database → Extensions → `pg_cron`.
Then run `09_jobs.sql` once more; the job that drops past events gets
scheduled. Without it you can run `select public.hide_past_events();` by
hand.

**8 · Check what is actually in** — `npm run health` ends with a line like
`SQL applied  13 of 13`. If a file is missing it names it, and exits
non-zero. That count is what the migration log (00_migrations.sql) is for:
every numbered file stamps its own name when it runs, so the answer to
"did I run that one?" stops being a memory.

**10 · Ticketmaster (real events)** — three moves, in order:

- Paste the CURRENT `sql/setup-1-structure.sql` (it now carries 15 and 16:
  the event columns, the worldwide deck, the coverage cities). Same rules
  as step 2 — role/RLS toggle off.
- Paste `sql/cleanup-seed-events.sql` **once**. It deletes the 142
  invented nights, and with them the sample comments and any swipes on
  them; the out-of-coverage showcase cities leave the filter in the same
  breath. This is the point of no return for the fiction — the seeds can
  always be re-pasted from `04_seed_events.sql` + `11_world.sql` if you
  ever miss them.
- In GitHub: Settings → Secrets and variables → Actions → two secrets:
  `TICKETMASTER_KEY` (the Discovery consumer key) and
  `SUPABASE_SERVICE_ROLE` (Supabase panel → Project Settings → API →
  service_role — it goes into a GitHub secret and NOWHERE else). Then
  Actions → "sync events" → Run workflow. From then on it runs every
  morning at 04:10 UTC on its own: upserts what Ticketmaster lists for
  the coverage cities, prunes what has passed.

**11 · Backups** — Supabase takes a daily backup. On top of that, run
`npm run backup` once a month; a copy of the texts, independent of the
project, lands under `backend/backup/`.

Putting one back:

```bash
npm run restore backup/afterhours-2026-08-30.json
```

That writes `backup/restore-2026-08-30.sql` next to it, to paste into the
SQL editor. It only fills gaps — every statement is `on conflict do
nothing`, so content that is still there is left alone and running it
twice changes nothing. It restores the cities, kinds, venues, events and
sample comments; it does not restore accounts, swipes or friendships,
which are people's and were never in the backup.

`backup.test.mjs` is the reason to trust it: it builds a full database,
takes a backup, restores into an empty one, and compares the two field for
field.

## The profile (12_profiles.sql)

The thing that appears once you have registered. It is split in two,
because the two halves are not the same thing:

| table | what | who sees it |
|---|---|---|
| `profiles` | handle, display name, a one-line bio, city, joined, last seen | **everyone** |
| `profile_settings` | who may see what you kept, whether you are findable by name, email, language | **the owner alone** — not even the admin |

Without the split, the "everyone reads" rule on `profiles` would have
opened the settings as well.

**The signup flow.** When an account opens, the trigger
(`handle_new_user`) creates the profile and the settings row by itself.
But registration **does not count as finished until a handle is chosen**:
`onboarded_at` is stamped at that moment. If the register form sends a
handle and a city in the metadata, the trigger tries them; if the handle
is taken it quietly leaves it empty and the person chooses later.

```
a row in auth.users  →  handle_new_user()  →  profiles + profile_settings
                                               (handle empty, onboarded_at empty)
                              ↓
                       profile_setup(handle, name, city, one line)
                              ↓
                       onboarded_at stamped — registration finished
```

**The functions**

| name | what it does |
|---|---|
| `handle_status(handle)` | `ok` · `empty` · `format` · `taken` · `yours` — the register form asks on every keystroke |
| `profile_setup(handle, name, city, bio)` | finishes the registration, in one request |
| `profile_me()` | your own profile + counts (kept, friends, comments) + settings |
| `profile_card(handle)` | the card someone else sees; the counts only if you are friends and the setting allows it |
| `seen()` | the last-seen stamp |
| `kept_visible(id)` | "are their kept cards visible", per the setting — RLS uses this |
| `card_visible(id)` | "is their card open to a stranger", per the setting |
| `is_linked(id)` | friend or pending request — the profile read rule uses this |
| `handle_to_id(handle)` | identity by handle; a friend request goes through it |
| `author_name(id, fallback)` | the name under a comment, without touching the profile table |
| `delete_account()` | deletes the account; comment texts stay, the name becomes `someone` |
| `export_me()` | everything held about the caller, as one JSON object (14_export.sql) |

**A changed rule:** the "a confirmed friend sees what you swiped RIGHT"
rule in 02 now looks at the setting too. If a person says `private`, not
even a friend sees it, and it does not appear in the `friends_kept()`
deck.

### The member list cannot be browsed

In 02, `profiles` was "everyone reads": somebody without an account could
pull down the whole member list in a single request. The rows you can now
read **directly** are your own, your confirmed friends, anyone with a
request pending between you, and the admin. Everything a stranger sees
goes through `security definer` functions, and each hands back only the
field it owes.

| who | what they see |
|---|---|
| a signed-out visitor | no profile row at all. The name under a comment comes from `author_name()` |
| a stranger who knows the handle | `profile_card()` — name, one line, city, joined. NO counts, NO last seen |
| a stranger to someone who switched the setting off | nothing. But whoever knows the handle can still **send a request** — otherwise nobody could ever add that person |
| a confirmed friend | the card + how many they kept (if the setting allows) + last seen **as a day** |
| themselves | all of it, with the clock time |

**Last seen never leaves with its clock time** (`last_seen_at::date`), so
that nobody can work out when a person is awake.

Two older definitions that fell foul of the new rule were rewritten in 12:
`comments_public` no longer joins the profile table, and `friend_request`
takes the identity behind a handle from `handle_to_id()`.

## Feedback (13_feedback.sql)

What sits behind the `feedback/` page. One table, two rules: **everyone
writes, only the admin reads.** It does not ask you to sign in — opening
an account just to report something broken would be absurd; a signed-out
writer may leave a contact line if they want one.

- `kind`: `broken` · `idea` · `event` · `other`
- `body`: 10–2000 characters (an empty or one-word report is no use)
- If signed in, `author_id` is filled in automatically; **you cannot write
  in someone else's name** (the rule checks it)
- Not even the writer can read their own back: this is an inbox, not a
  conversation
- When an account is deleted, what they wrote stays and the name falls away
- `feedback_list(limit)` is the list the admin side reads

**Note:** because it is open to signed-out writers there is no rate limit.
If spam arrives, the first remedy is to tie the `feedback_write` rule to
being signed in.

## Deliberately not done

- **The admin panel is not a secret address.** `admin/` is open to
  everyone; without the permission you can see nothing and write nothing,
  because the rule lives in the database.
- **Who liked what is open to nobody.** Not even the admin can see it one
  by one, only the total. What a friend swiped LEFT appears nowhere.
- **Guessed dates are not hidden on their own.** 24 of the 36 events had
  no year and it was filled in by inference; taking a night's listing off
  the site on the strength of that would be wrong. They are marked `date?`
  in the panel.
