/* afterhours — kayittan sonra olusan profil */

import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

const read = (y) => readFile(new URL(y, import.meta.url), "utf8");
let passed = 0, failed = 0;
const check = (k, name, extra = "") => {
  if (k) { passed++; console.log("  ✓ " + name); }
  else { failed++; console.log("  ✗ " + name + (extra ? "  → " + extra : "")); }
};
process.on("unhandledRejection", (e) => {
  console.log("\nHATA: " + ((e && e.message) || e));
  if (e && e.where) console.log("  " + e.where);
  process.exit(1);
});

const db = new PGlite();
for (const d of ["../test/supabase-shim.sql", "../sql/01_schema.sql", "../sql/02_rls.sql",
                 "../sql/03_seed_catalog.sql", "../sql/04_seed_events.sql",
                 "../sql/06_views.sql", "../sql/07_friends.sql", "../sql/12_profiles.sql"]) {
  await db.exec(await read(d));
}

const A = "aaaaaaaa-1111-1111-1111-111111111111";
const B = "bbbbbbbb-2222-2222-2222-222222222222";
const C = "cccccccc-3333-3333-3333-333333333333";

const asUser = (id) => db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"${id}"}';`);
const asService = () => db.exec(`reset role; set request.jwt.claims = '';`);

console.log("\n— record: profil kendiliginden aciliyor —");
{
  await asService();
  await db.exec(`insert into auth.users (id, email) values ('${A}', 'a@x.com')`);

  const p = await db.query(`select display_name, handle, onboarded_at from public.profiles where id = '${A}'`);
  check(p.rows.length === 1, "hesap acilinca profil olusuyor");
  check(p.rows[0].display_name === "a", "gorunen name e-postanin basindan geliyor");
  check(p.rows[0].handle === null, "handle empty: record henuz bitmedi");
  check(p.rows[0].onboarded_at === null, "onboarded_at empty");

  const s = await db.query(`select count(*)::int as n from public.profile_settings where user_id = '${A}'`);
  check(s.rows[0].n === 1, "ayar satiri da aciliyor");
}

console.log("\n— record formu handle ve sehir gonderirse —");
{
  await asService();
  await db.exec(`insert into auth.users (id, email, raw_user_meta_data) values
    ('${B}', 'b@x.com', '{"name":"Lena","handle":"lena","city":"munchen"}'::jsonb)`);

  const p = await db.query(`
    select p.handle, p.display_name, c.slug as city, p.onboarded_at is not null as bitti
    from public.profiles p left join public.cities c on c.id = p.city_id
    where p.id = '${B}'`);
  check(p.rows[0].handle === "lena", "handle kayitta alindi");
  check(p.rows[0].display_name === "Lena", "gorunen name kayitta alindi");
  check(p.rows[0].city === "munchen", "sehir baglandi");
  check(p.rows[0].bitti === true, "handle geldiyse record bitmis sayiliyor");

  /* Dolu handle sessizce dusuyor, hesap yine de aciliyor */
  await db.exec(`insert into auth.users (id, email, raw_user_meta_data) values
    ('${C}', 'c@x.com', '{"handle":"lena"}'::jsonb)`);
  const c = await db.query(`select handle from public.profiles where id = '${C}'`);
  check(c.rows[0].handle === null, "taken handle aliniyor ama hesap acilmayi surduruyor");
}

console.log("\n— handle musait mi —");
{
  await asUser(A);
  const s = (h) => db.query(`select public.handle_status(${h}) as s`).then((r) => r.rows[0].s);
  check(await s("''") === "empty", "empty handle");
  check(await s("'AB'") === "format", "kisa/bicimsiz handle");
  check(await s("'Büyük'") === "format", "buyuk harf ve turkce harf reddediliyor");
  check(await s("'lena'") === "taken", "alinmis handle");
  check(await s("'ahmet'") === "ok", "musait handle");
}

console.log("\n— kaydi tamamlama —");
{
  await asUser(A);
  const r = await db.query(`select public.profile_setup('ahmet', 'Ahmet', 'munchen', 'nights out, mostly') as s`);
  check(r.rows[0].s === "ok", "profil kuruldu");

  const p = await db.query(`select handle, display_name, bio, onboarded_at is not null as bitti from public.profiles where id = '${A}'`);
  check(p.rows[0].handle === "ahmet" && p.rows[0].bio === "nights out, mostly", "alanlar yazildi");
  check(p.rows[0].bitti === true, "record bitmis sayiliyor");

  const d = await db.query(`select public.profile_setup('lena') as s`);
  check(d.rows[0].s === "taken", "baskasinin handle'i alinamiyor");

  const y = await db.query(`select public.profile_setup('ahmet', null, 'yokboyle') as s`);
  check(y.rows[0].s === "nocity", "olmayan sehir reddediliyor");

  const t = await db.query(`select public.profile_setup('ahmet', null, null, null) as s`);
  check(t.rows[0].s === "ok", "kendi handle'ini tekrar yazmak sorun degil");
}

