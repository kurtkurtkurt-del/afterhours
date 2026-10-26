# the sparks of the day

One file per city and day, `<city>/<YYYY-MM-DD>.json`, written every night at 01:00 Berlin
by the spark night agent (a cloud routine; its brief is `.claude/prompts/spark-night.md`).
The GitHub action `sparks of the day` puts each file into `public.spark_days`
(`backend/tools/spark-days.mjs`, `backend/sql/98_spark_days.sql`); the app reads the day's
rows with `spark_day(city)` and draws them on the spark cards instead of the generic text.

A file's shape and the rules for its words are in the brief. `node backend/tools/spark-days.mjs --dry`
checks a file without writing anything.
