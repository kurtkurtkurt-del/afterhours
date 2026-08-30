/* afterhours — gorunumler ve fonksiyonlar.
   En kritik soru: gorunumler RLS'i sizdiriyor mu?  */

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
                 "../sql/05_seed_comments.sql", "../sql/06_views.sql"]) {
  await db.exec(await oku(d));
}
console.log("\n— sema + tohum + gorunumler yuklendi —");

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

const kimlik = (id) => db.exec(`set role authenticated; set request.jwt.claims = '{"sub":"${id}"}';`);
const anonim = () => db.exec(`set role anon; set request.jwt.claims = '';`);
const yonetim = () => db.exec(`reset role; set request.jwt.claims = '';`);

console.log("\n— deste —");
{
  await anonim();
  const r = await db.query(`select slug, type_name from public.deck()`);
  olmali(r.rows.length === 36, "anonime 36 kartin hepsi geliyor", `gelen ${r.rows.length}`);
  olmali(r.rows[0].slug === "asap-rocky", "sira poster sirasiyla ayni (ilk kart A$AP Rocky)");

  const t = await db.query(`select count(*)::int as n from public.deck('munchen', 'rave')`);
  olmali(t.rows[0].n === 7, "ture gore filtre calisiyor (7 rave)", `gelen ${t.rows[0].n}`);
}

console.log("\n— atilan kart bir daha gelmiyor —");
{
  await kimlik(BEN);
  const once = await db.query(`select count(*)::int as n from public.deck()`);
  await db.exec(`insert into public.swipes (user_id, event_id, direction)
                 select '${BEN}', id, 'left' from public.events where slug = 'asap-rocky'`);
  await db.exec(`insert into public.swipes (user_id, event_id, direction)
                 select '${BEN}', id, 'right' from public.events where slug = 'nick-cave'`);
  const sonra = await db.query(`select count(*)::int as n from public.deck()`);
  olmali(once.rows[0].n === 36 && sonra.rows[0].n === 34,
    "atilan iki kart desteden dustu", `${once.rows[0].n} → ${sonra.rows[0].n}`);
}

console.log("\n— kept —");
{
  await kimlik(BEN);
  const r = await db.query(`select slug from public.kept()`);
  olmali(r.rows.length === 1 && r.rows[0].slug === "nick-cave",
    "sadece saga atilan biriktiriliyor (sola atilan yok)");

  await kimlik(YABANCI);
  const y = await db.query(`select count(*)::int as n from public.kept()`);
  olmali(y.rows[0].n === 0, "baskasinin biriktirdigi kendi listesinde gorunmuyor");
}

console.log("\n— arkadaslarin begendikleri —");
{
  await kimlik(ARKADAS);
  const r = await db.query(`select slug, friend from public.friends_kept()`);
  olmali(r.rows.length === 1 && r.rows[0].slug === "nick-cave",
    "onayli arkadasin saga attigi gorunuyor");
  olmali(r.rows[0].friend !== null, "kimin begendigi belli (" + r.rows[0].friend + ")");

  await kimlik(YABANCI);
  const y = await db.query(`select count(*)::int as n from public.friends_kept()`);
  olmali(y.rows[0].n === 0, "bekleyen (onaysiz) arkadaslik veri vermiyor");
}

console.log("\n— gorunumler RLS'i siziyor mu —");
{
  await yonetim();
  await db.exec(`update public.events set is_published = false where slug = 'strobo'`);

  await anonim();
  const r = await db.query(`select count(*)::int as n from public.events_public where slug = 'strobo'`);
  olmali(r.rows[0].n === 0, "yayindan kaldirilan etkinlik gorunumden de dustu (security_invoker)");

  const g = await db.query(`select count(*)::int as n from public.comments_public`);
  olmali(g.rows[0].n > 0, "anonim yorumlari okuyabiliyor");

  await yonetim();
  const gizli = await db.query(`update public.comments set is_hidden = true
                                where id = (select id from public.comments limit 1)
                                returning id`);
  const gizliId = gizli.rows[0].id;

  await anonim();
  const h = await db.query(`select count(*)::int as n from public.comments_public where id = $1`,
                           [gizliId]);
  olmali(h.rows[0].n === 0, "gizlenen yorum gorunumde yok");
  /* Tablonun kendisinde de gorunmemeli — gorunum tek savunma hatti degil */
  const d = await db.query(`select count(*)::int as n from public.comments where id = $1`, [gizliId]);
  olmali(d.rows[0].n === 0, "gizlenen yorum tabloda da anonime kapali");
}

console.log("\n— sayaclar —");
{
  await anonim();
  const r = await db.query(`select type_name, n::int from public.event_counts()`);
  const gelen = Object.fromEntries(r.rows.map((x) => [x.type_name, x.n]));
  // strobo yukarida yayindan kaldirildi: rave 7 → 6
  olmali(gelen["Rave"] === 6 && gelen["Konzert"] === 5,
    "sayac yayindakileri sayiyor", JSON.stringify(gelen));

  const k = await db.query(`select count(*)::int as n from public.keep_counts()`);
  olmali(k.rows[0].n === 1, "biriktirme sayilari anonime de aciik (kim oldugu degil)");

  /* Anonimin swipes tablosunda hic yetkisi yok: bos sonuc degil,
     dogrudan yetki hatasi almali. */
  let hataAldi = false;
  try { await db.query(`select count(*) from public.swipes`); }
  catch (e) { hataAldi = /permission denied/i.test(e.message); }
  olmali(hataAldi, "ama atislarin kendisi anonime tamamen kapali");
}

console.log(`\n${gecti} gecti, ${kaldi} kaldi\n`);
process.exit(kaldi ? 1 : 0);
