/* afterhours — a poster generator for the new cities.
   Elle cizilen 36 posterin dilini surduruyor: 400x600, 12px ic cerceve,
   the kind and the time at the top (mono), a large title in the middle
   (Archivo 900), and at the bottom
   the date and the venue. Both the motif and the colour follow the kind.

   That they are generated is not hidden — they do not stand in for the
   hand-drawn ones,
   yanlarina geliyorlar.

     node tools/poster-build.mjs                                        */

import { writeFile, mkdir } from "node:fs/promises";
import { CONTINENTS } from "./world-data.mjs";

const ROOT = new URL("../../posters/", import.meta.url);

/* Every kind has its own palette: ground, main, secondary */
const PALET = {
  "Rave":       [["#0d0d12", "#c8ff3d", "#ff2ea6"], ["#12060f", "#ff5c1f", "#f6d64a"], ["#080f14", "#4fc4a8", "#c9d6ff"]],
  "Club Night": [["#121016", "#c9d6ff", "#ff5c1f"], ["#0a1014", "#f2b33d", "#8a5a3c"], ["#160d12", "#e0a53d", "#4fc4a8"]],
  "Konzert":    [["#141019", "#f6d64a", "#ff4d8d"], ["#0f1418", "#e8e4d9", "#d97b3f"], ["#101014", "#4fc4a8", "#f2b33d"]],
  "Festival":   [["#0e1410", "#f2b33d", "#c8ff3d"], ["#131013", "#ff8a3d", "#ffd9a0"], ["#0c1218", "#7fd1e8", "#f6d64a"]],
  "Meetup":     [["#15120e", "#e8e4d9", "#d97b3f"], ["#101312", "#c8ff3d", "#e8e4d9"], ["#12100f", "#f2b33d", "#ffffff"]],
  "Hausparty":  [["#160f0f", "#ff5c1f", "#f6d64a"], ["#0f1116", "#c9d6ff", "#ff4d8d"], ["#131211", "#e0a53d", "#c8ff3d"]],
};

/* A fixed mix: the same event always gets the same poster */
function seed(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const escape = (s) => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* Break the title over at most two lines, and pick the size by length */
function titleLines(title) {
  const words = title.toUpperCase().split(/\s+/);
  if (words.length === 1) return [words[0]];
  /* break at the space nearest the middle */
  let best = 1, gap = Infinity;
  for (let i = 1; i < words.length; i++) {
    const left = words.slice(0, i).join(" ").length;
    const right = words.slice(i).join(" ").length;
    if (Math.abs(left - right) < gap) { gap = Math.abs(left - right); best = i; }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

/* Archivo 900 in capitals is ~0.757em per character — with a guess of
   0.62 the title ran past the frame on 32 of the 106 posters (measured in
   the browser with getBBox). letter-spacing -1 gives 1px back per
   character. Usable width: 400 - 24 (left) - 12 (right) = 364. */
function fontSize(rows) {
  const longest = Math.max(...rows.map((s) => s.length));
  /* The measured ratio runs between 0.75 and 0.83 depending on the letters
     (wide-lettered titles like KAMOGAWA and BACKROOM sit at the top). We
     tried 0.62, then 0.757, then 0.80; all three still left titles running
     over. At 0.85 not one of the 106 posters passes the frame. */
  const p = Math.floor((364 / longest + 1) / 0.85);
  return Math.max(20, Math.min(58, p));
}

/* --- the motifs: one family per kind, varied by the seed --- */

function motif(kind, t, main, secondary) {
  const r = (n) => ((t >>> n) & 255) / 255;
  const p = [];

  if (kind === "Rave") {
    const n = 5 + Math.floor(r(3) * 4);
    for (let i = 0; i < n; i++) {
      const yc = 150 + i * (170 / n);
      p.push(`<circle cx="200" cy="250" r="${34 + i * 22}" fill="none" stroke="${i % 2 ? secondary : main}" stroke-width="${2 + (i % 3)}" opacity="${0.85 - i * 0.08}"/>`);
    }
  } else if (kind === "Club Night") {
    const a = 60 + r(5) * 120;
    p.push(`<path d="M 12 ${a} L 388 ${a - 40} L 388 ${a + 150} L 12 ${a + 190} Z" fill="${main}" opacity="0.9"/>`);
    p.push(`<circle cx="${120 + r(7) * 160}" cy="${a + 70}" r="${44 + r(9) * 30}" fill="${secondary}" opacity="0.85"/>`);
  } else if (kind === "Konzert") {
    const cx = 200, cy = 230;
    const n = 10 + Math.floor(r(11) * 8);
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 + r(13);
      const uz = 90 + r(i + 3) * 90;
      p.push(`<line x1="${cx}" y1="${cy}" x2="${(cx + Math.cos(angle) * uz).toFixed(1)}" y2="${(cy + Math.sin(angle) * uz).toFixed(1)}" stroke="${i % 3 ? main : secondary}" stroke-width="${3 + (i % 4)}" stroke-linecap="round"/>`);
    }
    p.push(`<circle cx="${cx}" cy="${cy}" r="${26 + r(17) * 16}" fill="${secondary}"/>`);
  } else if (kind === "Festival") {
    const base = 330;
    for (let i = 0; i < 4; i++) {
      const rr = 150 - i * 32;
      p.push(`<path d="M ${200 - rr} ${base} A ${rr} ${rr} 0 0 1 ${200 + rr} ${base} Z" fill="${i % 2 ? main : secondary}" opacity="${0.9 - i * 0.15}"/>`);
    }
    p.push(`<rect x="12" y="${base}" width="376" height="3" fill="${main}"/>`);
  } else if (kind === "Meetup") {
    const column = 6 + Math.floor(r(3) * 3);
    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < column; x++) {
        const taken = ((x * 7 + y * 13 + t) >>> 0) % 3 !== 0;
        p.push(`<circle cx="${60 + x * (280 / (column - 1))}" cy="${150 + y * 34}" r="${taken ? 7 : 4}" fill="${taken ? main : secondary}" opacity="${taken ? 0.95 : 0.5}"/>`);
      }
    }
  } else {
    /* Hausparty: rooms inside rooms */
    for (let i = 0; i < 5; i++) {
      const g = 300 - i * 52, y = 130 + i * 26;
      p.push(`<rect x="${200 - g / 2}" y="${y}" width="${g}" height="${g * 0.62}" fill="none" stroke="${i % 2 ? main : secondary}" stroke-width="${2 + i}" opacity="${0.9 - i * 0.1}"/>`);
    }
  }
  return p.join("\n    ");
}

