-- afterhours — poster deposu (Supabase Storage)
-- storage semasi yalnizca Supabase’de var; yerel testlerde bu blok
-- kendiliginden atlanir. Bu yuzden butun ifadeler dinamik (execute).

do $$
begin
  if not exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    raise notice 'storage semasi yok — poster deposu atlandi (yerel calisma)';
    return;
  end if;

  -- Herkese acik kova: posterler zaten sitede gorunuyor, gizli degiller.
  execute $q$
    insert into storage.buckets (id, name, public)
    values ('posters', 'posters', true)
    on conflict (id) do nothing
  $q$;

  -- Okuma herkese acik
  execute $q$ drop policy if exists "posters okunur" on storage.objects $q$;
  execute $q$
    create policy "posters okunur" on storage.objects
      for select using (bucket_id = 'posters')
  $q$;

  -- Yazma yalniz yoneticide. public.is_admin() 02_rls.sql’de tanimli.
  execute $q$ drop policy if exists "posters yonetici yazar" on storage.objects $q$;
  execute $q$
    create policy "posters yonetici yazar" on storage.objects
      for insert with check (bucket_id = 'posters' and public.is_admin())
  $q$;

  execute $q$ drop policy if exists "posters yonetici gunceller" on storage.objects $q$;
  execute $q$
    create policy "posters yonetici gunceller" on storage.objects
      for update using (bucket_id = 'posters' and public.is_admin())
      with check (bucket_id = 'posters' and public.is_admin())
  $q$;

  execute $q$ drop policy if exists "posters yonetici siler" on storage.objects $q$;
  execute $q$
    create policy "posters yonetici siler" on storage.objects
      for delete using (bucket_id = 'posters' and public.is_admin())
  $q$;
end
$$;
