# afterhours

**[kurtkurtkurt-del.github.io/afterhours](https://kurtkurtkurt-del.github.io/afterhours/)**

A site for finding your night in Munich (and Istanbul): rave, club night,
konzert, festival, meetup, hausparty. One card, one night, swipe right to
keep it.

> **This file is the project's only reference.** It is updated after every
> change — a new page, a new script, a new rule gets written down here too.
> Someone arriving cold (or you in six months) should be able to read only
> this and carry on.

---

## 1. What it is trying to do

The product in three sentences:

1. **There is no search.** Anywhere. A night is not the thing you look for,
   it is the thing that comes to you. The deck hands you one card: swipe
   right and you keep it, swipe left and you never see it again.
2. **What matters is not the night but the continuity.** Every night you go
   to turns into an *afterhours card*: the sound of that night, the talk,
   who was there. The collection holds the past; "now and next" lives
   somewhere else.
3. **A page does not sell you a night.** The event page does not say "here
   is what is on tonight", it says "this is how many times it has been
   you". There is a ticket button, but it is not the centre of the page.

### The spirit

- Black and white. Colour lives only in the posters and the cards.
- No boxes, no shadows, no rounded corners. The divider is a 1px hairline.
- Two typefaces: **Inter Tight** (the freely available answer to PP Neue
  Montreal) and **JetBrains Mono** (every small line: 10px, 0.14–0.18em
  tracking, uppercase, 38–50% opacity).
- The interface text is **English and lower case**; the code and this file
  are **English too** (they were Turkish until 30.08.2026 — see §13); the
  legal pages are **German**.
- Everything on the page was made by hand: the posters are hand-written
  SVG, the sound is synthesised. Apart from `foto.jpg` there is no media
  from outside.
- No dependencies, no build step. No npm, no bundler. Whatever the browser
  understands, that is what is used.

---

## 2. Running it

```bash
python3 -m http.server 4340
```

Then `http://localhost:4340`. Do not open it with `file://` — the SVG
posters load inside `<object>`, and external CSS and fonts do not arrive
that way.

It works in full without a backend: with `config.js` empty the data is read
from `events-data.js` and the site behaves exactly the same.

---

## 3. The map of pages

| Path | What | State |
|---|---|---|
| `index.html` | The landing page, five screens deep: the poster wall → how swiping works → a strip of cards → the turning city globe → a black footer screen | works |
| `explore/` | **The deck.** One card, left or right. Filters (country/city/kind/date), three sources (global deck / friends liked swipes / i feel lucky), the beforehours comments alongside | works |
| `explore/<slug>/` | **The event page** (a contact sheet) — 36 nights, all from one layout. See §6 | works |
| `maps/` | The city schematic, the venues as dots | works, **not linked from the menu** |
| `cards/` | **The card collection** — afterhours cards. Empty when signed in (there is no card logic yet) | a skeleton |
| `friends/` | Handle, adding friends, what you kept; familiar faces from nachtradar below | works |
| `login/` | Sign-in and account page. Three columns: sign in · (first time? / account settings) · give feedback | works |
| `settings/` | **Account settings** — handle, name, one line, city; who may see what you kept, whether you are findable by name, email; deleting the account | works |
| `feedback/` | **Feedback** — subject, message, an optional way to reach you. No sign-in needed | works |
| `register/` | **Registration** — two steps: email + password, then the handle (+ city). Registration does not count as finished until a handle is chosen | works |
| `help/` | How the site works. A band of three numbers at the top: friend connections · cards swiped · afterhours cards gathered | works, **the numbers are fixed** |
| `impressum/` `datenschutz/` `agb/` | The German legal pages | **placeholder** (the square brackets are still to be filled in) |
| `admin/` | Editing events, checking posters, moderating comments, the feedback inbox | `is_admin` only |
| `posters/` | 36 SVG posters, one per night | — |
| `sound/` | Two short recordings, entirely synthesised | — |
| `404.html` | A wrong address. It asks for no file from outside (it can be shown at any depth) and works the root path out from the address | works |
| `og/` | The sharing previews: 1200×630 per night, its own poster on the left | generated |
| `strip.html` | A parked sketch (horizontal strips) | leave it alone |

Every page has a **footer**: `© 2026 afterhours` + impressum · datenschutz
· agb. It has two forms: the normal one that sits in the flow, and
`foot thin` for the full-screen pages (`explore`, `maps`) where it sits in
the corner. Three pages have no footer: `index.html` (it has its own black
footer screen), `admin/` and `strip.html`.

---

## 4. How the data flows

```
config.js        Supabase URL + publishable key (both public)
   ↓
data.js          decides whether it is live or local
   ├── live   →  Supabase REST → turns the rows into the site's shape
   └── local  →  events-data.js, via data-fallback
   ↓
window.POSTERS   36 events: { slug, kind, title, meta, body, poster }
   ↓
data-after       the page's own scripts load ONLY after the data has arrived
```

The pattern on every page:

```html
<script src="../data.js?v=135"
        data-fallback="../events-data.js?v=135"
        data-after="explore.js?v=135, filters.js?v=135"></script>
```

The shared `AH` object: `AH.mode` (`live` / `local`), `AH.request()`,
`AH.errorText()`, `AH.session`, `AH.signedIn()`, `AH.sessionReady`
(a promise), `AH.onSessionChange(cb)`, `AH.refreshSession()` (renews an
expiring token; `AH.request` calls it before every request, so a page
left open past the hour keeps working), `AH.signUp()`,
`AH.signInWithPassword()`, `AH.events()`, `AH.kept()`, `AH.saveSwipe()`,
`AH.friends()`, `AH.comments()`, `AH.myProfile()`.

**Security:** the key in `config.js` is not a secret and does not need to
be one. What protects the data is the row-level rules in
`backend/sql/02_rls.sql`. The `service_role` key is **never** written into
this repository.

---

## 5. File by file

**The root**

| File | Job |
|---|---|
| `data.js` | The data layer. It runs first, then loads the page's scripts |
| `config.js` | Supabase URL + anon key + the default city |
| `session.js` | The session: talks straight to Supabase Auth's REST, the token lives in `localStorage` |
| `menu.js` | The menu as the session leaves it: "welcome \<name\>", an admin link for the admin |
| `swipes.js` | What was swiped left and right. `localStorage` when signed out, the database when signed in |
| `friendships.js` | Friend requests; the whole job is in database functions |
| `beforehours.js` | The event comments (reading is public, writing needs an account) |
| `app.js` | The landing page's five screens, the poster wall, the scrolling logic |
| `globe.js` | The turning city globe. No Three.js — its own projection maths, drawn onto a canvas |
| `venues.js` | The schematic coordinates of the Munich venues |
| `cards.js` | **The afterhours card generator.** `CARDS.front(night, id)` / `CARDS.back(night, id)` return SVG |
| `events-data.js` | The 36 events, the fallback used when the backend is off |
| `tools-event-pages.py` | Writes the shell of the event pages (§6) |
| `tools-favicon.py` | Generates the favicons (a different drawing per size) |
| `tools-previews.py` | Generates the `og/` previews: the poster through Chrome to PNG, the card assembled with PIL |

**The page scripts**

| File | Job |
|---|---|
| `explore/explore.js` | The deck: dragging, flying off, dealing again, the kept box |
| `explore/filters.js` | Our own drop-downs (not a native `<select>`) |
| `explore/comment-pools.js` | The beforehours pool — per kind, chosen with a seed from the slug |
| `explore/event.js` | **The one template that builds the event page** (§6) |
| `explore/event-data.js` | The event page's content pools, per kind |
| `cards/cards.js` · `card-data.js` · `session-state.js` | The collection: sample cards, hidden according to the session |
| `friends/friends.js` · `nachtradar.js` | Handle/friends/what you kept; the familiar-faces list |
| `login/login.js` · `shortcuts.js` | The sign-in form; the middle block changing with the session |
| `settings/settings.js` | The settings page: reads `profile_me()`, writes `profile_setup()`, PATCHes the switches straight onto `profile_settings` |
| `feedback/feedback.js` | Feedback: one job, adding what was written to the `feedback` table |
| `register/register.js` | Registration: `AH.signUp()` opens the account, `profile_setup()` writes the handle and finishes it |
| `maps/map.js` | Places the venues on the schematic |
| `admin/admin.js` | The admin panel |

---

## 6. The event page: a contact sheet

We do not write 36 pages for 36 nights. **One layout, and the content
comes from the data.**

The idea comes from photography: a contact sheet is not a result, it is an
inventory — "here is what I have". The page does not describe a single
night either, but this month's frame of something that keeps happening.

```
┌──────────┬────────────────────────────────┬──────────────┐
│ LEFT RAIL│ MIDDLE                         │ RIGHT        │
│ (fixed)  │                                │              │
│ poster   │ explore / <name>               │ which        │
│          │ edition 05 · your 3rd          │ friends are  │
│ credits: │ <TITLE>                        │ going        │
│ doors    │ kind · day date                │  ↓           │
│ curfew   │                                │ get the      │
│ capacity │ three paragraphs               │ ticket       │
│ door     │                                │  ↓           │
│ payment  │ THE ROLL — five frames, one    │ beforehours  │
│ photos   │ empty  [][][][ ][]             │ · friends    │
│ walk     │                                │              │
│ room     │ ─ the first screen ends here ─ │              │
│ from     │ editions you were at (cards)   │              │
└──────────┴────────────────────────────────┴──────────────┘
```

- **The left rail** stays put as the page scrolls. Deliberately dull: the
  identity of a series is not in what changes but in what does not. Only
  the things that are the same every edition live here — **the times are
  not here, they are in the frames.**
- **The frames** are all the same size. The resident and the guest sit in
  the same box; nobody is the big name, they all came off the same roll.
  The fourth frame is empty: "not shot yet / fills at the door". An empty
  frame is information too.
- **The right column** shows who is going first, then the ticket, then what
  your friends said about that night, that room or that date.
- **Below** are the past editions you were at — as real afterhours cards.

### Where the content comes from

| Part | Source |
|---|---|
| Title, kind, meta, first paragraph, poster | The event's own data (`POSTERS`) |
| The credit lines, roles, names, paragraphs, price, ticket wording, comments | `explore/event-data.js` — **pools per kind** |
| Which part lands on which night | **a mulberry32 seed made from the slug** |

So an event shows the same thing every time it is opened, and no two events
look alike. (`explore/comment-pools.js` uses the same pattern.)

What changes per kind — konzert says `get the ticket`, rave `get on the
list`, hausparty `ask for the address`, meetup `save a seat`; the roles
`dj set / support / headline` become `kitchen / living room / balcony`; the
credits say `bring something` instead of `card only`.

### Why the frames are cut from the poster

There are no real photographs. Every frame is **another band of the event's
own poster** (`--shift: 0 / 42 / 83 / 125`, poster 2:3, frame 3:2). Because
every night's poster is different, so is every roll. It is pulled to black
and white. When real photographs arrive, the only thing to do is change
where the frame gets its source in `event.js`.

### Adding a new event

1. Write the line into `events-data.js` (or add it to the database) —
   `slug`, `kind`, `title`, `meta`, `body`, the poster number.
2. Put the poster at `posters/NN.svg` (2:3, `xmlns` is required, the fonts
   go in the SVG's own `<style>@import`).
3. Write the shell:

```bash
python3 tools-event-pages.py 136
```

The argument is the version number (§10). It creates the folder and the
`index.html`, and the layout follows by itself.

---

## 7. The afterhours card

`cards.js` builds an SVG card out of a night's data. Three places use it:
the strip on the landing page, `cards/`, and the past editions on an event
page.

```js
CARDS.front(night, "unique-id")   // the front
CARDS.back(night, "unique-id")    // the back: that night's timeline
```

The `night` object: `city t ty v d metal motif in out dur crew more aud
msg who froze no at1 at2 q1 q2`. See `cards/card-data.js` for an example.

- **Metals:** steel, gold, chrome, copper, gunmetal, brass, rose, titanium,
  nickel, anthracite
- **Motifs:** rays, oval, diagonal, orbit, grid, moon, moire, bands, iso,
  descend

---

## 8. The backend

Postgres + Supabase. The tables: `cities`, `event_types`, `venues`,
`events`, `profiles`, `profile_settings`, `swipes`, `comments`,
`friendships`, `feedback`.

**The profile is split in two** — the public card (`profiles`: handle,
display name, one line, city, joined, last seen) and the settings only the
owner reads (`profile_settings`: who may see what you kept, whether you are
findable by name, email, language). Without the split, the read rule on
`profiles` would have opened the settings as well.

**The member list cannot be browsed.** The profile table is open directly
only to yourself, your confirmed friends, and anyone with a request pending
between you. Everything a stranger sees goes through functions that hand
back individually chosen fields: whoever knows your handle sees your card
(and that can be switched off in the settings), but cannot see how many
cards you kept, and last seen never leaves with its clock time — only as a
day, and only to a friend.

**A write may only say what the form asks.** The grants on `comments`,
`friendships`, `feedback` and `profiles` are per column: a comment arrives
as event, parent and body; a friend request as the two ends of it — born
`pending`, and only the side that received it may flip the status, so
consent cannot be skipped by inserting or self-accepting an `accepted`
row. `handled` belongs to the admin's PATCH, `created_at` to the clock,
`is_hidden` to a trigger that lets nobody but an admin move it (hiding a
comment is moderation, and moderation sticks). On the profile the direct
grant covers the four fields a person edits about themselves; joined,
last seen and onboarded move only through `seen()` and `profile_setup()`,
which are definer and set them honestly. The two owner-side functions —
`migration_done()` and `hide_past_events()` — had EXECUTE taken back from
the browser roles: the log and the cron job are not a public API.

**Which files have been run is written down.** The setup is pasted into
the Supabase editor by hand, so a project can sit a file behind while
everything still looks fine — a page just answers PGRST202 because the
function it wanted was never created. Every numbered file now stamps its
own name into `public.migrations` (00_migrations.sql), and
`npm run health` says how many of the thirteen are in and names the ones
that are not. Each file still runs on its own: the stamp is skipped when
the log is not there.

The signup flow: opening an account fires a trigger that creates the
profile **and** the settings row, but registration **does not count as
finished until a handle is chosen** (`onboarded_at`). The functions the
front end calls: `handle_status()`, `profile_setup()`, `profile_me()`,
`profile_card()`, `seen()`, `delete_account()`.

**A person can take their data with you.** `export_me()` hands back one
JSON object with everything tied to the caller — profile, settings, every
swipe named by its event slug, what they wrote, who they are connected to
and in which direction, and the feedback they left. The settings page saves
it as a file. It is the GDPR right of access and portability, and
datenschutz now points at the button instead of asking for an email. The
function takes no argument, so there is no way to aim it at somebody else;
`export.test.mjs` checks both halves — that everything of mine is in, and
that nothing of anybody else's is.

**Deleting an account really deletes it** — the account, the profile, the
settings, the swipes and the friendships all go with it. Comments are the
one exception: the text stays and the name falls away (`someone`). Two
reasons — deleting a topic would take other people's replies with it, and
the constraint on the `comments` table refuses a row with no author. The
settings page says so before it deletes.

For the setup, the tests (260 checks) and the local imitation of Supabase
(`tools/local-server.mjs`, PostgREST + GoTrue on top of PGlite) →
**[backend/README.md](backend/README.md)**

---

## 9. What runs on its own

**GitHub Actions** (`.github/workflows/test.yml`), on every push and pull
request. Three jobs, none of which needs a secret:

| job | what it refuses to let through |
|---|---|
| `backend` | the 260 checks, on a real Postgres (PGlite) |
| `generated` | SQL that has drifted from the files it was built from — it rebuilds and asks git whether anything moved |
| `versions` | more than one `?v=NN` across the pages, which would serve a stale script against a new stylesheet |

The site itself has no build step and nothing to check: it is plain HTML
the browser reads as it is. What can break in silence is the database and
the generated SQL, so that is what is watched.

A second workflow, `health.yml`, asks the live database how it is every
morning at 06:20 UTC — after the 05:30 job that drops past events, so what
it reports is the settled state. It needs no secret: the key in
`config.js` is the public one. `npm run health` exits non-zero when the
content is gone, when a SQL file has not been run, or when past events are
still on the deck, and a failed run is what sends the email.

`backend/package-lock.json` is committed — CI installs with `npm ci`, and
a lockfile is the only thing that makes that reproducible.

> **Both workflow files are on disk but not in the repository yet.** The
> token here has no `workflow` scope, so a push carrying
> `.github/workflows/` is refused. Adding that scope to the token, or
> pasting the two files through the GitHub web UI, is all that is left.

---

## 10. Publishing and caching

GitHub Pages, from `main`. `.nojekyll` is there (for the paths with an
underscore).

**Sharing and search.** Every page carries `description` + `og:*` tags; on
an event page the title, the description and the image come from the night
itself. `robots.txt` and `sitemap.xml` are at the root (`admin/` is
excluded). The preview images are regenerated with
`python3 tools-previews.py`.

**The version-number rule:** the `?v=NN` on every asset in every HTML file.
When CSS or a script changes, all of them go up together, otherwise the
browser keeps using the old file:

```bash
find . -name "*.html" -not -path "./.git/*" -not -path "./backend/*" | xargs perl -pi -e 's/\?v=135/?v=135/g'
```

The current version: **137**.

---

## 11. From nothing, step by step

The order matters: each step closes the road the one before it opened.

**Done**

- [x] The landing page, five screens
- [x] The deck: dragging, filters, three sources, the kept ones
- [x] The beforehours comments (reading + writing)
- [x] Session, handle, friendship, what you kept
- [x] Backend: schema, RLS, seed, tests, the local imitation
- [x] The admin panel
- [x] The footer + the legal pages (placeholder)
- [x] The account page shortcuts
- [x] **The event page system** — 36 nights, one layout
- [x] **The profile structure** — card + settings, the signup step, the privacy rules, 57 tests
- [x] **The settings page** — `settings/`, working together with its backend
- [x] **Feedback** — `feedback/` + the `feedback` table, 16 tests
- [x] **Registration** — `register/`, two steps, unfinished until a handle is chosen
- [x] **Sharing and search** — meta/og tags, a preview image per night, robots, sitemap
- [x] **404, `maps/` in the menu, an accessibility pass, errors in human language**
- [x] **The feedback inbox** — in the admin panel
- [x] **The code translated into English** — classes, ids, filenames, the `AH` API, the data fields, the comments, the docs (§13)
- [x] **CI, a migration log, and a repeatable setup** — §9, and `npm run health` says which SQL is live
- [x] **A backup that is provably restorable** — `npm run restore`, checked field for field by `backup.test.mjs`
- [x] **Take your data with you** — `export_me()` and a button on the settings page (GDPR Art. 15 and 20)

**Next (a suggested order)**

1. **Widening the event data.** Today there are five fields
   (`slug kind title meta body`). Everything on the event page — the
   line-up, the times, the capacity, the price, the rules — is currently
   invented from a pool. To make it real, fields have to be added to the
   `events` table. Once that is done the `event-data.js` pools become only
   a **fallback**.
2. **The card collection.** The heart of the concept and the most expensive
   part: past-night data, deciding what "that night's sound and talk" even
   means, and generating the cards.
3. **Filling in the legal pages** — the square brackets and a real Stand
   date.
4. **Real photographs** — real frames instead of bands of the poster.
5. **Making the three numbers on the help page real** — two of them can be
   worked out today (`swipes`, `friendships`); the third is impossible
   before the card collection exists.

---

## 12. Known traps

Every one of these cost us something:

- **`filter` does not work on an SVG inside `<object>`** (it is a separate
  document). What makes the frames grey is a `mix-blend-mode: saturation`
  layer.
- **An SVG inside `<img>` cannot load a webfont.** That is why the posters
  come through `<object>`; and `<object>` in turn wants
  `pointer-events: none`.
- **`[hidden]` loses to `display`.** That is why `style.css` has
  `[hidden] { display: none !important }`.
- **`lang="tr"` + `text-transform: uppercase`** turns i into İ in Turkish
  ("CLUB NİGHT"). The pages are `lang="en"`, the legal pages `lang="de"`.
- **`overflow-x: clip` on `body` alone does not clip** — it also needs
  `html:has(body.explore)`.
- **A flex/grid item without `min-width: 0`** lets a long paragraph push
  the page sideways.
- **Google Fonts** sends the IP to Google; that is written into
  datenschutz. Serving them locally would drop that clause.
- **Adding a second `id` to a `<main>` breaks the page silently.** While
  adding `id="content"` for the skip link, two `<main>` elements already
  had their own `id`; the browser keeps the first, `getElementById` no
  longer finds the old one, and the admin panel would not open. In a bulk
  edit, look at the existing attribute first.
- **A test tied to the calendar breaks by itself.** `jobs.test.mjs` ran on
  the real dates in the seed; once 29.08.26 went past, the number it
  measured shifted. A test should measure the rule, not the day: the setup
  block now pushes every event into the future first.
- **The preview panel** does not repaint scrolled content; a screenshot
  needs a fresh load. For measuring, `getBoundingClientRect` is more
  reliable than the panel.
- **A bulk rename quietly breaks the tools nobody runs daily.** The English
  pass left `world-sql.mjs` reading a file that no longer existed,
  `build-seed.mjs` reading field names that had moved, `backup.mjs` writing
  into a folder that did not exist, two `<label for=…>` pointing at ids
  that had been renamed, and ten `"hata"` status classes the stylesheet no
  longer knew. None of it showed in the browser. After a rename, run every
  tool once and check every cross-file reference.
- **A rename that treats an object key and a property read differently
  breaks the page in silence.** A word-boundary regex that excludes a
  leading dot renames `east:` in an object literal but leaves `b.dogu`
  alone, so the read returns `undefined`. That is what froze the globe.
  Rename a key and every read of it in the same pass, and afterwards check
  that no property is read that no key defines.
- **Two Turkish names can translate to one English name.** `metin` (the
  textarea) and `yazi` (its trimmed text) both became `text`, producing
  `const text = text.value.trim()` — a ReferenceError on every click, and
  the feedback page could not send anything. A rename tool must refuse a
  target name that is already an identifier in that file.
- **`npm run backup` did not work at all.** The bulk rename of the `sira`
  column had also renamed PostgREST's `order=` query parameter to
  `sort_order=`, and the API answers 400 to that — so the tool failed on
  its first request. The local server had the mirror of it and ignored
  ordering entirely. A parameter that belongs to somebody else's API is not
  yours to rename.
- **`create or replace view` can add a column but never rename one.** The
  live project was built while the code was Turkish, so its `events_public`
  carried `type_sira`; today's file wanted `type_sort_order` and the paste
  stopped dead with `42P16: cannot change name of view column`. The same is
  true of a function's OUT parameters — `friends_list()` and `health()`
  came next. Both need a `drop` first, and `upgrade.test.mjs` now rebuilds
  the pre-rename database from git and pastes today's setup onto it, which
  is the only way to see this at all.
- **Pasting a setup file twice used to double every conversation.** The
  structure files were already repeatable (`on conflict do nothing`), but
  the comment seed had no guard. It now clears the previous sample set
  first, recognising it by `time_text` — the one column only the seed ever
  writes. `setup.test.mjs` runs the whole setup twice and insists nothing
  moved.
- **An apostrophe in a SQL comment breaks the Supabase editor.** Its parser
  counts quotes and counts the ones inside comments too, so a single `'`
  turns the rest of the file into code. `seed.test.mjs` enforces this.
- **`datetime-local` speaks local time; `toISOString()` speaks UTC.**
  Filling the field with `toISOString().slice(0, 16)` and reading it back
  with `new Date(value)` shifts the stored time by the UTC offset on
  every open-and-save — in Munich, two hours earlier each time, and the
  drift walked events into the cron job's "past" window. Build the field
  value from the local clock (`admin.js`, `localInputValue`).
- **A bare UPDATE slips past the read rule; a WHERE does not.** An update
  that has to READ the row (a `where id = …`, a `returning`) also obeys
  the SELECT policy, so a hidden comment cannot even be aimed at by its
  writer — but `update … set is_hidden = false` with no WHERE reads
  nothing and reaches every row the update rule allows, hidden included.
  A row an update rule exposes is only protected if a trigger or a column
  grant stands behind it; the write-a-test-first way is the only way this
  showed up at all.
- **`perl -pi -e` with `|` as the delimiter and a `?v=` pattern** is a way
  to shred a file: the escaping is nested three deep (shell, perl, regex).
  For version bumps, use the command above and read the diff afterwards.

---

## 13. The old names

**The code was translated into English on 30.08.2026.** Class names, ids,
filenames, the `AH` API, the data fields, the comments and the
documentation are all English now. This table is here for anyone reading
older commits:

| Old | Now |
|---|---|
| `ayar.js` / `oturum.js` / `veri.js` / `atislar.js` | `config.js` / `session.js` / `data.js` / `swipes.js` |
| `data-yedek` / `data-sonra` | `data-fallback` / `data-after` |
| `AH.durum` / `AH.istek` / `AH.girisliMi` | `AH.mode` / `AH.request` / `AH.signedIn` |
| `KARTLAR.on` / `KARTLAR.arka` | `CARDS.front` / `CARDS.back` |
| `deste` / `atis` / `ucur` | deck / swipe / fly the card away |
| `kirinti` / `dipnot` / `kunye` | breadcrumb / footer / colophon |
| `ray` / `kare` / `poz` | rail / frame / exposure |
| `oturum` / `girisli` / `jeton` | session / signed in / token |
| `serit` / `sehir` / `mekan` | strip / city / venue |
| `yorum` / `konu` / `cevap` | comment / thread / reply |
| `tohum` / `havuz` / `karistir` | seed / pool / shuffle |
| `sira` (SQL column) | `sort_order` |
| `yon` with `giden` / `gelen` | `direction` with `outgoing` / `incoming` |
| `hedef` (SQL variable) | `target` |
| `profiles_ad_uzunluk` / `profiles_bio_uzunluk` | `profiles_name_length` / `profiles_bio_length` |
| `feedback_yeni_idx` | `feedback_recent_idx` |
| `"posters yonetici yazar"` (policy) | `"posters admin writes"` |
| `afterhours-gecmisi-dusur` (cron job) | `afterhours-drop-past` |
| `ses/` | `sound/` |
| `backend/yedek/` | `backend/backup/` |
