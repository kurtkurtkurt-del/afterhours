# afterhours — project instructions for the creative side

> Paste this into the project instructions. It describes everything that
> exists in the afterhours repository as of 10.10.2026, how it looks, how it
> speaks, and the rules to follow when adding anything creative: copy, a
> spark, a poster, a featured night, a screen, a card. `README.md` stays the
> technical reference (every file, every SQL, every trap). This file is the
> brief.

---

## 0. How to use this document

- Read §1–§4 before writing or designing anything. They are the product, the
  look and the voice. Everything else is built on them.
- §5 is the complete feature inventory, surface by surface. Use it to know
  what already exists before proposing something.
- §6 is what is sample, placeholder or not built. Use it to know where the
  creative work is actually needed.
- §7 is the checklist for each kind of creative addition.
- §8 is where the creative files live.

When a new feature or piece of copy is made, it also gets written into
`README.md` (the project's single technical reference). Nothing is done
until it is written down there.

---

## 1. What afterhours is

**find your night. one card at a time.**

afterhours is an app and a website for deciding whether to go out tonight.
A night is a rave, a club night, a konzert, a festival, a meetup or a
hausparty. Munich first, Istanbul next, and 94 cities the daily
Ticketmaster sync reaches (all of Europe, key Asia, North America).

The product in three sentences, decided and not up for renegotiation:

1. **There is no search. Anywhere.** A night is not the thing you look for,
   it is the thing that comes to you. In the app the deck hands you one
   card: swipe right and you **keep** it, swipe left and you **let it go**.
   On the web the same nights hang on **the wall**, soonest first.
2. **What matters is not the night but the continuity.** Every night you
   go to turns into an **afterhours card**: the sound of that night, the
   talk, who was there. The collection holds the past; "now and next" lives
   somewhere else.
3. **A page does not sell you a night.** The night page does not say "here
   is what is on tonight", it says "this is how many times it has been
   you". There is a ticket button, one word, `ticket`, but it is not the
   centre of the page.

**Two surfaces, one product.** The app is where the night happens: the
deck, the map, who's coming, check-in, the room, the collection, the djs,
sparks, groups, posts. The web is the door and the archive: the landing,
the wall, every night's page, the account and its settings, and for what
lives in the app a page that says so ("only available in the app"). The
words are the same on both sides.

**The line that sums it up** (from the store listing): *we count nights
out, not minutes in.*

### The world, in one vocabulary

Decided 25.09.2026. The app's wording wins where the two surfaces disagree.
This is the English of three languages (see §4).

| Say | Never |
|---|---|
| a **night** | an event (in the UI; `events` is only the table) |
| kinds, lowercase: **rave · club night · konzert · festival · meetup · hausparty** | genres, categories, "Concert" |
| **keep / let go** | like, save, dismiss, swipe right/left in copy |
| the kept list is **yours** | favourites, saved, wishlist |
| **who's coming?** → **i'm in · maybe · not tonight** | RSVP, attending, going |
| **where · when · kind**, then **ticket / szene** | venue, date, category |
| the button is the one word **ticket** | buy tickets, get tickets |
| the date reads **thu 26.09 · 20:00** (the card keeps `26.09.26`) | Sep 26, 2026 |
| time filter: **tonight · tomorrow · this weekend · this week · this month · any night** | upcoming, soon |
| **the deck** (app) · **the wall** (web) | feed, list, results |
| **the room** (open 48h after check-in, then frozen) | chat, group chat |
| **beforehours** (the comments before a night) | comments, discussion |
| **the afterhours card** (what a night leaves you) | badge, trophy, achievement |
| **the collection** | history, past events |
| **a spark** (a night nobody has organised yet) | plan, event, hangout |
| **a wave** (1st = friends, 2nd = their friends, 3rd = one step further) | audience, circle, network |
| **your people** | friends list, followers, contacts |
| **szene** (a night whose address shows only at check-in) | secret, underground, hidden |
| **the panel** (staff) | admin dashboard, back office |
| **handle** | username |
| **a sleeve** (a profile drawn as a record sleeve) | profile card |

Brand words that are never translated: **afterhours, beforehours, szene**.

---

## 2. The look

Two palettes, different on purpose. Colour otherwise lives only in the
posters, the photographs and the cards.

### The web: black and white

- `#000` on `#fff`. No boxes, no shadows, no rounded corners. The divider is
  a 1px hairline.
- Desktop-first at 1440 (poster 146×219, photo 780px), narrowing in bands at
  1180 / 900 / 720 px.
- The only black on a night page is the card band at its foot: paper, then
  the band, then the metal.
- The small lines are 10px, 0.14–0.18em tracking, uppercase, 38–50%
  opacity.

### The app: ink on paper

From `app/src/theme/tokens.ts`. No pure white, no pure black.

| Token | Value | Use |
|---|---|---|
| `paper` | `#F3F1EC` | the ground |
| `paper2` | `#FAF9F6` | a lighter paper |
| `ink` | `#0E0D0C` | text, dark pages, the tab bar |
| `ink2` | `#6C6961` | secondary text |
| `ink3` | `#2A2724` | hairline on dark |
| `rule` | `#D9D5CC` | dividers on paper |
| `mute` | `#A9A59C` | muted text on dark |
| `meta` | `#7F7B73` | the small uppercase meta lines |
| `spot` | `#D7261E` (red, default) | the accent: live · kept · on; buttons, the dot in the logo, live rings |
| `spotText` | `#F0443A` | the accent as small text on ink |

**The accent** is red by default and can be picked in settings → app:
red · green `#1E9E57` · yellow `#E5B000` · blue `#2D6BE0` · pink `#DD3B8A`.
Gold is reserved for **sparks** (gold diamond on the map, gold cards on
yours). Design for red; check nothing breaks in the other four.

**Radii** (since 28.09.2026, rounded everywhere, still no shadows):
xs 5 (small squares, initials) · sm 9 (chips) · md 14 (buttons, panels,
cards) · lg 24 (sheets, the deck card, the card caption, the paper over the
account poster) · pill 999 (small action buttons, switches).

### Type

- **Inter Tight** on both surfaces, the one typeface. Regular, medium,
  semibold. Small uppercase lines are Inter Tight too.
- **JetBrains Mono** survives only inside the drawn posters and the card
  artwork (poster captions, the map card at 10–11px).
- **Archivo** (width 62, weight 900, `ArchivoLogo.ttf`) is the wordmark
  only. The logo is `afterhours` with a red dot; the app icon and favicons
  are the `a.` mark on ink.
- Fonts are served from `fonts/` (woff2). No request leaves for Google.
- Nothing is uppercased by CSS in the app: React Native uppercases with the
  phone's locale, so `up()` and `upperData()` do it by hand (Turkish `i`
  → `İ` trap).

