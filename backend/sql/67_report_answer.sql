-- afterhours — the one who reported hears back (B1)
-- A report reached the panel and the staff acted on it (keep, remove, ban the
-- author), and the author was told (53), but the person who reported heard
-- nothing. Now, when a report is settled, its reporter gets a notice: the staff
-- looked at it. What was decided is not said: that part belongs to the author.
-- One trigger each on reports (51) and post_reports (45), so every way of
-- settling (staff_report_settle, staff_ban_author, staff_post_hide) is covered.

alter table public.notices drop constraint if exists notices_kind_check;
alter table public.notices add constraint notices_kind_check
  check (kind in ('comment_hidden', 'post_hidden', 'removed', 'profile_cleared',
                  'role', 'dj_verified', 'dj_hidden', 'report_settled'));

create or replace function public.notice_report_settled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  about text := 'post';
begin
  if new.handled and not old.handled and new.reporter_id is distinct from auth.uid() then
    -- post_reports has no kind column: a post is all it holds
    if TG_TABLE_NAME = 'reports' then about := to_jsonb(new) ->> 'kind'; end if;
    perform public.notice(new.reporter_id, 'report_settled', jsonb_build_object('about', about));
  end if;
  return new;
end;
$$;
revoke all on function public.notice_report_settled() from public, anon, authenticated;

drop trigger if exists notice_report_settled on public.reports;
create trigger notice_report_settled after update of handled on public.reports
  for each row execute function public.notice_report_settled();
drop trigger if exists notice_report_settled on public.post_reports;
create trigger notice_report_settled after update of handled on public.post_reports
  for each row execute function public.notice_report_settled();

do $$ begin
  if to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('67_report_answer.sql');
  end if;
end $$;
