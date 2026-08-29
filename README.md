# afterhours

**[kurtkurtkurt-del.github.io/afterhours](https://kurtkurtkurt-del.github.io/afterhours/)**

Event discovery for the night in Munich: raves, club nights, concerts, festivals,
meetups and house parties. One card at a time — there is no search anywhere on the
site, and that is deliberate.

No build step and no dependencies. Open `index.html`, or serve the folder:

    python3 -m http.server 4340

## Layout

- `index.html` · `style.css` · `app.js` — the landing page, five screens deep
- `explore/` — the deck: one card at a time, right keeps it, left is gone
- `friends/` — your handle, your friends, everything you kept
- `maps/` — the city globe on its own page
- `help/` · `login/` — how it works, and signing in
- `admin/` — event editing, poster checking, comment moderation (admin only)
- `explore/<slug>/` — one page per event, e.g. `explore/asap-rocky/`
- `posters/` — 36 SVG posters, one per event
- `ses/` — two short clips, fully synthesised
- `serit.html` — a parked layout experiment (horizontal marquee strips)

The site talks to a Postgres database through Supabase. `ayar.js` carries the project
URL and the publishable key — both are meant to be public; what protects the data is
the row-level security in `backend/sql/02_rls.sql`, not their secrecy. With `ayar.js`
empty the site falls back to `events-data.js` and behaves exactly the same, which is
how it ran before there was a backend.

- `veri.js` — decides where the data comes from, then loads the page's own scripts
- `oturum.js` · `atislar.js` · `beforehours.js` · `arkadaslar.js` · `menu.js` — session,
  swipes, comments, friends, and the menu's signed-in state
- `backend/` — the schema, the rules, the seeds, the tools and 82 tests. See
  [backend/README.md](backend/README.md) for setting it up from scratch.

Everything on the page is drawn or synthesised — the posters are hand-authored SVG and
the audio is generated, so there is no third-party media in the repo apart from
`foto.jpg`.
