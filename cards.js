/* GENERATED from app/src/content/cardsgen.js by app/tools/cards-site.mjs — do not edit here. */
/* afterhours — the afterhours card generator (04.11.2026).

   One card per night you went to. It says only what the product knows:
   the night's name, the date and the doors, who came with you (initials,
   only when there was anyone), one music note (the night's track when we
   have one, else a small motif), the night's photo when it has one, and a
   motif face designed for the kind of night. Nothing else.

   Six kinds × ten designs = sixty faces. A night always gets the same
   design (kind + a stable id, see pickDesign). No gradients, no metal:
   paper or ink, one red.

   THE SAME FILE draws the card in the app (SvgXml), in the web app and on
   the site: the site copy (cards.js at the repo root) is made from this
   one by app/tools/cards-site.mjs. Edit here, then run the tool.           */

const CARDS = (function () {

// ───────────────────────── palette & fonts ─────────────────────────
const PAPER = '#f4f1ea', INK = '#111111', RED = '#d7261e';
// scheme: where the motif lives and what it is drawn with
const SCHEMES = [
  { bg: PAPER, fg: INK,   m: INK   },   // ink on paper
  { bg: INK,   fg: PAPER, m: PAPER },   // paper on ink
  { bg: PAPER, fg: INK,   m: RED   },   // red on paper
  { bg: INK,   fg: PAPER, m: RED   },   // red on ink
];
// Web names by default; the app swaps in its own (setFonts).
let fonts = { regular: 'Inter Tight', medium: 'Inter Tight', mono: 'JetBrains Mono' };
const setFonts = (f) => { fonts = { ...fonts, ...f }; };
const weight = () => (fonts.medium === fonts.regular ? ' font-weight="500"' : '');

const esc = (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const rnd = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const f2 = (n) => Math.round(n * 100) / 100;

// drawing helpers (the motif window is 400 × 272, origin top left)
const W = 400, H = 272, CX = 200, CY = 136;
const L = (x1, y1, x2, y2, c, w, more) => `<line x1="${f2(x1)}" y1="${f2(y1)}" x2="${f2(x2)}" y2="${f2(y2)}" stroke="${c}" stroke-width="${w || 1.5}"${more || ''}/>`;
const C = (cx, cy, r, c, w, more) => `<circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(r)}" fill="none" stroke="${c}" stroke-width="${w || 1.5}"${more || ''}/>`;
const D = (cx, cy, r, c, more) => `<circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(r)}" fill="${c}"${more || ''}/>`;
const R = (x, y, w, h, c, sw, more) => `<rect x="${f2(x)}" y="${f2(y)}" width="${f2(w)}" height="${f2(h)}" fill="none" stroke="${c}" stroke-width="${sw || 1.5}"${more || ''}/>`;
const B = (x, y, w, h, c, more) => `<rect x="${f2(x)}" y="${f2(y)}" width="${f2(w)}" height="${f2(h)}" fill="${c}"${more || ''}/>`;
const P = (d, c, w, more) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w || 1.5}" stroke-linecap="round" stroke-linejoin="round"${more || ''}/>`;
const F = (d, c, more) => `<path d="${d}" fill="${c}"${more || ''}/>`;
const O = (o) => ` opacity="${o}"`;
// a sine path across the window
const sine = (y, amp, period, phase, x0, x1) => {
  let d = ''; const a = x0 == null ? 0 : x0, b = x1 == null ? W : x1;
  for (let x = a; x <= b; x += 6) d += (x === a ? 'M' : 'L') + f2(x) + ' ' + f2(y + Math.sin((x / period) * Math.PI * 2 + (phase || 0)) * amp);
  return d;
};

// ───────────────────────── the sixty motifs ─────────────────────────
// each: (m = motif colour, fg = text colour, bg) → svg inside the 400×272 window
const MOTIFS = {
  rave: [
    // 1 strobe — light from one point, every other ray a step shorter
    (m, fg, bg) => { let s = ''; for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2, r = i % 2 ? 150 : 230; s += L(CX + Math.cos(a) * 22, CY + Math.sin(a) * 22, CX + Math.cos(a) * r, CY + Math.sin(a) * r, m, i % 4 === 0 ? 2.2 : 1); } return s + D(CX, CY, 9, m); },
    // 2 kick — one square, struck seven times
    (m) => { let s = ''; for (let i = 0; i < 7; i++) { const r = 24 + i * 20; s += `<rect x="${CX - r}" y="${CY - r}" width="${r * 2}" height="${r * 2}" fill="none" stroke="${m}" stroke-width="${3.2 - i * 0.35}" transform="rotate(45 ${CX} ${CY})"/>`; } return s + `<rect x="${CX - 10}" y="${CY - 10}" width="20" height="20" fill="${m}" transform="rotate(45 ${CX} ${CY})"/>`; },
    // 3 laser — two fans of lines crossing above a floor
    (m) => { let s = L(0, 236, W, 236, m, 1); for (let i = 0; i < 9; i++) { s += L(40, 0, 20 + i * 48, 236, m, i === 4 ? 2.4 : 1); s += L(360, 0, 380 - i * 48, 236, m, i === 4 ? 2.4 : 1); } return s; },
    // 4 smoke — the fog machine, twelve layers
    (m) => { let s = ''; for (let i = 0; i < 12; i++) s += P(sine(40 + i * 19, 5 + i * 1.2, 90 + i * 9, i * 1.3), m, 1.6, O(f2(0.25 + i * 0.065))); return s; },
    // 5 four to the floor — a grid of beats, every fourth one lands
    (m) => { let s = ''; for (let r = 0; r < 9; r++) for (let c = 0; c < 16; c++) { const x = 32 + c * 22.4, y = 32 + r * 26; s += c % 4 === 0 ? D(x, y, 4.5, m) : D(x, y, 1.6, m, O(0.5)); } return s; },
    // 6 warehouse — a sawtooth roof and the pillars under it
    (m) => { let s = 'M0 92'; for (let i = 0; i < 5; i++) s += ` L${i * 80 + 52} 40 L${i * 80 + 80} 92`; s = P(s, m, 2) + L(0, 92, W, 92, m, 1); for (let i = 0; i < 5; i++) s += L(i * 80 + 80, 92, i * 80 + 80, 240, m, 1.2); return s + L(0, 240, W, 240, m, 2); },
    // 7 bpm — the meter, bars from the middle
    (m) => { let s = L(0, CY, W, CY, m, 1, O(0.5)); for (let i = 0; i < 44; i++) { const x = 14 + i * 8.6, h = 14 + rnd(i) * 70 + Math.sin(i / 3.2) * 36; s += B(x, CY - h, 3.4, h * 2, m, i % 8 === 0 ? '' : O(0.55)); } return s; },
    // 8 tunnel — the way in, the point of escape off to one side
    (m) => { let s = ''; const vx = 250, vy = 120; for (let i = 0; i < 8; i++) { const k = Math.pow(0.78, i); s += R(vx - (vx) * k, vy - vy * k, W * k, H * k, m, 2 - i * 0.18); } s += L(0, 0, vx, vy, m, 1, O(0.5)) + L(W, 0, vx, vy, m, 1, O(0.5)) + L(0, H, vx, vy, m, 1, O(0.5)) + L(W, H, vx, vy, m, 1, O(0.5)); return s; },
    // 9 sunrise — the sun comes up on the way home, cut by the blinds
    (m, fg, bg) => { let s = `<clipPath id="rave9"><path d="M60 230 A140 140 0 0 1 340 230 Z"/></clipPath><g clip-path="url(#rave9)">` + B(60, 90, 280, 140, m); for (let i = 0; i < 7; i++) s += B(0, 230 - i * 20 - 6 + i * 1.2, W, 4 + i * 0.6, bg); return s + '</g>' + L(0, 230, W, 230, m, 2); },
    // 10 reel — the tape it was all recorded on
    (m) => { let s = R(60, 70, 280, 134, m, 2) + ` <rect x="60" y="70" width="280" height="134" rx="6" fill="none" stroke="${m}" stroke-width="2"/>`; [140, 260].forEach((x) => { s += C(x, 137, 32, m, 2) + C(x, 137, 9, m, 2); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; s += L(x + Math.cos(a) * 12, 137 + Math.sin(a) * 12, x + Math.cos(a) * 28, 137 + Math.sin(a) * 28, m, 1.5); } }); return s + L(172, 137, 228, 137, m, 1) + R(150, 180, 100, 10, m, 1.2); },
  ],
  club: [
    // 1 mirror ball — a circle of small mirrors, hung from the ceiling
    (m, fg, bg) => { let s = `<clipPath id="club1"><circle cx="${CX}" cy="150" r="88"/></clipPath>` + L(CX, 0, CX, 62, m, 1.5) + `<g clip-path="url(#club1)">` + D(CX, 150, 88, m); for (let i = -9; i <= 9; i++) { s += L(CX + i * 11, 50, CX + i * 11, 250, bg, 1.4); s += L(100, 150 + i * 11, 300, 150 + i * 11, bg, 1.4); } s += '</g>'; [[86, 92], [318, 110], [70, 210], [330, 214]].forEach(([x, y], k) => { s += L(x - 9, y, x + 9, y, m, 1.2) + L(x, y - 9, x, y + 9, m, 1.2); }); return s; },
    // 2 the rope — three posts and the line you wait behind
    (m) => { let s = L(0, 232, W, 232, m, 1); [70, 200, 330].forEach((x) => { s += L(x, 96, x, 232, m, 2.4) + D(x, 90, 7, m) + L(x - 18, 232, x + 18, 232, m, 3); }); return s + P('M70 108 Q135 180 200 108', m, 3) + P('M200 108 Q265 180 330 108', m, 3); },
    // 3 the stamp — the mark on the back of your hand
    (m) => { let s = `<g transform="rotate(-12 ${CX} ${CY})">` + C(CX, CY, 92, m, 3) + C(CX, CY, 80, m, 1.2, ' stroke-dasharray="3 5"') + C(CX, CY, 52, m, 2.5); for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; s += L(CX + Math.cos(a) * 58, CY + Math.sin(a) * 58, CX + Math.cos(a) * 70, CY + Math.sin(a) * 70, m, i % 6 === 0 ? 2.5 : 1.2); } return s + L(CX - 26, CY - 26, CX + 26, CY + 26, m, 3) + L(CX + 26, CY - 26, CX - 26, CY + 26, m, 3) + '</g>'; },
    // 4 neon — one tube, lit, with its ghosts
    (m) => `<rect x="70" y="56" width="260" height="160" rx="80" fill="none" stroke="${m}" stroke-width="12" opacity="0.14"/><rect x="70" y="56" width="260" height="160" rx="80" fill="none" stroke="${m}" stroke-width="3"/><rect x="104" y="86" width="192" height="100" rx="50" fill="none" stroke="${m}" stroke-width="1.6"/>` + L(70, 216, 70, 272, m, 1.2) + L(330, 216, 330, 272, m, 1.2),
    // 5 bass — five waves, each one longer
    (m) => { let s = ''; for (let i = 0; i < 5; i++) s += P(sine(50 + i * 43, 8 + i * 5, 60 + i * 34, i * 0.8), m, 2 + i * 0.3); return s; },
    // 6 vinyl — only records tonight
    (m, fg, bg) => { let s = D(CX, CY, 118, m); for (let r = 56; r < 116; r += 6) s += C(CX, CY, r, bg, 0.8, O(0.55)); s += D(CX, CY, 42, bg) + C(CX, CY, 42, m, 1.5) + D(CX, CY, 5, m); return s + L(CX - 30, CY + 14, CX + 30, CY + 14, m, 1) + L(CX - 24, CY - 12, CX + 24, CY - 12, m, 1); },
    // 7 downstairs — the floor is one level below
    (m) => { let d = 'M20 40'; for (let i = 0; i < 8; i++) d += ` L${20 + i * 45} ${40 + i * 26} L${65 + i * 45} ${40 + i * 26}`; d += ' L380 248'; let s = P(d, m, 2.6); for (let i = 0; i < 8; i++) s += L(65 + i * 45, 40 + i * 26, 65 + i * 45, 272, m, 1, O(0.35)); return s + P('M20 20 L380 228', m, 1, O(0.5)); },
    // 8 the door — a slit of light under it
    (m, fg, bg) => R(136, 30, 128, 212, m, 2.5) + L(136, 242, 264, 242, m, 1) + B(136, 236, 128, 6, m) + D(244, 140, 5, m) + F('M136 242 L60 272 L340 272 L264 242 Z', m, O(0.16)) + L(136, 30, 136, 242, m, 1) + L(200, 30, 200, 60, m, 1, O(0.4)),
    // 9 the glass — one coupe, one more behind it
    (m) => { const g = (x, y, k, o) => `<g opacity="${o}">` + P(`M${x - 56 * k} ${y} Q${x} ${y + 70 * k} ${x + 56 * k} ${y}`, m, 2.2) + L(x - 56 * k, y, x + 56 * k, y, m, 2.2) + L(x, y + 70 * k, x, y + 118 * k, m, 2.2) + L(x - 30 * k, y + 118 * k, x + 30 * k, y + 118 * k, m, 2.6) + D(x + 14 * k, y + 22 * k, 6 * k, m) + '</g>'; return g(236, 110, 0.82, 0.45) + g(176, 86, 1.1, 1); },
    // 10 the tag — what the coat check gives you
    (m, fg, bg) => `<g transform="rotate(14 ${CX} ${CY})">` + F('M140 56 L260 56 L260 226 L140 226 Z', bg) + R(140, 56, 120, 170, m, 2.4) + C(200, 82, 8, m, 2) + L(154, 130, 246, 130, m, 1.2) + L(154, 150, 226, 150, m, 1.2) + L(154, 170, 236, 170, m, 1.2) + L(154, 190, 214, 190, m, 1.2) + '</g>' + P('M196 36 C 150 10, 120 30, 110 0', m, 1.4),
  ],
  concert: [
    // 1 spotlight — one beam, a pool of light, a stand
    (m, fg, bg) => F('M200 0 L60 272 L340 272 Z', m, O(0.14)) + F('M200 0 L120 272 L280 272 Z', m, O(0.12)) + `<ellipse cx="200" cy="262" rx="110" ry="12" fill="${m}" opacity="0.22"/>` + L(200, 150, 200, 258, m, 2.5) + L(176, 258, 224, 258, m, 2.5) + `<rect x="190" y="118" width="20" height="36" rx="10" fill="${m}"/>`,
    // 2 lighters — the slow song
    (m) => { let s = ''; for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) { const x = 36 + c * 41 + (r % 2) * 20, y = 60 + r * 56 + rnd(r * 9 + c) * 14; const lit = (r * 9 + c) % 5 === 2; s += F(`M${x} ${y - 16} C${x + 9} ${y - 4} ${x + 7} ${y + 6} ${x} ${y + 8} C${x - 7} ${y + 6} ${x - 9} ${y - 4} ${x} ${y - 16} Z`, m, lit ? '' : O(0.3)) + L(x, y + 10, x, y + 24, m, 1.4, lit ? '' : O(0.3)); } return s; },
    // 3 the stage — the front edge and the rows before it
    (m) => { let s = F('M40 30 L360 30 L400 86 L0 86 Z', m, O(0.14)) + P('M40 30 L360 30 L400 86 L0 86 Z', m, 2); for (let r = 0; r < 5; r++) for (let c = 0; c < 12 + r; c++) { const x = 200 + (c - (11 + r) / 2) * (30 - r * 1.5), y = 118 + r * 34; s += P(`M${x - 9} ${y + 8} A9 9 0 0 1 ${x + 9} ${y + 8}`, m, 1.6, O(0.35 + r * 0.16)); } return s; },
    // 4 the amp — the wall of speakers
    (m) => { let s = R(40, 26, 320, 220, m, 2.5); [[120, 86], [280, 86], [120, 186], [280, 186]].forEach(([x, y]) => { s += C(x, y, 42, m, 2) + C(x, y, 26, m, 1.2) + D(x, y, 8, m); }); [[52, 38], [348, 38], [52, 234], [348, 234]].forEach(([x, y]) => (s += D(x, y, 3, m))); return s + L(40, 136, 360, 136, m, 1, O(0.4)); },
    // 5 the wave — the room, recorded
    (m) => { let s = ''; for (let i = 0; i < 64; i++) { const x = 10 + i * 6, env = Math.sin((i / 64) * Math.PI), h = (6 + rnd(i * 3) * 70 + Math.sin(i / 2.1) * 30) * env + 3; s += L(x, CY - h, x, CY + h, m, 2.6, i % 9 === 4 ? '' : O(0.55)); } return s; },
    // 6 strings — six of them and a pick
    (m) => { let s = ''; for (let i = 0; i < 6; i++) s += L(0, 68 + i * 28, W, 68 + i * 28, m, 0.8 + i * 0.4); [90, 150, 230, 320].forEach((x) => (s += L(x, 60, x, 216, m, 1, O(0.3)))); return s + F('M254 120 C280 108 306 118 296 150 C290 172 276 190 266 196 C256 186 232 160 230 142 C228 128 240 124 254 120 Z', m); },
    // 7 the stub — torn along the dotted line
    (m, fg, bg) => `<g transform="rotate(-8 ${CX} ${CY})">` + R(60, 70, 280, 132, m, 2.4) + D(60, 136, 12, bg) + C(60, 136, 12, m, 2.4) + D(340, 136, 12, bg) + C(340, 136, 12, m, 2.4) + L(248, 70, 248, 202, m, 1.6, ' stroke-dasharray="4 6"') + L(84, 104, 216, 104, m, 1.2) + L(84, 124, 190, 124, m, 1.2) + L(84, 160, 160, 160, m, 1.2) + L(84, 178, 140, 178, m, 1.2) + L(272, 96, 316, 96, m, 1.2) + L(272, 176, 316, 176, m, 1.2) + '</g>',
    // 8 encore — they came back out
    (m) => { let s = ''; for (let i = 0; i < 6; i++) { const k = 1 - i * 0.14, y = 232 - i * 38; s += P(`M${CX - 150 * k} ${y} L${CX} ${y - 54 * k} L${CX + 150 * k} ${y}`, m, 1.6 + i * 0.5, O(0.35 + i * 0.13)); } return s; },
    // 9 the crowd — rows of heads, closer every row
    (m) => { let s = ''; for (let r = 0; r < 5; r++) { const n = 14 - r * 2, rad = 7 + r * 4, y = 60 + r * 46; for (let c = 0; c < n; c++) { const x = 200 + (c - (n - 1) / 2) * (28 + r * 10) + (r % 2 ? 8 : 0); s += r === 4 ? F(`M${x - rad} ${y + rad} A${rad} ${rad} 0 0 1 ${x + rad} ${y + rad} Z`, m) : P(`M${x - rad} ${y + rad} A${rad} ${rad} 0 0 1 ${x + rad} ${y + rad}`, m, 1.4); } } return s; },
    // 10 the hall — arch over arch over the stage
    (m) => { let s = ''; for (let i = 0; i < 5; i++) { const k = 1 - i * 0.17; s += P(`M${CX - 186 * k} 272 L${CX - 186 * k} ${140 - 60 * k + 60} A${186 * k} ${150 * k} 0 0 1 ${CX + 186 * k} ${140 - 60 * k + 60} L${CX + 186 * k} 272`, m, 2.4 - i * 0.3); } return s + L(118, 236, 282, 236, m, 2.5) + L(130, 250, 270, 250, m, 1, O(0.4)); },
  ],
  festival: [
    // 1 tents — the field at night
    (m) => { let s = L(0, 236, W, 236, m, 1.5); [[70, 46], [160, 70], [250, 56], [330, 40]].forEach(([x, h], k) => { s += P(`M${x - h * 1.2} 236 L${x} ${236 - h * 1.6} L${x + h * 1.2} 236`, m, 2, k === 2 ? '' : O(0.5)) + L(x, 236 - h * 1.6, x, 236, m, 1, O(0.3)); if (k === 2) s += F(`M${x - h * 1.2} 236 L${x} ${236 - h * 1.6} L${x + h * 1.2} 236 Z`, m, O(0.18)); }); return s; },
    // 2 the wristband — you do not take it off for days
    (m, fg, bg) => `<g transform="rotate(-28 ${CX} ${CY})">` + B(-60, CY - 34, 520, 68, m) + `<g opacity="0.5">` + Array.from({ length: 16 }, (_, i) => L(-40 + i * 34, CY - 34, -20 + i * 34, CY + 34, bg, 1.4)).join('') + '</g>' + B(CX + 70, CY - 22, 34, 44, bg) + R(CX + 70, CY - 22, 34, 44, m, 2) + '</g>',
    // 3 the sun — it did not set until ten
    (m) => { let s = D(CX, 120, 56, m); for (let i = 0; i < 32; i++) { const a = (i / 32) * Math.PI * 2; s += L(CX + Math.cos(a) * 72, 120 + Math.sin(a) * 72, CX + Math.cos(a) * (i % 2 ? 84 : 100), 120 + Math.sin(a) * (i % 2 ? 84 : 100), m, 1.6); } return s + L(0, 232, W, 232, m, 1.5) + L(150, 248, 250, 248, m, 1, O(0.4)) + L(170, 260, 230, 260, m, 1, O(0.3)); },
    // 4 bunting — two strings of flags
    (m) => { let s = P('M0 50 Q200 150 400 50', m, 1.6) + P('M0 150 Q200 250 400 150', m, 1.6); for (let i = 0; i < 10; i++) { const t = (i + 0.5) / 10, x = t * W, y1 = 50 + (1 - Math.pow(2 * t - 1, 2)) * 50, y2 = 150 + (1 - Math.pow(2 * t - 1, 2)) * 50; s += F(`M${x - 13} ${y1} L${x + 13} ${y1} L${x} ${y1 + 30} Z`, m, i % 3 ? O(0.45) : '') + F(`M${x - 13} ${y2} L${x + 13} ${y2} L${x} ${y2 + 30} Z`, m, (i + 1) % 3 ? O(0.45) : ''); } return s; },
    // 5 three stages — you could not be at all of them
    (m) => { let s = L(0, 236, W, 236, m, 1.5); [[60, 110, 70], [200, 160, 110], [340, 100, 60]].forEach(([x, w, h], k) => { s += R(x - w / 2, 236 - h, w, h, m, 2) + P(`M${x - w / 2} ${236 - h} L${x} ${236 - h - 26} L${x + w / 2} ${236 - h}`, m, 2); for (let i = 0; i < 4; i++) s += D(x - w / 2 + 12 + i * ((w - 24) / 3), 236 - h + 14, 3, m); }); return s; },
    // 6 the map — the path between the stages
    (m) => { let s = P('M30 240 C 90 150, 120 260, 170 170 S 250 60, 300 120 S 360 60, 380 40', m, 1.6, ' stroke-dasharray="2 7"'); [[30, 240, 0.5], [170, 170, 0.5], [300, 120, 1], [380, 40, 0.5]].forEach(([x, y, o]) => { s += `<g opacity="${o}">` + F(`M${x} ${y} L${x - 11} ${y - 20} A13 13 0 1 1 ${x + 11} ${y - 20} Z`, m) + D(x, y - 24, 4.5, '#ffffff', O(0.9)) + '</g>'; }); return s; },
    // 7 rain — it rained, nobody left
    (m) => { let s = ''; for (let i = 0; i < 120; i++) { const x = rnd(i) * 440 - 20, y = rnd(i + 500) * 240, l = 10 + rnd(i + 900) * 16; s += L(x, y, x - l * 0.35, y + l, m, 1.3, O(0.35 + rnd(i + 77) * 0.5)); } return s + `<ellipse cx="120" cy="250" rx="56" ry="8" fill="none" stroke="${m}" stroke-width="1.4"/><ellipse cx="290" cy="258" rx="40" ry="6" fill="none" stroke="${m}" stroke-width="1.4"/>`; },
    // 8 the camp — a field of small tents, yours is the dark one
    (m) => { let s = ''; for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) { const x = 40 + c * 46 + (r % 2) * 23, y = 60 + r * 52, me = r === 2 && c === 3; s += me ? F(`M${x - 18} ${y + 12} L${x} ${y - 14} L${x + 18} ${y + 12} Z`, m) : P(`M${x - 18} ${y + 12} L${x} ${y - 14} L${x + 18} ${y + 12} Z`, m, 1.4, O(0.55)); } return s; },
    // 9 fireworks — the last night
    (m) => { const burst = (cx, cy, r, n, o) => { let s = `<g opacity="${o}">`; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; s += L(cx + Math.cos(a) * r * 0.3, cy + Math.sin(a) * r * 0.3, cx + Math.cos(a) * r, cy + Math.sin(a) * r, m, 1.4) + D(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2.6, m); } return s + '</g>'; }; return burst(150, 120, 92, 18, 1) + burst(300, 70, 50, 12, 0.6) + burst(320, 210, 40, 10, 0.45) + L(150, 272, 150, 230, m, 1, O(0.3)); },
    // 10 the wheel — you saw the whole site from up there
    (m) => { let s = C(CX, 124, 96, m, 2.4) + C(CX, 124, 12, m, 2); for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const x = CX + Math.cos(a) * 96, y = 124 + Math.sin(a) * 96; s += L(CX, 124, x, y, m, 1.2) + `<rect x="${f2(x - 7)}" y="${f2(y)}" width="14" height="14" rx="3" fill="none" stroke="${m}" stroke-width="1.6"/>`; } return s + P(`M${CX} 124 L${CX - 70} 272`, m, 2.2) + P(`M${CX} 124 L${CX + 70} 272`, m, 2.2) + L(80, 272, 320, 272, m, 1.5); },
  ],
  meetup: [
    // 1 the round table — eight chairs
    (m) => { let s = C(CX, CY, 60, m, 2.4); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, x = CX + Math.cos(a) * 92, y = CY + Math.sin(a) * 92; s += `<rect x="${f2(x - 11)}" y="${f2(y - 11)}" width="22" height="22" rx="5" fill="${i === 2 ? m : 'none'}" stroke="${m}" stroke-width="1.8" transform="rotate(${f2((a * 180) / Math.PI)} ${f2(x)} ${f2(y)})"/>`; } return s; },
    // 2 two bubbles — somebody said something
    (m, fg, bg) => F('M60 60 L250 60 L250 160 L110 160 L80 190 L86 160 L60 160 Z', m) + `<rect x="60" y="60" width="190" height="100" rx="14" fill="${m}"/>` + F('M150 120 L340 120 L340 220 L314 220 L320 250 L290 220 L150 220 Z', bg) + `<rect x="150" y="120" width="190" height="100" rx="14" fill="${bg}" stroke="${m}" stroke-width="2.4"/>` + P('M290 220 L320 250 L314 220', m, 2.4) + L(174, 156, 300, 156, m, 1.4) + L(174, 176, 270, 176, m, 1.4) + L(174, 196, 290, 196, m, 1.4),
    // 3 coffee — the meeting that started at the counter
    (m) => P('M120 110 L120 200 Q120 236 156 236 L224 236 Q260 236 260 200 L260 110 Z', m, 2.6) + P('M260 130 Q310 130 310 165 Q310 200 260 200', m, 2.6) + `<ellipse cx="190" cy="252" rx="90" ry="8" fill="none" stroke="${m}" stroke-width="1.8"/>` + P('M156 92 C150 80 164 70 158 56', m, 1.8, O(0.6)) + P('M190 92 C184 80 198 70 192 52', m, 1.8, O(0.6)) + P('M224 92 C218 80 232 70 226 56', m, 1.8, O(0.6)),
    // 4 the name tag — hello, my name is
    (m, fg, bg) => `<g transform="rotate(-6 ${CX} ${CY})">` + `<rect x="70" y="66" width="260" height="150" rx="10" fill="${bg}" stroke="${m}" stroke-width="2.4"/>` + `<path d="M80 66 L320 66 Q330 66 330 76 L330 112 L70 112 L70 76 Q70 66 80 66 Z" fill="${m}"/>` + L(96, 150, 300, 150, m, 1.4) + L(96, 176, 240, 176, m, 1.4) + L(96, 198, 180, 198, m, 1.4) + '</g>',
    // 5 the handshake — two links
    (m) => `<rect x="60" y="86" width="170" height="100" rx="50" fill="none" stroke="${m}" stroke-width="12" transform="rotate(-20 ${CX} ${CY})"/><rect x="170" y="86" width="170" height="100" rx="50" fill="none" stroke="${m}" stroke-width="12" transform="rotate(20 ${CX} ${CY})"/>`,
    // 6 chairs — rows, an aisle, one seat still free
    (m) => { let s = ''; for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) { const x = 40 + c * 42 + (c > 3 ? 24 : 0), y = 70 + r * 66, free = r === 1 && c === 5; s += `<rect x="${x}" y="${y}" width="26" height="26" rx="4" fill="${free ? 'none' : m}" stroke="${m}" stroke-width="1.6"/>` + L(x, y - 10, x + 26, y - 10, m, 2); } return s; },
    // 7 the whiteboard — notes left on it
    (m, fg, bg) => R(40, 36, 320, 200, m, 2.4) + L(40, 236, 80, 272, m, 1.5) + L(360, 236, 320, 272, m, 1.5) + B(70, 66, 50, 50, m) + B(136, 86, 50, 50, m, O(0.45)) + B(96, 150, 50, 50, m, O(0.45)) + B(260, 60, 50, 50, m, O(0.45)) + L(212, 80, 244, 80, m, 1.6) + L(212, 100, 236, 100, m, 1.6) + P('M200 180 Q260 120 330 190', m, 1.6, ' stroke-dasharray="3 5"'),
    // 8 seven o clock — when it was meant to start
    (m) => { let s = C(CX, CY, 100, m, 2.4); for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; s += L(CX + Math.cos(a) * 86, CY + Math.sin(a) * 86, CX + Math.cos(a) * (i % 3 ? 94 : 100), CY + Math.sin(a) * (i % 3 ? 94 : 100), m, i % 3 ? 1.4 : 2.4); } return s + L(CX, CY, CX, CY - 58, m, 3) + L(CX, CY, CX - 42, CY + 42, m, 3) + D(CX, CY, 5, m); },
    // 9 pins — where next
    (m) => { let s = L(0, 244, W, 244, m, 1, ' stroke-dasharray="2 6"') + L(0, 228, W, 228, m, 1, ' stroke-dasharray="2 6"'); [[110, 244, 26, 0.5], [210, 228, 38, 1], [310, 244, 20, 0.5]].forEach(([x, y, r, o]) => { s += `<g opacity="${o}">` + F(`M${x} ${y} L${x - r * 0.75} ${y - r * 1.6} A${r} ${r} 0 1 1 ${x + r * 0.75} ${y - r * 1.6} Z`, m) + D(x, y - r * 1.95, r * 0.36, o === 1 ? '#ffffff' : m, o === 1 ? O(0.9) : O(0)) + '</g>'; }); return s; },
    // 10 threads — who knew whom by the end
    (m) => { const pts = [[60, 60], [170, 40], [300, 70], [350, 160], [250, 130], [120, 150], [50, 220], [190, 236], [330, 240]], ed = [[0, 1], [1, 2], [1, 4], [2, 3], [3, 4], [4, 5], [5, 0], [5, 6], [6, 7], [7, 4], [7, 8], [8, 3]]; let s = ''; ed.forEach(([a, b]) => (s += L(pts[a][0], pts[a][1], pts[b][0], pts[b][1], m, 1.2, O(0.5)))); pts.forEach(([x, y], i) => (s += i === 4 ? D(x, y, 12, m) : C(x, y, 8, m, 2))); return s; },
  ],
  house: [
    // 1 the house — one window lit
    (m) => P('M60 150 L200 40 L340 150', m, 2.6) + R(90, 130, 220, 120, m, 2.4) + R(176, 190, 48, 60, m, 2) + R(110, 156, 40, 34, m, 1.8) + B(250, 156, 40, 34, m) + L(250, 173, 290, 173, m, 1) + L(270, 156, 270, 190, m, 1) + L(40, 250, 360, 250, m, 1.5),
    // 2 the window — from the street you could tell
    (m, fg, bg) => B(90, 36, 220, 200, m) + L(200, 36, 200, 236, bg, 6) + L(90, 136, 310, 136, bg, 6) + R(90, 36, 220, 200, m, 4) + F('M90 36 L130 36 L124 236 L90 236 Z', bg, O(0.35)) + F('M310 36 L270 36 L276 236 L310 236 Z', bg, O(0.35)) + L(60, 250, 340, 250, m, 2),
    // 3 balloons — from the ceiling
    (m) => { let s = ''; [[110, 100, 30, 1], [170, 70, 26, 0.45], [230, 110, 34, 0.45], [300, 80, 28, 0.45], [150, 160, 22, 0.45]].forEach(([x, y, r, o]) => { s += `<g opacity="${o}"><ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 1.2}" fill="${m}"/>` + F(`M${x - 5} ${y + r * 1.2} L${x + 5} ${y + r * 1.2} L${x} ${y + r * 1.2 + 7} Z`, m) + P(`M${x} ${y + r * 1.2 + 7} Q${x + 12} ${y + r * 1.2 + 60} ${x - 6} ${y + r * 1.2 + 110}`, m, 1.2) + '</g>'; }); return s; },
    // 4 the kitchen — where everyone ends up
    (m) => { let s = L(40, 226, 360, 226, m, 2.4); [[80, 120, 28], [128, 90, 24], [176, 140, 30], [226, 100, 20], [270, 126, 26], [322, 84, 24]].forEach(([x, h, w], k) => { s += P(`M${x - w / 2} 226 L${x - w / 2} ${226 - h + 30} Q${x - w / 2} ${226 - h + 10} ${x - 6} ${226 - h} L${x - 6} ${226 - h - 18} L${x + 6} ${226 - h - 18} L${x + 6} ${226 - h} Q${x + w / 2} ${226 - h + 10} ${x + w / 2} ${226 - h + 30} L${x + w / 2} 226 Z`, m, 2, k === 2 ? '' : O(0.5)); if (k === 2) s += F(`M${x - w / 2} 226 L${x - w / 2} ${226 - h + 40} L${x + w / 2} ${226 - h + 40} L${x + w / 2} 226 Z`, m, O(0.35)); }); return s; },
    // 5 the stairs — third floor, no lift
    (m) => { let d = 'M30 250'; for (let i = 0; i < 7; i++) d += ` L${30 + i * 48} ${250 - i * 32} L${78 + i * 48} ${250 - i * 32}`; return P(d, m, 2.8) + P('M60 196 L380 -16', m, 1.4) + L(60, 196, 60, 230, m, 1.4) + L(170, 124, 170, 158, m, 1.4) + L(280, 52, 280, 86, m, 1.4); },
    // 6 the record player — somebody took over
    (m, fg, bg) => R(50, 50, 300, 180, m, 2.4) + D(160, 140, 72, m) + D(160, 140, 24, bg) + D(160, 140, 4, m) + D(300, 80, 10, m) + L(300, 80, 236, 168, m, 3) + L(236, 168, 224, 182, m, 6) + R(280, 190, 40, 14, m, 1.6),
    // 7 the plants — the one with the balcony
    (m) => { let s = R(160, 200, 80, 60, m, 2.4) + L(150, 200, 250, 200, m, 2.4); const leaf = (x, y, a, k, o) => `<ellipse cx="${x}" cy="${y}" rx="${12 * k}" ry="${30 * k}" fill="${m}" opacity="${o}" transform="rotate(${a} ${x} ${y})"/>`; s += L(200, 200, 200, 96, m, 2) + L(200, 170, 150, 120, m, 1.6) + L(200, 150, 250, 100, m, 1.6) + L(200, 130, 160, 80, m, 1.6); s += leaf(200, 70, 0, 1, 1) + leaf(142, 106, -46, 0.9, 0.5) + leaf(258, 86, 50, 0.9, 0.5) + leaf(150, 64, -30, 0.7, 0.5) + leaf(236, 140, 70, 0.6, 0.5); return s; },
    // 8 ring twice — the bell
    (m, fg, bg) => `<rect x="150" y="66" width="100" height="150" rx="12" fill="none" stroke="${m}" stroke-width="2.4"/>` + D(200, 110, 22, m) + R(170, 156, 60, 10, m, 1.4) + R(170, 178, 60, 10, m, 1.4) + P('M268 96 A40 40 0 0 1 268 124', m, 2) + P('M284 82 A60 60 0 0 1 284 138', m, 2, O(0.6)) + P('M132 96 A40 40 0 0 0 132 124', m, 2) + P('M116 82 A60 60 0 0 0 116 138', m, 2, O(0.6)),
    // 9 the couch — where the night ended
    (m) => `<rect x="60" y="120" width="280" height="90" rx="14" fill="none" stroke="${m}" stroke-width="2.6"/><rect x="40" y="110" width="40" height="100" rx="14" fill="none" stroke="${m}" stroke-width="2.6"/><rect x="320" y="110" width="40" height="100" rx="14" fill="none" stroke="${m}" stroke-width="2.6"/>` + L(200, 130, 200, 210, m, 1.4) + `<rect x="92" y="96" width="98" height="40" rx="8" fill="${m}"/><rect x="210" y="96" width="98" height="40" rx="8" fill="none" stroke="${m}" stroke-width="2"/>` + L(70, 210, 70, 240, m, 2.4) + L(330, 210, 330, 240, m, 2.4),
    // 10 the roofs — the moon over the street
    (m) => { let d = 'M0 236 L0 170 L40 170 L40 120 L90 90 L140 120 L140 180 L180 180 L180 110 L230 110 L230 150 L270 150 L270 100 L310 70 L350 100 L350 200 L400 200 L400 236 Z'; return F(d, m) + D(300, 44, 22, m) + L(0, 236, W, 236, m, 1.5) + B(60, 140, 10, 12, '#ffffff', O(0.85)) + B(192, 130, 10, 12, '#ffffff', O(0.85)); },
  ],
};

