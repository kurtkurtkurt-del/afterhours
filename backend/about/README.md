# who is this? — the night's files

One folder per run, `<YYYY-MM-DD>/`, written every morning after the Ticketmaster sync by
the about night agent (a cloud routine; its brief is `.claude/prompts/about-night.md`):

- `<city>.json` — the nights of that city that got a "who is this?" text tonight: the act's
  Wikipedia page, the extract it was written from, and kicker · who · two facts in en · de · tr.
- `skips.json` — the nights looked at and left empty, each with its reason (no page of that
  name, not a music act, the check threw the text out). Empty on purpose: nothing is forced.
- `plan/` — the planner's working files (not committed).

The GitHub action `who is this` (`.github/workflows/about.yml`) runs
`backend/tools/about-days.mjs --apply` on each push here: the same check the agent ran, then
`public.event_about` (40) and `public.event_about_skips` (113) are brought up to date.
`node backend/tools/about-days.mjs --check` checks a day's files without writing anything.
