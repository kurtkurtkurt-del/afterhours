-- afterhours — arka planda calisan isler
-- pg_cron uzantisi Supabase'de Database → Extensions altindan acilir.
-- Uzanti yoksa fonksiyonlar yine calisir, sadece kendiliginden
-- tetiklenmez; elle de cagirabilirsin.

-- Gecmis etkinlikleri listeden dusur.
-- ONEMLI: sadece tarihi DOGRULANMIS olanlara dokunuyor. Yil cikarimiyla
-- doldurulmus 24 tarih yanlis olabilir; onlari kendiliginden gizlemek
-- gercek bir etkinligi siteden silmek olurdu.
create or replace function public.hide_past_events()
returns integer
language sql
security definer
set search_path = public
as $$
  with kapatilan as (
    update public.events
    set is_published = false
    where is_published
      and starts_at is not null
      and not starts_at_estimated
      and starts_at < now() - interval '12 hours'   -- gece bitsin, sonra dussun
    returning 1
  )
  select count(*)::int from kapatilan;
$$;

-- Bakim ozeti: neyin ilgi bekledigini tek satirda soyler.
-- Yonetim panelindeki uyarilarin veritabanindaki karsiligi.
create or replace function public.health()
returns table (
  events            bigint,
  published         bigint,
  missing_venue     bigint,
  unverified_date   bigint,
  past_still_up     bigint,
  comments          bigint,
  hidden_comments   bigint,
  people            bigint,
  swipes            bigint
)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from public.events),
    (select count(*) from public.events where is_published),
    (select count(*) from public.events where venue_id is null),
    (select count(*) from public.events where starts_at_estimated),
    (select count(*) from public.events
      where is_published and starts_at is not null
        and not starts_at_estimated and starts_at < now()),
    (select count(*) from public.comments),
    (select count(*) from public.comments where is_hidden),
    (select count(*) from public.profiles),
    (select count(*) from public.swipes);
$$;

grant execute on function public.health() to anon, authenticated;

-- Zamanlama. pg_cron acik degilse bu blok sessizce atlanir.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('afterhours-gecmisi-dusur')
      where exists (select 1 from cron.job where jobname = 'afterhours-gecmisi-dusur');
    perform cron.schedule(
      'afterhours-gecmisi-dusur',
      '30 5 * * *',                       -- her gun 05:30 UTC, gece bittikten sonra
      $job$ select public.hide_past_events(); $job$
    );
  end if;
end
$$;
