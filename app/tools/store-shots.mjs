// Store screenshots from the PWA build: 1080×2340 (a 360×780 phone at 3×), every screen
// in en · de · tr, into store/shots/<lang>-<screen>.png. It serves the web export itself
// and drives the Chrome already on the machine (playwright-core: no browser download).
//
//   npm run shots                    export, then shoot against the live project
//   npm run shots -- --offline       nothing leaves the machine (the night agent's way)
//   npm run shots -- --profile DIR   a Chrome profile signed in once (people, messages, account)
//   CHROME=/path/to/chrome           when Chrome is not the installed Google Chrome
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const app = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const offline = args.includes('--offline');
const profile = args.includes('--profile') ? args[args.indexOf('--profile') + 1] : null;

// screen → route. Without data (--offline) only welcome shows the real thing.
const SCREENS = offline
  ? { welcome: '/' }
  : { welcome: '/', flow: '/flow', map: '/map', people: '/people', messages: '/messages', account: '/account' };
const LANGS = ['en', 'de', 'tr'];
const PORT = 4398;

const dist = mkdtempSync(join(tmpdir(), 'afterhours-web-'));
execFileSync('npx', ['expo', 'export', '-p', 'web', '--output-dir', dist], { cwd: app, stdio: 'inherit' });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
const server = createServer((req, res) => {
  const path = decodeURIComponent((req.url || '/').split('?')[0]);
  const candidates = [join(dist, path), join(dist, path, 'index.html'), join(dist, path + '.html'), join(dist, 'index.html')];
  const file = candidates.find((f) => existsSync(f) && statSync(f).isFile());
  res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(PORT);

const launch = process.env.CHROME ? { executablePath: process.env.CHROME } : { channel: 'chrome' };
const phone = { viewport: { width: 360, height: 780 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };
const out = join(app, 'store', 'shots');
mkdirSync(out, { recursive: true });

for (const lang of LANGS) {
  // the language the app reads first is the device's choice; a fresh browser has none, so locale decides
  const context = profile
    ? await chromium.launchPersistentContext(profile, { ...launch, ...phone, locale: lang })
    : await (await chromium.launch(launch)).newContext({ ...phone, locale: lang });
  if (offline) await context.route(/^https?:\/\/(?!localhost:4398)/, (route) => route.abort());
  const page = await context.newPage();
  for (const [name, route] of Object.entries(SCREENS)) {
    await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'load' });
    await page.waitForTimeout(4000); // fonts, photos and the first animation
    const file = join(out, `${lang}-${name}.png`);
    await page.screenshot({ path: file });
    console.log('  ' + file.slice(app.length));
  }
  await context.close();
  await context.browser()?.close();
}
server.close();
