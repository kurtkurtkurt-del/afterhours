/* afterhours — on yuzdeki veriyi SQL'e cevirir.
   Kaynak: events-data.js (36 etkinlik), app.js icindeki MEKANLAR,
   explore/yorumlar.js (ornek yorumlar).
   Cikti: sql/03_seed_katalog.sql, 04_seed_events.sql, 05_seed_comments.sql

   Elle yazilmis veri tek yerde kalsin diye uretiliyor: ileride
   events-data.js degisirse bu script tekrar kosulur.  */

import { readFile, writeFile } from "node:fs/promises";

const kok = new URL("../../", import.meta.url);
const oku = (yol) => readFile(new URL(yol, kok), "utf8");

/* ---- kaynaklari yukle (DOM'suz, duz eval) ---------------------------- */

const eventsJs = await oku("events-data.js");
const { POSTERS } = new Function(eventsJs + "\n;return { POSTERS };")();

const appJs = await oku("app.js");
const mekanBlok = appJs.match(/const MEKANLAR = \[[\s\S]*?\n\];/);
if (!mekanBlok) throw new Error("app.js icinde MEKANLAR bulunamadi");
const { MEKANLAR } = new Function(mekanBlok[0] + "\n;return { MEKANLAR };")();

const yorumJs = await oku("explore/yorumlar.js");
const { YORUM_HAVUZU, YORUMLARI_GETIR } =
  new Function(yorumJs + "\n;return { YORUM_HAVUZU, YORUMLARI_GETIR };")();

/* ---- yardimcilar ----------------------------------------------------- */

