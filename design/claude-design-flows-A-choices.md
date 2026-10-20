# afterhours — pick your flow (choices)

**Brief for Claude Design.** Build one interactive prototype. Read everything once before you start; the quality bar is at the end.

---

## 1 · What afterhours is

afterhours is a phone app (and web app) for going out at night in a city — Munich, Berlin, Istanbul and 50 more. It lists real nights (concerts, club nights, raves, stand-up, meetups) from Ticketmaster plus nights people send in. Today it works one way: a **deck** of night cards you swipe — right keeps a night, left lets it go, up opens the ticket. Around that:

- **friends** see which nights you kept ("lina, berk kept it") and when you are **out now** (a red ring around your face)
- **check in** at the door and the night becomes a collectible **card** in your sleeve
- **sparks**: nights nobody organised yet — a grill by the river, a derby at the kiosk — that you light and send to friends (shown as **gold diamonds** on the map)
- **rooms**: a chat that opens for everyone checked in to the same night, and freezes the next day
- **groups**: a crew that votes on where to go

The project is anonymous for now. Never put a real person's name in it; the sample people below are invented.

## 2 · The idea to design

One flow does not fit everyone. A planner wants the whole week in a list. A tired person wants one answer. A music person wants to hear before choosing. Someone new in town wants what is near.

So the main screen stops being a fixed screen. **On the first launch the app shows a gallery of flows. The user picks one and it becomes their app.** Each flow then has a few switches of its own that fine-tune it, and the user can pick another flow at any time.

Think forward. Picking should feel like trying on a new app in a second, not like opening settings: each choice previews itself live, and switching **morphs** the same nights into the new shape. This should feel like 2028 and still be calm and readable at 1 a.m. outside a club.

## 3 · The choice

A gallery of eight flows. Each tile shows a tiny live preview of its flow with real nights moving in it, the flow's name, and one line on who it is for. Tapping a tile turns the phone into that flow. Each flow has **2–4 switches** (on/off or two-way), listed below. Switching them changes the screen visibly, not just a filter.

## 4 · The eight flows and their switches

Each one must be a complete, beautiful main screen with the sample nights in it, not a sketch. Each needs its own way to **keep**, **let go**, **open** and **get a ticket**.

1. **deck** — one night card at a time, full-bleed poster, swipe right to keep and left to let go. *For people who like to discover.*
   switches: show friends' faces on the card · sound on the card (preview plays) · only this week / any time
2. **agenda** — days as tabs, hours as a spine, nights as rows. *For the planner.*
   switches: group by day / by kind · compact rows / poster rows · only free · only near
3. **tonight's three** — three nights picked for this person's taste, with one honest line each saying why. *For the busy and the tired.*
   switches: taste chips (electronic · live bands · stand-up · …) · surprise me (one wild card) · refresh daily / hourly
4. **oracle** — one verdict, full screen: "go here." A big "another" button. *For decision fatigue.*
   switches: by taste / by chance · near only · with a friend going
5. **radar** — a dark map with your position, nights as pins, sparks as gold diamonds and friends out now as red rings. Distance is the first fact. *For the spontaneous and the new in town.*
   switches: friends layer · sparks layer · walking radius 1 / 3 / 10 km
6. **crew** — nights ordered by which friends kept them, with faces, "3 going" and a vote with your group. *For people who don't go alone.*
   switches: all friends / my group only · show votes · invite strip. A designed state for someone with no friends yet is required.
7. **listen** — a vertical feed; each night plays its 30-second preview and the poster breathes with the audio. *For people who choose by sound.*
   switches: autoplay · only nights with a preview · waveform / poster first
8. **build** — spark-first: "no plan? light one." Pick a kind, an hour and a place; the nights around it are suggestions to join instead. *For organisers.*
   switches: tonight / weekend · friends only / friends of friends · show nights to join

## 5 · The interface to build

One page, desktop-first, that also works at phone width:

