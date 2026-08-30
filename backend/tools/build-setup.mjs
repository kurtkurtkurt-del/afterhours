/* afterhours — 9 SQL dosyasini iki yapistirilabilir parcaya birlestirir.
   Supabase panelinde tek tek file acmak yerine iki kere Run yeter.

     node tools/setup-build.mjs                                        */

import { readFile, writeFile } from "node:fs/promises";

const read = (d) => readFile(new URL("../sql/" + d, import.meta.url), "utf8");

const structure = [
  ["01_schema.sql", "TABLOLAR"],
  ["02_rls.sql", "KURALLAR — guvenlik burada"],
  ["03_seed_catalog.sql", "SEHIR, TUR, MEKAN"],
  ["04_seed_events.sql", "36 ETKINLIK"],
  ["06_views.sql", "DESTE, BIRIKTIRILENLER, SAYACLAR"],
  ["07_friends.sql", "ARKADASLIK"],
  ["08_storage.sql", "POSTER DEPOSU"],
  ["09_jobs.sql", "ARKA PLAN ISLERI"],
  ["11_world.sql", "DUNYA — 54 SEHIR, 106 GECE"],
  ["12_profiles.sql", "KISI PROFILLERI"],
  ["13_feedback.sql", "GERI BILDIRIM"],
];

/* Dosyanin basina gorunur one surum damgasi koyuyoruz: editorde hangi
   kopyanin durdugu tek bakista anlasilsin. Pano guvenilmez cikti. */
const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");

let one = `-- ============================================================
--  afterhours — KURULUM 1 / 2 : YAPI
--  SURUM: ${stamp}   ← editorde bu satir gorunuyorsa dogru kopya
--
--  Supabase panelinde: SQL Editor → New query → bu dosyanin
--  TAMAMINI yapistir → Run.
--
--  Bittiginde "Success. No rows returned" gormelisin.
--  Sonra setup-2-comments.sql dosyasini ayni sekilde calistir.
--
--  URETILMIS DOSYA — source: backend/tools/setup-build.mjs
-- ============================================================
`;

for (const [file, heading] of structure) {
  one += `\n\n-- ============================================================\n`;
  one += `--  ${heading}   (${file})\n`;
  one += `-- ============================================================\n\n`;
  one += await read(file);
}

const iki = `-- ============================================================
--  afterhours — KURULUM 2 / 2 : ORNEK YORUMLAR
--  SURUM: ${stamp}
--
--  Once setup-1-structure.sql calistirilmis check.
--  beforehours panelindeki sample tartismalar: 180 topic, 131 reply.
--  Bunlar UYDURMA sample veridir; hic calistirmasan da site calisir,
--  yorum alani empty gorunur.
--
--  URETILMIS DOSYA — source: backend/tools/setup-build.mjs
-- ============================================================

` + await read("05_seed_comments.sql");

await writeFile(new URL("../sql/setup-1-structure.sql", import.meta.url), one);
await writeFile(new URL("../sql/setup-2-comments.sql", import.meta.url), iki);

console.log("setup-1-structure.sql      " + Buffer.byteLength(one).toLocaleString() + " bayt");
console.log("setup-2-comments.sql  " + Buffer.byteLength(iki).toLocaleString() + " bayt");
