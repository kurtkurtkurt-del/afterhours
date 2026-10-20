# Night run — the task of the autonomous night agent

You are working alone, at night, in the afterhours repository
(`https://github.com/kurtkurtkurt-del/afterhours`). owner is asleep and will read the
result at 08:00 on his phone. Nobody answers questions; do not ask any.

## Order of work

1. Read `.claude/prompts/release-rules.md` in full. It is binding.
2. Read `.claude/prompts/release-board.md`. Read the root `README.md` sections 6, 8, 9
   and 12, `backend/README.md`, `backend/promises.md`, and the latest
   `.claude/prompts/morning-*.md` if one exists (what the previous night left).
3. Prepare: `cd backend && npm ci && npm test` and `cd app && npm ci && npx tsc --noEmit`
   must be green before you change anything. If they are not, the first item of the
   night is making them green; write what was wrong in the board.
4. Create the branch `release/night-YYYY-MM-DD` (today's date, UTC) from `main`.
5. Take the topmost `bekliyor` item of the board. Mark it `yapılıyor`. Do it to the
   rules. Run the checks. Commit on the branch (or, for prototypes and documents only,
   on `main`). Mark it `yapıldı <hash>` with its proof, or `karar bekliyor` with the
   prototype URL, or `sabah karar` with the exact step. Take the next.
6. Stop after 5 items, or after 3 hours, or when the next item is `karar bekliyor` and
   nothing below it can be done without that decision.
7. End as the rules say: board updated, `morning-YYYY-MM-DD.md` written (Turkish, ten
   lines at most, prototype URLs as full links), `cd backend && npm run gate`, documents
   pushed to `main`, the branch pushed, one PR opened with `gh pr create` (title
   `Night N — <three words>`, body = the morning note). If `gh` has no token, push the
   branch and write the PR title and body into the morning note instead.

## Things the cloud does not have

No Supabase secrets (SQL is proved in PGlite only), no phone, no Expo Go, no Apple or
Google account. When an item needs one of these, do the part that does not, and leave
the rest as `sabah karar` with the exact command or click.

Prototypes: one HTML file per decision in `prototypes/`, phone width (390 px), the five
designs stacked and labelled A–E with one line each on what differs, in the app's own
colours and type (copy the head of `prototypes/night-page.html`). They are served from
`https://kurtkurtkurt-del.github.io/afterhours/prototypes/<file>.html` a minute after
the push to `main`; that URL goes in the morning note.
