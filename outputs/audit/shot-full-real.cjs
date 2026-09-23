/**
 * Full-page screenshot with a REAL scroll.
 *
 * `shot-full.cjs` uses `window.scrollTo`, which does nothing on a Lenis page —
 * so lazy images never enter the viewport and reveals never fire, and the
 * screenshot shows an empty page that is not actually empty. That was measured
 * once already (18 "broken" images that were simply never requested).
 *
 * This uses real wheel events, then returns to the top with wheel too.
 *
 * Usage: node outputs/audit/shot-full-real.cjs <baseUrl> <prefix> <route> [width]
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const BASE = process.argv[2] ?? 'http://127.0.0.1:3000';
const PREFIX = process.argv[3] ?? 'final';
const ROUTE = process.argv[4] ?? '/';
const WIDTH = Number(process.argv[5] ?? 1440);

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });
  const page = await browser.newPage({ viewport: { width: WIDTH, height: 1000 } });

  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'load', timeout: 60000 });

  // Tunggu sampai halaman tenang SEBELUM menggulir. Menggulir saat Lenis masih
  // menginisialisasi dan gerbang reveal belum terbuka membuat sebagian besar
  // elemen terlewat — itu menghasilkan laporan "13/55" yang terlihat seperti
  // regresi padahal bukan. `probe-scroll-speed.cjs` membuktikannya 55/55 pada
  // keempat kecepatan gulir begitu jeda ini ada.
  await page.waitForTimeout(1500);

  // Gulir dengan roda mouse: satu-satunya cara yang bekerja pada Lenis.
  const height = await page.evaluate(() => document.body.scrollHeight);
  const steps = Math.ceil(height / 600) + 6;
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(65);
  }
  await page.waitForTimeout(1600);

  // Kembali ke atas dengan roda juga, supaya Lenis benar-benar menggulir.
  for (let i = 0; i < steps + 4; i++) {
    await page.mouse.wheel(0, -600);
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(900);

  const slug = ROUTE === '/' ? 'home' : ROUTE.replace(/^\//, '').replace(/\//g, '_');
  // Animasi reveal berjalan 1.1–1.4 detik. `animations: 'disabled'` akan
  // membekukan transisi di tengah, jadi biarkan selesai dan tunggu.
  await page.screenshot({
    path: `outputs/audit/${PREFIX}-${slug}-${WIDTH}.png`,
    fullPage: true,
  });

  const report = await page.evaluate(() => {
    const targets = Array.from(document.querySelectorAll('[data-reveal], [data-image-reveal]'));
    const broken = Array.from(document.images)
      .filter((i) => i.complete && i.naturalWidth === 0)
      .map((i) => i.currentSrc || i.src);
    const pending = targets
      .filter((e) => !e.hasAttribute('data-revealed'))
      .map((e) => String(e.className).slice(0, 45));
    const lowOpacity = targets
      .filter((e) => parseFloat(getComputedStyle(e).opacity) < 0.9)
      .map((e) => `${String(e.className).slice(0, 35)} opacity=${getComputedStyle(e).opacity}`);
    return { total: targets.length, revealed: targets.length - pending.length, pending, broken, lowOpacity };
  });

  console.log(`${ROUTE} @${WIDTH}`);
  console.log(`  console errors : ${errors.length}`);
  errors.slice(0, 5).forEach((e) => console.log(`    - ${e.slice(0, 170)}`));
  console.log(`  revealed       : ${report.revealed}/${report.total}`);
  if (report.pending.length) console.log(`  still hidden   : ${JSON.stringify(report.pending)}`);
  if (report.lowOpacity.length) console.log(`  low opacity    : ${JSON.stringify(report.lowOpacity)}`);
  console.log(`  broken images  : ${report.broken.length}`);
  report.broken.slice(0, 5).forEach((s) => console.log(`    - ${s}`));

  await browser.close();
})();
