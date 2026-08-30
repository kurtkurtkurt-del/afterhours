-- afterhours — geri bildirim
-- "give feedback → help us" sayfasinin arkasi. Tek tablo, iki kural:
-- herkes yazabilir, yalniz yonetici okuyabilir.
--
-- Girissiz de yazilabiliyor, cunku bozuk bir seyi bildirmek icin once
-- hesap acmak sacma. O zaman yazan kisi isterse bir iletisim satiri
-- birakiyor; birakmazsa da yazdigi okunuyor, cevabi olmuyor.

create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  -- Girisliyse kim oldugu kendiliginden yaziliyor; hesap silinirse
  -- yazdigi kaliyor ama adi dusuyor.
  author_id   uuid default auth.uid() references public.profiles on delete set null,
  -- Girissizin biraktigi e-posta ya da baska bir yol. Istege bagli.
  contact     text check (contact is null or length(btrim(contact)) between 3 and 120),
  kind        text not null default 'other'
              check (kind in ('broken', 'idea', 'event', 'other')),
  body        text not null check (length(btrim(body)) between 10 and 2000),
  -- Yonetim tarafinda "bununla ilgilenildi" isareti.
  handled     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists feedback_yeni_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

-- Herkes yazar — girisli de girissiz de. Tek sart: baskasinin adina yazma.
drop policy if exists feedback_write on public.feedback;
create policy feedback_write on public.feedback for insert
  with check (author_id is null or author_id = auth.uid());

-- Yalniz yonetici okur. Yazan kendi yazdigini bile geri okumuyor:
-- bu bir gelen kutusu, konusma degil.
drop policy if exists feedback_read on public.feedback;
create policy feedback_read on public.feedback for select
  using (public.is_admin());

drop policy if exists feedback_handle on public.feedback;
create policy feedback_handle on public.feedback for update
  using (public.is_admin()) with check (public.is_admin());

-- Yonetim panelinin okudugu liste: yazani cozulmus, yenisi ustte.
drop function if exists public.feedback_list(int);
create or replace function public.feedback_list(p_limit int default 100)
returns table (
  id         uuid,
  kind       text,
  body       text,
  author     text,
  contact    text,
  handled    boolean,
  created_at timestamptz
)
language sql
stable
as $$
  select f.id, f.kind, f.body,
         public.author_name(f.author_id, null),
         f.contact, f.handled, f.created_at
  from public.feedback f
  order by f.created_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;

grant insert on public.feedback to anon, authenticated;
grant select, update on public.feedback to authenticated;
grant execute on function public.feedback_list(int) to authenticated;
