# afterhours — backend

The database, the rules, the admin panel, and the tests that put them
through their paces. The site (the folder above) works without any of it:
as long as `config.js` is empty the data is read from `events-data.js` and
nothing changes.

## The files

```
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

tools/build-seed.mjs     builds 03/04/05 from the front-end data
tools/build-setup.mjs    joins the SQL files into two pasteable parts
tools/build-posters.mjs  generates the posters for the new cities
tools/local-server.mjs   an imitation of Supabase — for development
tools/world-sql.mjs      turns the world data into 11_world.sql
tools/backup.mjs         backs the content up to JSON
tools/health.mjs         the status check

test/                    171 checks, all on a real Postgres (PGlite)
```

## Day to day

```bash
npm test           # schema, seed, views, friendship, profiles, feedback, jobs, update
npm run server     # http://localhost:4350 — development without Supabase
npm run seed       # rebuild the SQL after events-data.js changed
npm run setup      # rebuild the two combined setup files
npm run health     # the state of the published database
npm run backup     # take a copy of the content
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

**2 · Run the SQL in order** — SQL Editor in the Supabase panel.

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

**8 · Backups** — Supabase takes a daily backup. On top of that, run
`npm run backup` once a month; a copy of the texts, independent of the
project, lands under `backend/backup/`.

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
