/* afterhours — YEREL GELISTIRME SUNUCUSU. Supabase DEGIL.
   Supabase'in kullandigimiz uclarini (PostgREST + GoTrue'nun kucuk bir
   alt kumesi) PGlite'in ustunde taklit eder. Amaci tek: proje acilmadan
   once canli yolu gercekten calistirip test edebilmek.

   Kimlik dogrulama SAHTEDIR: jeton = kullanici id'si. Uretimde
   kullanilmaz, internete acilmaz.

     node tools/yerel-sunucu.mjs          → http://localhost:4350
*/

import { PGlite } from "@electric-sql/pglite";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const PORT = Number(process.env.PORT || 4350);
const oku = (y) => readFile(new URL(y, import.meta.url), "utf8");

const db = new PGlite();
for (const d of ["../test/supabase-shim.sql", "../sql/01_schema.sql", "../sql/02_rls.sql",
                 "../sql/03_seed_katalog.sql", "../sql/04_seed_events.sql",
                 "../sql/05_seed_comments.sql", "../sql/06_views.sql",
                 "../sql/07_friends.sql"]) {
  await db.exec(await oku(d));
}
console.log("veritabani hazir (bellekte)");

/* --- istegi kimin yaptigi ------------------------------------------- */

/* Gercek Supabase'de bu bir JWT. Burada duz kullanici id'si; sahte
   oldugu belli olsun diye "yerel-" onekiyle geliyor. */
function jetondanKullanici(bas) {
  const yetki = bas.authorization || "";
  const m = yetki.match(/^Bearer\s+yerel-(.+)$/);
  return m ? m[1] : null;
}

async function rolAyarla(kullanici) {
  if (kullanici) {
    await db.exec(`set role authenticated;
                   set request.jwt.claims = '{"sub":"${kullanici}"}';`);
  } else {
    await db.exec(`set role anon; set request.jwt.claims = '';`);
  }
}
const rolBirak = () => db.exec(`reset role; set request.jwt.claims = '';`);

/* Fonksiyon argumanlarinin adi → tipi. Bir kere okunup saklaniyor. */
const tipBellegi = new Map();
async function argumanTipleri(fn) {
  if (tipBellegi.has(fn)) return tipBellegi.get(fn);
  const r = await db.query(
    `select p.proargnames as adlar,
            array(select t::regtype::text from unnest(p.proargtypes) as t) as tipler
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = $1 limit 1`, [fn]);
  const esle = {};
  if (r.rows.length && r.rows[0].adlar) {
    const adlar = r.rows[0].adlar, tipler = r.rows[0].tipler;
    adlar.forEach((a, i) => { if (a && tipler[i]) esle[a] = tipler[i]; });
  }
  tipBellegi.set(fn, esle);
  return esle;
}

/* --- PostgREST suzgeclerinin kucuk bir alt kumesi -------------------- */

/* ?event_id=eq.<uuid>&order=created_at.desc&limit=60 */
function suzgecCevir(arama, sayac) {
  const kosullar = [];
  const parametreler = [];
  let sira = "";
  let limit = "";

  for (const [alan, deger] of arama) {
    if (alan === "select" || alan === "apikey") continue;
    if (alan === "order") {
      const [k, y] = deger.split(".");
      sira = ` order by ${k.replace(/[^a-z_]/gi, "")} ${/desc/i.test(y) ? "desc" : "asc"}`;
      continue;
    }
    if (alan === "limit") { limit = ` limit ${Number(deger) || 50}`; continue; }

    const [islem, ...kalan] = deger.split(".");
    const v = kalan.join(".");
    const kolon = alan.replace(/[^a-z_0-9]/gi, "");
    const isaret = { eq: "=", neq: "<>", gt: ">", lt: "<", gte: ">=", lte: "<=" }[islem];
    if (!isaret) continue;
    parametreler.push(v);
    kosullar.push(`${kolon} ${isaret} $${sayac.n++}`);
  }
  return {
    nerede: kosullar.length ? " where " + kosullar.join(" and ") : "",
    sira, limit, parametreler,
  };
}

const govdeOku = (istek) =>
  new Promise((tamam) => {
    let v = "";
    istek.on("data", (p) => (v += p));
    istek.on("end", () => { try { tamam(v ? JSON.parse(v) : null); } catch (_) { tamam(null); } });
  });

/* --- sunucu --------------------------------------------------------- */

