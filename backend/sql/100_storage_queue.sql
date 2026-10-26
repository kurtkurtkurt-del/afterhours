-- afterhours — a file that cannot go at once waits in a queue (100)
--
-- 82 made the database delete a photo with its row: a deleted post, a replaced face, a
-- group gone, an account gone. It did so by deleting from storage.objects. Supabase now
-- refuses that ("Direct deletion from storage tables is not allowed", a trigger of its
-- own), and the refusal rolled the whole delete back: a story could not be deleted
-- (26.10.2026), and neither could a face be replaced or an account be closed.
--
--   storage_leftovers         the files still to go: bucket, a path or a folder, when
--   storage_drop(path)        tries the delete as before; refused, the path is queued
--   storage_drop_folder(uid)  the same for everything under a person
--
-- The row always goes. backend/tools/storage-sweep.mjs (the daily sync workflow) removes
-- the queued files through the Storage API with the service key and clears the queue.
-- The app still removes the photo of a post itself right after (data/posts.ts), so most never
-- wait at all.

create table if not exists public.storage_leftovers (
  id         bigserial primary key,
  bucket     text not null default 'photos',
  path       text not null,
  folder     boolean not null default false,
  queued_at  timestamptz not null default now()
);
alter table public.storage_leftovers enable row level security;
revoke all on public.storage_leftovers from public, anon, authenticated;

create or replace function public.storage_drop(p_path text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_path is null or to_regclass('storage.objects') is null then return; end if;
  begin
    execute 'delete from storage.objects where bucket_id = $1 and name = $2' using 'photos', p_path;
  exception when others then
    insert into public.storage_leftovers (bucket, path) values ('photos', p_path);
  end;
end;
$$;
revoke execute on function public.storage_drop(text) from public, anon, authenticated;

create or replace function public.storage_drop_folder(p_uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_uid is null or to_regclass('storage.objects') is null then return; end if;
  begin
    execute 'delete from storage.objects where bucket_id = $1 and name like $2' using 'photos', p_uid::text || '/%';
  exception when others then
    insert into public.storage_leftovers (bucket, path, folder) values ('photos', p_uid::text, true);
  end;
end;
$$;
revoke execute on function public.storage_drop_folder(uuid) from public, anon, authenticated;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('100_storage_queue.sql', '552a3e7283802908967d1fdf0e8e10cde8c95f9e14763a36302f3843a26fcdc5');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('100_storage_queue.sql');
  end if;
end $$;
