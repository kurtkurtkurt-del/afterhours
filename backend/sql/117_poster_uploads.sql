-- afterhours — a member hangs their own poster (117, owner 04.11.2026)
--
-- The site has a host page: a person lists their own night (event_submit, 36: staff look
-- at it before it is on the wall). The night may carry a poster. Until now only the admin
-- could write into the posters bucket (12), so the poster of a member failed and the night
-- went in without it. From now on a signed-in member may upload into the posters bucket
-- under their own folder, posters/<their id>/..., the same way the photos bucket works
-- (24): the folder is the person, nobody writes into another folder, and nobody lists
-- the bucket (a public bucket serves a file by its address; no select policy for members).
--
-- Kept as it was: the admin writes anywhere; reading a poster by its address is open.
-- Changed (separate eye, 04.11.2026): the open select policy of 12 let anyone LIST the
-- bucket, which from now on would list member ids as folder names; it goes, and a member
-- sees only their own files (the storage API reads a row before it removes it). Ten
-- posters per member at most: an upload comes before the night is submitted, so without
-- a cap the bucket could be filled without ever listing a night. The bucket gets the
-- limits the photos bucket has: 3 MB, jpeg or png only; the admin, who used to upload a
-- few SVG posters by hand, uses png or jpeg from now on too (an SVG can carry a script).
-- The moderation of what a poster shows stays with the review of the night itself (36).
--
-- Storage policies live in the storage schema, which the local tests do not have; like
-- 12 and 24 the block skips itself there and every statement is dynamic.

do $$
begin
  if not exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    raise notice 'no storage schema - poster uploads skipped (running locally)';
    return;
  end if;

  execute $q$
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('posters', 'posters', true, 3145728, array['image/jpeg', 'image/png'])
    on conflict (id) do update
      set public = true, file_size_limit = 3145728, allowed_mime_types = array['image/jpeg', 'image/png']
  $q$;

  execute $q$ drop policy if exists "posters okunur" on storage.objects $q$;
  execute $q$ drop policy if exists "posters member sees own" on storage.objects $q$;
  execute $q$
    create policy "posters member sees own" on storage.objects
      for select to authenticated
      using (bucket_id = 'posters' and (storage.foldername(name))[1] = auth.uid()::text)
  $q$;

  execute $q$ drop policy if exists "posters member writes own" on storage.objects $q$;
  execute $q$
    create policy "posters member writes own" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'posters'
                  and not public.is_guest()
                  and not public.is_banned(auth.uid())
                  and (storage.foldername(name))[1] = auth.uid()::text
                  and (select count(*) from storage.objects o
                       where o.bucket_id = 'posters'
                         and (storage.foldername(o.name))[1] = auth.uid()::text) < 10)
  $q$;

  execute $q$ drop policy if exists "posters member removes own" on storage.objects $q$;
  execute $q$
    create policy "posters member removes own" on storage.objects
      for delete to authenticated
      using (bucket_id = 'posters' and (storage.foldername(name))[1] = auth.uid()::text)
  $q$;
end $$;

do $$ begin
  if to_regprocedure('public.migration_done(text, text)') is not null then
    perform public.migration_done('117_poster_uploads.sql', 'f371fa846619a9f34880b902e93833e97af5f33e3586e2e69c9241b0da0be004');
  elsif to_regprocedure('public.migration_done(text)') is not null then
    perform public.migration_done('117_poster_uploads.sql');
  end if;
end $$;
