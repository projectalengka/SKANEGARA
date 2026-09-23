/**
 * Uji pemisah yang tegas: apakah warning ini benar-benar berasal dari halaman
 * yang sedang dimuat, atau diputar ulang oleh overlay Next dari konteks lain?
 *
 * Caranya: matikan JavaScript. Tanpa JS tidak ada hidrasi, jadi tidak mungkin
 * ada mismatch yang nyata. Kalau warning tetap muncul, sumbernya bukan halaman
 * ini.
 *
 * Kedua: bandingkan `page.on('console')` dengan panggilan `console.error`
 * yang ditangkap langsung di dalam halaman. Overlay Next memutar ulang lewat
 * jembatan yang berbeda dari console.error asli.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:3001';

async function run(label, opts) {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    javaScriptEnabled: opts.js !== false,
  });
  const page = await context.newPage();

  await page.addInitScript(() => {
    window.__caught = 0;
    const orig = console.error;
    console.error = function (...a) {
      const t = a.map((x) => (typeof x === 'string' ? x : '')).join(' ');
      if (/hydrated but some attributes/i.test(t)) window.__caught++;
      return orig.apply(this, a);
    };
  }).catch(() => {});

  const captured = [];
  page.on('console', (m) => {
    if (/hydrated but some attributes/i.test(m.text())) captured.push(m.text().slice(0, 80));
  });

  await page.goto(BASE + opts.path, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(opts.wait ?? 4000);

  let inPage = 'n/a (no js)';
  if (opts.js !== false) {
    inPage = await page.evaluate(() => window.__caught);
  }
  const revealed = await page
    .evaluate(() => document.querySelectorAll('[data-revealed]').length)
    .catch(() => 'n/a');

  console.log(
    `${label.padEnd(28)} playwright-console=${captured.length}  in-page-console.error=${inPage}  data-revealed=${revealed}`,
  );
  await browser.close();
}

(async () => {
  await run('kegiatan js=off', { path: '/kegiatan', js: false, wait: 2500 });
  await run('kegiatan js=on', { path: '/kegiatan' });
  await run('kegiatan js=on (2nd)', { path: '/kegiatan' });
  await run('galeri js=on', { path: '/galeri' });
  await run('tentang js=on', { path: '/tentang' });
})();
