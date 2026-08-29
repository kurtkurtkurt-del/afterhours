/* afterhours — semayi gercek Postgres'te calistirip dogrular.
   PGlite = Postgres'in WASM derlemesi; Docker/psql gerekmiyor.
   Supabase'e yollamadan once burada patlasin.  */

import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

const oku = (yol) => readFile(new URL(yol, import.meta.url), "utf8");

let gecti = 0, kaldi = 0;
const olmali = (kosul, ad) => {
  if (kosul) { gecti++; console.log("  ✓ " + ad); }
  else { kaldi++; console.log("  ✗ " + ad); }
};

/* Bir islemin RLS yuzunden reddedilmesini bekle */
async function reddedilmeli(db, sql, ad) {
  try {
    await db.exec(sql);
    kaldi++; console.log("  ✗ " + ad + " (gecmemeliydi, gecti)");
  } catch (e) {
    gecti++; console.log("  ✓ " + ad);
  }
}

async function kimlik(db, kullaniciId) {
  await db.exec(`set role authenticated;
                 set request.jwt.claims = '{"sub":"${kullaniciId}"}';`);
}
async function anonim(db) {
  await db.exec(`set role anon; set request.jwt.claims = '';`);
}
async function yonetim(db) {
  await db.exec(`reset role; set request.jwt.claims = '';`);
}

const db = new PGlite();

/* PGlite hatalari tum paketi basiyor; sadece mesaji goster. */
process.on("uncaughtException", (e) => {
  console.log("\nHATA: " + (e.message || e));
  if (e.where) console.log("  " + e.where);
  process.exit(1);
});
process.on("unhandledRejection", (e) => {
  console.log("\nHATA: " + ((e && e.message) || e));
  if (e && e.where) console.log("  " + e.where);
  process.exit(1);
});

console.log("\n— sema kuruluyor —");
for (const dosya of ["../test/supabase-shim.sql", "../sql/01_schema.sql", "../sql/02_rls.sql"]) {
  await db.exec(await oku(dosya));
  console.log("  · " + dosya.split("/").pop());
}

/* ---------------------------------------------------------- fikstur */

await db.exec(`
  insert into public.cities (slug, name, status, sira)
  values ('munchen', 'münchen', 'live', 1), ('istanbul', 'istanbul', 'live', 2);

  insert into public.event_types (slug, name, sira) values
    ('rave', 'Rave', 1), ('club-night', 'Club Night', 2), ('konzert', 'Konzert', 3);

  insert into public.venues (city_id, slug, name, opens_hour, open_hours)
  select id, 'olympiahalle', 'OLYMPIAHALLE', 18.5, 4 from public.cities where slug = 'munchen';

  insert into public.events (slug, city_id, type_id, title, meta, body, poster_no)
  select 'asap-rocky', c.id, t.id, 'A$AP Rocky',
         'Olympiahalle · 11.09.26 · 18:30', 'An arena show.', 1
  from public.cities c, public.event_types t
  where c.slug = 'munchen' and t.slug = 'konzert';

  insert into public.events (slug, city_id, type_id, title, meta, is_published, poster_no)
  select 'gizli-gece', c.id, t.id, 'Gizli', 'x', false, 2
  from public.cities c, public.event_types t
  where c.slug = 'munchen' and t.slug = 'rave';

  insert into auth.users (id, email) values
    ('11111111-1111-1111-1111-111111111111', 'ahmet@example.com'),
    ('22222222-2222-2222-2222-222222222222', 'arkadas@example.com'),
    ('33333333-3333-3333-3333-333333333333', 'yabanci@example.com');

  update public.profiles set is_admin = true, handle = 'ahmet'
  where id = '11111111-1111-1111-1111-111111111111';
`);

const AHMET = "11111111-1111-1111-1111-111111111111";
const ARKADAS = "22222222-2222-2222-2222-222222222222";
const YABANCI = "33333333-3333-3333-3333-333333333333";

console.log("\n— kullanici olusunca profil aciliyor mu —");
{
  const r = await db.query(`select id, is_admin from public.profiles order by created_at`);
  olmali(r.rows.length === 3, "uc kullanicinin ucune de profil acildi (trigger)");
  olmali(r.rows.filter((s) => s.is_admin).length === 1, "sadece bir yonetici var");
}

console.log("\n— anonim gezinme —");
{
  await anonim(db);
  const r = await db.query(`select slug from public.events`);
  olmali(r.rows.length === 1 && r.rows[0].slug === "asap-rocky",
    "anonim sadece yayindaki etkinligi goruyor (gizli olan gorunmuyor)");

  const y = await db.query(`select count(*)::int as n from public.venues`);
  olmali(y.rows[0].n === 1, "anonim mekanlari okuyabiliyor");

  await reddedilmeli(db,
    `insert into public.events (slug, city_id, type_id, title, meta)
     select 'korsan', c.id, t.id, 'Korsan', 'x' from public.cities c, public.event_types t limit 1`,
    "anonim etkinlik ekleyemiyor");
}

console.log("\n— giris yapmis kullanici —");
{
  await kimlik(db, ARKADAS);
  await reddedilmeli(db,
    `insert into public.events (slug, city_id, type_id, title, meta)
     select 'korsan2', c.id, t.id, 'Korsan', 'x' from public.cities c, public.event_types t limit 1`,
    "sirali kullanici etkinlik ekleyemiyor");

  await reddedilmeli(db,
    `update public.profiles set is_admin = true where id = '${ARKADAS}'`,
    "kullanici kendini yonetici yapamiyor");

  /* user_id gonderilmiyor: varsayilani auth.uid(). Tarayicinin kimin
     adina yazdigini soylemesi gerekmiyor. */
  await db.exec(`insert into public.swipes (event_id, direction)
                 select id, 'right' from public.events where slug = 'asap-rocky'`);
  const r = await db.query(`select user_id from public.swipes`);
  olmali(r.rows.length === 1, "kendi atisini kaydedebiliyor");
  olmali(r.rows[0].user_id === ARKADAS, "user_id oturumdan kendiliginden dolduruldu");

  await reddedilmeli(db,
    `insert into public.swipes (user_id, event_id, direction)
     select '${YABANCI}', id, 'right' from public.events where slug = 'asap-rocky'`,
    "baskasinin adina atis kaydedemiyor");
}

