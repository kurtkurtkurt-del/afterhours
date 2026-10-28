# The promises afterhours' database keeps

Thirteen sentences. Each says what a person can or cannot do, which SQL file enforces it
and which test proves it (file and the check's own words). `node test/setup.test.mjs`
reads this table and refuses a row whose test file or check is not there, so a test
that goes takes its promise with it, visibly. A change to who may do what edits this
file first, in the same commit. (The idea is KULA's `docs/promises.md`, 11.10.2026.)

| # | Promise | Enforced in | Proved by |
| --- | --- | --- | --- |
| 1 | Nobody can read anyone else's swipes; a friend sees only what you swiped right. | `02_rls.sql` | `views.test.mjs` · "but the swipes themselves are entirely closed to anonymous" |
| 2 | Nobody can make themselves an admin from a browser. | `02_rls.sql` | `schema.test.mjs` · "there is exactly one admin" |
| 3 | A friendship is born pending and only the side that received it may accept. | `07_friends.sql` | `friends.test.mjs` · "a friendship cannot be INSERTed as already accepted" |
| 4 | Your settings are yours alone; nobody else reads or changes them. | `12_profiles.sql` | `profiles.test.mjs` · "someone else's settings cannot be changed" |
| 5 | The member list cannot be browsed; a stranger sees their own row and named cards. | `12_profiles.sql`, `25_people.sql` | `profiles.test.mjs` · "a stranger sees only their own row" |
| 6 | Your export holds everything of yours and nothing of anybody else's. | `14_export.sql`, `64_export_more.sql` | `export.test.mjs` · "not their message" |
| 7 | A block closes both ways: no card, no search, no request, no wave, no message. | `50_blocks.sql`, `57_doors.sql`, `59_dms.sql` | `blocks.test.mjs` · "the wave stops at the block" |
| 8 | A banned account writes nothing and, since 57, reads no feed, finds nobody. | `52_bans.sql`, `57_doors.sql` | `doors.test.mjs` · "a banned account: refused" |
| 9 | Nobody becomes a member of a group they were not added to; every group call asks first. | `44_groups.sql`, `57_doors.sql` | `groups.test.mjs` · "the table itself is closed" |
| 10 | A push never carries a member's words: a fixed sentence and a name. | `58_push_words.sql` | `doors.test.mjs` · "the title still names who and where" |
| 11 | A direct message goes only between confirmed friends who can reach each other. | `59_dms.sql` | `dms.test.mjs` · "a pending request is not a friend yet" |
| 12 | A burst is bounded: twenty lines a minute in a chat, forty requests a day. | `53_trust.sql`, `59_dms.sql` | `trust.test.mjs` · "the table itself is closed" |
| 13 | A deleted account leaves no row that names the person; the last admin cannot delete theirs, and since 111 only a sign-in from the last ten minutes can delete (`terms-delete-reauth.test.mjs` · "an old sign-in cannot delete"). | `12_profiles.sql`, `65_account_delete.sql`, `111_terms_and_delete_reauth.sql` | `delete-account.test.mjs` · "no row of any table still points at the person" |

Known gaps, written down so they are not forgotten:

- Guests (anonymous sessions) pass `assert_member()`; what they may not do is refused
  write by write (`is_guest()` in the writers), not at one door.
