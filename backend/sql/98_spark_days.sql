-- afterhours — the sparks of the day, written by the night agent (98)
--
-- Every night at 01:00 an agent looks at the coming day in a city — the date, the
-- weekday, the weather, the derbies and matches, what the town is up to — and writes
-- that day its own version of each spark kind: a title, a line, a place, an hour, in
-- en · de · tr, and one line on why (owner, 26.10.2026). Munich first. The kinds stay
-- the kinds of the app (content/sparks.ts); a kind without a row shows as before.
--
--   spark_days (city_slug, day, kind)   one row per kind per day, jsonb text
--   spark_day(city)                     for anyone: the rows of the day the city is
--                                       about to live — today until 05:00, then
--                                       tomorrow once the night agent has written it,
--                                       else the latest day that exists
--
-- Written only by the service (the GitHub action backend/tools/spark-days.mjs, from the
-- files the agent commits under backend/sparks/<city>/<day>.json). No grant to anyone.

create table if not exists public.spark_days (
  city_slug   text not null,
  day         date not null,
  kind        text not null,
  title       jsonb not null,   -- {"en": …, "de": …, "tr": …}
  line        jsonb not null,
  place       jsonb not null,
  hour        int check (hour between 0 and 23),
  minute      int check (minute between 0 and 59),
  why         text,             -- the agent s reason, in english, for the log and the panel
  written_at  timestamptz not null default now(),
  primary key (city_slug, day, kind)
);
alter table public.spark_days enable row level security;
revoke all on public.spark_days from public, anon, authenticated;

create or replace function public.spark_day(p_city text)
returns table (day date, kind text, title jsonb, line jsonb, place jsonb, hour int, minute int, why text)
language sql
stable
security definer
set search_path = public
as $$
  with here as (
    select coalesce((select c.tz from public.cities c where c.slug = p_city), 'Europe/Berlin') as tz
  ), clock as (
    select (now() at time zone h.tz) as t from here h
  ), want as (
    -- before 05:00 the night still belongs to yesterday s date; the deck shows that day
    select case when extract(hour from k.t) < 5 then (k.t::date - 1) else k.t::date end as d from clock k
  ), pick as (
    select coalesce(
      (select max(s.day) from public.spark_days s, want w where s.city_slug = p_city and s.day between w.d and w.d + 1),
      (select max(s.day) from public.spark_days s where s.city_slug = p_city)) as d
  )
  select s.day, s.kind, s.title, s.line, s.place, s.hour, s.minute, s.why
  from public.spark_days s, pick p
  where s.city_slug = p_city and s.day = p.d
  order by s.kind;
$$;
grant execute on function public.spark_day(text) to anon, authenticated;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('98_spark_days.sql', 'a310f1d6f17037ba1378a23b9e034af31863cce9e4e246d0b6bada610de5c41d');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('98_spark_days.sql');
  end if;
end $$;
