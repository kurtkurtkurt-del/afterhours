# who is this? + listen — every night in every city

Written 22.10.2026, on the owner's ask: a flow that gives **every upcoming night in every
city** a "who is this?" text (`event_about`, 40) and a "listen" preview (`event_previews`,
63), fast and by rules, run whenever we want. The logic is laid out here first; nothing
runs until the owner says yes.

## What exists

- **listen** already has a tool: `backend/tools/previews.mjs --all` (Apple search, exact
  artist match, 1.5 s between calls). It runs every night in `sync-events.yml` after the
  Ticketmaster sync, with the service key, and skips nights that have a preview.
  Weak spots: Apple allows ~20 searches a minute, so 3 659 upcoming nights take ~90 min
  and the nightly job may not finish; an act not on Apple (or named a little differently)
  gets nothing, though the table already allows `source = 'deezer'`.
- **who is this?** has no tool. The 18 Munich texts were written by hand from each act's
  Wikipedia summary, in en · de · tr, and pasted as SQL (`about-munich.sql`, `-2.sql`).
  Rule since then: nothing invented, the source linked, a wrong page worse than none.

## The flow

One tool, `backend/tools/enrich.mjs`, two jobs that share one plan:

1. **collect** — every published night with `starts_at >= today`, from `events_public`,
   city by city (the sync's order). For each, the act: the same `act()` rule as
   previews.mjs (the part before " - ", ":", "|"; "Live in …" cut), moved into
   `backend/tools/lib/act.mjs` so both tools read the same name.
2. **skip what is done** — a night with a preview is left alone; a night with an
   `event_about` row in all three languages is left alone. Two sets read once at start.
3. **listen** (per night): Apple first, as today. No exact match → **Deezer**
   (`api.deezer.com/search?q=artist:"<act>"`, no key, 50 calls per 5 s): the first
   result whose `artist.name` is the act letter for letter, `preview` 30 s, link to the
   track. Still nothing → skipped, with the reason written down.
4. **who is this?** (per night): the act → Wikipedia search
   (`en.wikipedia.org/w/rest.php/v1/search/title?q=<act>&limit=3`) → the page summary
   (`/api/rest_v1/page/summary/<title>`). Guards, in order: the page's `description`
   must name a music act (band, singer, rapper, dj, musician, producer, duo, group,
   orchestra, composer, girl/boy group, trio, quartet); the title must equal the act
   after lowercasing and stripping accents, or the search must have returned it as
   the first hit with the act in the title; a disambiguation page is never taken. Fails
   any → skipped, reason written down ("no page", "not a music act", "name differs").
   Then the extract (≤ 1 500 characters) goes to Claude (Haiku 5.5, `claude-haiku-5-5`)
   with one instruction: from this text only, write `kicker` (what they are · year, city),
   `who` (2–3 plain sentences), `facts` (two, each a line, each in the text), in **en, de
   and tr**, lower case as the app writes, nothing not in the text; answer "no" if the
   text is not about a music act. The answer is checked: every fact must share at least
   three words with the extract, else the night is skipped ("fact not in source").
   Written with `source_url` = the page, `made_at` now.
5. **write** — REST upserts with the service key, 50 rows a call, `on_conflict`:
   `event_id` (previews) · `event_id,lang` (about). Idempotent: run twice, same result.
6. **rate and resume** — Apple 1.5 s/call, Deezer 0.2 s, Wikipedia 0.3 s with a
   User-Agent, Claude 4 in flight. Progress is saved to `backend/.enrich-state.json`
   every 50 nights (city, index), so a stopped run continues where it was; `--fresh`
   starts over. One full pass: ~3 659 nights × (Apple 1.5 s + Wikipedia 0.6 s) ≈ 2 h
   on the first run; afterwards only new nights.
7. **what it says** — `--dry` prints the plan (how many nights, how many lack what,
   per city) and writes nothing. A run ends with a report,
   `backend/reports/enrich-<date>.md`: per city, how many previews (apple/deezer), how
   many abouts, and every skip with its reason and the night's slug — so the owner can
   spot-check the texts (each line links the source) before trusting them.
8. **where it runs** — by hand first (`node backend/tools/enrich.mjs --dry`, then without
   `--dry`), from a terminal that has `SUPABASE_SERVICE_ROLE` and `ANTHROPIC_API_KEY` in
   its environment (neither lives in this repo or on this Mac); then as a step in
   `sync-events.yml` after the Ticketmaster sync, in place of `previews.mjs --all`, with
   both keys as GitHub secrets. The nightly step only ever sees the new nights.

## Rules it keeps

- Never invent: every word comes from the Wikipedia extract; the source is linked.
- A wrong act is worse than none: the guards skip rather than guess.
- Three languages or none: an about row is written in en, de and tr together.
- Idempotent and resumable; a stopped run loses nothing.
- Nothing in the app changes: `about_for()` and `previews_for()` already read these
  tables; "who is this?" and "listen" appear on a card the moment its rows exist.
- A night that is gone (retired, cancelled) is skipped; its rows cascade with it.

## Cost (to settle before the yes)

- Wikipedia, Apple, Deezer: free.
- Claude: ~3 659 nights × ~1 200 tokens in + ~500 out — the price is read from the
  current list at run time and printed by `--dry` before anything is sent.

## Not in this flow (said, not built)

- A second about source for acts without a Wikipedia page (Bandcamp, Resident Advisor):
  later, each with its own guard.
- The web site reads the same tables; nothing to do there.
