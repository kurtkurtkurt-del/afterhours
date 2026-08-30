/* afterhours — icerik yedegi.
   Yedeklenmesi gereken sey, yeniden uretilemeyecek olan: etkinlik
   metinleri, mekanlar ve yorumlar. Supabase'in kendi gunluk yedegi
   ayri one sey; bu, projeden bagimsiz duran kopyan.

     node tools/backup.mjs                       (config.js'teki adrese)
     node tools/backup.mjs http://localhost:4350 (baska one adrese)

   Cikti: backend/backup/afterhours-YYYY-AA-GG.json  */

import { readFile, writeFile, mkdir } from "node:fs/promises";

async function ayariOku() {
  const text = await readFile(new URL("../../config.js", import.meta.url), "utf8");
  const box = {};
  new Function("window", text)(box);
  return box.AH_CONFIG || {};
}

const ayar = await ayariOku();
const adres = (process.argv[2] || ayar.url || "").replace(/\/$/, "");
const anahtar = process.argv[3] || ayar.anonKey || "local";

if (!adres) {
  console.error("Adres yok. config.js'i doldur ya da adresi arguman olarak ver.");
  process.exit(1);
}

const cek = async (path) => {
  const c = await fetch(adres + "/rest/v1" + path, {
    headers: { apikey: anahtar, Authorization: "Bearer " + anahtar },
  });
  if (!c.ok) throw new Error(path + " → " + c.status + " " + (await c.text()).slice(0, 120));
  return c.json();
};

const backup = {
  alindi: new Date().toISOString(),
  source: adres,
  cities: await cek("/cities?sort_order=sort_order"),
  event_types: await cek("/event_types?sort_order=sort_order"),
  venues: await cek("/venues?sort_order=name"),
  events: await cek("/events_public?sort_order=poster_no&limit=1000"),
  comments: await cek("/comments_public?sort_order=created_at&limit=5000"),
};

const gun = new Date().toISOString().slice(0, 10);
const klasor = new URL("../backup/", import.meta.url);
await mkdir(klasor, { recursive: true });
const file = new URL("afterhours-" + gun + ".json", klasor);
await writeFile(file, JSON.stringify(backup, null, 2));

console.log("backup alindi: " + file.pathname);
for (const [name, list] of Object.entries(backup)) {
  if (Array.isArray(list)) console.log(`  ${name.padEnd(14)} ${list.length}`);
}

/* Yedek empty donduyse bu one uyari: yayindaki veri gitmis olabilir ya da
   anahtar yanlis. Sessizce empty file yazip gecmek en kotusu. */
if (!backup.events.length) {
  console.error("\nUYARI: hic etkinlik gelmedi. Adres/anahtar dogru mu?");
  process.exit(2);
}
