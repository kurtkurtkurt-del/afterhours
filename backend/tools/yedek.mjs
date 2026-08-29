/* afterhours — icerik yedegi.
   Yedeklenmesi gereken sey, yeniden uretilemeyecek olan: etkinlik
   metinleri, mekanlar ve yorumlar. Supabase'in kendi gunluk yedegi
   ayri bir sey; bu, projeden bagimsiz duran kopyan.

     node tools/yedek.mjs                       (ayar.js'teki adrese)
     node tools/yedek.mjs http://localhost:4350 (baska bir adrese)

   Cikti: backend/yedek/afterhours-YYYY-AA-GG.json  */

import { readFile, writeFile, mkdir } from "node:fs/promises";

async function ayariOku() {
  const metin = await readFile(new URL("../../ayar.js", import.meta.url), "utf8");
  const kutu = {};
  new Function("window", metin)(kutu);
  return kutu.AH_AYAR || {};
}

const ayar = await ayariOku();
const adres = (process.argv[2] || ayar.url || "").replace(/\/$/, "");
const anahtar = process.argv[3] || ayar.anonKey || "yerel";

if (!adres) {
  console.error("Adres yok. ayar.js'i doldur ya da adresi arguman olarak ver.");
  process.exit(1);
}

const cek = async (yol) => {
  const c = await fetch(adres + "/rest/v1" + yol, {
    headers: { apikey: anahtar, Authorization: "Bearer " + anahtar },
  });
  if (!c.ok) throw new Error(yol + " → " + c.status + " " + (await c.text()).slice(0, 120));
  return c.json();
};

const yedek = {
  alindi: new Date().toISOString(),
  kaynak: adres,
  cities: await cek("/cities?order=sira"),
  event_types: await cek("/event_types?order=sira"),
  venues: await cek("/venues?order=name"),
  events: await cek("/events_public?order=poster_no&limit=1000"),
  comments: await cek("/comments_public?order=created_at&limit=5000"),
};

const gun = new Date().toISOString().slice(0, 10);
const klasor = new URL("../yedek/", import.meta.url);
await mkdir(klasor, { recursive: true });
const dosya = new URL("afterhours-" + gun + ".json", klasor);
await writeFile(dosya, JSON.stringify(yedek, null, 2));

console.log("yedek alindi: " + dosya.pathname);
for (const [ad, liste] of Object.entries(yedek)) {
  if (Array.isArray(liste)) console.log(`  ${ad.padEnd(14)} ${liste.length}`);
}

/* Yedek bos donduyse bu bir uyari: yayindaki veri gitmis olabilir ya da
   anahtar yanlis. Sessizce bos dosya yazip gecmek en kotusu. */
if (!yedek.events.length) {
  console.error("\nUYARI: hic etkinlik gelmedi. Adres/anahtar dogru mu?");
  process.exit(2);
}
