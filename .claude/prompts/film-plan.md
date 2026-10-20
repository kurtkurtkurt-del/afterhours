# The intro film, second cut (12.10.2026)

owner: the first film (Claude Design export, 15 s) was amateurish. Redo: realistic, explains the
app, uses the app's own screens, more artistic. Plan and do it.

## What it is

A single HTML file (`app/assets/film/film.html`, built from `app/tools/film/film.html` by
`npm run film`), played in the WebView of `app/film.tsx`, offline. Everything inline: the app's
photos (resized by `sips`), the three typefaces (woff2), no network. The app injects the language
(`__LANG__` → en · de · tr) before loading. It posts `end` when done; `skip` stays top right.

## Storyboard (≈38 s, 9:16, ink)

| s | scene | on screen | caption (en) |
|---|---|---|---|
| 0–2.4 | dot | the red dot pulses, `afterhours.` rises | — |
| 2.4–6 | city | concert photo, slow zoom, grain | your city. after dark. |
| 6–11.5 | flow | phone: the real flow card (design E: date tag, kind tag, ink block, red title); swipes right with the red tint, the next card lands, swipes left | swipe the nights. right keeps, left lets go |
| 11.5–16 | night | the night page as a ticket (design B): photo, stub with date · doors · where, red `get a ticket ↗`, a tap | the night is a ticket. one tap to the seller |
| 16–21 | people | people page (design C): groups line, a group plan card, faces with red rings `out now`; a wave card chain: three rings, `friends of friends · via berk` | see who is out. your people, theirs, one step further |
| 21–25.5 | spark | a Berlin spark: `hike the grunewald to the teufelsberg.`, time chips, a wave, `send the spark`, a tap | no plan? start a spark. |
| 25.5–30 | map | dark streets, pins with radar rings, you as a puck, the card `‹ 2 of 8 ›` swipes and the map walks | what is near, tonight. |
| 30–34 | collection | the account sleeve, a card flies in and lands, the red messages button with a badge | check in. keep the card. |
| 34–38 | out | `afterhours.` and `explore your city` (the home button's words), then `end` | — |

## Rules

- Only the app's own photos and type (credits unchanged: Unsplash, the DJ portraits, OFL fonts).
- Every screen mirrors the chosen designs (ticket card E, night page B, people C, messaging D, Berlin sparks).
- The film is silent: the home screen's sound corner already plays.
- README row `film` rewritten; the old export and its four hand edits are gone.
