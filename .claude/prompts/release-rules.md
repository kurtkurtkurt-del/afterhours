# Release rules — the constitution of the autonomous runs (20–23.10.2026)

Read this first, every run, before touching anything. These are the owner's working
principles, written down from seven weeks of sessions. A run that breaks one of them
has failed even if its tests are green.

## What a run may do

- Change code in `app/` (phone app + PWA), the site at the repo root (plain HTML, no
  build step), `backend/sql` (new numbered files only — applied files are append-only)
  and `backend/test`, `backend/tools`, the docs.
- Write prototypes (static HTML in `prototypes/`, several designs in one file, labelled
  A–E, phone-width) for every design decision.
- Commit per queue item. Message style: as in `git log` — one line, what changed and
  why, plain words, no emoji.
- Push **documents only** to `main`: `.claude/prompts/`, `prototypes/`, `*.md`. The
  pre-push hook lets those through; they are served on GitHub Pages, so owner can open a
  prototype on his phone at 08:00.
- Push **code** to a branch `release/night-YYYY-MM-DD` and open ONE pull request per
  night against `main`, titled `Night N — <three words>`. owner merges. Never merge.

## What a run may never do

- Push code to `main`, force-push anything, rewrite history, or merge a PR.
- Start an EAS build, publish the PWA (`tools/publish-pwa.sh`), run `sync-events`,
  touch GitHub secrets, or write to the live Supabase project (no `migrate --write`, no
  SQL editor). SQL is written and proved in PGlite; applying it is the owner's morning step.
- Create accounts, pay for anything, or send anything to a third party.
- Add a dependency without writing why in the PR. Nothing with native code (Expo Go).
- Invent work. Only queue items from `release-board.md`. Something new you notice goes
  into the board as `found`, not into code.
- Delete or weaken a test, a promise in `backend/promises.md`, or an RLS rule to make
  something pass.
- Put an apostrophe in a SQL comment (the setup test refuses it) or a module script in
  the site (it is opened from `file://`).

## How a run decides

- **Design decisions are the owner's.** When an item needs one (a new screen, a changed
  layout, a feel), write a prototype file with five designs, mark the item
  `karar bekliyor` with the file's URL, and move on. Do not pick and build one.
  Small, mechanical fixes (a margin, a truncated label, a missing state) are not design
  decisions — do them.
- Follow the chosen designs already in the app: ticket card E, night page B, people C,
  messaging D, connect A, account under-the-cards B. Ink · paper · red; no pure black or
  white; Archivo for titles, Inter Tight for text, JetBrains Mono for small meta lines;
  photos full-bleed with an ink block under them; one tip per page; the same swipe
  language everywhere (right keep, left let go, up ticket, down page).
- Security lives in the database, not the page: closed tables, definer RPCs, a test per
  rule, a line in `backend/promises.md` when who-may-do-what changes.
- Three languages (en · de · tr) for every new string, in `app/src/i18n/parts/*` and
  `lang/*.js` on the site. Sample data sits on top of real data and says `sample`.
- README is the single reference: every change lands in the matching row or section of
  the root `README.md`, same commit.

## Before every job

A job starts with the five-line card of `hat.md` §1 (what · surface · promise · risk · done ·
rounds). A job that touches a **heart** file (`hat.md` §2) is heavy: a separate, fresh session
reads the diff to break it before the PR, and the owner approves. Every finished job is one
line in `is-gunlugu.md`. Since 26.10.2026.

## Before every commit

```
cd app && npx tsc --noEmit && npx expo lint && npm test
cd backend && npm test        # 950+ checks, PGlite
cd backend && npm run gate    # on the last commit of the night, before the push
python3 tools-site-check.py   # when a site page changed
```

Red → fix or `git checkout` the item away; never commit red. Note in the board what
broke and why.

## How a run ends

1. `release-board.md` updated: every touched item has its state, commit hash, proof
   (which test / which file), and `sabah karar` steps if any.
2. `morning-YYYY-MM-DD.md` written next to this file: ten lines at most — what was done,
   what waits for a decision (with prototype URLs on
   `https://kurtkurtkurt-del.github.io/afterhours/prototypes/<file>.html`), what owner
   must do by hand, what broke.
3. Documents pushed to `main`, code pushed to the night's branch, PR opened.
4. Stop. Do not start the next item after the limit (3–5 items, or 3 hours).

Talk to owner in Turkish; keep code, comments and commits in the repo's English.