const q = (v) => (v === null || v === undefined ? "null" : "'" + String(v).replace(/'/g, "''") + "'");
const slugla = (s) =>
  s.toLowerCase()
    .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ä/g, "a").replace(/ß/g, "ss")
    .replace(/ş/g, "s").replace(/ç/g, "c").replace(/ı/g, "i").replace(/ğ/g, "g")
    .replace(/\$/g, "s")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* Sitenin "bugun"u. Yilsiz tarihlerin yili buna gore cikariliyor. */
const BUGUN = new Date("2026-08-29T00:00:00+02:00");

/* meta = "Olympiahalle · 11.09.26 · 18:30"
   Mekan adi parcalarin herhangi birinde olabilir (bazi metalar tarihle
   basliyor). Tarih uc bicimde geliyor:
     gg.aa.yy          → kesin
     gg.aa  /  gg—gg.aa → yil yok, cikarim (estimated)
     "Sommer 2027", "Mittwochs", "TBA" → tarih yok, sadece date_text  */
function metayiCoz(meta) {
  const parcalar = meta.split("·").map((p) => p.trim()).filter(Boolean);

  const saat = meta.match(/\b(\d{2}):(\d{2})\b/);
  const ss = saat ? saat[1] : "20";
  const dd = saat ? saat[2] : "00";

  const tam = meta.match(/\b(\d{2})\.(\d{2})\.(\d{2})\b/);
  if (tam) {
    const [, gg, aa, yy] = tam;
    return {
      parcalar,
      baslangic: `20${yy}-${aa}-${gg}T${ss}:${dd}:00+02:00`,
      tahmin: false,
      tarihMetni: parcalar.slice(1).join(" · ") || null,
    };
  }

  /* "15—16.09" → 15.09 ; "19.11 — 23.12" → 19.11 ; "05.09" → 05.09 */
  const aralik = meta.match(/\b(\d{2})\s*[—–-]\s*(\d{2})\.(\d{2})\b/);
  const yilsiz = aralik
    ? { gg: aralik[1], aa: aralik[3] }
    : (() => {
        const m = meta.match(/\b(\d{2})\.(\d{2})\b(?!\.)/);
        return m ? { gg: m[1], aa: m[2] } : null;
      })();

  if (yilsiz) {
    // Yili, tarihi bugunden cok geride birakmayacak sekilde sec.
    let yil = BUGUN.getFullYear();
    const kur = (y) => new Date(`${y}-${yilsiz.aa}-${yilsiz.gg}T${ss}:${dd}:00+02:00`);
    if (kur(yil) < new Date(BUGUN.getTime() - 30 * 864e5)) yil += 1;
    return {
      parcalar,
      baslangic: kur(yil).toISOString(),
      tahmin: true,
      tarihMetni: parcalar.slice(1).join(" · ") || null,
    };
  }

  return { parcalar, baslangic: null, tahmin: false,
           tarihMetni: parcalar.slice(1).join(" · ") || null };
}

/* MEKANLAR icinde ada gore ara: "Olympiahalle" → OLYMPIAHALLE,
   "Bahnwärter Thiel" → BAHNWÄRTER THIEL, "Milla Club" → MILLA */
function mekanBul(adayHam) {
  if (!adayHam) return null;
  const aday = adayHam.toUpperCase().trim();
  let m = MEKANLAR.find((x) => x.ad === aday);
  if (m) return m;
  m = MEKANLAR.find((x) => aday.startsWith(x.ad) || x.ad.startsWith(aday));
  if (m) return m;
  // "ab Isartor" gibi on ekli yazimlar
  m = MEKANLAR.find((x) => aday.includes(x.ad));
  return m || null;
}

/* zaman metnini gercek bir ana cevir: "3 days ago", "Nov 2023", "6 h ago" */
function zamaniCoz(metin) {
  const simdi = new Date("2026-08-29T21:00:00+02:00");
  let m;
  if (/^yesterday$/i.test(metin)) return new Date(simdi - 864e5);
  if ((m = metin.match(/^(\d+)\s*h ago$/i)))     return new Date(simdi - m[1] * 36e5);
  if ((m = metin.match(/^(\d+)\s*days? ago$/i))) return new Date(simdi - m[1] * 864e5);
  if ((m = metin.match(/^([A-Za-z]{3,9})\s+(\d{4})$/))) {
    const aylar = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
    const i = aylar.indexOf(m[1].slice(0, 3).toLowerCase());
    if (i >= 0) return new Date(Date.UTC(+m[2], i, 15, 20, 0, 0));
  }
  return simdi;                       // cozulemezse simdi; time_text zaten dogru
}

/* ---- 03: sehir, tur, mekan ------------------------------------------ */

const sehirler = [
  ["munchen", "münchen", "live", 1],
  ["istanbul", "istanbul", "live", 2],
  ["ankara", "ankara", "soon", 3],
  ["berlin", "berlin", "planned", 4],
  ["wien", "wien", "planned", 5],
  ["koln", "köln", "planned", 6],
];

/* spec'in kendi sirasi */
const turler = ["Rave", "Club Night", "Konzert", "Festival", "Meetup", "Hausparty"];

let sql = `-- URETILMIS DOSYA — elle duzenleme. Kaynak: backend/tools/seed-uret.mjs
-- Sehirler, turler ve mekanlar. Once bu, sonra 04.

insert into public.cities (slug, name, status, sira) values
${sehirler.map(([s, a, d, i]) => `  (${q(s)}, ${q(a)}, ${q(d)}, ${i})`).join(",\n")}
on conflict (slug) do nothing;

insert into public.event_types (slug, name, sira) values
${turler.map((t, i) => `  (${q(slugla(t))}, ${q(t)}, ${i + 1})`).join(",\n")}
on conflict (slug) do nothing;

`;

for (const m of MEKANLAR) {
  sql += `insert into public.venues (city_id, slug, name, map_x, map_y, opens_hour, open_hours)
select id, ${q(slugla(m.ad))}, ${q(m.ad)}, ${m.x}, ${m.y}, ${m.saat}, ${m.sure}
from public.cities where slug = 'munchen'
on conflict (city_id, slug) do nothing;
`;
}

await writeFile(new URL("../sql/03_seed_katalog.sql", import.meta.url), sql);

/* ---- 04: 36 etkinlik ------------------------------------------------- */

let etkinlikSql = `-- URETILMIS DOSYA — kaynak: events-data.js (${POSTERS.length} kayit)
-- meta alani ekranda gorunen satirin ta kendisi; degistirilmemeli.

`;
let tarihli = 0, mekanli = 0, tahminli = 0;

POSTERS.forEach((e, i) => {
  const { parcalar, baslangic, tahmin, tarihMetni } = metayiCoz(e.meta);
  const mekan = parcalar.map(mekanBul).find(Boolean) || null;
  if (baslangic) tarihli++;
  if (tahmin) tahminli++;
  if (mekan) mekanli++;

  etkinlikSql += `insert into public.events
  (slug, city_id, type_id, venue_id, title, meta, body, poster_no,
   starts_at, starts_at_estimated, date_text)
select ${q(e.slug)}, c.id, t.id, ${mekan ? `v.id` : `null`},
       ${q(e.baslik)}, ${q(e.meta)}, ${q(e.metin)}, ${i + 1},
       ${baslangic ? `${q(baslangic)}::timestamptz` : "null"}, ${tahmin}, ${q(tarihMetni)}
from public.cities c
join public.event_types t on t.slug = ${q(slugla(e.tur))}
${mekan ? `join public.venues v on v.city_id = c.id and v.slug = ${q(slugla(mekan.ad))}\n` : ""}where c.slug = 'munchen'
on conflict (slug) do nothing;

`;
});

await writeFile(new URL("../sql/04_seed_events.sql", import.meta.url), etkinlikSql);

/* ---- 05: ornek yorumlar --------------------------------------------- */

let yorumSql = `-- URETILMIS DOSYA — kaynak: explore/yorumlar.js
-- Ornek yorumlar: gercek kullanicisi yok, author_name ile duruyorlar.
-- Sitenin bugun gosterdigi secimin aynisi (ayni tohum, ayni kartlar).

`;
let konuSayisi = 0, cevapSayisi = 0;

for (const e of POSTERS) {
  const { eski, yeni } = YORUMLARI_GETIR(e);
  for (const konu of [...yeni, ...eski]) {
    konuSayisi++;
    const zaman = zamaniCoz(konu.zaman).toISOString();
    yorumSql += `with konu as (
  insert into public.comments (event_id, author_name, body, time_text, created_at)
  select id, ${q(konu.kim)}, ${q(konu.metin)}, ${q(konu.zaman)}, ${q(zaman)}::timestamptz
  from public.events where slug = ${q(e.slug)}
  returning id, event_id
)
`;
    if (konu.cevaplar && konu.cevaplar.length) {
      const satirlar = konu.cevaplar.map((c) => {
        cevapSayisi++;
        return `  select konu.event_id, konu.id, ${q(c.kim)}, ${q(c.metin)}, ${q(c.zaman)}, ${q(zamaniCoz(c.zaman).toISOString())}::timestamptz from konu`;
      }).join("\n  union all\n");
      yorumSql += `insert into public.comments (event_id, parent_id, author_name, body, time_text, created_at)
${satirlar};

`;
    } else {
      yorumSql += `select 1 from konu;\n\n`;
    }
  }
}

await writeFile(new URL("../sql/05_seed_comments.sql", import.meta.url), yorumSql);

console.log(`etkinlik      : ${POSTERS.length}`);
console.log(`  tarihi var    : ${tarihli}  (${tahminli} tanesi yil cikarimi — admin'de dogrulanacak)`);
console.log(`  mekani eslesti: ${mekanli} / ${POSTERS.length}`);
console.log(`yorum         : ${konuSayisi} konu, ${cevapSayisi} cevap`);
console.log(`mekan         : ${MEKANLAR.length}`);
console.log(`tur           : ${turler.length}, sehir: ${sehirler.length}`);
