/**
 * Space Invaders Mouse — CDP smoke tests
 * Run: node loops/cdp/test.mjs
 * Requires: npx playwright install chromium
 */
import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(DIR, '..', '..');
const PORT = 8767;
const BASE = `http://localhost:${PORT}`;

const MODES = [
  { name: 'move', path: '/game.html?mode=move', hint: '自動射' },
  { name: 'left',  path: '/game.html?mode=left',  hint: '左掣射' },
  { name: 'right', path: '/game.html?mode=right', hint: '右掣射' },
];

let server;
async function startServer() {
  const http = await import('http');
  const fs = await import('fs');
  const mime = { '.html': 'text/html', '.js': 'application/javascript' };
  server = http.createServer((req, res) => {
    const file = path.join(ROOT, req.url.split('?')[0]);
    try {
      const data = fs.readFileSync(file);
      const ext = path.extname(file);
      res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain' });
      res.end(data);
    } catch {
      res.writeHead(404); res.end('Not found');
    }
  });
  await new Promise(r => server.listen(PORT, r));
  console.log(`Server listening on ${BASE}`);
}

async function stopServer() {
  if (server) server.close();
}

async function smokeTest(name, path, check) {
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH ||
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') {
    // filter expected: external logo URL unreachable in local test
    const t = msg.text();
    if (t.includes('puichi.edu.hk') || t.includes('net::ERR_')) return;
    errors.push(t);
  }});
  page.on('pageerror', err => errors.push('[pageerror] ' + err.message));

  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200); // let game init + 1st frame

  const result = await check(page);

  await browser.close();
  return { name, errors, ...result };
}

async function main() {
  await startServer();
  const results = [];

  // ── index ──
  console.log('\n[1/4] index.html');
  results.push(await smokeTest('index', '/index.html', async (page) => {
    const who = await page.locator('.who-btn').count();
    const modes = await page.locator('.mode').count();
    const logo = await page.locator('#logo').getAttribute('src');
    return { pass: who > 0 && modes === 3 && logo, detail: `who-btns=${who} mode-cards=${modes} logo=${logo}` };
  }));

  // ── 3 game modes ──
  for (const m of MODES) {
    console.log(`[${MODES.indexOf(m) + 2}/4] ${m.name} mode`);
    results.push(await smokeTest(m.name, m.path, async (page) => {
      const stage = await page.locator('#stage').count();
      const hud = await page.locator('#scoreLab').textContent();
      const wave = await page.locator('#waveLab').textContent();
      const aliens = await page.locator('.alien').count();
      const ship = await page.locator('.ship').count();
      return {
        pass: stage === 1 && hud !== null && aliens > 0 && ship === 1,
        detail: `stage=${stage} hud=${hud} wave=${wave} aliens=${aliens} ship=${ship}`
      };
    }));
  }

  await stopServer();

  // ── report ──
  console.log('\n=== RESULTS ===');
  let all = true;
  for (const r of results) {
    const ok = r.pass && r.errors.length === 0;
    all = all && ok;
    const icon = ok ? '✅' : '❌';
    console.log(`${icon} ${r.name}: ${r.detail}`);
    if (r.errors.length) r.errors.forEach(e => console.log(`   ERROR: ${e}`));
  }
  console.log('\n' + (all ? '✅ ALL PASS' : '❌ SOME FAIL'));
  process.exit(all ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
