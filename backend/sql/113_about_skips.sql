-- afterhours — "who is this?" that was looked for and not found (113)
--
-- The about night (owner, 28.10.2026: .claude/prompts/about-night.md, a cloud routine,
-- and backend/tools/about-days.mjs) walks every upcoming night in every city and writes
-- a "who is this?" for the ones it can source. A night it cannot source — no Wikipedia
-- page of that name, not a music act, a text the check threw out — stays empty, on
-- purpose; nothing is forced. But without a note the same night is looked up again
-- every night. This table is the note: one row per night, why, and when it was last
-- tried. The planner leaves a night alone for seven days after a try.
--
--   event_about_skips (event_id)   why · tried_at · tries
--   about_skips_for(ids)           for anyone: event_id and tried_at of these nights
--                                  (the planner reads with the anon key; the reason stays
--                                  in the files under backend/about/)
--
-- Written only by the service (the GitHub action about.yml, from the files the agent
-- commits). A night with a text is removed from here by the same action.

create table if not exists public.event_about_skips (
  event_id    uuid primary key references public.events on delete cascade,
  why         text not null,
  tried_at    timestamptz not null default now(),
  tries       int not null default 1
);

alter table public.event_about_skips enable row level security;
revoke all on public.event_about_skips from public, anon, authenticated;

create or replace function public.about_skips_for(p_events uuid[])
returns table (event_id uuid, tried_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select s.event_id, s.tried_at
  from public.event_about_skips s
  where s.event_id = any(p_events);
$$;

grant execute on function public.about_skips_for(uuid[]) to anon, authenticated;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('113_about_skips.sql', '816e15293f2d3b94a4926842b977b833733514a057231be575ef82c64130f883');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('113_about_skips.sql');
  end if;
end $$;