- **Left: the gallery.** The eight flows as tiles with live mini-previews. Under the selected one, its switches.
- **Right: the phone.** A 390 × 844 device frame rendering the chosen flow live with the sample nights. Changing flow or switch **morphs** the screen: the same night keeps its identity while it changes form (card → row → pin → waveform), around 300–450 ms with easing and no hard cuts.
- **Above the phone:** the flow's name and its one line, plus what the switches changed ("agenda · grouped by kind · only near").
- **A "first launch" toggle** that shows what a new user sees: after the city, one screen with three big choices (deck · agenda · tonight's three), each tile playing a tiny live preview. Below them it says "more in settings · change any time." Also show the full picker as it would sit in settings, with all eight.
- **Accent switcher** with the five accents below.
- **Small toggles to show states:** no friends yet · offline · nothing near.
- Interactions inside the phone should work: keep/let go, open a night (detail sheet with date, doors, where, ticket button), play/pause a preview (a simulated waveform is fine), "another" in oracle.

## 6 · Design language — follow it exactly

**Palette.** Ink on paper; no pure white, no pure black. The app is dark-first.

| token | value | use |
|---|---|---|
| ink | `#0E0D0C` | background |
| ink3 | `#2A2724` | hairlines on dark |
| mute | `#A9A59C` | secondary text on dark |
| meta | `#7F7B73` | small uppercase lines |
| paper | `#F3F1EC` | text on dark, light surfaces |
| paper2 | `#FAF9F6` | lightest surface |
| rule | `#D9D5CC` | hairlines on paper |
| ink2 | `#6C6961` | secondary text on paper |

**Accent** — one, picked by the user; default red:
red `#D7261E` (text on ink `#F0443A`) · green `#1E9E57` (`#3CC878`) · yellow `#E5B000` (`#F5C838`) · blue `#2D6BE0` (`#5C8FF0`) · pink `#DD3B8A` (`#F065A8`).
The accent means **live · kept · on**. Use it as fills, rings and the dot, and sparingly.

Gold `#D9A93A` is reserved for sparks.

**Type.**
- Wordmark: **Archivo**, width 62 (condensed), weight 900, lowercase: `afterhours` followed by an accent-coloured full stop.
- UI: **Inter Tight** 400 / 500 / 600. Headlines are big, tight and lowercase (−0.03 to −0.045 em), and often end in an accent full stop: "this week."
- Details: **JetBrains Mono** 10–11 px uppercase with letter-spacing for poster captions, meta lines, the map card and counts ("4 OF 12 · 1.2 KM").

**Shape.** Radii 5 / 9 / 14 / 24 / pill. Bottom sheets are 24. Pills for actions.

**Night card.** Full-bleed poster photo with an ink gradient from the bottom. The title sits big at the bottom left, with a mono meta line above it (`CLUB NIGHT · KRANHALLE`). A ticket-like detail strip shows **date · doors · where**. Kept-by is small stacked faces plus "lina, berk kept it".

**Faces.** Small round avatars drawn from initials. A red ring means out right now.

**Motion.** Calm, physical, 300–450 ms, ease-out. One orchestrated morph per change, not confetti. Respect reduced motion.

**Voice.** Lowercase, short, warm, never salesy. Say "nights", not "events". Examples: "keep" · "let go" · "get a ticket ↗" · "who is coming" · "nothing near yet · widen the circle" · "offline · the map waits". No emoji. The app ships in English, German and Turkish, so leave room for long German words (a label may shrink, never cut).

**Do not** make eight lists in disguise. Avoid generic dashboard cards, purple gradients, glassmorphism and the usual "AI" look. It must read as one product in eight shapes.

## 7 · Rules every flow shares

- Same data, same four actions: **keep · let go · open · ticket**. Whatever the surface, a keep is a keep, so friends' signals and cards keep working.
- A night always shows its **date/hour, venue and kind** somewhere reachable.
- Friends' signals use the same language everywhere: faces, red ring = out now, "kept it".
- Sparks are always gold diamonds.
- Every flow has designed **empty**, **offline** and **no friends yet** states.

## 8 · Sample data (use it, do not invent other nights)

Real upcoming nights in Munich and Berlin, with poster images from Ticketmaster's CDN. If an image fails to load, use an ink gradient tinted by the night's energy. `keptBy`, `energy_1to5`, `km` and `hasPreview` are invented context so every flow has something to show. The user is `ada` in münchen.

```json
{
 "me": {
  "handle": "ada",
  "city": "münchen",
  "taste": [
   "electronic",
   "live bands",
   "stand-up"
  ],
  "kept": [
   "n02",
   "n08"
  ],
  "out_now": false
 },
 "friends": [
  {
   "name": "mira",
   "live": "blitz"
  },
  {
   "name": "jonas",
   "live": "blitz"
  },
  {
   "name": "erdem",
   "live": "rote sonne"
  },
  {
   "name": "lina"
  },
  {
   "name": "berk"
  },
  {
   "name": "eda"
  },
  {
   "name": "deniz"
  },
  {
   "name": "kaan"
  }
 ],
 "sparks": [
  {
   "title": "derby night at the kiosk",
   "when": "sat · 18:00",
   "place": "giesing",
   "in": [
    "berk",
    "kaan"
   ]
  },
  {
   "title": "grill by the isar",
   "when": "sun · 16:00",
   "place": "flaucher",
   "in": [
    "lina"
   ]
  },
  {
   "title": "night walk to the teufelsberg",
   "when": "fri · 22:00",
   "place": "grunewald",
   "in": []
  }
 ],
 "nights": [
  {
   "id": "n01",
   "city": "munchen",
   "title": "Simple Plan - Bigger Than You Think! Europe Tour 2026",
   "kind": "Konzert",
   "venue": "olympiahalle",
   "when": "23.10.26 · 19:30",
   "image": "https://s1.ticketm.net/dam/a/cba/438368cf-15a9-4571-8ace-48057f045cba_RETINA_LANDSCAPE_16_9.jpg",
   "keptBy": [
    "lina",
    "berk"
   ],
   "energy_1to5": 4,
   "km": 1.2,
   "hasPreview": true
  },
  {
   "id": "n02",
   "city": "munchen",
   "title": "FKJ - Tyber Tour",
   "kind": "Club Night",
   "venue": "olympiahalle",
   "when": "24.10.26 · 20:00",
   "image": "https://s1.ticketm.net/dam/a/1ce/7f1e9720-b87f-4e84-8753-b62314a2b1ce_RETINA_LANDSCAPE_16_9.jpg",
   "keptBy": [],
   "energy_1to5": 3,
   "km": 2.8,
   "hasPreview": true
  },
  {
   "id": "n03",
   "city": "munchen",
   "title": "HULLIS - Comedy. Dinner. Show.",
   "kind": "Meetup",
   "venue": "HULLIS Die Dinnershow",
   "when": "29.10.26 → 28.12.26 · 19:00",
   "image": "https://s1.ticketm.net/dam/a/0c7/8c3e1b03-3db7-4548-a209-8e8ce5a170c7_RETINA_LANDSCAPE_16_9.jpg",
   "keptBy": [
    "mira"
   ],
   "energy_1to5": 2,
   "km": 0.6,
   "hasPreview": false
  },
  {
   "id": "n04",
   "city": "munchen",
   "title": "NEUNUNDNEUNZIG - Nichts Für Immer Tour",
   "kind": "Konzert",
   "venue": "olympiahalle",
   "when": "24.10.26 · 20:00",
   "image": "https://s1.ticketm.net/dam/a/572/cbfb4c88-a92a-4301-8fe6-0e603e9c1572_RETINA_LANDSCAPE_16_9.jpg",
   "keptBy": [
    "jonas",
    "erdem",
    "eda"
   ],
   "energy_1to5": 4,
   "km": 3.4,
   "hasPreview": true
  },
  {
   "id": "n05",
   "city": "munchen",
   "title": "Jero19 - Tour von Seite",
   "kind": "Club Night",
   "venue": "olympiahalle",
   "when": "28.10.26 · 20:00",
   "image": "https://s1.ticketm.net/dam/a/4c9/d50cc2df-148c-4e11-8f33-a55eee4864c9_RETINA_LANDSCAPE_16_9.jpg",
   "keptBy": [],
   "energy_1to5": 3,
   "km": 1.9,
   "hasPreview": true
  },
  {
   "id": "n06",
   "city": "munchen",
   "title": "Ulle & Rick - Live auf Tour 2026",
   "kind": "Meetup",
   "venue": "olympiahalle",
   "when": "19.11.26 · 20:00",
   "image": "https://s1.ticketm.net/dam/a/a78/0827453e-6fe6-426b-9703-830a86c6ca78_RETINA_LANDSCAPE_16_9.jpg",
   "keptBy": [
    "deniz"
   ],
   "energy_1to5": 2,
   "km": 5.1,
   "hasPreview": false
  },
  {
   "id": "n07",
   "city": "munchen",
   "title": "Darren Kiely - The Space Between Dreams Tour",
   "kind": "Konzert",
   "venue": "olympiahalle",
   "when": "26.10.26 · 20:00",
   "image": "https://s1.ticketm.net/dam/a/e31/f113a678-a934-4a3a-bc0c-050832ca9e31_RETINA_LANDSCAPE_16_9.jpg",
   "keptBy": [
    "kaan"
   ],
   "energy_1to5": 3,
   "km": 2.2,
   "hasPreview": true
  },
  {
   "id": "n08",
   "city": "munchen",
   "title": "DON TOLIVER: NITROUS - OCTANE WORLD TOUR LEG 2",
   "kind": "Club Night",
   "venue": "Olympiahalle",
   "when": "29.10.26 · 20:00",
   "image": "https://s1.ticketm.net/dam/a/4d1/d0bc76d6-02e3-4e46-96fc-658377e464d1_RETINA_LANDSCAPE_16_9.jpg",
   "keptBy": [
    "mira",
    "jonas"
   ],
   "energy_1to5": 5,
   "km": 4.0,
   "hasPreview": true
  },
  {
   "id": "n09",
   "city": "munchen",
   "title": "ALEX STOLDT - QUASI NICHTS",
   "kind": "Meetup",
   "venue": "olympiahalle",
   "when": "05.12.26 · 19:30",
   "image": "https://s1.ticketm.net/dam/a/a93/30d54e2d-64c0-4ba4-8ed4-da8e9c2f1a93_RETINA_LANDSCAPE_16_9.jpg",
   "keptBy": [],
   "energy_1to5": 1,
   "km": 0.9,
   "hasPreview": false
  },
  {
   "id": "n10",
   "city": "munchen",
   "title": "The Home Team - The Crucible of Life European Tour 2026",
   "kind": "Konzert",
   "venue": "olympiahalle",
   "when": "27.10.26 · 20:00",
   "image": "https://s1.ticketm.net/dam/a/9e3/57fb150f-8613-4b26-b4fd-6618d3ce69e3_RETINA_LANDSCAPE_16_9.jpg",
   "keptBy": [
    "eda"
   ],
   "energy_1to5": 4,
   "km": 3.1,
   "hasPreview": true
  },
  {
   "id": "n11",
   "city": "munchen",
   "title": "heylucas",
   "kind": "Club Night",
   "venue": "Kranhalle",
   "when": "13.11.26 · 20:00",
   "image": "https://s1.ticketm.net/dam/a/1a7/a16db916-973f-4ed1-90d4-e11e491971a7_RETINA_LANDSCAPE_16_9.jpg",
   "keptBy": [
    "erdem"
   ],
   "energy_1to5": 4,
   "km": 1.4,
   "hasPreview": true
  },
  {
   "id": "n12",
   "city": "munchen",
   "title": "Ariana Baborie - Toll die Energie!",
   "kind": "Meetup",
   "venue": "olympiahalle",
   "when": "12.12.26 · 20:00",
   "image": "https://s1.ticketm.net/dam/a/f15/1c07ade4-23ff-4be4-a193-231a1e0acf15_RETINA_LANDSCAPE_16_9.jpg",
   "keptBy": [],
   "energy_1to5": 2,
   "km": 2.6,
   "hasPreview": false
  },
  {
   "id": "n13",
   "city": "berlin",
   "title": "Lachkater Die Stand Up Comedy Show",
   "kind": "Meetup",
   "venue": "Al Hamra",
   "when": "20.10.26 → 03.11.26 · 20:00",
   "image": "https://s1.ticketm.net/dam/a/f54/76407821-d9bf-4352-8bd9-be11bb3dbf54_RETINA_LANDSCAPE_16_9.jpg",
   "keptBy": [
    "lina"
   ],
   "energy_1to5": 2,
   "km": 0.8,
   "hasPreview": true
  },
  {
   "id": "n14",
   "city": "berlin",
   "title": "Darren Kiely - The Space Between Dreams Tour",
   "kind": "Konzert",
   "venue": "columbiahalle",
   "when": "20.10.26 · 20:00",
   "image": "https://s1.ticketm.net/dam/a/e31/f113a678-a934-4a3a-bc0c-050832ca9e31_RETINA_LANDSCAPE_16_9.jpg",
   "keptBy": [],
   "energy_1to5": 3,
   "km": 3.9,
   "hasPreview": true
  },
  {
   "id": "n15",
   "city": "berlin",
   "title": "FKJ - Tyber Tour",
   "kind": "Club Night",
   "venue": "columbiahalle",
   "when": "21.10.26 · 20:00",
   "image": "https://s1.ticketm.net/dam/a/1ce/7f1e9720-b87f-4e84-8753-b62314a2b1ce_RETINA_LANDSCAPE_16_9.jpg",
   "keptBy": [
    "berk",
    "deniz"
   ],
   "energy_1to5": 3,
   "km": 2.4,
   "hasPreview": false
  },
  {
   "id": "n16",
   "city": "berlin",
   "title": "TOMORA",
   "kind": "Rave",
   "venue": "columbiahalle",
   "when": "01.11.26 · 20:00",
   "image": "https://s1.ticketm.net/dam/a/4ad/24271d47-ba22-498b-860a-2a04b1cbc4ad_RETINA_LANDSCAPE_16_9.jpg",
   "keptBy": [
    "mira"
   ],
   "energy_1to5": 5,
   "km": 6.2,
   "hasPreview": true
  },
  {
   "id": "n17",
   "city": "berlin",
   "title": "Saying the Wrong Thing — English Stand-up Comedy in Berlin",
   "kind": "Meetup",
   "venue": "The Wall Comedy",
   "when": "21.10.26 → 04.11.26 · 20:00",
   "image": "https://s1.ticketm.net/dam/a/e0e/60c063ef-cc47-4127-8804-a1711236be0e_RETINA_LANDSCAPE_16_9.jpg",
   "keptBy": [],
   "energy_1to5": 2,
   "km": 1.1,
   "hasPreview": true
  },
  {
   "id": "n18",
   "city": "berlin",
   "title": "Cirque du Soleil ALIZÉ",
   "kind": "Konzert",
   "venue": "columbiahalle",
   "when": "21.10.26 → 31.10.26 · 18:30",
   "image": "https://s1.ticketm.net/dam/a/90f/9755f60d-6af7-4fab-a196-9e4e5adc390f_RETINA_LANDSCAPE_16_9.jpg",
   "keptBy": [
    "jonas"
   ],
   "energy_1to5": 3,
   "km": 2.9,
   "hasPreview": false
  },
  {
   "id": "n19",
   "city": "berlin",
   "title": "Laughs, Pizza & Shots – English Comedy Night in the Heart of Berlin!",
   "kind": "Club Night",
   "venue": "Cosmic Comedy Club",
   "when": "22.10.26 → 30.10.26 · 19:00",
   "image": "https://s1.ticketm.net/dam/a/2d2/ce6302c9-93a4-451e-9d94-43192c09a2d2_RETINA_LANDSCAPE_16_9.jpg",
   "keptBy": [],
   "energy_1to5": 2,
   "km": 3.3,
   "hasPreview": true
  },
  {
   "id": "n20",
   "city": "berlin",
   "title": "The Epic Comedy Showcase — English Stand-up Comedy in Berlin",
   "kind": "Meetup",
   "venue": "Zosch",
   "when": "23.10.26 → 30.10.26 · 20:30",
   "image": "https://s1.ticketm.net/dam/a/e0e/60c063ef-cc47-4127-8804-a1711236be0e_RETINA_LANDSCAPE_16_9.jpg",
   "keptBy": [
    "kaan",
    "lina"
   ],
   "energy_1to5": 3,
   "km": 1.7,
   "hasPreview": true
  }
 ]
}
```

## 9 · Quality bar

Push yourself. Each of the eight flows should be good enough to be some real app's whole identity on its own, and all of them should still be unmistakably afterhours. Make them different in structure, not just in colour. The morph between them is the signature moment, so spend your effort there. Readable at phone width, dark-first, all interactions working, no placeholder text, no lorem ipsum.

**Deliver:** one interactive prototype page (the gallery + the live phone + the first-launch view), with all eight flows and every switch working.
