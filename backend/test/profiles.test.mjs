/* afterhours — kayittan sonra olusan profil */

import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

const oku = (y) => readFile(new URL(y, import.meta.url), "utf8");
let gecti = 0, kaldi = 0;
const olmali = (k, ad, ek = "") => {
  if (k) { gecti++; console.log("  ✓ " + ad); }
  else { kaldi++; console.log("  ✗ " + ad + (ek ? "  → " + ek : "")); }
};
process.on("unhandledRejection", (e) => {
  console.log("\nHATA: " + ((e && e.message) || e));
  if (e && e.where) console.log("  " + e.where);
  process.exit(1);
});

const db = new PGlite();
for (const d of ["../test/supabase-shim.sql", "../sql/01_schema.sql", "../sql/02_rls.sql",
                 "../sql/03_seed_katalog.sql", "../sql/04_seed_events.sql",
                 "../sql/06_views.sql", "../sql/07_friends.sql", "../sql/12_profiles.sql"]) {
  await db.exec(await oku(d));
}

const A = "aaaaaaaa-1111-1111-1111-111111111111";
const B = "bbbbbbbb-2222-2222-2222-222222222222";
const C = "cccccccc-3333-3333-3333-333333333333";

const kimlik = (id) => db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"${id}"}';`);
const yonetim = () => db.exec(`reset role; set request.jwt.claims = '';`);

console.log("\n— kayit: profil kendiliginden aciliyor —");
{
  await yonetim();
  await db.exec(`insert into auth.users (id, email) values ('${A}', 'a@x.com')`);

  const p = await db.query(`select display_name, handle, onboarded_at from public.profiles where id = '${A}'`);
  olmali(p.rows.length === 1, "hesap acilinca profil olusuyor");
  olmali(p.rows[0].display_name === "a", "gorunen ad e-postanin basindan geliyor");
  olmali(p.rows[0].handle === null, "handle bos: kayit henuz bitmedi");
  olmali(p.rows[0].onboarded_at === null, "onboarded_at bos");

  const s = await db.query(`select count(*)::int as n from public.profile_settings where user_id = '${A}'`);
  olmali(s.rows[0].n === 1, "ayar satiri da aciliyor");
}

console.log("\n— kayit formu handle ve sehir gonderirse —");
{
  await yonetim();
  await db.exec(`insert into auth.users (id, email, raw_user_meta_data) values
    ('${B}', 'b@x.com', '{"name":"Lena","handle":"lena","city":"munchen"}'::jsonb)`);

  const p = await db.query(`
    select p.handle, p.display_name, c.slug as sehir, p.onboarded_at is not null as bitti
    from public.profiles p left join public.cities c on c.id = p.city_id
    where p.id = '${B}'`);
  olmali(p.rows[0].handle === "lena", "handle kayitta alindi");
  olmali(p.rows[0].display_name === "Lena", "gorunen ad kayitta alindi");
  olmali(p.rows[0].sehir === "munchen", "sehir baglandi");
  olmali(p.rows[0].bitti === true, "handle geldiyse kayit bitmis sayiliyor");

  /* Dolu handle sessizce dusuyor, hesap yine de aciliyor */
  await db.exec(`insert into auth.users (id, email, raw_user_meta_data) values
    ('${C}', 'c@x.com', '{"handle":"lena"}'::jsonb)`);
  const c = await db.query(`select handle from public.profiles where id = '${C}'`);
  olmali(c.rows[0].handle === null, "dolu handle aliniyor ama hesap acilmayi surduruyor");
}

console.log("\n— handle musait mi —");
{
  await kimlik(A);
  const s = (h) => db.query(`select public.handle_status(${h}) as s`).then((r) => r.rows[0].s);
  olmali(await s("''") === "bos", "bos handle");
  olmali(await s("'AB'") === "bicim", "kisa/bicimsiz handle");
  olmali(await s("'Büyük'") === "bicim", "buyuk harf ve turkce harf reddediliyor");
  olmali(await s("'lena'") === "dolu", "alinmis handle");
  olmali(await s("'ahmet'") === "ok", "musait handle");
}

