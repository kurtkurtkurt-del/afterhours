-- afterhours — arkadaslik islemleri
-- Tablo ve kurallar 01/02’de; burasi gunluk islerin fonksiyonlari.

-- Kullanici adi: arkadaslik bunun uzerinden kuruluyor, o yuzden
-- bicimi zorunlu. Kucuk harf, rakam, alt cizgi; 3-20 karakter.
alter table public.profiles
  drop constraint if exists profiles_handle_bicim;
alter table public.profiles
  add constraint profiles_handle_bicim
  check (handle is null or handle ~ '^[a-z0-9_]{3,20}$');

-- Kendi arkadaslarin ve bekleyen istekler, tek listede.
-- yon: ’giden’ = sen istedin, ’gelen’ = sana geldi.
create or replace function public.friends_list()
returns table (
  other_id      uuid,
  handle        text,
  display_name  text,
  status        text,
  yon           text
)
language sql
stable
as $$
  select f.addressee_id, p.handle, p.display_name, f.status, 'giden'
  from public.friendships f
  join public.profiles p on p.id = f.addressee_id
  where f.requester_id = auth.uid()
  union all
  select f.requester_id, p.handle, p.display_name, f.status, 'gelen'
  from public.friendships f
  join public.profiles p on p.id = f.requester_id
  where f.addressee_id = auth.uid()
  order by 4, 2;
$$;

-- Kullanici adiyla istek gonder. Karsi taraf zaten sana istek
-- gonderdiyse istegi kabul etmis olursun — iki kere sormaya gerek yok.
create or replace function public.friend_request(p_handle text)
returns text
language plpgsql
as $$
declare
  hedef uuid;
begin
  select id into hedef from public.profiles where handle = lower(btrim(p_handle));

  if hedef is null then
    return 'notfound';
  end if;
  if hedef = auth.uid() then
    return 'yourself';
  end if;

  -- Karsi yonde bekleyen bir istek varsa onu kabul et
  if exists (select 1 from public.friendships
             where requester_id = hedef and addressee_id = auth.uid()) then
    update public.friendships set status = 'accepted'
    where requester_id = hedef and addressee_id = auth.uid();
    return 'accepted';
  end if;

  insert into public.friendships (requester_id, addressee_id)
  values (auth.uid(), hedef)
  on conflict (requester_id, addressee_id) do nothing;

  return 'sent';
end;
$$;

-- Sana gelen istegi kabul et.
create or replace function public.friend_accept(p_other uuid)
returns boolean
language sql
as $$
  update public.friendships set status = 'accepted'
  where requester_id = p_other and addressee_id = auth.uid()
  returning true;
$$;

-- Arkadasligi bitir / istegi geri al. Iki yon de calisir.
create or replace function public.friend_remove(p_other uuid)
returns boolean
language sql
as $$
  with silinen as (
    delete from public.friendships
    where (requester_id = auth.uid() and addressee_id = p_other)
       or (addressee_id = auth.uid() and requester_id = p_other)
    returning 1
  )
  select exists (select 1 from silinen);
$$;

grant execute on function public.friends_list()          to authenticated;
grant execute on function public.friend_request(text)    to authenticated;
grant execute on function public.friend_accept(uuid)     to authenticated;
grant execute on function public.friend_remove(uuid)     to authenticated;
