/* afterhours — yeni cities icin poster ureteci.
   Elle cizilen 36 posterin dilini surduruyor: 400x600, 12px ic cerceve,
   ustte kind ve saat (mono), ortada buyuk heading (Archivo 900), altta
   tarih ve mekan. Motif ture gore degisiyor, renk de.

   Uretilmis olduklari sakli degil — elle cizilenlerin yerine gecmiyorlar,
   yanlarina geliyorlar.

     node tools/poster-build.mjs                                        */

import { writeFile, mkdir } from "node:fs/promises";
import { KITALAR } from "./world-data.mjs";

const KOK = new URL("../../posters/", import.meta.url);

/* Her turun kendi paleti: zemin, main, ikincil */
const PALET = {
  "Rave":       [["#0d0d12", "#c8ff3d", "#ff2ea6"], ["#12060f", "#ff5c1f", "#f6d64a"], ["#080f14", "#4fc4a8", "#c9d6ff"]],
  "Club Night": [["#121016", "#c9d6ff", "#ff5c1f"], ["#0a1014", "#f2b33d", "#8a5a3c"], ["#160d12", "#e0a53d", "#4fc4a8"]],
  "Konzert":    [["#141019", "#f6d64a", "#ff4d8d"], ["#0f1418", "#e8e4d9", "#d97b3f"], ["#101014", "#4fc4a8", "#f2b33d"]],
  "Festival":   [["#0e1410", "#f2b33d", "#c8ff3d"], ["#131013", "#ff8a3d", "#ffd9a0"], ["#0c1218", "#7fd1e8", "#f6d64a"]],
  "Meetup":     [["#15120e", "#e8e4d9", "#d97b3f"], ["#101312", "#c8ff3d", "#e8e4d9"], ["#12100f", "#f2b33d", "#ffffff"]],
  "Hausparty":  [["#160f0f", "#ff5c1f", "#f6d64a"], ["#0f1116", "#c9d6ff", "#ff4d8d"], ["#131211", "#e0a53d", "#c8ff3d"]],
};

/* Sabit karisim: ayni etkinlik hep ayni posteri alsin */
function seed(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const kacis = (s) => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* Basligi en fazla iki satira bol, uzunluga gore puntoyu sec */
function baslikSatirlari(heading) {
  const kelimeler = heading.toUpperCase().split(/\s+/);
  if (kelimeler.length === 1) return [kelimeler[0]];
  /* ortaya en yakin bosluktan bol */
  let enIyi = 1, fark = Infinity;
  for (let i = 1; i < kelimeler.length; i++) {
    const sol = kelimeler.slice(0, i).join(" ").length;
    const sag = kelimeler.slice(i).join(" ").length;
    if (Math.abs(sol - sag) < fark) { fark = Math.abs(sol - sag); enIyi = i; }
  }
  return [kelimeler.slice(0, enIyi).join(" "), kelimeler.slice(enIyi).join(" ")];
}

/* Archivo 900 buyuk harfte ~0.757em/karakter — 0.62 tahminiyle 106
   posterin 32'sinde heading cerceveyi tasiyordu (tarayicida getBBox ile
   olculdu). letter-spacing -1 karakter basina 1px geri veriyor.
   Kullanilabilir genislik: 400 - 24 (sol) - 12 (sag) = 364. */
function punto(rows) {
  const enUzun = Math.max(...rows.map((s) => s.length));
  /* Olculen oran harflere gore 0.75 ile 0.83 arasinda degisiyor
     (KAMOGAWA, BACKROOM gibi genis harfli basliklar en ustte). Once
     0.62, sonra 0.757, sonra 0.80 denendi; ucunde de tasan basliklar
     failed. 0.85 ile 106 posterin hicbiri cerceveyi gecmiyor. */
  const p = Math.floor((364 / enUzun + 1) / 0.85);
  return Math.max(20, Math.min(58, p));
}

/* --- motifler: kind basina one aile, tohumla degisiyor --- */

function motif(kind, t, main, ikincil) {
  const r = (n) => ((t >>> n) & 255) / 255;
  const p = [];

  if (kind === "Rave") {
    const n = 5 + Math.floor(r(3) * 4);
    for (let i = 0; i < n; i++) {
      const yc = 150 + i * (170 / n);
      p.push(`<circle cx="200" cy="250" r="${34 + i * 22}" fill="none" stroke="${i % 2 ? ikincil : main}" stroke-width="${2 + (i % 3)}" opacity="${0.85 - i * 0.08}"/>`);
    }
  } else if (kind === "Club Night") {
    const a = 60 + r(5) * 120;
    p.push(`<path d="M 12 ${a} L 388 ${a - 40} L 388 ${a + 150} L 12 ${a + 190} Z" fill="${main}" opacity="0.9"/>`);
    p.push(`<circle cx="${120 + r(7) * 160}" cy="${a + 70}" r="${44 + r(9) * 30}" fill="${ikincil}" opacity="0.85"/>`);
  } else if (kind === "Konzert") {
    const cx = 200, cy = 230;
    const n = 10 + Math.floor(r(11) * 8);
    for (let i = 0; i < n; i++) {
      const aci = (i / n) * Math.PI * 2 + r(13);
      const uz = 90 + r(i + 3) * 90;
      p.push(`<line x1="${cx}" y1="${cy}" x2="${(cx + Math.cos(aci) * uz).toFixed(1)}" y2="${(cy + Math.sin(aci) * uz).toFixed(1)}" stroke="${i % 3 ? main : ikincil}" stroke-width="${3 + (i % 4)}" stroke-linecap="round"/>`);
    }
    p.push(`<circle cx="${cx}" cy="${cy}" r="${26 + r(17) * 16}" fill="${ikincil}"/>`);
  } else if (kind === "Festival") {
    const taban = 330;
    for (let i = 0; i < 4; i++) {
      const rr = 150 - i * 32;
      p.push(`<path d="M ${200 - rr} ${taban} A ${rr} ${rr} 0 0 1 ${200 + rr} ${taban} Z" fill="${i % 2 ? main : ikincil}" opacity="${0.9 - i * 0.15}"/>`);
    }
    p.push(`<rect x="12" y="${taban}" width="376" height="3" fill="${main}"/>`);
  } else if (kind === "Meetup") {
    const sut = 6 + Math.floor(r(3) * 3);
    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < sut; x++) {
        const taken = ((x * 7 + y * 13 + t) >>> 0) % 3 !== 0;
        p.push(`<circle cx="${60 + x * (280 / (sut - 1))}" cy="${150 + y * 34}" r="${taken ? 7 : 4}" fill="${taken ? main : ikincil}" opacity="${taken ? 0.95 : 0.5}"/>`);
      }
    }
  } else {
    /* Hausparty: ic ice odalar */
    for (let i = 0; i < 5; i++) {
      const g = 300 - i * 52, y = 130 + i * 26;
      p.push(`<rect x="${200 - g / 2}" y="${y}" width="${g}" height="${g * 0.62}" fill="none" stroke="${i % 2 ? main : ikincil}" stroke-width="${2 + i}" opacity="${0.9 - i * 0.1}"/>`);
    }
  }
  return p.join("\n    ");
}

