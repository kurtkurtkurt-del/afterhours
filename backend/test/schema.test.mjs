/* afterhours — semayi gercek Postgres'te calistirip dogrular.
   PGlite = Postgres'in WASM derlemesi; Docker/psql gerekmiyor.
   Supabase'e yollamadan once burada patlasin.  */

import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

let passed = 0, failed = 0;
const check = (kosul, name) => {
  if (kosul) { passed++; console.log("  ✓ " + name); }
  else { failed++; console.log("  ✗ " + name); }
};

/* Bir islemin RLS yuzunden reddedilmesini bekle */
async function reddedilmeli(db, sql, name) {
  try {
    await db.exec(sql);
    failed++; console.log("  ✗ " + name + " (gecmemeliydi, passed)");
  } catch (e) {
    passed++; console.log("  ✓ " + name);
  }
}

async function asUser(db, kullaniciId) {
  await db.exec(`set role authenticated;
                 set request.jwt.claims = '{"sub":"${kullaniciId}"}';`);
}
async function asAnon(db) {
  await db.exec(`set role anon; set request.jwt.claims = '';`);
}
async function asService(db) {
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
for (const file of ["../test/supabase-shim.sql", "../sql/01_schema.sql", "../sql/02_rls.sql"]) {
  await db.exec(await read(file));
  console.log("  · " + file.split("/").pop());
}

/* ---------------------------------------------------------- fikstur */

await db.exec(`
  insert into public.cities (slug, name, status, sort_order)
  values ('munchen', 'münchen', 'live', 1), ('istanbul', 'istanbul', 'live', 2);

  insert into public.event_types (slug, name, sort_order) values
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

console.log("\n— user olusunca profil aciliyor mu —");
{
  const r = await db.query(`select id, is_admin from public.profiles order by created_at`);
  check(r.rows.length === 3, "uc kullanicinin ucune de profil acildi (trigger)");
  check(r.rows.filter((s) => s.is_admin).length === 1, "sadece one yonetici var");
}

console.log("\n— asAnon gezinme —");
{
  await asAnon(db);
  const r = await db.query(`select slug from public.events`);
  check(r.rows.length === 1 && r.rows[0].slug === "asap-rocky",
    "asAnon sadece yayindaki etkinligi goruyor (gizli olan gorunmuyor)");

  const y = await db.query(`select count(*)::int as n from public.venues`);
  check(y.rows[0].n === 1, "asAnon mekanlari okuyabiliyor");

  await reddedilmeli(db,
    `insert into public.events (slug, city_id, type_id, title, meta)
     select 'korsan', c.id, t.id, 'Korsan', 'x' from public.cities c, public.event_types t limit 1`,
    "asAnon etkinlik ekleyemiyor");
}

console.log("\n— giris yapmis user —");
{
  await asUser(db, ARKADAS);
  await reddedilmeli(db,
    `insert into public.events (slug, city_id, type_id, title, meta)
     select 'korsan2', c.id, t.id, 'Korsan', 'x' from public.cities c, public.event_types t limit 1`,
    "sirali user etkinlik ekleyemiyor");

  await reddedilmeli(db,
    `update public.profiles set is_admin = true where id = '${ARKADAS}'`,
    "user kendini yonetici yapamiyor");

  /* user_id gonderilmiyor: varsayilani auth.uid(). Tarayicinin kimin
     adina yazdigini soylemesi gerekmiyor. */
  await db.exec(`insert into public.swipes (event_id, direction)
                 select id, 'right' from public.events where slug = 'asap-rocky'`);
  const r = await db.query(`select user_id from public.swipes`);
  check(r.rows.length === 1, "kendi atisini kaydedebiliyor");
  check(r.rows[0].user_id === ARKADAS, "user_id oturumdan kendiliginden dolduruldu");

  await reddedilmeli(db,
    `insert into public.swipes (user_id, event_id, direction)
     select '${YABANCI}', id, 'right' from public.events where slug = 'asap-rocky'`,
    "baskasinin adina atis kaydedemiyor");
}

console.log("\n— atislar kisisel mi —");
{
  await asUser(db, YABANCI);
  const r = await db.query(`select count(*)::int as n from public.swipes`);
  check(r.rows[0].n === 0, "yabanci, baskasinin atisini goremiyor");

  await asService(db);
  await db.exec(`insert into public.friendships (requester_id, addressee_id, status)
                 values ('${ARKADAS}', '${YABANCI}', 'accepted')`);

  await asUser(db, YABANCI);
  const s = await db.query(`select direction from public.swipes`);
  check(s.rows.length === 1 && s.rows[0].direction === "right",
    "onayli arkadasin SAGA attigini gorebiliyor");

  await asService(db);
  await db.exec(`insert into public.swipes (user_id, event_id, direction)
                 select '${ARKADAS}', id, 'left' from public.events where slug = 'gizli-gece'`);
  await asUser(db, YABANCI);
  const l = await db.query(`select count(*)::int as n from public.swipes where direction = 'left'`);
  check(l.rows[0].n === 0, "arkadasin SOLA attigi gorunmuyor");
}

console.log("\n— yorumlar —");
{
  await asService(db);
  const e = await db.query(`select id from public.events where slug = 'asap-rocky'`);
  const eid = e.rows[0].id;
  const k = await db.query(
    `insert into public.comments (event_id, author_name, body) values ($1, 'lena_k', 'sample topic') returning id`,
    [eid]);
  const konuId = k.rows[0].id;
  await db.exec(`insert into public.comments (event_id, parent_id, author_name, body)
                 values ('${eid}', '${konuId}', 'tobi', 'sample reply')`);

  await reddedilmeli(db,
    `insert into public.comments (event_id, parent_id, author_name, body)
     select '${eid}', id, 'x', 'cevaba reply'
     from public.comments where parent_id = '${konuId}' limit 1`,
    "cevaba reply yazilamiyor (iki seviye)");

  await reddedilmeli(db,
    `insert into public.comments (event_id, parent_id, author_name, body)
     select id, '${konuId}', 'x', 'baska etkinlige reply' from public.events where slug = 'gizli-gece'`,
    "reply baska etkinlige baglanamiyor");

  await asUser(db, YABANCI);
  await reddedilmeli(db,
    `insert into public.comments (event_id, author_id, body) values ('${eid}', '${ARKADAS}', 'sahte')`,
    "baskasinin adina yorum yazilamiyor");

  await db.exec(`insert into public.comments (event_id, author_id, body)
                 values ('${eid}', '${YABANCI}', 'kendi yorumum')`);
  const c = await db.query(`select count(*)::int as n from public.comments`);
  check(c.rows[0].n === 3, "kendi adina yorum yazabiliyor");

  /* RLS'te DELETE hata vermez, sadece hicbir satiri silmez.
     O yuzden dogru olcum: yorum yerinde duruyor mu. */
  await db.exec(`delete from public.comments where author_name = 'lena_k'`);
  await asService(db);
  const kaldiMi = await db.query(
    `select count(*)::int as n from public.comments where author_name = 'lena_k'`);
  check(kaldiMi.rows[0].n === 1, "baskasinin yorumu silinmedi (RLS sessizce engelledi)");
}

console.log("\n— yonetici —");
{
  await asUser(db, AHMET);
  const r = await db.query(`select count(*)::int as n from public.events`);
  check(r.rows[0].n === 2, "yonetici yayinda olmayani da goruyor");

  await db.exec(`insert into public.events (slug, city_id, type_id, title, meta)
                 select 'yeni-gece', c.id, t.id, 'Yeni', 'Mekan · 01.01' 
                 from public.cities c, public.event_types t
                 where c.slug = 'munchen' and t.slug = 'rave'`);
  const s = await db.query(`select count(*)::int as n from public.events`);
  check(s.rows[0].n === 3, "yonetici etkinlik ekleyebiliyor");

  const g = await db.query(`select count(*)::int as n from public.swipes`);
  check(g.rows[0].n === 0, "yonetici bile kimin ne attigini goremiyor");
}

console.log("\n— kisitlar —");
{
  await asService(db);
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

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
