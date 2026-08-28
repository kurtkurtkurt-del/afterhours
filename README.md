# afterhours

Event discovery for the night: raves, club nights, concerts, festivals, meetups and house parties.

Static landing page — no build step. Open `index.html`, or serve the folder:

    python3 -m http.server 4340

## Layout

- `index.html` · `style.css` · `app.js` — the landing page
- `explore/` · `help/` · `login/` — the sections, each an `index.html`
- `explore/<slug>/` — one page per event, e.g. `explore/asap-rocky/`
- `events-data.js` — the 36 events (slug, type, title, venue, copy)
- `posters/` — 36 SVG posters, one per event
- `sehir.js` — the spinnable city globe on the landing page
- `ses/` — three short clips, fully synthesised (see `tools-*`)
- `serit.html` — a parked layout experiment (horizontal marquee strips)

Everything on the page is drawn or synthesised — the posters are hand-authored SVG and the
audio is generated, so there is no third-party media in the repo apart from `foto.jpg`.