console.log("\n— atislar kisisel mi —");
{
  await kimlik(db, YABANCI);
  const r = await db.query(`select count(*)::int as n from public.swipes`);
  olmali(r.rows[0].n === 0, "yabanci, baskasinin atisini goremiyor");

  await yonetim(db);
  await db.exec(`insert into public.friendships (requester_id, addressee_id, status)
                 values ('${ARKADAS}', '${YABANCI}', 'accepted')`);

  await kimlik(db, YABANCI);
  const s = await db.query(`select direction from public.swipes`);
  olmali(s.rows.length === 1 && s.rows[0].direction === "right",
    "onayli arkadasin SAGA attigini gorebiliyor");

  await yonetim(db);
  await db.exec(`insert into public.swipes (user_id, event_id, direction)
                 select '${ARKADAS}', id, 'left' from public.events where slug = 'gizli-gece'`);
  await kimlik(db, YABANCI);
  const l = await db.query(`select count(*)::int as n from public.swipes where direction = 'left'`);
  olmali(l.rows[0].n === 0, "arkadasin SOLA attigi gorunmuyor");
}

console.log("\n— yorumlar —");
{
  await yonetim(db);
  const e = await db.query(`select id from public.events where slug = 'asap-rocky'`);
  const eid = e.rows[0].id;
  const k = await db.query(
    `insert into public.comments (event_id, author_name, body) values ($1, 'lena_k', 'ornek konu') returning id`,
    [eid]);
  const konuId = k.rows[0].id;
  await db.exec(`insert into public.comments (event_id, parent_id, author_name, body)
                 values ('${eid}', '${konuId}', 'tobi', 'ornek cevap')`);

  await reddedilmeli(db,
    `insert into public.comments (event_id, parent_id, author_name, body)
     select '${eid}', id, 'x', 'cevaba cevap'
     from public.comments where parent_id = '${konuId}' limit 1`,
    "cevaba cevap yazilamiyor (iki seviye)");

  await reddedilmeli(db,
    `insert into public.comments (event_id, parent_id, author_name, body)
     select id, '${konuId}', 'x', 'baska etkinlige cevap' from public.events where slug = 'gizli-gece'`,
    "cevap baska etkinlige baglanamiyor");

  await kimlik(db, YABANCI);
  await reddedilmeli(db,
    `insert into public.comments (event_id, author_id, body) values ('${eid}', '${ARKADAS}', 'sahte')`,
    "baskasinin adina yorum yazilamiyor");

  await db.exec(`insert into public.comments (event_id, author_id, body)
                 values ('${eid}', '${YABANCI}', 'kendi yorumum')`);
  const c = await db.query(`select count(*)::int as n from public.comments`);
  olmali(c.rows[0].n === 3, "kendi adina yorum yazabiliyor");

  /* RLS'te DELETE hata vermez, sadece hicbir satiri silmez.
     O yuzden dogru olcum: yorum yerinde duruyor mu. */
  await db.exec(`delete from public.comments where author_name = 'lena_k'`);
  await yonetim(db);
  const kaldiMi = await db.query(
    `select count(*)::int as n from public.comments where author_name = 'lena_k'`);
  olmali(kaldiMi.rows[0].n === 1, "baskasinin yorumu silinmedi (RLS sessizce engelledi)");
}

console.log("\n— yonetici —");
{
  await kimlik(db, AHMET);
  const r = await db.query(`select count(*)::int as n from public.events`);
  olmali(r.rows[0].n === 2, "yonetici yayinda olmayani da goruyor");

  await db.exec(`insert into public.events (slug, city_id, type_id, title, meta)
                 select 'yeni-gece', c.id, t.id, 'Yeni', 'Mekan · 01.01' 
                 from public.cities c, public.event_types t
                 where c.slug = 'munchen' and t.slug = 'rave'`);
  const s = await db.query(`select count(*)::int as n from public.events`);
  olmali(s.rows[0].n === 3, "yonetici etkinlik ekleyebiliyor");

  const g = await db.query(`select count(*)::int as n from public.swipes`);
  olmali(g.rows[0].n === 0, "yonetici bile kimin ne attigini goremiyor");
}

console.log("\n— kisitlar —");
{
  await yonetim(db);
  await reddedilmeli(db,
    `insert into public.swipes (user_id, event_id, direction)
     select '${ARKADAS}', id, 'yukari' from public.events limit 1`,
    "gecersiz yon reddediliyor");

  await reddedilmeli(db,
    `insert into public.friendships (requester_id, addressee_id) values ('${AHMET}', '${AHMET}')`,
    "kendisiyle arkadas olunamiyor");

  await reddedilmeli(db,
    `insert into public.swipes (user_id, event_id, direction)
     select '${ARKADAS}', id, 'left' from public.events where slug = 'asap-rocky'`,
    "ayni karta ikinci kez atis yapilamiyor");

  await reddedilmeli(db, `insert into public.comments (event_id, body)
     select id, 'yazarsiz' from public.events limit 1`,
    "yazarsiz yorum reddediliyor");
}

console.log(`\n${gecti} gecti, ${kaldi} kaldi\n`);
process.exit(kaldi ? 1 : 0);
