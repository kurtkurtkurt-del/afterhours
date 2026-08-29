/* afterhours — durum kontrolu.
   Veritabani ayakta mi, icerik yerinde mi, ilgi bekleyen ne var.
   Dusuk cikis kodu = sorun var; zamanlanmis bir ise baglanabilir.

     node tools/saglik.mjs [adres] [anahtar]  */

import { readFile } from "node:fs/promises";

const metin = await readFile(new URL("../../ayar.js", import.meta.url), "utf8");
const kutu = {};
new Function("window", metin)(kutu);
const ayar = kutu.AH_AYAR || {};

const adres = (process.argv[2] || ayar.url || "").replace(/\/$/, "");
const anahtar = process.argv[3] || ayar.anonKey || "yerel";
if (!adres) { console.error("Adres yok."); process.exit(1); }

const basla = Date.now();
let cevap;
try {
  const c = await fetch(adres + "/rest/v1/rpc/health", {
    method: "POST",
    headers: { apikey: anahtar, Authorization: "Bearer " + anahtar,
               "Content-Type": "application/json" },
    body: "{}",
  });
  if (!c.ok) throw new Error(c.status + " " + (await c.text()).slice(0, 120));
  cevap = (await c.json())[0];
} catch (e) {
  console.error("ULASILAMADI: " + e.message);
  process.exit(1);
}

const sure = Date.now() - basla;
const say = (a) => Number(a || 0);

console.log(`\nafterhours · ${adres}`);
console.log(`cevap suresi        ${sure} ms\n`);
console.log(`etkinlik            ${say(cevap.events)} (${say(cevap.published)} yayinda)`);
console.log(`yorum               ${say(cevap.comments)} (${say(cevap.hidden_comments)} gizli)`);
console.log(`kisi                ${say(cevap.people)}`);
console.log(`atis                ${say(cevap.swipes)}`);

const uyarilar = [];
if (say(cevap.events) === 0) uyarilar.push("hic etkinlik yok — veri gitmis olabilir");
if (say(cevap.past_still_up)) uyarilar.push(`${say(cevap.past_still_up)} gecmis etkinlik hala yayinda`);
if (say(cevap.missing_venue)) uyarilar.push(`${say(cevap.missing_venue)} etkinligin mekani bos`);
if (say(cevap.unverified_date)) uyarilar.push(`${say(cevap.unverified_date)} tarih dogrulanmamis`);

if (uyarilar.length) {
  console.log("\nilgi bekleyen:");
  uyarilar.forEach((u) => console.log("  · " + u));
}

/* Sadece "hic etkinlik yok" gercek bir arizadir; digerleri bakim isi. */
process.exit(say(cevap.events) === 0 ? 1 : 0);
