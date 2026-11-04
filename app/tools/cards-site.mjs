// afterhours — the site's copy of the card generator.
// app/src/content/cardsgen.js is the one source; this writes cards.js at the repo root
// (a classic script: window.CARDS instead of export default). Run after every change:
//   node app/tools/cards-site.mjs
import { readFile, writeFile } from 'node:fs/promises';
const src = new URL('../src/content/cardsgen.js', import.meta.url);
const out = new URL('../../cards.js', import.meta.url);
let s = await readFile(src, 'utf8');
s = '/* GENERATED from app/src/content/cardsgen.js by app/tools/cards-site.mjs — do not edit here. */\n' + s;
if (!/\nexport default CARDS;\s*$/.test(s)) throw new Error('cardsgen.js: expected "export default CARDS;" at the end');
s = s.replace(/\nexport default CARDS;\s*$/, '\n/* A global const is not written onto window; the pages read it from here. */\nwindow.CARDS = CARDS;\n');
await writeFile(out, s);
console.log('cards.js written');
