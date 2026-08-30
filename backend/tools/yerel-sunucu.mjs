/* afterhours — YEREL GELISTIRME SUNUCUSU. Supabase DEGIL.
   Supabase'in kullandigimiz uclarini (PostgREST + GoTrue'nun kucuk one
   alt kumesi) PGlite'in ustunde taklit eder. Amaci tek: proje acilmadan
   once canli yolu gercekten calistirip test edebilmek.

   Kimlik dogrulama SAHTEDIR: jeton = user id'si. Uretimde
   kullanilmaz, internete acilmaz.

     node tools/yerel-server.mjs          → http://localhost:4350
*/

import { PGlite } from "@electric-sql/pglite";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const PORT = Number(process.env.PORT || 4350);
const read = (y) => readFile(new URL(y, import.meta.url), "utf8");

const db = new PGlite();
for (const d of ["../test/supabase-shim.sql", "../sql/01_schema.sql", "../sql/02_rls.sql",
                 "../sql/03_seed_katalog.sql", "../sql/04_seed_events.sql",
                 "../sql/05_seed_comments.sql", "../sql/06_views.sql",
                 "../sql/07_friends.sql", "../sql/09_jobs.sql",
                 "../sql/11_dunya.sql", "../sql/12_profiles.sql",
                 "../sql/13_feedback.sql"]) {
  await db.exec(await read(d));
}
console.log("veritabani hazir (bellekte)");

/* Depo taklidi: dosyalar bellekte, server kapaninca gider.
   Gercek Supabase Storage'in yerine sadece akisi denemek icin. */
const depo = new Map();

/* --- istegi kimin yaptigi ------------------------------------------- */

/* Gercek Supabase'de bu one JWT. Burada duz user id'si; sahte
   oldugu belli olsun diye "yerel-" onekiyle geliyor. */
function jetondanKullanici(bas) {
  const yetki = bas.authorization || "";
  const m = yetki.match(/^Bearer\s+yerel-(.+)$/);
  return m ? m[1] : null;
}