console.log("\n— kendi profilin —");
{
  await asUser(A);
  await db.exec(`select public.swipe_set('asap-rocky', 'right')`);
  await db.exec(`select public.swipe_set('blitz', 'left')`);
  const m = await db.query(`select * from public.profile_me()`);
  check(m.rows.length === 1, "profile_me tek satir donuyor");
  check(m.rows[0].handle === "ahmet" && m.rows[0].city_slug === "munchen", "asUser ve sehir geliyor");
  check(m.rows[0].kept_count === 1, "yalniz saga atilanlar sayiliyor");
  check(m.rows[0].kept_visibility === "friends" && m.rows[0].notify_email === true,
    "ayarlar varsayilanlariyla geliyor");
}

console.log("\n— ayarlar kisiye ozel —");
{
  await asUser(B);
  const o = await db.query(`select count(*)::int as n from public.profile_settings`);
  check(o.rows[0].n === 1, "kisi yalniz kendi ayarini goruyor");

  let hata = null;
  try { await db.exec(`update public.profile_settings set notify_email = false where user_id = '${A}'`); }
  catch (e) { hata = e.message; }
  const kalan = await db.query(`select notify_email from public.profile_settings where user_id = '${A}'`);
  check(hata !== null || kalan.rows.length === 0, "baskasinin ayari degistirilemiyor");
}

console.log("\n— baskasinin profili —");
{
  await asUser(B);
  const k = await db.query(`select * from public.profile_card('ahmet')`);
  check(k.rows.length === 1 && k.rows[0].handle === "ahmet", "kart geliyor");
  check(k.rows[0].is_friend === false, "arkadas degiliz");
  check(k.rows[0].kept_count === null, "arkadas olmayana sayilar kapali");

  await db.exec(`select public.friend_request('ahmet')`);
  await asUser(A);
  await db.exec(`select public.friend_request('lena')`);
  await asUser(B);
  const a = await db.query(`select is_friend, kept_count from public.profile_card('ahmet')`);
  check(a.rows[0].is_friend === true && a.rows[0].kept_count === 1,
    "arkadas olunca sayilar aciliyor");
}

console.log("\n— 'private' dendiginde arkadas da goremiyor —");
{
  await asUser(A);
  await db.exec(`update public.profile_settings set kept_visibility = 'private' where user_id = '${A}'`);

  await asUser(B);
  const k = await db.query(`select kept_count from public.profile_card('ahmet')`);
  check(k.rows[0].kept_count === null, "kartta sayilar kapandi");

  const f = await db.query(`select count(*)::int as n from public.friends_kept()`);
  check(f.rows[0].n === 0, "arkadasin destesinde de gorunmuyor");

  await asUser(A);
  await db.exec(`update public.profile_settings set kept_visibility = 'friends' where user_id = '${A}'`);
  await asUser(B);
  const g = await db.query(`select count(*)::int as n from public.friends_kept()`);
  check(g.rows[0].n === 1, "geri acilinca yine gorunuyor");
}

console.log("\n— list gezilemiyor —");
{
  await asUser(C);   /* kimseyle bagi olmayan biri */
  const t = await db.query(`select count(*)::int as n from public.profiles`);
  check(t.rows[0].n === 1, "yabanci yalniz kendi satirini goruyor", "gordugu " + t.rows[0].n);

  await db.exec(`set role anon; set request.jwt.claims = '';`);
  const a = await db.query(`select count(*)::int as n from public.profiles`);
  check(a.rows[0].n === 0, "girissiz hicbir profil goremiyor", "gordugu " + a.rows[0].n);

  await asUser(B);   /* A ile arkadas */
  const f = await db.query(`select count(*)::int as n from public.profiles`);
  check(f.rows[0].n === 2, "arkadasinin satirini gorebiliyor", "gordugu " + f.rows[0].n);
}

console.log("\n— adini bilen karti goruyor —");
{
  await asUser(C);
  const k = await db.query(`select * from public.profile_card('ahmet')`);
  check(k.rows.length === 1 && k.rows[0].display_name === "Ahmet",
    "yabanci ada gore karti goruyor");
  check(k.rows[0].kept_count === null, "sayilar yabanciya kapali");
  check(k.rows[0].last_seen_day === null, "son gorulme yabanciya kapali");

  const y = await db.query(`select count(*)::int as n from public.profile_card('yokboyle')`);
  check(y.rows[0].n === 0, "olmayan name empty donuyor");
}

