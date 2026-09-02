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
| `explore/<slug>/` | **The event page** (a contact sheet) — all 142 nights, Munich and the world, from one layout. A night missing from the deck is fetched live by its slug. See §6 | works |
| `maps/` | The city schematic, the venues as dots | works, **not linked from the menu** |
| `cards/` | **The card collection** — afterhours cards. Empty when signed in (there is no card logic yet) | a skeleton |
| `friends/` | Handle, adding friends, what you kept; familiar faces from nachtradar below | works |
| `login/` | Sign-in and account page. Three columns: sign in · (first time? / account settings) · give feedback | works |
| `settings/` | **Account settings** — handle, name, one line, city; who may see what you kept, whether you are findable by name, email; deleting the account | works |
| `feedback/` | **Feedback** — subject, message, an optional way to reach you. No sign-in needed | works |
| `register/` | **Registration** — two steps: email + password, then the handle (+ city). Registration does not count as finished until a handle is chosen | works |
| `reset/` | **A new password** — sends the recovery link signed out; sets the new password once the link lands you back signed in | works |
| `help/` | How the site works. A band of three numbers at the top: the first two are live from `health()`, the third waits for the card collection | works |
| `impressum/` `datenschutz/` `agb/` | The German legal pages | **placeholder** (the square brackets are still to be filled in) |
| `admin/` | Editing events, checking posters, moderating comments, the feedback inbox | `is_admin` only |
| `posters/` | 142 SVG posters, one per night | — |
| `sound/` | Two short recordings, entirely synthesised | — |
| `404.html` | A wrong address. It asks for no file from outside (it can be shown at any depth) and works the root path out from the address | works |
| `og/` | The sharing previews: 1200×630 per night, its own poster on the left, all 142 | generated |
| `strip.html` | A parked sketch (horizontal strips) | leave it alone |

Every page has a **footer**: `© 2026 afterhours` + impressum · datenschutz
· agb. It has two forms: the normal one that sits in the flow, and
`foot thin` for the full-screen pages (`explore`, `maps`) where it sits in
the corner. Three pages have no footer: `index.html` (it has its own black
footer screen), `admin/` and `strip.html`.

**Every surface.** The layout is desktop-first and narrows in bands, each
a `@media` block in `style.css`: below **1180px** the photo scales with
the viewport (`min(780px, 46vw)`) and the intro starts under the sound
rows — the two were printing over each other on a tablet; below
**1000px** explore gives up its four-column grid and flows as one column
(its corner footer joins the flow at the end); below **900px** the globe
screen moves the walking-distance list to the bottom of the frame (it
shared a band with "go local." and they collided) and the footer screen
gives the sónar note its own line and the button a full row; below
**720px** the rest stacks — the menu wraps, the sound rows become a
bottom bar, the photo leaves. The desktop at 1440 is untouched by all of
it: poster 146×219, photo 780px, measured after every pass.

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
`AH.signInWithPassword()`, `AH.requestRecovery()`, `AH.updatePassword()`,
`AH.events()`, `AH.kept()`, `AH.saveSwipe()`,
`AH.friends()`, `AH.comments()`, `AH.myProfile()`.