### The drawn things

Everything on the page was made by hand. Apart from one photograph, the
synced covers and the music excerpts there is no media from outside.

- **The posters** (`posters/01.svg` … `142.svg`): hand-written SVG, 400×600
  (2:3), each its own colour world, fonts via the SVG's own `@import`. They
  were the whole catalogue; since the Ticketmaster sync they remain as the
  offline fallback and on the seed pages, and are being retired. A synced
  night shows its photograph instead, cropped 2:3 with `object-fit: cover`.
- **The afterhours card** (`cards.js`, mirrored in
  `app/src/content/cardsgen.js`): an SVG plate, 400 units wide, front and
  back. **Ten metals**: brushed steel, gold, chrome, oxidised copper,
  gunmetal, brass, rose gold, titanium, nickel, anthracite. **Ten motifs**:
  rays, oval, diagonal, orbit, grid, moon, moire, bands, iso, descend. The
  front is who stood there (crew initials, `+n more`); the back is the
  night's timeline: in, out, duration, two quotes with their hour, the
  audio length, the message count, who froze it, the card number. An
  unearned card is drawn with every slot empty (`NOT YET`, dashed crew
  squares, `AUDIO —:—`, `ROOM OPEN`, `NO. NOT ISSUED`): **a blur says pay
  me, an empty slot says go.** The voice note line reads `VOICE NOTE · SOON`
  until recording exists.
- **The faces** (`avatars.js`, `components/Avatar.tsx`): nobody without a
  photo gets an initial in a box. The placeholder is a frame shot in a dark
  room: one lamp, a silhouette cropped by the edge, grain over the top. The
  head is drawn big enough that the frame cuts it and sits in the outer
  thirds, never centred (centred with two shoulders is every site's grey
  person). Everything comes from the name, so a person wears the same face
  on every page.
- **The record sleeve** (`components/Sleeve.tsx`): a profile. The photo as a
  square cover with the name on it, the record sliding out behind it on the
  right with a red label. In Munich the label reads `MÜNCHEN` over the Alps
  (a pale far range, the near range in rock, snow on the summits); elsewhere
  it carries the number of nights. Groups sit on a shelf as sleeves too.
- **Map marks**: nights are rounded drops with an ink hole standing on their
  tip (paper; red when a friend kept it; the picked one larger with a paper
  ring); sparks are rounded gold diamonds; you are a round puck (paper disc,
  ink gap, red rim and core, a slow red ping). Every mark sends a radar ring
  every 3.2s from its own moment. Tiles are Esri dark grey canvas, ground
  `#1b1a19`.
- **The link marks** (`components/LinkMarks.tsx`): round marks for
  instagram · spotify · x · whatsapp (always; filled when added, outlined
  when not), tiktok · soundcloud · website once added.
- **Small actions as pills** (`components/PillAction.tsx`): remove, cancel,
  block, report, close, sign out, try again, clear. A rounded pill with a
  drawn glyph, quiet or red for danger, never an underlined word.
- **The landing's instruments**: a walnut tuning knob (`knob.js`) on the
  djs screen, an FM radio strip, a turning city globe drawn onto a canvas
  with its own projection maths (no Three.js), a phone preview with a
  finger that taps and drags through real app screenshots.
- **The intro film**: 15s, made in Claude Design, played in a WebView
  offline, plays once and holds the last frame.
- **The sound**: background music, off by default, house · techno · rap,
  ten 60s excerpts each from Free Music Archive (CC BY, credited in
  `app/CREDITS.md` and the credits screen). On the web the synthesised
  sound. The DJ clips are 45s excerpts. Tap for on/off, hold for the genre.

### Motion

- Keeping shows a red heart and `KEPT` over the deck for a moment. A still
  fade when the phone asks for reduced motion.
- The gallery on yours moves on by itself every 6s; a finger restarts the
  count.
- Intro: paper holds 300ms, photo in over 1400ms, the name after 900ms, leave
  at 3200ms.
- Taglines: fade in 500ms, rise 14px, read for 1600ms + 320ms per word,
  fade out 350ms.
- Still no shadows anywhere.

---

## 3. How the screens are built (the patterns to reuse)

- **One layout, content from the data.** There is no page per night. One
  shell and the night is fetched by slug. The contact sheet (left rail
  fixed and deliberately dull, middle, right column, black card band at the
  foot) is the web night page; photo on top, `check in · keep · ticket`,
  where · when · kind is the app night page.
- **Pools and a seed.** Where real data is missing, text comes from pools
  per kind, chosen by a mulberry32 seed made from the slug, so a night
  shows the same thing every time and no two look alike. The pools live in
  `lang/src/explore.json` in three languages, **same length and order in
  every language**, so the seeded pick lands on the same item.
- **The card is the unit.** A ticket card, a spark card, a wave card, a
  group deck card are all `CardFace`: a photo, a kicker, a title, a note
  line, a red strip at the bottom that says what right does (`keep`,
  `create →`, `i'm in →`).
- **Right = yes, left = no, up = ticket, down = details.** Everywhere a
  card is swiped, including the staff queues (right lets through, left
  turns down, down edits).
