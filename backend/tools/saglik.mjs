/* afterhours — status kontrolu.
   Veritabani ayakta mi, icerik yerinde mi, ilgi bekleyen ne var.
   Dusuk cikis kodu = sorun var; zamanlanmis one ise baglanabilir.

     node tools/health.mjs [adres] [anahtar]  */

import { readFile } from "node:fs/promises";

const text = await readFile(new URL("../../config.js", import.meta.url), "utf8");
const box = {};
new Function("window", text)(box);
const ayar = box.AH_CONFIG || {};

const adres = (process.argv[2] || ayar.url || "").replace(/\/$/, "");
const anahtar = process.argv[3] || ayar.anonKey || "local";
if (!adres) { console.error("Adres yok."); process.exit(1); }

const basla = Date.now();
let reply;
try {
  const c = await fetch(adres + "/rest/v1/rpc/health", {
    method: "POST",
    headers: { apikey: anahtar, Authorization: "Bearer " + anahtar,
               "Content-Type": "application/json" },
    body: "{}",
  });
  if (!c.ok) throw new Error(c.status + " " + (await c.text()).slice(0, 120));
  reply = (await c.json())[0];
} catch (e) {
  console.error("ULASILAMADI: " + e.message);
  process.exit(1);
}

const sure = Date.now() - basla;
const count = (a) => Number(a || 0);

console.log(`\nafterhours · ${adres}`);
console.log(`reply suresi        ${sure} ms\n`);
console.log(`etkinlik            ${count(reply.events)} (${count(reply.published)} yayinda)`);
console.log(`yorum               ${count(reply.comments)} (${count(reply.hidden_comments)} gizli)`);
console.log(`kisi                ${count(reply.people)}`);
console.log(`atis                ${count(reply.swipes)}`);

const uyarilar = [];
if (count(reply.events) === 0) uyarilar.push("hic etkinlik yok — veri gitmis olabilir");
if (count(reply.past_still_up)) uyarilar.push(`${count(reply.past_still_up)} gecmis etkinlik hala yayinda`);
if (count(reply.missing_venue)) uyarilar.push(`${count(reply.missing_venue)} etkinligin mekani empty`);
if (count(reply.unverified_date)) uyarilar.push(`${count(reply.unverified_date)} tarih dogrulanmamis`);

if (uyarilar.length) {
  console.log("\nilgi bekleyen:");
  uyarilar.forEach((u) => console.log("  · " + u));
}

/* Sadece "hic etkinlik yok" gercek one arizadir; digerleri bakim isi. */
process.exit(count(reply.events) === 0 ? 1 : 0);