const sunucu = createServer(async (istek, cevap) => {
  const url = new URL(istek.url, "http://localhost");
  const yol = url.pathname;

  cevap.setHeader("Access-Control-Allow-Origin", "*");
  cevap.setHeader("Access-Control-Allow-Headers", "authorization, apikey, content-type, prefer");
  cevap.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  if (istek.method === "OPTIONS") { cevap.writeHead(204); return cevap.end(); }

  const yolla = (kod, veri) => {
    cevap.writeHead(kod, { "Content-Type": "application/json" });
    cevap.end(veri === undefined ? "" : JSON.stringify(veri));
  };

  const kullanici = jetondanKullanici(istek.headers);
  const govde = ["POST", "PATCH", "PUT"].includes(istek.method) ? await govdeOku(istek) : null;

  try {
    /* ---------- GoTrue taklidi ---------- */

    if (yol === "/auth/v1/otp") {
      const eposta = (govde && govde.email || "").toLowerCase();
      if (!eposta) return yolla(400, { msg: "email gerekli" });
      await rolBirak();
      let k = await db.query(`select id from auth.users where email = $1`, [eposta]);
      if (!k.rows.length) {
        k = await db.query(`insert into auth.users (email) values ($1) returning id`, [eposta]);
      }
      const id = k.rows[0].id;
      const donus = (govde.options && govde.options.email_redirect_to) || "http://localhost:4340/";
      console.log("\n  ✉  giris baglantisi (" + eposta + "):");
      console.log("     " + donus + "#access_token=yerel-" + id +
                  "&refresh_token=yerel-" + id + "&expires_in=3600\n");
      return yolla(200, {});
    }

    if (yol === "/auth/v1/token") {
      const id = (govde && govde.refresh_token || "").replace(/^yerel-/, "");
      if (!id) return yolla(400, { msg: "refresh_token gerekli" });
      return yolla(200, { access_token: "yerel-" + id, refresh_token: "yerel-" + id, expires_in: 3600 });
    }

    if (yol === "/auth/v1/user") {
      if (!kullanici) return yolla(401, { msg: "jeton yok" });
      await rolBirak();
      const r = await db.query(`select id, email from auth.users where id = $1`, [kullanici]);
      return yolla(200, r.rows[0] || null);
    }

    if (yol === "/auth/v1/logout") return yolla(204);

    /* ---------- PostgREST taklidi ---------- */

    if (yol.startsWith("/rest/v1/")) {
      const ad = yol.slice("/rest/v1/".length);
      await rolAyarla(kullanici);

      /* fonksiyon cagrisi */
      if (ad.startsWith("rpc/")) {
        const fn = ad.slice(4).replace(/[^a-z_0-9]/gi, "");
        const anahtarlar = Object.keys(govde || {});
        const tipler = await argumanTipleri(fn);
        /* Tip verilmezse Postgres argumani "unknown" sayip fonksiyonu
           bulamiyor; imzayi katalogdan okuyup her argumani donusturuyoruz. */
        const args = anahtarlar
          .map((k, i) => `${k} => $${i + 1}::${tipler[k] || "text"}`)
          .join(", ");
        const r = await db.query(`select * from public.${fn}(${args})`,
                                 anahtarlar.map((k) => govde[k]));
        /* PostgREST skaler donen fonksiyonlarda ciplak degeri dondurur,
           satir sarmalamaz. Ayni davranis. */
        const skaler = r.rows.length === 1 && r.fields && r.fields.length === 1
          && r.fields[0].name === fn;
        return yolla(200, skaler ? r.rows[0][fn] : r.rows);
      }

      const tablo = ad.split("?")[0].replace(/[^a-z_0-9]/gi, "");
      const sayac = { n: 1 };
      const { nerede, sira, limit, parametreler } = suzgecCevir(url.searchParams, sayac);
      const tercih = String(istek.headers.prefer || "");

      if (istek.method === "GET") {
        const r = await db.query(
          `select * from public.${tablo}${nerede}${sira}${limit}`, parametreler);
        return yolla(200, r.rows);
      }

      if (istek.method === "POST") {
        const satirlar = Array.isArray(govde) ? govde : [govde];
        if (!satirlar.length || !satirlar[0]) return yolla(400, { message: "govde bos" });
        const kolonlar = Object.keys(satirlar[0]);
        const degerler = [];
        const parcalar = satirlar.map((s) => {
          const yer = kolonlar.map((k) => { degerler.push(s[k]); return `$${degerler.length}`; });
          return `(${yer.join(", ")})`;
        });
        const catisma = /merge-duplicates/.test(tercih)
          ? ` on conflict (user_id, event_id) do update set direction = excluded.direction,
              created_at = now()`
          : "";
        const donus = /return=minimal/.test(tercih) ? "" : " returning *";
        const r = await db.query(
          `insert into public.${tablo} (${kolonlar.join(", ")}) values ${parcalar.join(", ")}${catisma}${donus}`,
          degerler);
        return donus ? yolla(201, r.rows) : yolla(201);
      }

      if (istek.method === "PATCH") {
        /* SET degerleri $1..$n, suzgecler ondan SONRA baslamali.
           Suzgecler yukarida $1'den numaralandigi icin burada
           kaydirilmis bir sayacla yeniden hesapliyoruz. */
        const kolonlar = Object.keys(govde || {});
        const kaydirilmis = { n: kolonlar.length + 1 };
        const f = suzgecCevir(url.searchParams, kaydirilmis);
        const atamalar = kolonlar.map((k, i) => `${k} = $${i + 1}`);
        const r = await db.query(
          `update public.${tablo} set ${atamalar.join(", ")}${f.nerede} returning *`,
          [...kolonlar.map((k) => govde[k]), ...f.parametreler]);
        return yolla(200, r.rows);
      }

      if (istek.method === "DELETE") {
        await db.query(`delete from public.${tablo}${nerede}`, parametreler);
        return yolla(204);
      }
    }

    yolla(404, { message: "bilinmeyen uc: " + yol });
  } catch (e) {
    console.error("  ✗ " + istek.method + " " + yol + " → " + e.message);
    yolla(400, { message: e.message });
  } finally {
    await rolBirak().catch(() => {});
  }
});

sunucu.listen(PORT, () => {
  console.log(`\nYEREL taklit sunucu: http://localhost:${PORT}`);
  console.log("Bu Supabase DEGIL; sadece gelistirme icin.\n");
  console.log("ayar.js icin:");
  console.log(`  url: "http://localhost:${PORT}", anonKey: "yerel"\n`);
});
