// Builds the intro film: tools/film/film.html (readable source) → assets/film/film.html
// (one file, offline). {{img:name}} becomes a base64 JPEG resized with sips (macOS),
// {{font:name}} a base64 woff2 from the site's fonts folder. `npm run film` in app/.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = fileURLToPath(new URL('..', import.meta.url));
const repo = join(app, '..');

// name → [file under app/, longest side in px, jpeg quality]
const IMAGES = {
  concert: ['assets/intro/concert.jpg', 720, 62],
  e1: ['assets/feed/e1.jpg', 640, 60],
  h1: ['assets/feed/h1.jpg', 640, 60],
  r2: ['assets/feed/r2.jpg', 640, 60],
  t3: ['assets/feed/t3.jpg', 640, 60],
  a2: ['assets/feed/a2.jpg', 480, 60],
  f3: ['assets/feed/f3.jpg', 480, 60],
  hike: ['assets/sparks/hike.jpg', 640, 60],
  grill: ['assets/sparks/grill.jpg', 480, 60],
  dilan: ['assets/djs/dilan-k.jpg', 160, 70],
  ines: ['assets/djs/ines-okur.jpg', 160, 70],
  levent: ['assets/djs/levent-ok.jpg', 160, 70],
  mara: ['assets/djs/mara-volt.jpg', 160, 70],
  selin: ['assets/djs/selin.jpg', 160, 70],
};
// name → file under the repo's fonts/
const FONTS = {
  logo: 'fonts/ArchivoLogo.woff2',
  sans400: 'fonts/InterTight-400-latin.woff2',
  sans400x: 'fonts/InterTight-400-latin-ext.woff2',
  sans500: 'fonts/InterTight-500-latin.woff2',
  sans500x: 'fonts/InterTight-500-latin-ext.woff2',
  mono: 'fonts/JetBrainsMono-400-latin.woff2',
};

const tmp = mkdtempSync(join(tmpdir(), 'film-'));
const b64 = (p) => readFileSync(p).toString('base64');
const image = (name) => {
  const [file, size, q] = IMAGES[name];
  const out = join(tmp, `${name}.jpg`);
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', String(q), '-Z', String(size), join(app, file), '--out', out], { stdio: 'ignore' });
  return `data:image/jpeg;base64,${b64(out)}`;
};
const font = (name) => `data:font/woff2;base64,${b64(join(repo, FONTS[name]))}`;

let html = readFileSync(join(app, 'tools/film/film.html'), 'utf8');
const missing = [];
html = html.replace(/\{\{(img|font):([\w-]+)\}\}/g, (m, kind, name) => {
  const table = kind === 'img' ? IMAGES : FONTS;
  if (!table[name]) {
    missing.push(m);
    return m;
  }
  return kind === 'img' ? image(name) : font(name);
});
if (missing.length) {
  console.error('unknown:', [...new Set(missing)].join(' '));
  process.exit(1);
}
const out = join(app, 'assets/film/film.html');
writeFileSync(out, html);
console.log(`assets/film/film.html · ${(statSync(out).size / 1024).toFixed(0)} kB`);