async function rolAyarla(user) {
  if (user) {
    await db.exec(`set role authenticated;
                   set request.jwt.claims = '{"sub":"${user}"}';`);
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

/* --- PostgREST suzgeclerinin kucuk one alt kumesi -------------------- */

/* ?event_id=eq.<uuid>&sort_order=created_at.desc&limit=60 */
function suzgecCevir(arama, sayac) {
  const kosullar = [];
  const parametreler = [];
  let sort_order = "";
  let limit = "";

  for (const [field, value] of arama) {
    if (field === "select" || field === "apikey") continue;
    if (field === "sort_order") {
      const [k, y] = value.split(".");
      sort_order = ` order by ${k.replace(/[^a-z_]/gi, "")} ${/desc/i.test(y) ? "desc" : "asc"}`;
      continue;
    }
    if (field === "limit") { limit = ` limit ${Number(value) || 50}`; continue; }

    const [islem, ...kalan] = value.split(".");
    const v = kalan.join(".");
    const kolon = field.replace(/[^a-z_0-9]/gi, "");
    const isaret = { eq: "=", neq: "<>", gt: ">", lt: "<", gte: ">=", lte: "<=" }[islem];
    if (!isaret) continue;
    parametreler.push(v);
    kosullar.push(`${kolon} ${isaret} $${sayac.n++}`);
  }
  return {
    nerede: kosullar.length ? " where " + kosullar.join(" and ") : "",
    sort_order, limit, parametreler,
  };
}

const govdeOku = (req) =>
  new Promise((tamam) => {
    let v = "";
    req.on("data", (p) => (v += p));
    req.on("end", () => { try { tamam(v ? JSON.parse(v) : null); } catch (_) { tamam(null); } });
  });

/* --- server --------------------------------------------------------- */

const server = createServer(async (req, reply) => {
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname;

  reply.setHeader("Access-Control-Allow-Origin", "*");
  reply.setHeader("Access-Control-Allow-Headers", "authorization, apikey, content-type, prefer, x-upsert, range");
  reply.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  if (req.method === "OPTIONS") { reply.writeHead(204); return reply.end(); }

  const send = (code, veri) => {
    reply.writeHead(code, { "Content-Type": "application/json" });
    reply.end(veri === undefined ? "" : JSON.stringify(veri));
  };

  const user = jetondanKullanici(req.headers);
  const body = ["POST", "PATCH", "PUT"].includes(req.method) ? await govdeOku(req) : null;

  try {
    /* ---------- GoTrue taklidi ---------- */

    if (path === "/auth/v1/otp") {
      const email = (body && body.email || "").toLowerCase();
      if (!email) return send(400, { msg: "email gerekli" });
      await rolBirak();
      let k = await db.query(`select id from auth.users where email = $1`, [email]);
      if (!k.rows.length) {
        k = await db.query(`insert into auth.users (email) values ($1) returning id`, [email]);
      }
      const id = k.rows[0].id;

      /* Gelistirme kolayligi: ilk user yonetici olsun. Gercek
         kurulumda bu, SQL editorunde tek satirlik one guncelleme. */
      const yon = await db.query(`select count(*)::int as n from public.profiles where is_admin`);
      if (yon.rows[0].n === 0) {
        await db.query(`update public.profiles set is_admin = true where id = $1`, [id]);
        console.log("  ★ " + email + " yonetici yapildi (sadece yerelde)");
      }

      const donus = (body.options && body.options.email_redirect_to) || "http://localhost:4340/";
      console.log("\n  ✉  giris baglantisi (" + email + "):");
      console.log("     " + donus + "#access_token=yerel-" + id +
                  "&refresh_token=yerel-" + id + "&expires_in=3600\n");
      return send(200, {});
    }

    /* Hesap acma. Gercek Supabase burada e-posta dogrulamasi isteyebilir;
       taklit server istemiyor, hemen jeton veriyor. */
    if (path === "/auth/v1/signup") {
      const email = ((body && body.email) || "").toLowerCase();
      if (!email) return send(400, { msg: "email gerekli" });
      await rolBirak();
      const varMi = await db.query(`select id from auth.users where email = $1`, [email]);
      if (varMi.rows.length) {
        return send(400, { msg: "User already registered" });
      }
      const extra = (body && body.data) || {};
      const k = await db.query(
        `insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`,
        [email, JSON.stringify(extra)]);
      const id = k.rows[0].id;

      const yon = await db.query(`select count(*)::int as n from public.profiles where is_admin`);
      if (yon.rows[0].n === 0) {
        await db.query(`update public.profiles set is_admin = true where id = $1`, [id]);
        console.log("  ★ " + email + " yonetici yapildi (sadece yerelde)");
      }

      console.log("  ✚ hesap acildi: " + email);
      return send(200, {
        access_token: "yerel-" + id, refresh_token: "yerel-" + id, expires_in: 3600,
        user: { id, email: email },
      });
    }

    if (path === "/auth/v1/token") {
      const kind = url.searchParams.get("grant_type") || "refresh_token";

      /* Sifreyle giris. DIKKAT: burada sifre KONTROL EDILMIYOR — bu one
         taklit server, sadece akisi denemek icin. Gercek Supabase sifreyi
         dogrular. Internete acilmaz. */
      if (kind === "password") {
        const email = ((body && body.email) || "").toLowerCase();
        if (!email) return send(400, { msg: "email gerekli" });
        await rolBirak();
        let k = await db.query(`select id from auth.users where email = $1`, [email]);
        if (!k.rows.length) {
          return send(400, { error_description: "Invalid login credentials" });
        }
        const id = k.rows[0].id;
        console.log("  🔑 sifreyle giris: " + email + " (sifre dogrulanmadi — taklit)");
        return send(200, {
          access_token: "yerel-" + id, refresh_token: "yerel-" + id, expires_in: 3600,
          user: { id, email: email },
        });
      }

      const id = (body && body.refresh_token || "").replace(/^yerel-/, "");
      if (!id) return send(400, { msg: "refresh_token gerekli" });
      return send(200, { access_token: "yerel-" + id, refresh_token: "yerel-" + id, expires_in: 3600 });
    }

    if (path === "/auth/v1/user") {
      if (!user) return send(401, { msg: "jeton yok" });
      await rolBirak();
      const r = await db.query(`select id, email from auth.users where id = $1`, [user]);
      return send(200, r.rows[0] || null);
    }

    if (path === "/auth/v1/logout") return send(204);

    /* ---------- Storage taklidi (bellekte) ---------- */

    if (path.startsWith("/storage/v1/object/")) {
      /* Yukleme: /storage/v1/object/posters/<name> */
      if (req.method === "POST" || req.method === "PUT") {
        if (!user) return send(401, { message: "jeton yok" });
        await rolAyarla(user);
        const y = await db.query(`select public.is_admin() as y`);
        await rolBirak();
        if (!y.rows[0].y) return send(403, { message: "sadece yonetici yukleyebilir" });

        const name = path.split("/").slice(5).join("/");
        const parcalar = [];
        for await (const p of req) parcalar.push(p);
        depo.set(name, Buffer.concat(parcalar));
        console.log("  ⇧ poster yuklendi: " + name + " (" + depo.get(name).length + " bayt)");
        return send(200, { Key: "posters/" + name });
      }

      /* Okuma: /storage/v1/object/public/posters/<name> */
      if (req.method === "GET") {
        const name = path.replace("/storage/v1/object/public/posters/", "");
        const veri = depo.get(name);
        if (!veri) return send(404, { message: "yok" });
        reply.writeHead(200, { "Content-Type": "image/svg+xml" });
        return reply.end(veri);
      }
    }

    /* ---------- PostgREST taklidi ---------- */

    if (path.startsWith("/rest/v1/")) {
      const name = path.slice("/rest/v1/".length);
      await rolAyarla(user);

      /* fonksiyon cagrisi */
      if (name.startsWith("rpc/")) {
        const fn = name.slice(4).replace(/[^a-z_0-9]/gi, "");
        const anahtarlar = Object.keys(body || {});
        const tipler = await argumanTipleri(fn);
        /* Tip verilmezse Postgres argumani "unknown" sayip fonksiyonu
           bulamiyor; imzayi katalogdan okuyup her argumani donusturuyoruz. */
        const args = anahtarlar
          .map((k, i) => `${k} => $${i + 1}::${tipler[k] || "text"}`)
          .join(", ");
        const r = await db.query(`select * from public.${fn}(${args})`,
                                 anahtarlar.map((k) => body[k]));
        /* PostgREST skaler donen fonksiyonlarda ciplak degeri dondurur,
           satir sarmalamaz. Ayni davranis. */
        const skaler = r.rows.length === 1 && r.fields && r.fields.length === 1
          && r.fields[0].name === fn;
        return send(200, skaler ? r.rows[0][fn] : r.rows);
      }

      const tablo = name.split("?")[0].replace(/[^a-z_0-9]/gi, "");
      const sayac = { n: 1 };
      const { nerede, sort_order, limit, parametreler } = suzgecCevir(url.searchParams, sayac);
      const tercih = String(req.headers.prefer || "");

      if (req.method === "GET") {
        const r = await db.query(
          `select * from public.${tablo}${nerede}${sort_order}${limit}`, parametreler);
        return send(200, r.rows);
      }

      if (req.method === "POST") {
        const rows = Array.isArray(body) ? body : [body];
        if (!rows.length || !rows[0]) return send(400, { message: "body empty" });
        const kolonlar = Object.keys(rows[0]);
        const degerler = [];
        const parcalar = rows.map((s) => {
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
        return donus ? send(201, r.rows) : send(201);
      }

      if (req.method === "PATCH") {
        /* SET degerleri $1..$n, suzgecler ondan SONRA baslamali.
           Suzgecler yukarida $1'den numaralandigi icin burada
           kaydirilmis one sayacla yeniden hesapliyoruz. */
        const kolonlar = Object.keys(body || {});
        const kaydirilmis = { n: kolonlar.length + 1 };
        const f = suzgecCevir(url.searchParams, kaydirilmis);
        const atamalar = kolonlar.map((k, i) => `${k} = $${i + 1}`);
        const r = await db.query(
          `update public.${tablo} set ${atamalar.join(", ")}${f.nerede} returning *`,
          [...kolonlar.map((k) => body[k]), ...f.parametreler]);
        return send(200, r.rows);
      }

      if (req.method === "DELETE") {
        await db.query(`delete from public.${tablo}${nerede}`, parametreler);
        return send(204);
      }
    }

    send(404, { message: "bilinmeyen uc: " + path });
  } catch (e) {
    console.error("  ✗ " + req.method + " " + path + " → " + e.message);
    send(400, { message: e.message });
  } finally {
    await rolBirak().catch(() => {});
  }
});

server.listen(PORT, () => {
  console.log(`\nYEREL taklit server: http://localhost:${PORT}`);
  console.log("Bu Supabase DEGIL; sadece gelistirme icin.\n");
  console.log("config.js icin:");
  console.log(`  url: "http://localhost:${PORT}", anonKey: "local"\n`);
});
