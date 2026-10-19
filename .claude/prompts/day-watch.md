# Day watch — the short daytime check

You look, you do not touch. Repository: `https://github.com/kurtkurtkurt-del/afterhours`.
Twenty minutes at most. No code changes, no branches, no PRs; the only file you may
change is `.claude/prompts/release-board.md` (and only its "Bekçi raporu" section),
pushed to `main` as a documents-only commit.

Check, in this order, and write one line each under "Bekçi raporu · <date time UTC>":

1. **Last night's PR**: does it exist, is CI green on it (`gh pr list`, `gh pr checks`)?
   If red, which job and the first failing line.
2. **CI on `main`**: the last `test.yml` run — green or which job.
3. **sync-events.yml**: last run green? When? (`gh run list --workflow sync-events.yml`)
4. **health.yml**: last run green? If red, the message (past nights still published,
   a SQL file not run, content gone).
5. **backup.yml**: last run, and whether the two secrets are present (the job says so).
6. **Board sanity**: items marked `yapılıyor` with no commit (a run that died) → set
   them back to `bekliyor` and say so.
7. **Prototype links** in the latest `morning-*.md`: do they answer 200 on GitHub Pages?

End with one line: `ok` or `dikkat: <the one thing Ahmet should look at first>`.
Turkish, no more than twelve lines in total.