/* --- poster --- */

function poster({ kind, heading, mekan, gun, saat, sehirAd }) {
  const t = seed(heading + mekan + gun);
  const secenekler = PALET[kind] || PALET["Club Night"];
  const [zemin, main, ikincil] = secenekler[t % secenekler.length];

  const rows = baslikSatirlari(heading);
  const bt = punto(rows);
  const basY = rows.length === 1 ? 452 : 430;

  const yazi = rows
    .map((s, i) => `<text x="24" y="${basY + i * (bt + 6)}" font-family="Archivo, sans-serif" font-weight="900" font-size="${bt}" fill="${main}" letter-spacing="-1">${kacis(s)}</text>`)
    .join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600">
  <style>@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;900&amp;family=JetBrains+Mono:wght@400;500;700&amp;display=swap');</style>

  <rect width="400" height="600" fill="${zemin}"/>
  <rect x="12" y="12" width="376" height="576" fill="none" stroke="${main}" stroke-width="1" opacity="0.5"/>

  <g>
    ${motif(kind, t, main, ikincil)}
  </g>

  <text x="24" y="44" font-family="JetBrains Mono, monospace" font-size="10" letter-spacing="2" fill="${main}">${kacis(kind.toUpperCase())}</text>
  <text x="376" y="44" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="10" letter-spacing="2" fill="${main}">${kacis(saat)}</text>

  ${yazi}

  <line x1="24" y1="512" x2="376" y2="512" stroke="${ikincil}" stroke-width="1.5"/>
  <text x="24" y="536" font-family="JetBrains Mono, monospace" font-size="9.5" letter-spacing="1.6" fill="${ikincil}">${kacis(gun.toUpperCase())} · ${kacis(mekan.toUpperCase())}</text>
  <text x="24" y="556" font-family="JetBrains Mono, monospace" font-size="9.5" letter-spacing="1.6" fill="${main}" opacity="0.75">${kacis(sehirAd.toUpperCase())}</text>
</svg>
`;
}

/* --- calistir --- */

await mkdir(KOK, { recursive: true });

let no = 36;                       /* elle cizilenler 1..36 */
const record = [];

for (const k of KITALAR) {
  for (const u of k.ulkeler) {
    for (const s of u.cities) {
      for (const g of s.nights) {
        const [kind, heading, mekan, gun, saat, text] = g;
        no++;
        const file = String(no).padStart(2, "0") + ".svg";
        await writeFile(new URL(file, KOK),
          poster({ kind, heading, mekan, gun, saat, sehirAd: s.name }));
        record.push({ no, kind, heading, mekan, gun, saat, text,
                     city: s.slug, sehirAd: s.name, country: u.name, ulkeKod: u.code,
                     kita: k.kita, kitaKod: k.kitaKod });
      }
    }
  }
}

await writeFile(new URL("../tools/dunya-record.json", import.meta.url),
                JSON.stringify(record, null, 2));

console.log("poster uretildi: " + record.length + " (37 → " + no + ")");