console.log("\n— kaydi tamamlama —");
{
  await kimlik(A);
  const r = await db.query(`select public.profile_setup('ahmet', 'Ahmet', 'munchen', 'nights out, mostly') as s`);
  olmali(r.rows[0].s === "ok", "profil kuruldu");

  const p = await db.query(`select handle, display_name, bio, onboarded_at is not null as bitti from public.profiles where id = '${A}'`);
  olmali(p.rows[0].handle === "ahmet" && p.rows[0].bio === "nights out, mostly", "alanlar yazildi");
  olmali(p.rows[0].bitti === true, "kayit bitmis sayiliyor");

  const d = await db.query(`select public.profile_setup('lena') as s`);
  olmali(d.rows[0].s === "dolu", "baskasinin handle'i alinamiyor");

  const y = await db.query(`select public.profile_setup('ahmet', null, 'yokboyle') as s`);
  olmali(y.rows[0].s === "sehir", "olmayan sehir reddediliyor");

  const t = await db.query(`select public.profile_setup('ahmet', null, null, null) as s`);
  olmali(t.rows[0].s === "ok", "kendi handle'ini tekrar yazmak sorun degil");
}

console.log("\n— kendi profilin —");
{
  await kimlik(A);
  await db.exec(`select public.swipe_set('asap-rocky', 'right')`);
  await db.exec(`select public.swipe_set('blitz', 'left')`);
  const m = await db.query(`select * from public.profile_me()`);
  olmali(m.rows.length === 1, "profile_me tek satir donuyor");
  olmali(m.rows[0].handle === "ahmet" && m.rows[0].city_slug === "munchen", "kimlik ve sehir geliyor");
  olmali(m.rows[0].kept_count === 1, "yalniz saga atilanlar sayiliyor");
  olmali(m.rows[0].kept_visibility === "friends" && m.rows[0].notify_email === true,
    "ayarlar varsayilanlariyla geliyor");
}

console.log("\n— ayarlar kisiye ozel —");
{
  await kimlik(B);
  const o = await db.query(`select count(*)::int as n from public.profile_settings`);
  olmali(o.rows[0].n === 1, "kisi yalniz kendi ayarini goruyor");

  let hata = null;
  try { await db.exec(`update public.profile_settings set notify_email = false where user_id = '${A}'`); }
  catch (e) { hata = e.message; }
  const kalan = await db.query(`select notify_email from public.profile_settings where user_id = '${A}'`);
  olmali(hata !== null || kalan.rows.length === 0, "baskasinin ayari degistirilemiyor");
}

console.log("\n— baskasinin profili —");
{
  await kimlik(B);
  const k = await db.query(`select * from public.profile_card('ahmet')`);
  olmali(k.rows.length === 1 && k.rows[0].handle === "ahmet", "kart geliyor");
  olmali(k.rows[0].is_friend === false, "arkadas degiliz");
  olmali(k.rows[0].kept_count === null, "arkadas olmayana sayilar kapali");

  await db.exec(`select public.friend_request('ahmet')`);
  await kimlik(A);
  await db.exec(`select public.friend_request('lena')`);
  await kimlik(B);
  const a = await db.query(`select is_friend, kept_count from public.profile_card('ahmet')`);
  olmali(a.rows[0].is_friend === true && a.rows[0].kept_count === 1,
    "arkadas olunca sayilar aciliyor");
}

console.log("\n— 'private' dendiginde arkadas da goremiyor —");
{
  await kimlik(A);
  await db.exec(`update public.profile_settings set kept_visibility = 'private' where user_id = '${A}'`);

  await kimlik(B);
  const k = await db.query(`select kept_count from public.profile_card('ahmet')`);
  olmali(k.rows[0].kept_count === null, "kartta sayilar kapandi");

  const f = await db.query(`select count(*)::int as n from public.friends_kept()`);
  olmali(f.rows[0].n === 0, "arkadasin destesinde de gorunmuyor");

  await kimlik(A);
  await db.exec(`update public.profile_settings set kept_visibility = 'friends' where user_id = '${A}'`);
  await kimlik(B);
  const g = await db.query(`select count(*)::int as n from public.friends_kept()`);
  olmali(g.rows[0].n === 1, "geri acilinca yine gorunuyor");
}

console.log("\n— goruldu damgasi —");
{
  await kimlik(A);
  await db.exec(`select public.seen()`);
  const s = await db.query(`select last_seen_at is not null as v from public.profiles where id = '${A}'`);
  olmali(s.rows[0].v === true, "kendi satirini damgaliyor");

  await kimlik(B);
  await db.exec(`select public.seen()`);
  const b = await db.query(`select last_seen_at from public.profiles where id = '${A}'`);
  olmali(b.rows.length === 1, "baskasininki degismiyor (kural durduruyor)");
}

console.log("\n— sinirlar —");
{
  await kimlik(A);
  let hata = null;
  try { await db.exec(`update public.profiles set bio = repeat('x', 200) where id = '${A}'`); }
  catch (e) { hata = e.message; }
  olmali(Boolean(hata), "160 karakteri gecen bir satir reddediliyor");
}

console.log(`\n${gecti} gecti, ${kaldi} kaldi\n`);
process.exit(kaldi ? 1 : 0);
