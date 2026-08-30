/* afterhours — gorunumler ve fonksiyonlar.
   En kritik soru: gorunumler RLS'i sizdiriyor mu?  */

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
                 "../sql/05_seed_comments.sql", "../sql/06_views.sql"]) {
  await db.exec(await read(d));
}
console.log("\n— sema + seed + gorunumler yuklendi —");

const BEN = "11111111-1111-1111-1111-111111111111";
const ARKADAS = "22222222-2222-2222-2222-222222222222";
const YABANCI = "33333333-3333-3333-3333-333333333333";

await db.exec(`
  insert into auth.users (id, email) values
    ('${BEN}', 'ben@example.com'),
    ('${ARKADAS}', 'arkadas@example.com'),
    ('${YABANCI}', 'yabanci@example.com');
  insert into public.friendships (requester_id, addressee_id, status)
  values ('${BEN}', '${ARKADAS}', 'accepted'),
         ('${BEN}', '${YABANCI}', 'pending');
  update public.profiles set handle = 'lena' where id = '${ARKADAS}';
  update public.profiles set handle = 'yabanci' where id = '${YABANCI}';
`);

const asUser = (id) => db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"${id}"}';`);
const asAnon = () => db.exec(`set role anon; set request.jwt.claims = '';`);
const asService = () => db.exec(`reset role; set request.jwt.claims = '';`);

console.log("\n— deste —");
{
  await asAnon();
  const r = await db.query(`select slug, type_name from public.deck()`);
  check(r.rows.length === 36, "anonime 36 kartin all geliyor", `gelen ${r.rows.length}`);
  check(r.rows[0].slug === "asap-rocky", "sort_order poster sirasiyla ayni (ilk kart A$AP Rocky)");

  const t = await db.query(`select count(*)::int as n from public.deck('munchen', 'rave')`);
  check(t.rows[0].n === 7, "ture gore filtre calisiyor (7 rave)", `gelen ${t.rows[0].n}`);
}

console.log("\n— atilan kart one daha gelmiyor —");
{
  await asUser(BEN);
  const once = await db.query(`select count(*)::int as n from public.deck()`);
  await db.exec(`insert into public.swipes (user_id, event_id, direction)
                 select '${BEN}', id, 'left' from public.events where slug = 'asap-rocky'`);
  await db.exec(`insert into public.swipes (user_id, event_id, direction)
                 select '${BEN}', id, 'right' from public.events where slug = 'nick-cave'`);
  const sonra = await db.query(`select count(*)::int as n from public.deck()`);
  check(once.rows[0].n === 36 && sonra.rows[0].n === 34,
    "atilan iki kart desteden dustu", `${once.rows[0].n} → ${sonra.rows[0].n}`);
}

console.log("\n— kept —");
{
  await asUser(BEN);
  const r = await db.query(`select slug from public.kept()`);
  check(r.rows.length === 1 && r.rows[0].slug === "nick-cave",
    "sadece saga atilan biriktiriliyor (sola atilan yok)");

  await asUser(YABANCI);
  const y = await db.query(`select count(*)::int as n from public.kept()`);
  check(y.rows[0].n === 0, "baskasinin biriktirdigi kendi listesinde gorunmuyor");
}

console.log("\n— arkadaslarin begendikleri —");
{
  await asUser(ARKADAS);
  const r = await db.query(`select slug, friend from public.friends_kept()`);
  check(r.rows.length === 1 && r.rows[0].slug === "nick-cave",
    "onayli arkadasin saga attigi gorunuyor");
  check(r.rows[0].friend !== null, "kimin begendigi belli (" + r.rows[0].friend + ")");

  await asUser(YABANCI);
  const y = await db.query(`select count(*)::int as n from public.friends_kept()`);
  check(y.rows[0].n === 0, "bekleyen (onaysiz) arkadaslik veri vermiyor");
}

console.log("\n— gorunumler RLS'i siziyor mu —");
{
  await asService();
  await db.exec(`update public.events set is_published = false where slug = 'strobo'`);

  await asAnon();
  const r = await db.query(`select count(*)::int as n from public.events_public where slug = 'strobo'`);
  check(r.rows[0].n === 0, "yayindan kaldirilan etkinlik gorunumden de dustu (security_invoker)");

  const g = await db.query(`select count(*)::int as n from public.comments_public`);
  check(g.rows[0].n > 0, "asAnon yorumlari okuyabiliyor");

  await asService();
  const gizli = await db.query(`update public.comments set is_hidden = true
                                where id = (select id from public.comments limit 1)
                                returning id`);
  const gizliId = gizli.rows[0].id;

  await asAnon();
  const h = await db.query(`select count(*)::int as n from public.comments_public where id = $1`,
                           [gizliId]);
  check(h.rows[0].n === 0, "gizlenen yorum gorunumde yok");
  /* Tablonun kendisinde de gorunmemeli — gorunum tek savunma hatti degil */
  const d = await db.query(`select count(*)::int as n from public.comments where id = $1`, [gizliId]);
  check(d.rows[0].n === 0, "gizlenen yorum tabloda da anonime kapali");
}

console.log("\n— sayaclar —");
{
  await asAnon();
  const r = await db.query(`select type_name, n::int from public.event_counts()`);
  const gelen = Object.fromEntries(r.rows.map((x) => [x.type_name, x.n]));
  // strobo yukarida yayindan kaldirildi: rave 7 → 6
  check(gelen["Rave"] === 6 && gelen["Konzert"] === 5,
    "sayac yayindakileri sayiyor", JSON.stringify(gelen));

  const k = await db.query(`select count(*)::int as n from public.keep_counts()`);
  check(k.rows[0].n === 1, "biriktirme sayilari anonime de aciik (kim oldugu degil)");

  /* Anonimin swipes tablosunda hic yetkisi yok: empty sonuc degil,
     dogrudan yetki hatasi almali. */
  let hataAldi = false;
  try { await db.query(`select count(*) from public.swipes`); }
  catch (e) { hataAldi = /permission denied/i.test(e.message); }
  check(hataAldi, "ama atislarin kendisi anonime tamamen kapali");
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