console.log("\n— ayardan kapatinca kart kayboluyor —");
{
  await asUser(A);
  await db.exec(`update public.profile_settings set discoverable = false where user_id = '${A}'`);

  await asUser(C);
  const k = await db.query(`select count(*)::int as n from public.profile_card('ahmet')`);
  check(k.rows[0].n === 0, "yabanci artik karti goremiyor");

  /* Ama adini bilen yine req gonderebiliyor: yoksa kimse ekleyemezdi */
  const i = await db.query(`select public.friend_request('ahmet') as s`);
  check(i.rows[0].s === "sent", "req gondermek hala calisiyor");

  await asUser(B);   /* arkadasi */
  const f = await db.query(`select count(*)::int as n from public.profile_card('ahmet')`);
  check(f.rows[0].n === 1, "arkadasi gormeye devam ediyor");

  await asUser(A);
  const kendi = await db.query(`select count(*)::int as n from public.profile_card('ahmet')`);
  check(kendi.rows[0].n === 1, "kendi kartini her zaman gorursun");
  await db.exec(`update public.profile_settings set discoverable = true where user_id = '${A}'`);
}

console.log("\n— son gorulme gun olarak —");
{
  await asUser(A);
  await db.exec(`select public.seen()`);
  await asUser(B);
  /* Metin olarak soruyoruz: surucu date’i JS Date’e cevirip saat
     uyduruyor, biz veritabanindan ne CIKTIGINI olcmek istiyoruz. */
  const f = await db.query(`select last_seen_day::text as g from public.profile_card('ahmet')`);
  check(f.rows[0].g !== null, "arkadasi gunu goruyor");
  check(/^\d{4}-\d{2}-\d{2}$/.test(f.rows[0].g),
    "yalniz gun tasiniyor, saat yok", String(f.rows[0].g));
}

console.log("\n— kurala takilmayan eski isler —");
{
  await asService();
  await db.exec(`
    insert into public.comments (event_id, author_id, body)
    select id, '${A}', 'burada olacagim' from public.events where slug = 'blitz';
  `);
  await db.exec(`set role anon; set request.jwt.claims = '';`);
  const c = await db.query(`select author from public.comments_public where body = 'burada olacagim'`);
  check(c.rows[0].author === "ahmet", "girissiz okuyucu yorumun yazarini goruyor", String(c.rows[0].author));

  await asUser(C);
  const h = await db.query(`select public.handle_status('ahmet') as s`);
  check(h.rows[0].s === "taken", "name musaitlik kontrolu hala calisiyor");
}

console.log("\n— goruldu damgasi —");
{
  await asUser(A);
  await db.exec(`select public.seen()`);
  const s = await db.query(`select last_seen_at is not null as v from public.profiles where id = '${A}'`);
  check(s.rows[0].v === true, "kendi satirini damgaliyor");

  await asUser(B);
  await db.exec(`select public.seen()`);
  const b = await db.query(`select last_seen_at from public.profiles where id = '${A}'`);
  check(b.rows.length === 1, "baskasininki degismiyor (kural durduruyor)");
}

console.log("\n— sinirlar —");
{
  await asUser(A);
  let hata = null;
  try { await db.exec(`update public.profiles set bio = repeat('x', 200) where id = '${A}'`); }
  catch (e) { hata = e.message; }
  check(Boolean(hata), "160 karakteri gecen one satir reddediliyor");
}

console.log("\n— hesabi silme —");
{
  await asService();
  const D = "dddddddd-4444-4444-4444-444444444444";
  await db.exec(`insert into auth.users (id, email) values ('${D}', 'd@x.com')`);
  await db.exec(`update public.profiles set handle = 'silinecek' where id = '${D}'`);

  await asUser(D);
  await db.exec(`select public.swipe_set('blitz', 'right')`);
  await db.exec(`
    insert into public.comments (event_id, author_id, body)
    select id, '${D}', 'ben de geliyorum' from public.events where slug = 'blitz';
  `);

  await db.exec(`select public.delete_account()`);

  await asService();
  const h = await db.query(`select count(*)::int as n from auth.users where id = '${D}'`);
  check(h.rows[0].n === 0, "hesap gitti");

  const pr = await db.query(`select count(*)::int as n from public.profiles where id = '${D}'`);
  check(pr.rows[0].n === 0, "profil zincirle gitti");

  const ay = await db.query(`select count(*)::int as n from public.profile_settings where user_id = '${D}'`);
  check(ay.rows[0].n === 0, "ayarlar zincirle gitti");

  const at = await db.query(`select count(*)::int as n from public.swipes where user_id = '${D}'`);
  check(at.rows[0].n === 0, "atislari gitti");

  const y = await db.query(`select author_id, author_name from public.comments where body = 'ben de geliyorum'`);
  check(y.rows.length === 1 && y.rows[0].author_id === null && y.rows[0].author_name === "someone",
    "yorumun metni failed, adi dustu");
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