const KINDS = ['rave', 'club', 'concert', 'festival', 'meetup', 'house'];
// type names from the database → kind
const kindOf = (name) => {
  const n = String(name || '').toLowerCase();
  if (n.includes('rave')) return 'rave';
  if (n.includes('konzert') || n.includes('concert')) return 'concert';
  if (n.includes('festival')) return 'festival';
  if (n.includes('meetup')) return 'meetup';
  if (n.includes('haus') || n.includes('house')) return 'house';
  return 'club';
};
// a night always gets the same design: its kind and a stable id (the slug)
const hash = (s) => Array.from(String(s)).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const pickDesign = (id) => hash(id) % 10;

// ───────────────────────── the card ─────────────────────────
// e: { kind, design, t, d, doors, v, city, crew[], track, artist, photo }
function wrap(t, max) {
  const words = String(t).split(/\s+/), lines = ['']; let i = 0;
  for (const w of words) { if (lines[i] && (lines[i] + ' ' + w).length > max) { if (i === 1) { lines[i] = lines[i].slice(0, max - 1).trimEnd() + '…'; return lines; } lines[++i] = w; } else lines[i] = lines[i] ? lines[i] + ' ' + w : w; }
  return lines;
}
function note(x, y, c) { // a small quaver
  return `<g transform="translate(${x},${y})">${D(4, 14, 4, c)}${L(7.5, 14, 7.5, 0, c, 1.6)}${P('M7.5 0 C11 2 13 5 12 9', c, 1.6)}</g>`;
}