**Real events (Ticketmaster).** Since v141 the database also holds synced
nights: `source = 'ticketmaster'`, an `image_url` (a photograph instead of
a drawn poster), a `ticket_url` (a real ticket page) and an `external_id`
the daily sync upserts on, so a night keeps its uuid and the swipes on it
survive. The deck's default is now **everywhere** — `deck(null)` deals the
whole world, soonest first — and the explore filter opens on
everywhere/everywhere. A synced night renders as an `<img>` (2:3, cropped
with `object-fit: cover`) wherever a drawn night renders an `<object>`,
and its event page is the shared shell `explore/event/index.html?slug=...` — no
folder is generated for it. The landing is live, and its wall is CURATED:
`featured.js` names twenty hand-picked nights (01.10.2026 → 01.01.2027;
the best covers, the most gloriously absurd, the loudest names — The
Weeknd's After Hours Til Dawn leads, for the obvious reason) that hold
the wall in written order until their dates pass; each entry may carry a
`pos` (object-position) to seat its cover in the 2:3 frame, and a `body`
— the line the hover panel speaks for that night, each of the twenty in
a different register (a customs form, a shipping forecast, a bug ticket,
a diplomatic cable...) — and an `artist` + `song`: the act's most famous
track, hand-picked. On the event page a small chip sits ON the poster
(no height added) and plays the Apple Music preview of that song — no
key, no account; the arrow beside it leads to the store, which is the
use Apple hands the previews out for. The two non-music nights carry no
song and show no chip. Whatever the
calendar takes, a random hand covers: `data-sample="36"` on its data.js tag pulls a wide
pool (`deck(null)`, limit 300), keeps only nights with a photograph, hangs
a recurring show once, shuffles, and cuts to 36 — the wall shows the
first 20, the globe the lot. The drawn posters remain only as the offline
fallback and on the seed pages; they are being retired. The coverage (which cities exist at all) is
`backend/sql/16_coverage.sql` — all of Europe, key Asia, North America —
and it moves together with the city map in
`backend/tools/sync-ticketmaster.mjs`.

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
| `tools-event-pages.py` | Writes the shell of ALL 142 event pages and the sitemap (§6) |
| `tools-favicon.py` | Generates the favicons (a different drawing per size) |
| `tools-previews.py` | Generates the `og/` previews for all 142 nights: the poster through Chrome to PNG, the card assembled with PIL |
| `tools-site-check.py` | Walks every reference on the site: every href/src resolves, every event has page+poster+og, one `?v=` (the CI `site` job) |
| `fonts/` | The three typefaces as woff2 + `fonts.css`, served from here — no request leaves for Google |
| `manifest.webmanifest` | The site as an installable app: name, colours, icons |

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
│ payment  │ THE AFTER — a bracket out of   │ beforehours  │
│ photos   │ the closing time  ■─┬──┬──┘     │ · friends    │
│ walk     │                                │              │
│ room     │ ─ the first screen ends here ─ │              │
│ from     │                                │              │
├──────────┴────────────────────────────────┴──────────────┤
│ IF YOU GO — a black band, both faces of the card the     │
│ night leaves you, with nothing written on them yet       │
└──────────────────────────────────────────────────────────┘
```

- **The left rail** stays put as the page scrolls. Deliberately dull: the
  identity of a series is not in what changes but in what does not. Only
  the things that are the same every edition live here.
- **The after** is the section this page exists for. A bracket drops out of
  the moment the room empties and every branch is a room that is still
  open, in the order they open — the time is the story, the walk is a
  footnote. No pictures in it on purpose: the poster is on the rail and the
  cards are at the foot, and between them this has to read like a departure
  board rather than a third gallery.
- **The right column** shows who is going first, then the ticket, then what
  your friends said about that night, that room or that date. The list is
  no longer only *your* friends, and that is the point of it: two of the
  five you know, the rest arrive **through** somebody. Each row is a face,
  a name, and an answer — `going`, `kept it` (the swipe, no ticket) or
  `can't` — and the answer is also readable without reading, because a
  face dims as the answer weakens. Hovering a row swaps the handle under
  the name for **the path back to you**: you as a filled square, then a
  small face per hop, then *friend of emre* or *friend of friend of kurt*.
  Somebody is going is not information; a friend of Emre is going is a
  plan. Where there is no pointer (`@media (hover: none)`) the path is
  simply always the one showing.
- **The band at the foot** is a sibling of the contact sheet, not a fourth
  item in it (see the traps). It is the only black on the page and the last thing
  on it: paper, then the band, then the metal. It carries **both faces** of
  the card this night would leave you — the front is who stood there, the
  back is what the night sounded like and what got said in it. Nothing on
  it has happened, so nothing on it is filled: `NOT YET`, dashed crew
  squares, `AUDIO —:—`, `ROOM OPEN`, `NO. NOT ISSUED`. The slots are drawn
  and left empty rather than hidden or blurred — **a blur says pay me, an
  empty slot says go.** It used to say "editions you were at", which we had
  no way of knowing.

### Where the content comes from

| Part | Source |
|---|---|
| Title, kind, meta, first paragraph, poster | The event's own data (`POSTERS`) |
| The credit lines, the after rooms, paragraphs, price, ticket wording, comments | `explore/event-data.js` — **pools per kind** |
| Which part lands on which night | **a mulberry32 seed made from the slug** |
| The card's metal and motif | `featured.js` for a hand-picked night, otherwise the seed |
| Everybody's face | `avatars.js` — drawn from the name, so a person keeps one |

So an event shows the same thing every time it is opened, and no two events
look alike. (`explore/comment-pools.js` uses the same pattern.)

What changes per kind — konzert says `get the ticket`, rave `get on the
list`, hausparty `ask for the address`, meetup `save a seat`; how long the
night runs before the after starts counting (`RUNS`: a konzert three hours,
a rave eight); the credits say `bring something` instead of `card only`.

### How the after keeps its clock

Doors plus the run of the kind is when the room empties, and the bracket
hangs off that. A room may only open between **21:00 and 04:00** — past
four nothing opens any more, and a night that already ran into the morning
simply has no after, which the section says out loud instead of inventing
one. A night that ends in the afternoon waits for nine. Closing times are
whole hours between four and eight hours out, so nothing shuts at two in
the afternoon.

### The deck card, for a night with a photograph

A listing photograph is **16:9** and the deck frame is **2:3**. Filling one
with the other keeps 37.5% of the picture's width and throws the rest away
from the centre out, which is how a card ends up showing half a face. So a
synced night (`.ex-card.ex-photo`, built by `fillPhotoCard`) does not crop:
the picture is a **16:9 band across the top**, and the two thirds of the
card left under it are set in type — kind, then the title in the middle of
the space, then the room and the date on the floor of the card. That is the
same order the card in the collection is built in (artwork, a rule, then
the night in writing), so the thing you swipe and the thing you keep speak
one language. The card grows a hairline edge here for the first time,
because without one the type reads as a caption lying on the page instead
of the lower half of an object.

**The shape of the card follows the shape of the picture.** The band is
not fixed at 16:9: once the picture has loaded, `shapeCard` sets the band's
`aspect-ratio` inline to the picture's own, clamped between 1:1 and 2:1, and
the type takes whatever is left (a square band keeps three title lines,
wider ones four). Under 1:1 the picture is a **poster**, and it gets the
poster's layout (`.ex-card.ex-poster`): shown whole on the white of the
card, never cropped, the small strip beneath — the layout a drawn night has
always had. The real posters earned it: they carry the room, the date and
the line-up in their own hand, so printing the title again underneath would
only repeat them. Of 1000 live pictures, 865 are Ticketmaster 16:9 press
shots; the rest (ticketweb, universe) are 3:2, square, and true upright gig
posters — Nashville and New York are full of them.

The ratio is read at load time (`img.onload` → `naturalWidth/Height`), so
a card assumes 16:9 until the picture lands and may settle once; the deck's
pictures load eagerly (only three cards exist at a time) to keep that
settle ahead of paint. The next step, if the layout stays: store `image_w`
and `image_h` at sync time — Ticketmaster hands them over and the other
two hosts write them into the URL — so the card knows its shape before the
picture arrives.

**A night with no picture is set in type** (`.ex-card.ex-type`). One in
nine synced nights carries no picture at all — most of them İzmir,
İstanbul and Ankara, where the listings hand over only a generic
placeholder the sync rightly refuses. It used to be a grey box. Now the
card is the written half on its own, set large: the kind as a masthead
with a rule under it (the rule a photograph card's band draws with its
bottom edge), the title at up to five lines in the size the missing
picture leaves it, the room and the date on the floor. Three card states,
one grammar: picture-and-type, poster-and-strip, type alone.

And the sync no longer keeps a picture under 500px wide: `imageFor` used
to fall back to whatever was left, which was a 305px thumbnail the deck
then blew up to twice its size on a retina screen. Under 500px a picture
is worse than none; those nights are set in type after the next daily
run. (Of 3618 live nights: 2759 Ticketmaster 1136px press shots, 417
without a picture, 264 ticketweb 640px, 148 universe 1024px, 29 tiny.)

The deck box is unchanged (`--ex-w * 1.5 + --ex-info-h`), so nothing else
in the column had to be re-derived. A **drawn** night — today only the
offline deck — still gets the old poster plus the strip underneath.

### Holding a card up, and the way back

Two taps on the top card and it comes forward over a white veil, about
1.5× the size (`zoomIn` in explore.js — the same element moved by
transform, measured from where the deck is; nothing is cloned). One more
tap on it opens the night; a tap on the veil or Esc puts it back. It is
read from pointer events, not `dblclick`, so a thumb and a mouse are the
same gesture, and a tap is a press that did not travel — a short drag that
snapped back is not half of one. Arrow keys are inert while a card is up.

The back button finds the deck the way it was left. Before leaving, a note
goes into `sessionStorage` (`afterhours.deck`): the mode, the filter, the
**order of the whole deck** by slug, the card, the counter, and whether it
was held up. It is read only on a `back_forward` arrival (a plain visit to
explore starts clean) and goes stale after half an hour. On arrival the
filter is written into the object filters.js draws from, the deck is
pulled again wide (no date window) and rebuilt in the remembered order —
the order and not the filter, because the window moves at midnight and the
first deal of the day does not apply it the way a redeal does — and the
remembered card is dealt to the top, held up again if it was. Cards swiped
in between simply are not there. Through the bfcache none of this runs:
the DOM comes back intact, card still up.

Found on the way: `stack()` never cleared the transform of the card that
had just come to the top, so it stayed 4.5% smaller and 14px lower until
touched. It does now.

### Somebody's page — `profile/?handle=…&via=…`

You get here from a name in the column of who is going, and the link
carries the path (`via=jonas,nils`), because a page about somebody you do
not know should open on how you know them. Three things from three
sketches, in the order the question arrives:

1. **The path** — you as the filled square, a face per hop, the person at
   the end, hairlines between; "friend of friend of jonas"; the last hop
   can introduce you. Each hop is a link to its own page, path included.
2. **The head and the roll** — face, name, `@handle · city · since`, one
   line; then the nights they kept as a **contact sheet**: nine real nights
   from the listings in their city, in colour (the proof-sheet grey was
   tried and taken off — on this page the nights are the person), numbered,
   each leading to its night, and a tenth frame "not shot yet".
3. **The shelf** — the same black band the event page ends on, with the
   cards those nights left them with on `cards.js` plates, metals dealt by
   the seed; and the sentence that none of them are real yet.

Everything is drawn from the handle with the event page's seed, so a
person looks the same from every night. **A real account** with that
handle (`profile_card`, callable signed out) takes over its own name, line,
city and date — and nothing from the pools is said about a real person: no
line if they wrote none, no counts the database did not hand over. What is
still missing for real people is their kept nights (no RPC lets one person
read another's; the roll shows their city's nights instead) and real
cards, which do not exist for anybody yet. Everybody is public for now,
as agreed.

### The faces

Nobody has uploaded a photograph, and an initial in a box was standing in
for one. `avatars.js` draws the placeholder instead: **a frame shot in a
dark room** — one lamp, a silhouette cropped by the edge of the picture,
and grain over the top. You can tell two people apart and you cannot see
either of their faces, which is the honest amount to show for a night that
has not happened. Everything comes from the name, so a person wears the
same face on every page.

The crop is the whole trick and it took three passes to learn it: a head
that fits neatly inside a square, centred, with two clean shoulders under
it **is** the little grey person every site shows when there is no
photograph. So the head is drawn big enough that the frame cuts it, and it
is placed in the outer thirds and never in the middle. When real
photographs arrive the only thing to change is the `<img>` that replaces
what this function returns.

### The unearned card

`cards.js` draws the same plate either way; `blank: true` on the night is
what empties it. A hand-picked night in `featured.js` may carry `metal`,
`motif` and a `card` line of its own — The Weeknd gets **rose gold and the
moon motif**, because rose gold is the colour dawn actually is and the
motif runs three rows of phases down the plate. That is the tour name,
printed as metal. Everything else is dealt a metal from the slug, so a
night always turns up wearing the same card.

The plate is 400 units wide and a listing title is not: the card takes the
artist from `featured.js` when there is one, and otherwise cuts the title
at the colon — `Artist: Tour Name` is how the listings are written.

**The rooms are invented for now** (`AFTERS` in `explore/event-data.js`) —
they are placeholders, not real venues. The moment the after is wired to
the deck they come out of our own events: same city, same night, a later
start. Nothing in the section is booked with the ticket, which is the
entire point of it.

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

For the setup, the tests (278 checks) and the local imitation of Supabase
(`tools/local-server.mjs`, PostgREST + GoTrue on top of PGlite) →
**[backend/README.md](backend/README.md)**

---

## 9. What runs on its own

**GitHub Actions** (`.github/workflows/test.yml`), on every push and pull
request. Three jobs, none of which needs a secret:

| job | what it refuses to let through |
|---|---|
| `backend` | the 278 checks, on a real Postgres (PGlite) |
| `generated` | SQL that has drifted from the files it was built from — it rebuilds and asks git whether anything moved |
| `versions` | more than one `?v=NN` across the pages, which would serve a stale script against a new stylesheet |
| `site` | a reference that leads nowhere — every href/src in every page, and page+poster+og for all 142 events |

A third workflow, `sync-events.yml`, pulls the real events: every morning
at 04:10 UTC it runs `backend/tools/sync-ticketmaster.mjs`, which asks
Ticketmaster city by city (the coverage of `16_coverage.sql`), files each
event under one of the six kinds, composes the meta line, picks a 16:9
photograph, upserts on `external_id` and prunes the nights that have
passed. Three house rules hold, on the way in and swept over what is
already there: nothing before 18:00 (festivals and raves exempt — real
ones start in the afternoon), no add-on listings ("VIP Ticket",
"Box-Seat", "Parking permit" — receipts, not nights), and a show that
repeats is ONE package — the soonest night stands for the run and its
meta line carries the span ("Venue · 20.11.26 → 23.12.26 · 20:00"). It needs the two secrets named inside it; run it by hand from the
Actions tab any time. `--dry` locally shows what it would write.

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

The current version: **168**.

The explore date filter is real now (every synced night carries a true
date): tonight / tomorrow / this weekend / this week / this month /
any night, cut client-side out of a date-ordered pull. And one type
rule: the small labels are Inter Tight like everything else — JetBrains
Mono lives on only inside the drawn poster and card artwork.

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
- [x] **The whole audit closed** — 29 findings in three passes: consent, moderation, grants, session, and the rest (§8, §12)
- [x] **Every surface** — the width bands in §3, measured at five widths
- [x] **Fonts served from here** — `fonts/`, no request leaves for Google; datenschutz says so
- [x] **All 142 nights have pages** — world shells, og previews, sitemap; a missing slug is fetched live in `event.js`
- [x] **The landing page derives itself** — globe nights and the near list come from `POSTERS` (colour and minutes stay hand-picked per slug)
- [x] **Two help numbers are real** — `health()` counts swipes and friendships, `help.js` writes them in
- [x] **A new password** — `reset/`, request + set, and the forgot link under sign-in
- [x] **Replies, a deck count, and two ways out of an empty deck** — beforehours answers, "03 / 36", deal-again / try-another-city
- [x] **The site checks itself** — `tools-site-check.py` walks every reference; the CI `site` job runs it
- [x] **Real events** — the Ticketmaster sync (§4, §9): the worldwide deck, the everywhere filter, photographs and real ticket pages; the invented nights retire via `cleanup-seed-events.sql`
- [x] **Installable** — `manifest.webmanifest`, and the poster wall lazy-loads below the fold

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
4. **The after, wired to the deck** — the rooms come out of our own events
   (same city, same night, a later start) instead of the placeholder pool.
5. **The third help number** — impossible before the card collection
   exists; the first two are live now.

---

## 12. Known traps

Every one of these cost us something:

- **A sticky grid item is clamped to the grid CONTAINER, not to its own
  row.** The card band began life as a fourth child of `.cs` spanning all
  three columns, and the sticky poster and the sticky right column slid
  straight down over the top of it — measured at 1111→1698 against a band
  that started at 1243. The band is a sibling of the contact sheet now,
  which also spared it the negative margins it needed to reach the edges.
- **Bare class names collide across pages.** The explore card was given
  `photo`, which the landing page's portrait block already owns and which
  is handed `width: min(780px, 46vw)` further down the same file. An empty
  card in a 317px deck measured 780px wide and every theory about grid
  containing blocks and `aspect-ratio` was wrong — the class list was the
  thing that needed reading. Explore classes keep the `ex-` prefix.
- **`filter` does not work on an SVG inside `<object>`** (it is a separate
  document). Anything that needs an SVG poster pulled to grey has to lay a
  `mix-blend-mode: saturation` layer over it instead.
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
- **Google Fonts** used to send the IP to Google with every page and
  every poster. The fonts live in `fonts/` now (woff2 + one CSS), the
  posters `@import` it relatively, and datenschutz says so. 404.html is
  the one page with NO webfont: it renders at any depth, so no relative
  href can be trusted there.
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
documentation are all English now — a second pass on 31.08.2026 caught
the stragglers the first left behind (`egim2`, `enYakin`, `araAlan`,
`BOS_MESAJ`, the Turkish halves of mixed comments), so only `strip.html`
(parked, untouched on purpose) and the legacy `afterhours.oturum`
localStorage key (kept so old sessions still migrate) remember the old
names. This table is here for anyone reading
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
