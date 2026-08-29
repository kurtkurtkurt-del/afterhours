/* afterhours — card collection icin ornek kartlar.
   Poster ureteciyle ayni yapi (400x600, ic cerceve, Archivo baslik,
   mono kicker/altbilgi, ture gore motif) ama ACIK palet: kagit gibi
   zemin, koyu murekkep, tek vurgu rengi.

     node tools/kart-uret.mjs                                          */

import { writeFile } from "node:fs/promises";

const KOK = new URL("../../posters/", import.meta.url);

/* Acik paletler: [zemin, murekkep, vurgu] */
const PALET = [
  ["#f4f1e8", "#16150f", "#d9542b"],   /* kagit / kiremit */
  ["#eef1ee", "#101410", "#2f6f4e"],   /* kirec / yesil */
  ["#f2eef4", "#141018", "#5a4bd1"],   /* soluk lila / mor */
];

const KARTLAR = [
  { sehir: "istanbul", tur: "Club Night", baslik: "Karaköy Alt Kat",
    mekan: "Karaköy", gun: "19.09", saat: "23:00" },
  { sehir: "münchen",  tur: "Rave",       baslik: "Blitz",
    mekan: "Museumsinsel 1", gun: "23.09", saat: "23:59" },
  { sehir: "berlin",   tur: "Rave",       baslik: "Betonhalle",
    mekan: "Kraftwerk Mitte", gun: "12.09", saat: "23:30" },
];

const kacis = (s) => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function tohum(m) {
  let h = 2166136261;
  for (let i = 0; i < m.length; i++) { h ^= m.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function satirlar(baslik) {
  const k = baslik.toUpperCase().split(/\s+/);
  if (k.length === 1) return [k[0]];
  let en = 1, fark = Infinity;
  for (let i = 1; i < k.length; i++) {
    const f = Math.abs(k.slice(0, i).join(" ").length - k.slice(i).join(" ").length);
    if (f < fark) { fark = f; en = i; }
  }
  return [k.slice(0, en).join(" "), k.slice(en).join(" ")];
}

/* Poster ureteciyle ayni olcu: Archivo 900 buyuk harfte 0.85 em/karakter
   guvenli ust sinir, kullanilabilir genislik 364. */
const punto = (s) =>
  Math.max(20, Math.min(58, Math.floor((364 / Math.max(...s.map((x) => x.length)) + 1) / 0.85)));

function motif(tur, t, murekkep, vurgu) {
  const r = (n) => ((t >>> n) & 255) / 255;
  const p = [];
  if (tur === "Rave") {
    const n = 6 + Math.floor(r(3) * 3);
    for (let i = 0; i < n; i++) {
      p.push(`<circle cx="200" cy="250" r="${36 + i * 21}" fill="none" stroke="${i % 2 ? vurgu : murekkep}" stroke-width="${1.4 + (i % 2)}" opacity="${0.9 - i * 0.07}"/>`);
    }
  } else {
    const a = 80 + r(5) * 90;
    p.push(`<path d="M 12 ${a} L 388 ${a - 34} L 388 ${a + 140} L 12 ${a + 174} Z" fill="${vurgu}" opacity="0.16"/>`);
    p.push(`<path d="M 12 ${a} L 388 ${a - 34}" stroke="${murekkep}" stroke-width="1.2"/>`);
    p.push(`<circle cx="${140 + r(7) * 120}" cy="${a + 66}" r="${46 + r(9) * 26}" fill="none" stroke="${vurgu}" stroke-width="2"/>`);
  }
  return p.join("\n    ");
}

function kart(k, i) {
  const t = tohum(k.baslik + k.sehir);
  const [zemin, murekkep, vurgu] = PALET[i % PALET.length];
  const s = satirlar(k.baslik);
  const bt = punto(s);
  const y0 = s.length === 1 ? 452 : 430;

  const yazi = s.map((x, j) =>
    `<text x="24" y="${y0 + j * (bt + 6)}" font-family="Archivo, sans-serif" font-weight="900" font-size="${bt}" fill="${murekkep}" letter-spacing="-1">${kacis(x)}</text>`
  ).join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600">
  <style>@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;900&amp;family=JetBrains+Mono:wght@400;500;700&amp;display=swap');</style>

  <rect width="400" height="600" fill="${zemin}"/>
  <rect x="12" y="12" width="376" height="576" fill="none" stroke="${murekkep}" stroke-width="1" opacity="0.35"/>

  <g>
    ${motif(k.tur, t, murekkep, vurgu)}
  </g>

  <text x="24" y="44" font-family="JetBrains Mono, monospace" font-size="10" letter-spacing="2" fill="${vurgu}">${kacis(k.tur.toUpperCase())}</text>
  <text x="376" y="44" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="10" letter-spacing="2" fill="${murekkep}" opacity="0.7">${kacis(k.saat)}</text>

  ${yazi}

  <line x1="24" y1="512" x2="376" y2="512" stroke="${vurgu}" stroke-width="1.5"/>
  <text x="24" y="536" font-family="JetBrains Mono, monospace" font-size="9.5" letter-spacing="1.6" fill="${murekkep}" opacity="0.75">${kacis(k.gun)} · ${kacis(k.mekan.toUpperCase())}</text>
  <text x="24" y="556" font-family="JetBrains Mono, monospace" font-size="9.5" letter-spacing="1.6" fill="${vurgu}">${kacis(k.sehir.toUpperCase())}</text>
</svg>
`;
}

let no = 142;
for (let i = 0; i < KARTLAR.length; i++) {
  no++;
  await writeFile(new URL(String(no) + ".svg", KOK), kart(KARTLAR[i], i));
  console.log("posters/" + no + ".svg — " + KARTLAR[i].baslik + " (" + KARTLAR[i].sehir + ")");
}
