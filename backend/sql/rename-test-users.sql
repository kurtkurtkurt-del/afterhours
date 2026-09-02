-- afterhours — every account becomes testuser1, testuser2, … in the order
-- they were opened.
--
-- A one-shot for the live database (paste it into the Supabase SQL
-- editor); not a numbered migration, and not part of setup. Handles and
-- display names both change; sign-in does not, that is email and
-- password. The handle rule is the one profile_setup enforces:
-- ^[a-z0-9_]{3,20}$, unique. Running it twice is harmless — the numbering
-- is by created_at, so it lands on the same names.
--
-- Two passes rather than one: with five accounts, renaming the first to
-- testuser1 could collide with an account that already carries that
-- handle, and the unique index would stop the whole statement. So every
-- handle first moves out of the way, then each takes its number.

begin;

update public.profiles
   set handle = 'tmp_' || left(replace(id::text, '-', ''), 16);

with numbered as (
  select id, row_number() over (order by created_at, id) as n
    from public.profiles
)
update public.profiles p
   set handle       = 'testuser' || numbered.n,
       display_name = 'testuser' || numbered.n
  from numbered
 where numbered.id = p.id;

commit;

-- What it did:
select handle, display_name, created_at
  from public.profiles
 order by created_at, id;