- **Pull down to close.** Every sheet and sub-page.
- **Press the open tab again** to go back to its start.
- **The saved copy first.** Every read shows what the phone has, fetches
  behind it, redraws on difference. Every write goes through one outbox.
  Design every screen for offline: a waiting card numbered `····`, "goes
  out when online", the bar `offline · N waiting`.
- **Faces are the loudest line.** On a card friends kept, who kept it (faces
  36px overlapping, red edge when out now, `+n` after four) is louder than
  the title.
- **Nothing invented about a real person.** No line if they wrote none, no
  counts the database did not hand over. Nothing is said about a night's
  act unless a text exists ("who is this?" shows no button rather than an
  invented one).
- **Design decisions live in `prototypes/`** as standalone HTML before they
  are built (`djs.html`, `nav.html`, `new-pages-designs.html` with the
  picks 1D 2A 3B 4B 5E 6D 7D 8C 9B 10D 11E 12B 13A 14E 15B 16C 17C,
  `person-bio.html`, `poster-flow.html`, `what-is-this.html`).

---

## 4. The voice

**Lowercase, short, dry.** English interface text on both surfaces. German
legal pages. The code and docs are English (they were Turkish until
30.08.2026).

### Rules

- Everything in the UI is lowercase, including the first word of a
  sentence, including German nouns (*finde deine nacht.*). Data keeps its
  own case (titles, venues, artists, handles, what people wrote).
- Sentences end with a full stop even when short. `kept.` `saved.`
  `that is you`.
- Say what the button does in one or two words: `keep`, `ticket`, `i'm in`,
  `create →`, `call it off`, `let it through`, `not for me`.
- Say what happened, not what the system did: `goes out when online`, `back
  online · sending…`, `this one is gone for good.` (the 404).
- Prefer the concrete to the abstract: *two lines, at most* not "limited
  messaging"; *the room stays open for 48 hours. then it freezes, forever.*
- Address the person as `you`; German `du`, Turkish `sen`.
- Dry humour is allowed where there is room for it and nowhere near a
  safety or legal line. The landing's manifesto: *A festival once beamed
  music at a star 12 light years away. The reply comes in 2042. Your night
  is sooner.*
- Mark what is not real: `sample`, `soon`, `not yet`, `sample numbers ·
  offline`. Never let an invented thing pass as real.
- Numbers stay numerals, dates `thu 26.09`, times `20:00`, counts `03/08`,
  `3 friends kept it · live`.
- Separators are the middle dot ` · `.

### The registers, with examples that exist

**Taglines** (rotating on the sign-up screen):
- explore the nights your city hides.
- find tonight before it finds you.
- every city has an afterhours. find yours.
- the night is a map. start walking.
- explore what's still going at 4am.

**The sign-in doors**: *first time? welcome in.* · *welcome back. sign in.*
· *one last thing. what do we call you?* · *leave both empty to look around
first* · *friends find you by this*.

**Tips** (first visit, at most two per page, title + one line): *swipe the
nights* — right keeps a night, left lets it go. up: the ticket, down: the
details. · *your sleeve* — tap the cover to set your photo; edit adds a bio
and your links. · *who gets it* — a wave: your friends, their friends too,
or one step further.

**The featured wall** (`featured.js`): twenty hand-picked nights, each body
line in a different register: a customs form, a shipping forecast, a bug
ticket, a diplomatic cable, an actuarial note, a press release, an incident
report, protocol minutes. The Weeknd leads: *The one tour we were legally
obliged to hang first: it runs from after hours til dawn, and we have never
related to anything more.* Hatsune Miku: *Support ticket #01: performer
does not physically exist. Status: closed — working as intended.* These
are sentence case on purpose; they are written prose, not interface.

**The sparks** (titles): derby night at yours. · grill by the river. · a
hike, out of the city. · meet the sunrise. · breakfast club, after the
after. · a rooftop hunt. · a night swim. · pub quiz, team of four. ·
something new opened on your street. · disposable camera night. · someone
else's festival.

**The card quotes** (the back of a card, what somebody said at what hour):
*the ferry horn came through the wall* — B, 02:14 · *where do you get simit
at this hour* — E, 04:31 · *the phones stayed in our pockets* — L, 03:02 ·
*draußen ist es schon hell* — N, 07:12.

**Sample posts** (the Munich crowd, mixed languages, not translated): *5:40
and he played the one track i have been looking for since march. still no
id.* · *bu fotoğrafı kim çektiyse teşekkürler, hiçbirimiz hatırlamıyoruz*.

**The landing's who's-coming phone**: *tickets are in my pocket* · *u-bahn
at 21, don't be late* · *depends on my shift, i'll know friday* · *third
time this year, no regrets* · *in berlin that week — send videos*.

**Store listing**: *afterhours is for deciding whether to go out tonight.
there is no search and no feed.* … *we count nights out, not minutes in.*

### Three languages: english · deutsch · türkçe

Since 27.09.2026 the whole site and the whole app speak three languages.
English is the fallback and what a crawler reads.

- Site words: `lang/src/*.json` (`common · landing · explore · account ·
  pages · legal`), three languages side by side. `python3 tools-lang.py`
  builds `lang/en.js · de.js · tr.js` and **refuses** a key missing a
  language, a lost `{placeholder}`, a pool of a different length, or a key
  nobody defined. Edit the json, never the generated files.
- App words: `app/src/i18n/parts/*.ts` (`common · home · tabs · pages ·
  groups · posts · staff · tips`). Keys are typed; a missing key fails
  `tsc`.
- The voice is the same in all three: lowercase, short, dry, `du` / `sen`.
  Where the English is sentence-case prose (help, the featured nights, the
  manifesto) the translation uses its own orthography.
- **Glossary**: night *nacht / gece* · keep *behalten / sakla* · let go
  *ziehen lassen / bırak* · deck *stapel / deste* · card *karte / kart* ·
  wall *wand / duvar* · collection *sammlung / koleksiyon* · map *karte /
  harita* · yours *deins / seninkiler* · handle *handle / kullanıcı adı* ·
  the room *der raum / oda* · who's coming *wer kommt / kim geliyor* · i'm
  in *bin dabei / varım* · not tonight *heute nicht / bu gece değil*.
