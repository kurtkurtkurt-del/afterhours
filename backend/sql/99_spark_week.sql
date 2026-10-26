-- afterhours — the sparks of the week, for every city (99)
--
-- 98 read one day: the day the city is about to live. The week agent (owner, 26.10.2026)
-- walks every city in turn and writes what it finds for the coming seven days — a derby
-- on saturday, a market on thursday, a warm evening on sunday — not all kinds, not every
-- day: whatever it found. So a kind is read for the nearest day that has it.
--
--   spark_week(city)   for anyone: per kind, the row of the nearest day from the day the
--                      city is living (before 05:00 that is yesterday) up to seven days
--                      ahead. A kind with nothing in that week has no row (the generic
--                      spark shows). The card then suggests that day.
--   spark_day(city)    as 98, but its fallback no longer reaches into the future: with
--                      a week written ahead, "the latest day there is" was next sunday.
--
-- Nothing new is written: the table is that of 98, filled by backend/tools/spark-days.mjs.

create or replace function public.spark_here_day(p_city text)
returns date
language sql
stable
security definer
set search_path = public
as $$
  select case when extract(hour from t) < 5 then t::date - 1 else t::date end
  from (select now() at time zone coalesce((select c.tz from public.cities c where c.slug = p_city), 'Europe/Berlin') as t) k;
$$;

create or replace function public.spark_week(p_city text)
returns table (day date, kind text, title jsonb, line jsonb, place jsonb, hour int, minute int, why text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct on (s.kind) s.day, s.kind, s.title, s.line, s.place, s.hour, s.minute, s.why
  from public.spark_days s
  where s.city_slug = p_city
    and s.day between public.spark_here_day(p_city) and public.spark_here_day(p_city) + 7
  order by s.kind, s.day;
$$;
grant execute on function public.spark_week(text) to anon, authenticated;

create or replace function public.spark_day(p_city text)
returns table (day date, kind text, title jsonb, line jsonb, place jsonb, hour int, minute int, why text)
language sql
stable
security definer
set search_path = public
as $$
  with pick as (
    select coalesce(
      (select max(s.day) from public.spark_days s
        where s.city_slug = p_city and s.day between public.spark_here_day(p_city) and public.spark_here_day(p_city) + 1),
      (select max(s.day) from public.spark_days s
        where s.city_slug = p_city and s.day <= public.spark_here_day(p_city))) as d
  )
  select s.day, s.kind, s.title, s.line, s.place, s.hour, s.minute, s.why
  from public.spark_days s, pick p
  where s.city_slug = p_city and s.day = p.d
  order by s.kind;
$$;
grant execute on function public.spark_day(text) to anon, authenticated;

do $$ begin
  if to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('99_spark_week.sql');
  end if;
end $$;
