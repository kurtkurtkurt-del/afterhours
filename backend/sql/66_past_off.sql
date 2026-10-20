-- afterhours — past nights leave the deck even without pg_cron (A7)
-- hide_past_events() (09) is run by pg_cron at 05:30 UTC. When the extension is
-- off, nothing runs it, and past nights stay published: on 11.10.2026 health
-- counted 680. The morning sync (sync-ticketmaster.mjs, 04:10 UTC, service key)
-- now calls it at the end of every run, so the cleanup no longer hangs on one
-- extension. The service role gets the call by name; anon and authenticated
-- still do not.

do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.hide_past_events() to service_role;
  end if;
end $$;

do $$ begin
  if to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('66_past_off.sql');
  end if;
end $$;