- **Not translated**: data (titles, venues, artists, cities, handles, what
  people wrote), the brand words, the drawn artwork, sample posts (people
  write how they write). Kinds of night ARE translated (`type.<slug>`).
- **Turkish suffixes depend on the word before them**, so a sentence never
  hangs a suffix on a `{placeholder}`: *katılım {when}*, not *{when}'den
  beri*.
- The legal pages: German is the binding text; English and Turkish say so
  under their title.

---

## 5. Feature inventory

Everything that exists, surface by surface. "sample" means the design is
there and the content is invented until real data arrives.

### 5.1 The website (`/`, GitHub Pages, no build, no dependencies)

| Page | What it does |
|---|---|
| **Landing** `index.html` | Seven screens deep: the curated poster wall with the hover panel and the intro → how swiping works (two cards, then a phone showing who's coming) → a strip of afterhours cards → the room → who is playing (the walnut tuning knob, the FM strip) → the turning city globe with tonight's nights and the walking-distance list → a black footer screen with `go outside`, `get the app`, the store badges, the manifesto, the language switch. Background sound, tap/hold. |
| **The wall** `explore/` | Every night that fits, six posters across (four, then two as it narrows), soonest first, words on hover. Filter line: country / city / kind / date (tonight … any night). Opens on the home city. Our own drop-downs, not `<select>`. |
| **The night page** `explore/event/?slug=…` | The contact sheet (§3). Where · when · kind · ticket / szene; the photograph or poster; the ticket; `open in the app`; the card band at the foot with both unearned faces. Since 09.10.2026 who's coming, beforehours and the after live in the app only. A small chip on a featured night's poster plays the act's most famous track (Apple Music preview). |
| **Closed pages** `djs/` `friends/` `maps/` | The title (`who is playing.` / `yours.` / `go local.`), "only available in the app.", a `preview.` button that opens a phone playing the app's real screenshots with a finger. Store badges. |
| **The collection** `cards/` | Signed out: three sample cards (Karaköy Alt Kat, Blitz, Betonhalle). Signed in: your own cards from `my_cards`, drawn as the app draws them. |
| **Account** `login/` `register/` `reset/` | Sign in (email, apple, google), two-step registration (email + password, then handle + city; not finished until a handle is chosen), a new password. |
| **Settings** `settings/` | Profile (handle, name, one line, city) · privacy (who sees what you kept, findable by handle, blocked list with unblock) · account (download my data as JSON, delete account by typing your handle) · language. |
| **Somebody's page** `profile/?handle=…&via=…` | The path back to you (a filled square, a face per hop, "friend of friend of jonas"), the head and the roll (nine nights as a contact sheet, a tenth "not shot yet"), the shelf of cards. Real accounts take over their own name, line, city, date. |
| **Feedback** `feedback/` | Subject, message, an optional way to reach you. No sign-in needed. |
| **Help** `help/` | The app's six steps, what the web shows, two live numbers from `health()`. |
| **Legal** `privacy/` `impressum/` `datenschutz/` `agb/` | English privacy summary (works); the German pages are placeholders with square brackets still to fill. |
| **404** | "this one is gone for good." — four ways out, three languages inline, no webfont. |
| **The panel** `admin/` | Rebuilt on the app's (09.10.2026): the same gate (admins and community managers), overview with what waits, nights (new / edit / delete), sent in, reports (remove / keep / close the account), reported posts, dj pages waiting, comments, make a venue or a dj; for the admin people and roles with bans, feedback, the log, app errors, the database status. |
| **Group join** `g/?c=CODE` | Opens `afterhours://groups/join?code=…`. |
| `sound/` `posters/` `strip.html` | Index pages over the sound and the posters; a parked sketch. Leave them. |

Also: every page carries `description` + `og:*` tags and a generated
preview image (`og/`); `robots.txt`, `sitemap.xml`, `manifest.webmanifest`
(installable); a footer `© 2026 afterhours` + impressum · datenschutz ·
agb; the menu in the app's tab order `explore · djs · yours · map ·
collection · help · account`, signed in `welcome <name> (:`; the language
switch `en de tr` at the right end of the menu; a "get the web app" pill top
right on every page leading to the PWA.

### 5.2 The app (`app/`, Expo SDK 57, React Native, Expo Router, TypeScript)

Android first (`app.afterhours.android`, closed test on Play), iOS
configured and coded (`app.afterhours.ios`, waits on an Apple Developer
account), and a **PWA** build of the same code at
`kurtkurtkurt-del.github.io/afterhours-pwa/` for trying it on an iPhone.

**Arrival**
- **Intro**: the wordmark on paper, then the home screen with a rotating
  tagline, `sign up`, `explore your city`, the sound toggle, the language
  row. Signed in: straight to yours.
- **The intro film** (15s) from `explore your city` and settings → `show
  the intro again`; `skip` top right; ends in sign-up.
- **Sign up / sign in**: email + password, `continue with google`,
  `continue with apple` (iPhone), or `leave both empty to look around
  first` (guest mode; a guest who later signs in with Google keeps their
  swipes). Then **welcome**: the handle (`friends find you by this`), name,
  city.
- **The terms gate**: right after signing in (guests too) a full screen asks
  to confirm 18 or older and accept the terms and the privacy notice, with
  the no-tolerance rule. `not for me` signs out. Versioned, so everyone is
  asked again when it changes.
- **Tips**: a full-screen demo on first visit of each page, the title in the
  logo letters, at most two per page. `show the tips again` in settings.

**The five tabs** (six for staff): flow · djs · yours · map · account (· panel)

- **Flow, the deck.** One card. Under the city a `tickets · spark` switch;
  on tickets a third row `all events · any time`. Right keeps, left lets go,
  up opens the ticket, down the night page. Three buttons under the card do
  the same: ✕ let go · ↺ undo · a red ♥ keep. `KEPT` and a red heart flash
  on keep. A card carries a share mark and, when the act has a text, a
  red-into-gold `✦ who is this?` button opening a sheet (kind and home,
  name large, two or three sentences, two numbered facts, the source,
  `summarised with ai`; `keep` there throws the card right). Deck count
  `03 / 36`; at the end `deal again` / `try another city`. The deck's
  default is everywhere, soonest first. A **+** beside the switch offers
  **with a ticket** (the night form: staff publish at once, anyone with an
  account sends it in with a ticket link, at most five waiting, and sees it
  under *what you sent in*) or **among friends** (the eleven sparks).
- **The spark panel** holds only sparks: friends' invites first (`<name> is
  starting this · n in so far`, the wave it came through), then the eleven
  to start yourself. Right opens the spark page; `create →` on its strip.
- **DJs.** One genre pill (all · techno · house · rap; it filters everything
  and moves the background music), the DJs you follow as rings (red when
  playing tonight, pulsing LIVE when on now), **now**: a spinning record,
  how far into the set, `listen`; **clips**: a large card playing a 30s clip
  with its waveform over a record rack where the record slides out of its
  sleeve. A DJ page: follow, sets, next. **All sample** for launch (§6).
- **Yours, the hub.** A search field (people results replace the page). A
  chat mark top right opens **your rooms** (red dot while a room is open). A
  **+** makes a post. Then:
  - **with your people**: a full-photo gallery, one night per page, sliding
    sideways every 6s, the nights your friends kept, most keepers first; a
    red `match` badge when you kept it too; the keepers' faces and names as
    the loudest line; `me too` and `who's coming?` (a sheet: everyone who
    answered, coming first, and everyone who kept it; your own answer in ·
    maybe · out, stored, the same answer twice takes it back); the sparks
    waiting for your answer in gold.
  - **decks**: four card stacks with counts: friends', yours, **2nd wave**,
    **3rd wave**. They play like the flow (the card flies, undo, `start
    over`); a wave card carries the chain it came through (`you — L — T`,
    "via lina · tarık kept it"). Keeping a wave card keeps the real night.
  - **your people**: 62px faces, whoever is out right now first (ringed red
    with a breathing dot and where they are), wants in · asked · kept n,
    add + suggestions (friends of friends, then your city).
  - **groups**: a shelf of record sleeves (below).
  - **from your people**: posts (below).
  - **from past nights**: an endless feed, one post per past night with a
    photo, newest first, a year back, in your city plus wherever you or
    friends went; `you were there` / `berk, lina were there` in red. Sample
    posts mixed in, one after every two, marked sample.
- **Map.** The city large (tap: place picker), pills `all events · this week
  (default) · near me`, a km slider that moves the map live. Radar rings,
  pins, gold spark diamonds, `n sparks` in gold under the night count, you
  as a puck. One-finger zoom as in Google Maps. Opens centred on you with a
  5km circle. A tap opens a caption (red for a night, gold for a spark:
  kind · who started it, time · place · how many are in, your answer, `go
  →`). The spot of a spark is sharp for the host and their friends and
  rounded to about a kilometre for the 2nd and 3rd wave.
- **Account, a record sleeve.** Your photo as the cover (tap to change), the
  record with the red label (`MÜNCHEN` over the Alps, or the number of
  nights), the bio and the longer text, the links as round marks, two
  counts (`events` = nights kept, `your people`; each opens its list), a
  full-width red `edit profile`, then **the collection** placed so the first
  screen ends halfway down the cards. Below: coming up, your sparks (open
  one: who is in by name, `call it off` pressed twice), your cities. Sign
  out in settings.
- **Panel** (admins and community managers): numbers; new night / new room
  / new dj; the nights made here (edit, hide, delete); **sent in** (a pile:
  right lets through, left turns down with a line the sender sees, down
  edits first); **reports** (left removes, right keeps, down removes and
  closes the account); reported posts; dj pages waiting; the newest
  comments (hide / show). Admin only: **people and roles** (search first, by
  role; change the role, give admin, close an account with a reason, a
  `closed` chip), feedback, **the log** (who made, changed or deleted
  what), **app errors** (30 days), **database** (which numbered SQL files
  were never pasted). The account type is typed at a **door panel** in
  settings → account: the code is the name itself (`normal user`, `dj`).

**Pages off the tabs**

- **Night** `night/[slug]`: the photograph with a share mark, `check in ·
  keep · ticket`, where · when · kind, the room line, beforehours read from
  the web's comments ("say something on the web").
- **Check-in and the room** `room/[slug]`: check in at a night and its
  card lands in the collection. The room is open for 48h after check-in,
  *two lines, at most*, then frozen forever. A szene night reveals its
  address at check-in.
- **Spark page** `spark/[kind]`: the night page's layout with **create it**
  right under the photo: name, the first of four start times, the first
  place and the 1st wave already suggested, one press creates it; `change
  it if you like` below. The **derby** suggests the city team's real next
  matches (TheSportsDB); the **grill**, the **hike**, the **sunrise**, the
  **rooftops** and the **swim** put first the days the forecast likes
  (Open-Meteo), with `24° · dry` under the times. In Munich every spark has
  its own version with real spots (the grill at the Flaucher, the hike up
  the Herzogstand, the sunrise on the Olympiaberg, Schmalznudeln at Café
  Frischhut, Kilians, the Auer Dult, Tollwood …). A friend's spark opens as
  `i'm in` / `not this time` with started by · when · where · who.
- **Someone's profile** `person/[handle]` and the lists `list/events` ·
  `list/people`: the same sleeve; photo and links friends only; one red
  button that says what it does (`add friend · accept request · request
  sent · friends`); their collection (friends only); `block` and `report`
  under it. Sample people get a page drawn from the name, marked sample.
- **Groups** `groups/*`: friends who find a night together, 2 to 12. Made in
  three steps (look: name, emoji, colour, cover photo; who; where and when:
  a city or everywhere and a window of days; lasting or just once). Friends
  added directly; anyone else joins by an 8-letter code shown large, as a
  QR and as a link, or from the invitation with the faces. Tabs: **swipe**
  (the group's deck, a full photo with the score huge on top, faces of
  members who already said yes, *everyone is in*), **matches** (three
  shelves: everyone, most, some), **plan** (a vote of two or three nights
  for 1, 3, 12 or 24h with bars and who voted what; the plan as the group's
  own flyer: in · maybe · out, *i have my ticket*, who still needs one, the
  ticket link, *drop the plan*; *… is going too* when a visible group with a
  friend has the same plan), **live** (the same card for everyone there
  now, 15 seconds each, passes for whoever has not answered), **chat**
  (bubbles; plans, votes and results appear as small lines). Tapping the
  name opens **our nights**: the vibe (the two kinds the group says yes to
  most, the hour its nights start, its room), the numbers, the photo wall
  of every night two or more members checked in to, and an album per night
  members add photos to. Yours suggests a group when friends kept the same
  nights lately.
- **Posts** `post/new`: camera first, a photo, up to 500 characters, if you
  like one of the nights you kept. Friends see it under *from your people*.
  Two taps on the photo like it (a heart blooms); the heart likes and
  unlikes; `n likes` opens who liked it; the speech mark opens the
  comments (first two shown, `all n comments`, `add a comment`). ··· deletes
  your own or reports someone else's. 20 posts a day.
- **Settings**, grouped: a profile card on top, then **app** (language,
  background music, genre, accent colour, show the intro again, show the
  tips again) · **privacy** (who sees what you kept, findable by handle,
  blocked) · **notifications** (allow on this phone, switches in three
  groups: friends, nights, discovery incl. sparks, groups, posts; quiet
  hours 00:00–09:00) · **account** (email, password, the door panel for the
  account type, *my dj page* for a dj, delete account in a red box, asked
  twice) · **about** (afterhours on the web, privacy, credits, the version).
- **Edit profile**: photo, name, handle with its status, bio (300), about
  you (1500), city, elsewhere (instagram · tiktok · spotify · soundcloud · x
  · whatsapp · website; only friends see them).
- **Credits**: the music, the map tiles, the type.
- **From the team** (`NoticeSheet`): a sheet the next time the app opens
  telling a person what the staff did to their things (a hidden comment or
  post, a removed message, a cleared profile, a new role, a dj page let
  through or not).
- **Something broke · try again**: a screen that throws lands in the error
  log the admin reads.

**Under everything**

- **Sharing**: a round mark on photographs; the message is WhatsApp-short:
  the act, day · hour · place, `coming?`, the link on its own line.
- **Push** (Expo): friends, nights, discovery, sparks (`spark` when one
  reaches you, `spark_in` to the host), groups (ten kinds), posts (likes,
  comments), staff (*the panel · 3 waiting…*, once an hour); quiet hours;
  ten a day for the 2nd and 3rd wave.
- **Offline**: every read saved per account per shelf, saved copy first,
  one outbox for every write, retried 2s … 1min; warm-up of the pages
  people open most when the app opens and when the connection returns;
  `expo-image` disk cache. Starting a spark is the one write that needs
  the connection.
- **Where you are**: one current city for the whole app, worked out from
  the nights nearest to you (not the place name), asked on open and after
  half an hour away; a city picked by hand holds until you actually move.
- **Blocking**: across a block, in both directions, no card, no search, no
  request, no spark wave, no group; the friendship goes; they are not
  told.
- **Reports**: a long press reports a comment, a room line, a group bubble,
  a group, a person, a spark, a post. 30 a day.
- **Limits**: 40 friend requests a day, 30 comments, 60 room and 120 group
  messages an hour, 10 groups, 10 sparks and 20 invite codes a day.
- **Deleting the account** deletes it (profile, settings, swipes,
  friendships, photos; comments stay signed *someone*; an Apple account is
  revoked through an Edge Function). **Download my data** hands back one
  JSON of everything tied to you.
- **The app and the site are one account**: same Supabase project, same
  language setting, share → the web page, `open in the app` →
  `afterhours://night/<slug>`, App Links written (`assetlinks.json`,
  `apple-app-site-association`) and waiting on a host-root repository.

### 5.3 The backend (`backend/`, Postgres + Supabase)

55 numbered SQL files, each stamping itself into a migrations log so
`npm run health` names what was never pasted. Row-level security is the
security (`02_rls.sql`); the public key is public; the service key is never
in the repository. Tested on a real Postgres (PGlite) in CI: schema, seed,
views, friendship, profiles, feedback, jobs, update, setup, backup, export,
upgrade, plus one test file per feature (sparks, waves, groups, plans,
posts, blocks, safety, bans, trust, upkeep, staff, submissions …), several
hundred checks in all.

What the data knows: cities (94 in coverage) · venues (every Ticketmaster
venue becomes a room) · events (source: ticketmaster · staff · seed; image,
ticket url, lat/lng, venue) · event_about (the "who is this?" texts in
three languages) · profiles (public card) + profile_settings (owner only) ·
profile_photos, profile_links · swipes (kept = right) · comments
(beforehours, two levels) · friendships (pending → accepted, only the
receiver flips it) · rsvps · checkins + cards + rooms · djs, dj_sets,
dj_follows · sparks + spark_invites (reach 1 · 2 · 3) · groups, members,
invites, group_swipes, live, rounds, votes, plans, thread, album · posts,
post_likes, post_comments · blocks · reports · bans · notices · push_tokens
+ push_outbox · staff_log · client_errors · feedback · event_submissions.

Who sees what: swipes are private, even from the admin (totals only);
kept nights open to friends (or private); the member list cannot be
browsed; strangers see a card only by handle and only if findable; last
seen leaves as a day and only to a friend.

### 5.4 What runs on its own

- **sync-events** daily 04:10 UTC: Ticketmaster city by city, six kinds,
  one photograph, nothing before 18:00 (festivals and raves exempt), no
  add-on listings, a repeating show is one package, each venue a room,
  past nights pruned.
- **drop past events** 05:30, **health** 06:20 (exits non-zero when content
  is gone, a SQL file is missing, or past nights are still on the deck).
- **backup** nightly, kept 90 days, provably restorable.
- **guests_prune** nightly: guest accounts unseen for 30 days.
- **push_hourly**, **push_flush** every 5 min (quiet hours), **push_prune**.
- **CI on every push**: the backend tests, generated SQL drift, one `?v=NN`
  across all pages, every href/src resolves and every night has
  page + poster + og, the three-language dictionaries complete.

---

## 6. What is sample, placeholder, or not built

This is where creative work is wanted. Be honest about it on screen:
`sample`, `soon`, `not yet`.

**Sample content standing in for real**
- The **DJs**, their sets, stories and clips (eight invented DJs: mara
  volt, levent ok, nachtfalter, ines okur, tuesday club, dilan k., orbit 9,
  selin). Kept as they are for launch.
- The **sample posts** and **sample friends** (jonas, selin, mira, erdem,
  pınar, deniz, kaan, berk, lina, tarık …) in the feed and galleries until
  a person has friends.
- The **sample wave cards** while a wave is empty.
- The **three sample cards** in the web collection; **nobody has a real
  afterhours card yet** with sound and talk on it (check-in produces the
  card; the voice note is `soon`).
- The **event-page pools** (credits, paragraphs, the after's rooms, friend
  names) when the backend is off.
- The **eight newer sparks** borrow photos from the feed until their own
  arrive; the Munich spots were chosen from memory and not checked.
- The **drawn posters** (142) are being retired in favour of photographs.

**Placeholder**
- `impressum/` `datenschutz/` `agb/`: square brackets and a Stand date to
  fill.
- The App Store badge sits dimmed until there is an iOS listing.
- `explore` in the app (the old six onboarding slides) is no longer linked.

**Not built, decided**
- **The DJ tab vision** (07.10.2026): every other tab answers one question
  in the same language (flow *what*, map *where*, yours *with whom*,
  account *mine*). The DJ tab should answer *who is playing, and what do
  you hear*: a DJ's profile as the same record sleeve; following as keeping
  (a deck of DJs swiped right, the same `KEPT`); their sets marked in the
  flow and on the map; the DJ who played a night written on the back of
  its card; the app's background music coming from a DJ ("now playing: …")
  with this tab as source and remote; stories that live for one night,
  like a room. Keep: sound and genre first, "playing now", the clips.
- **Spark ideas, 25 noted**, each wanting a name, a line, a photo, a default
  hour, three languages, and ideally **a few seconds of video** for its
  card and page. Built so far: sunrise, breakfast, rooftop, swim, quiz,
  camera, festival, new place. First picks still open: **kebab run**,
  **record hunt**, **coin-flip walk**, plus Ahmet's **football** and
  **basketball** pickup games. The rest: night bus to the end, headphone
  walk, living-room gig, follow the DJ, karaoke duel, last stop, lantern
  walk, one country each, market closing, blind tasting, the whole menu,
  bowling or pool, park table tennis, chess café, one-word plan.
- **The card collection proper**: past-night data, what "that night's
  sound and talk" means, generating real cards; the voice note; the third
  help number.
- **Widening the event data**: line-up, times, capacity, price, rules as
  real fields so the pools become only a fallback.
- **Beforehours written from the app** (reading works; writing is on the
  web).
- **Real photographs for faces** (the `<img>` simply replaces the drawn
  frame).
- **App Links finished**: the host-root repository `kurtkurtkurt-del.github.io`
  (content ready in `user-site/`), or a custom domain.
- **iOS shipped**: an Apple Developer account, Apple provider on in
  Supabase, TestFlight, 6.9" screenshots.
- **A "who is this?" sync job** that checks the Wikipedia page is about the
  act before writing (three of 21 Munich searches landed on the wrong
  page and were left out).

---

## 7. Checklists for creative additions

**Any copy**
1. Lowercase, short, dry, full stop. Use the vocabulary of §1. `you` / `du`
   / `sen`.
2. Write all three languages at once. Site: the json in `lang/src/`, then
   `python3 tools-lang.py`. App: the matching `app/src/i18n/parts/*.ts`.
3. A pool keeps the same length and order in every language.
4. No suffix on a `{placeholder}` in Turkish. Data elements that CSS
   uppercases get `lang="en"`.
5. Codes are not words: `ok / taken / format`, filter values, kinds go to
   the database as they are.
6. Mark what is not real: `sample`, `soon`.

**A new spark**
1. A kind id, a title (a short sentence with a full stop), one line, a
   label, a default hour, two or three suggested places (keys), a photo
   (2:3-safe, Unsplash or own, credited in `app/CREDITS.md`).
2. Three languages for title, line, places. A Munich version with real spots
   if it has one (`LOCAL` in `content/sparks.ts`).
3. Does it read the world? (forecast, fixtures) → `data/sparkHints.ts`.
4. The database must know the kind (a numbered SQL file like
   `39_spark_kinds.sql`), with tests.
5. A few seconds of video for its card and page is the wish.

**A new featured night** (`featured.js`)
1. The slug from the database; `pos` if the cover's subject is off-centre.
2. A `body` in a register of its own (sentence case prose; no two of the
   twenty alike).
3. `artist` + `song`: the act's most famous track; the Apple Music preview
   and store addresses looked up once and baked in. A non-music night
   carries no song.
4. Optionally `metal`, `motif` and a `card` line for the card at the foot
   (The Weeknd: rose gold, moon, "After hours til dawn is four marks on the
   back of this card…").
5. The body also goes into `lang/src/landing.json` under
   `featured.<slug>.body` in three languages.

**A new poster** (if still drawing one)
1. `posters/NN.svg`, 400×600, `xmlns` required, fonts through the SVG's own
   `@import` of `../fonts/fonts.css`. Its own colour world; JetBrains Mono
   and Archivo are allowed inside.
2. `python3 tools-event-pages.py <version>` writes the shell;
   `python3 tools-previews.py` the og image.

**A new card metal or motif** (`cards.js` and `app/src/content/cardsgen.js`,
change both)
1. A metal is a palette with a name printed on the plate ("brushed steel",
   "rose gold"). A motif is a function of `(id, metal)` returning SVG that
   uses the metal palette.
2. The plate is 400 units wide; titles cut at the colon.

**A new screen or sheet in the app**
1. Ink on paper, the accent only for live · kept · on, gold only for
   sparks. Radii from the tokens, no shadows. Inter Tight.
2. Pull down to close. Right = yes, left = no where cards are swiped.
3. Saved copy first; show waiting work; survive offline.
4. A tip (title + one line, at most two per page) in `parts/tips.ts`.
5. Design it first as a standalone HTML in `prototypes/`, then build.
6. `npx tsc --noEmit`, `npx expo lint`, `npm test` before declaring it done.

**A new page on the site**
1. `i18n.js` first in the head, `data.js` with `data-fallback` and
   `data-after`, the footer, the menu, `og:` tags, `?v=NN` on every asset.
2. Classes prefixed per page (`ex-` on explore); no bare `photo`.
3. Bump every `?v=NN` together (currently 197) and read the diff.
4. `python3 tools-site-check.py` and `python3 tools-lang.py --check`.

**A new sample person, post or quote**
1. Faces are drawn from the name; names from the Munich/Istanbul crowd
   (short, mixed german · turkish · english).
2. Posts are written the way people write and are not translated.
3. A card quote is one observed thing at one hour: *draußen ist es schon
   hell — N, 07:12*.

**Always**
- Write it into `README.md` with the date, as every change has been.
- Never put the `service_role` key, a model name, or a credential into the
  repository.

---

## 8. Where the creative files live

| What | Where |
|---|---|
| Design tokens (colours, accents, radii, fonts, intro timing) | `app/src/theme/tokens.ts`, `app/src/theme/layout.ts` |
| The site's stylesheet | `style.css` (one file, bands at 1180 / 900 / 720) |
| The words, site (three languages) | `lang/src/{common,landing,explore,account,pages,legal}.json` → `tools-lang.py` |
| The words, app (three languages) | `app/src/i18n/parts/{common,home,tabs,pages,groups,posts,staff,tips}.ts` |
| Taglines (order, timing) | `app/src/content/taglines.ts`; the lines in `parts/home.ts` |
| Tips | `app/src/i18n/parts/tips.ts`, `components/Tips.tsx` |
| Featured wall (the twenty) | `featured.js` |
| Event-page pools, the after's rooms, run lengths | `explore/event-data.js`, `explore/comment-pools.js`, words in `lang/src/explore.json` |
| Sparks (kinds, hours, places, Munich versions) | `app/src/content/sparks.ts`, photos `app/assets/sparks/` |
| Spark hints (forecast, fixtures) | `app/src/data/sparkHints.ts` |
| Sample DJs, sets, clips, stories | `app/src/content/djs.ts`, `clips.ts`, `stories.ts`, `soundtracks.ts`, photos `app/assets/djs/` |
| Sample friends, posts, waves, collection | `app/src/content/friends.ts`, `posts.ts`, `waves.ts`, `collection.ts`, photos `app/assets/feed/` |
| Music (bundled excerpts) and credits | `app/assets/music/`, `app/sound/`, `app/CREDITS.md`, `app/src/content/music.ts`, `credits.ts` |
| The afterhours card generator | `cards.js` ↔ `app/src/content/cardsgen.js` (keep identical apart from font names); samples `cards/card-data.js` |
| The drawn faces | `avatars.js` (site), `app/src/components/Avatar.tsx` (app) |
| The record sleeve, link marks, pills, pins | `app/src/components/Sleeve.tsx`, `LinkMarks.tsx`, `PillAction.tsx`, `MapWeb.tsx` |
| The card face, deck, swipe stack | `app/src/components/CardFace.tsx`, `Deck.tsx`, `DeckViewer.tsx`, `SwipeStack.tsx` |
| Posters (hand-drawn SVG) | `posters/NN.svg`; generators `tools-event-pages.py`, `tools-previews.py`, `backend/tools/build-posters.mjs` |
| Logo, icons, favicons | `app/assets/fonts/ArchivoLogo.ttf`, `app/assets/icon.png`, `tools-favicon.py`, `favicon-*.png` |
| The intro film | `app/assets/film/film.html` |
| Landing instruments | `app.js` (screens, wall), `globe.js`, `knob.src.js` → `knob.js`, `radio.js`, `phone.js` + `phone/*.jpg`, `strip.js` |
| Prototypes (design before build) | `prototypes/*.html`, `prototypes/yours-before-redesign.tsx.txt` |
| Store copy | `app/store/listing.md` |
| The audit prompt (systemic gaps, in Turkish) | `.claude/prompts/systemic-gaps-audit.md` |
| The technical reference | `README.md` (§1 spirit · §3 pages · §5 night page · §6 app · §7 card · §8 backend · §12 traps · §13 old names) |

---

## 9. Timeline, for orientation

| When | What |
|---|---|
| 29–30.08.2026 | The data model decided; the code translated from Turkish to English |
| 25.09.2026 | The app joins the repository; one vocabulary decided; the web follows the app (the wall, the closed pages) |
| 27.09.2026 | Three languages on both surfaces |
| 28.09.2026 | The app goes rounded everywhere |
| 05.10.2026 | Yours redesigned as the hub; sparks (first called scene); the decks play like the flow; waves |
| 06.10.2026 | The record sleeve (account and profiles); the saved copy first, one outbox; real waves; sparks on the map; the after wired to our own nights; Apple sign-in written |
| 07.10.2026 | Account types and the panel; the + on the flow; groups, plans, our nights; posts; eleven sparks with Munich versions; "who is this?"; sharing; the chosen designs; the DJ tab vision noted |
| 08.10.2026 | Blocking, the terms gate, reports, bans, trust, notices, limits, upkeep, pills |
| 09.10.2026 | Likes and comments on posts; the site and the app one account; one panel; the PWA; the "get the web app" pill |
| 10.10.2026 | Icons named; this brief |
