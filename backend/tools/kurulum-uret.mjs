/* afterhours — 9 SQL dosyasini iki yapistirilabilir parcaya birlestirir.
   Supabase panelinde tek tek dosya acmak yerine iki kere Run yeter.

     node tools/kurulum-uret.mjs                                        */

import { readFile, writeFile } from "node:fs/promises";

const oku = (d) => readFile(new URL("../sql/" + d, import.meta.url), "utf8");

const yapi = [
  ["01_schema.sql", "TABLOLAR"],
  ["02_rls.sql", "KURALLAR — guvenlik burada"],
  ["03_seed_katalog.sql", "SEHIR, TUR, MEKAN"],
  ["04_seed_events.sql", "36 ETKINLIK"],
  ["06_views.sql", "DESTE, BIRIKTIRILENLER, SAYACLAR"],
  ["07_friends.sql", "ARKADASLIK"],
  ["08_storage.sql", "POSTER DEPOSU"],
  ["09_jobs.sql", "ARKA PLAN ISLERI"],
];

let bir = `-- ============================================================
--  afterhours — KURULUM 1 / 2 : YAPI
--
--  Supabase panelinde: SQL Editor → New query → bu dosyanin
--  TAMAMINI yapistir → Run.
--
--  Bittiginde "Success. No rows returned" gormelisin.
--  Sonra kurulum-2-yorumlar.sql'i ayni sekilde calistir.
--
--  URETILMIS DOSYA — kaynak: backend/tools/kurulum-uret.mjs
-- ============================================================
`;

for (const [dosya, baslik] of yapi) {
  bir += `\n\n-- ============================================================\n`;
  bir += `--  ${baslik}   (${dosya})\n`;
  bir += `-- ============================================================\n\n`;
  bir += await oku(dosya);
}

const iki = `-- ============================================================
--  afterhours — KURULUM 2 / 2 : ORNEK YORUMLAR
--
--  Once kurulum-1-yapi.sql calistirilmis olmali.
--  beforehours panelindeki ornek tartismalar: 180 konu, 131 cevap.
--  Bunlar UYDURMA ornek veridir; hic calistirmasan da site calisir,
--  yorum alani bos gorunur.
--
--  URETILMIS DOSYA — kaynak: backend/tools/kurulum-uret.mjs
-- ============================================================

` + await oku("05_seed_comments.sql");

await writeFile(new URL("../sql/kurulum-1-yapi.sql", import.meta.url), bir);
await writeFile(new URL("../sql/kurulum-2-yorumlar.sql", import.meta.url), iki);

console.log("kurulum-1-yapi.sql      " + Buffer.byteLength(bir).toLocaleString() + " bayt");
console.log("kurulum-2-yorumlar.sql  " + Buffer.byteLength(iki).toLocaleString() + " bayt");