/* --- poster --- */

function poster({ kind, title, venue, day, time, cityName }) {
  const t = seed(title + venue + day);
  const options = PALET[kind] || PALET["Club Night"];
  const [zemin, main, secondary] = options[t % options.length];

  const rows = titleLines(title);
  const bt = fontSize(rows);
  const basY = rows.length === 1 ? 452 : 430;

  const text = rows
    .map((s, i) => `<text x="24" y="${basY + i * (bt + 6)}" font-family="Archivo, sans-serif" font-weight="900" font-size="${bt}" fill="${main}" letter-spacing="-1">${escape(s)}</text>`)
    .join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600">
  <style>@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;900&amp;family=JetBrains+Mono:wght@400;500;700&amp;display=swap');</style>

  <rect width="400" height="600" fill="${zemin}"/>
  <rect x="12" y="12" width="376" height="576" fill="none" stroke="${main}" stroke-width="1" opacity="0.5"/>

  <g>
    ${motif(kind, t, main, secondary)}
  </g>

  <text x="24" y="44" font-family="JetBrains Mono, monospace" font-size="10" letter-spacing="2" fill="${main}">${escape(kind.toUpperCase())}</text>
  <text x="376" y="44" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="10" letter-spacing="2" fill="${main}">${escape(time)}</text>

  ${text}

  <line x1="24" y1="512" x2="376" y2="512" stroke="${secondary}" stroke-width="1.5"/>
  <text x="24" y="536" font-family="JetBrains Mono, monospace" font-size="9.5" letter-spacing="1.6" fill="${secondary}">${escape(day.toUpperCase())} · ${escape(venue.toUpperCase())}</text>
  <text x="24" y="556" font-family="JetBrains Mono, monospace" font-size="9.5" letter-spacing="1.6" fill="${main}" opacity="0.75">${escape(cityName.toUpperCase())}</text>
</svg>
`;
}

/* --- run --- */

await mkdir(ROOT, { recursive: true });

let no = 36;                       /* the hand-drawn ones are 1..36 */
const record = [];

for (const k of CONTINENTS) {
  for (const u of k.countries) {
    for (const s of u.cities) {
      for (const g of s.nights) {
        const [kind, title, venue, day, time, body] = g;
        no++;
        const file = String(no).padStart(2, "0") + ".svg";
        await writeFile(new URL(file, ROOT),
          poster({ kind, title, venue, day, time, cityName: s.name }));
        record.push({ no, kind, title, venue, day, time, body,
                     city: s.slug, cityName: s.name,
                     country: u.name, countryCode: u.code,
                     continent: k.continent, continentCode: k.continentSlug });
      }
    }
  }
}

await writeFile(new URL("../tools/world-record.json", import.meta.url),
                JSON.stringify(record, null, 2));

console.log("poster uretildi: " + record.length + " (37 → " + no + ")");
