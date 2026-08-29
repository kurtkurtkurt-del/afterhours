-- afterhours — poster deposu (Supabase Storage)
-- Bu dosya SADECE Supabase'de anlamli: storage semasi orada var.
-- Yerel PGlite testlerinde calistirilmaz.

-- Herkese acik kova: posterler zaten sitede gorunuyor, gizli degiller.
insert into storage.buckets (id, name, public)
values ('posters', 'posters', true)
on conflict (id) do nothing;

-- Okuma herkese acik.
drop policy if exists "posters okunur" on storage.objects;
create policy "posters okunur" on storage.objects
  for select using (bucket_id = 'posters');

-- Yazma sadece yoneticide. public.is_admin() 02_rls.sql'de tanimli.
drop policy if exists "posters yonetici yazar" on storage.objects;
create policy "posters yonetici yazar" on storage.objects
  for insert with check (bucket_id = 'posters' and public.is_admin());

drop policy if exists "posters yonetici gunceller" on storage.objects;
create policy "posters yonetici gunceller" on storage.objects
  for update using (bucket_id = 'posters' and public.is_admin())
  with check (bucket_id = 'posters' and public.is_admin());

drop policy if exists "posters yonetici siler" on storage.objects;
create policy "posters yonetici siler" on storage.objects
  for delete using (bucket_id = 'posters' and public.is_admin());