function front(e, i) {
  const kind = KINDS.includes(e.kind) ? e.kind : kindOf(e.kind);
  const design = Number.isInteger(e.design) ? ((e.design % 10) + 10) % 10 : pickDesign(e.id || e.t);
  const sc = SCHEMES[design % 4], bg = sc.bg, fg = sc.fg, m = sc.m;
  const motifs = MOTIFS[kind] && MOTIFS[kind].length ? MOTIFS[kind] : MOTIFS.rave;
  const motif = (motifs[design] || motifs[0])(m, fg, bg);
  const id = 'c' + String(i).replace(/[^a-z0-9]/gi, '');
  const faint = 0.55;
  const crew = Array.isArray(e.crew) ? e.crew.filter(Boolean).slice(0, 6) : [];
  const photo = e.photo ? String(e.photo) : '';
  const titleMax = photo ? 15 : 22;
  const lines = wrap(e.t || '', titleMax);
  const longest = Math.max(...lines.map((l) => l.length));
  // the size follows the room: 344 px wide, 240 next to a photo; ~0.6 em per capital
  const size = Math.max(14, Math.min(32, Math.floor((photo ? 240 : 344) / (0.62 * Math.max(longest, 1)))));
  const title = lines.map((l, k) => `<text x="28" y="${358 + k * (size + 4)}" font-family="${fonts.medium}"${weight()} font-size="${size}" letter-spacing="-0.6" fill="${fg}">${esc(l.toUpperCase())}</text>`).join('');
  const when = [e.d, e.doors ? 'DOORS ' + e.doors : ''].filter(Boolean).join(' · ');
  const where = [e.v, e.city].filter(Boolean).map((s) => String(s).toUpperCase()).join(' · ');
  const yAfter = 358 + (lines.length - 1) * (size + 4);
  // the people who came: initials in squares, only when there were any
  let with_ = '';
  if (crew.length) {
    with_ = `<text x="28" y="472" font-family="${fonts.mono}" font-size="9.5" letter-spacing="2" fill="${fg}" opacity="${faint}">WITH</text>`;
    crew.forEach((c, k) => { const x = 28 + k * 34; with_ += R(x, 480, 28, 28, fg, 1) + `<text x="${x + 14}" y="${499}" text-anchor="middle" font-family="${fonts.regular}" font-size="13" fill="${fg}">${esc(String(c).toUpperCase().slice(0, 2))}</text>`; });
  }
  // the music note: the track when the night has one, else the small motif
  const music = e.track
    ? note(28, 548, m) + `<text x="52" y="561" font-family="${fonts.mono}" font-size="10" letter-spacing="0.6" fill="${fg}">${esc(String(e.track).toUpperCase().slice(0, 30))}</text>` + (e.artist ? `<text x="52" y="575" font-family="${fonts.mono}" font-size="9" letter-spacing="1" fill="${fg}" opacity="${faint}">${esc(String(e.artist).toUpperCase().slice(0, 34))}</text>` : '')
    : `<g opacity="${faint}">${L(28, 556, 110, 556, fg, 1)}${L(28, 562, 110, 562, fg, 1)}${L(28, 568, 110, 568, fg, 1)}</g>` + note(60, 548, m) + note(84, 544, m);
  const img = photo
    ? `<clipPath id="p${id}"><rect x="276" y="336" width="96" height="96"/></clipPath><image href="${esc(photo)}" x="276" y="336" width="96" height="96" preserveAspectRatio="xMidYMid slice" clip-path="url(#p${id})"/>` + R(276, 336, 96, 96, fg, 1)
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600">
  <rect width="400" height="600" fill="${bg}"/>
  <text x="28" y="31" font-family="${fonts.mono}" font-size="10" letter-spacing="3" fill="${fg}">${esc(String(e.ty || kind).toUpperCase())}</text>
  <text x="372" y="31" text-anchor="end" font-family="${fonts.mono}" font-size="10" letter-spacing="3" fill="${fg}" opacity="${faint}">AFTERHOURS</text>
  <clipPath id="w${id}"><rect x="0" y="44" width="400" height="272"/></clipPath>
  <g clip-path="url(#w${id})"><g transform="translate(0,44)">${motif}</g></g>
  ${L(0, 316, 400, 316, fg, 1)}
  ${title}
  <text x="28" y="${yAfter + 26}" font-family="${fonts.mono}" font-size="10.5" letter-spacing="1.6" fill="${fg}">${esc(when)}</text>
  <text x="28" y="${yAfter + 44}" font-family="${fonts.mono}" font-size="9.5" letter-spacing="1.6" fill="${fg}" opacity="${faint}">${esc(where)}</text>
  ${img}
  ${with_}
  ${L(28, 530, 372, 530, fg, 1, O(0.35))}
  ${music}
  <rect x="8" y="8" width="384" height="584" fill="none" stroke="${fg}" stroke-width="1" opacity="0.5"/>
</svg>`;
}

// Twelve nights for the landing strip (two per kind). Not real; the strip only shows what a card is.
const NIGHTS = [
  { kind: 'rave', design: 0, ty: 'RAVE', t: 'Blitz', v: 'MUSEUMSINSEL 1', city: 'MÜNCHEN', d: 'SAT 05.09.26', doors: '23:59', crew: ['L', 'E', 'J', 'M'], track: 'Innerbloom', artist: 'Rüfüs Du Sol' },
  { kind: 'concert', design: 3, ty: 'KONZERT', t: 'A$AP Rocky', v: 'OLYMPIAHALLE', city: 'MÜNCHEN', d: 'FRI 11.09.26', doors: '20:00', crew: ['M'], track: null },
  { kind: 'club', design: 5, ty: 'CLUB NIGHT', t: 'Karaköy Alt Kat', v: 'KARAKÖY', city: 'İSTANBUL', d: 'SAT 19.09.26', doors: '23:00', crew: ['E', 'B', 'S'], track: 'Teardrop', artist: 'Massive Attack' },
  { kind: 'festival', design: 2, ty: 'FESTIVAL', t: 'Elysium', v: 'MAXVORSTADT', city: 'MÜNCHEN', d: 'SAT 12.09.26', doors: '22:00', crew: [], track: null },
  { kind: 'meetup', design: 8, ty: 'MEETUP', t: 'Open Talk', v: 'MUCCA', city: 'MÜNCHEN', d: 'THU 24.09.26', doors: '19:00', crew: ['A', 'N'], track: null },
  { kind: 'house', design: 1, ty: 'HAUSPARTY', t: 'Housewarming', v: 'SCHWABING', city: 'MÜNCHEN', d: 'SAT 03.10.26', doors: '21:00', crew: ['K', 'T', 'Z'], track: 'Jungle', artist: 'Fred again..' },
  { kind: 'rave', design: 6, ty: 'RAVE', t: 'Silo West', v: 'SILO', city: 'MÜNCHEN', d: 'SAT 05.09.26', doors: '14:00', crew: ['B', 'N'], track: null },
  { kind: 'concert', design: 9, ty: 'KONZERT', t: 'Nick Cave', v: 'OLYMPIAPARK', city: 'MÜNCHEN', d: 'SUN 23.08.26', doors: '19:30', crew: [], track: 'Into My Arms', artist: 'Nick Cave' },
  { kind: 'club', design: 7, ty: 'CLUB NIGHT', t: 'Unterwelt', v: 'SUNNY RED', city: 'MÜNCHEN', d: 'FRI 02.10.26', doors: '22:00', crew: ['C', 'Ş', 'A'], track: null },
  { kind: 'festival', design: 9, ty: 'FESTIVAL', t: 'Mondscheinexpress', v: 'BAHNWÄRTER THIEL', city: 'MÜNCHEN', d: 'THU 19.11.26', doors: '21:00', crew: ['I', 'U'], track: null },
  { kind: 'meetup', design: 0, ty: 'MEETUP', t: 'Round Table', v: 'IMPACT HUB', city: 'MÜNCHEN', d: 'WED 30.09.26', doors: '18:30', crew: [], track: null },
  { kind: 'house', design: 4, ty: 'HAUSPARTY', t: 'Up the Stairs', v: 'MAXVORSTADT', city: 'MÜNCHEN', d: 'SAT 10.10.26', doors: '20:00', crew: ['D', 'Y'], track: 'Opus', artist: 'Eric Prydz' },
];

return { front, nights: NIGHTS, kinds: KINDS, kindOf, pickDesign, setFonts, designs: () => KINDS.map((k) => MOTIFS[k].length) };
})();

/* A global const is not written onto window; the pages read it from here. */
window.CARDS = CARDS;
