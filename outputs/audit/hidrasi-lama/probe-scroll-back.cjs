/**
 * Membuktikan bahwa `13/55` tadi adalah artefak SKRIP, bukan bug situs.
 *
 * Bedanya dengan `probe-scroll-speed.cjs` (yang menghasilkan 55/55): skrip
 * screenshot menggulir ke bawah lalu KEMBALI KE ATAS dengan roda, lalu
 * mengambil sampel. Kandidat penyebab:
 *
 *   a. Gulir balik ke atas dengan `wheel` pada Lenis memicu re-render atau
 *      menggulingkan terlalu jauh dalam satu langkah besar (-900px), sehingga
 *      sebagian elemen terlewat sama sekali.
 *   b. Lenis "membalik" scroll position sehingga observer tidak pernah melihat
 *      elemen itu.
 *
 * Uji ini membandingkan tiga perlakuan dan melaporkan jumlah yang ter-reveal
 * di tiap titik.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.argv[2] || 'http://127.0.0.1:3000';

const count = () => {
  const t = Array.from(document.querySelectorAll('[data-reveal], [data-image-reveal]'));
  return { total: t.length, revealed: t.filter((e) => e.hasAttribute('data-revealed')).length };
};

async function scenario(label, actions) {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1500);
  const height = await page.evaluate(() => document.body.scrollHeight);
  const steps = Math.ceil(height / 600) + 6;

  await actions(page, steps);

  const r = await page.evaluate(count);
  const y = await page.evaluate(() => Math.round(window.scrollY));
  console.log(`${label.padEnd(34)} revealed=${r.revealed}/${r.total} scrollY=${y}`);
  await browser.close();
}

(async () => {
  await scenario('A. down only (600/65)', async (page, steps) => {
    for (let i = 0; i < steps; i++) {
      await page.mouse.wheel(0, 600);
      await page.waitForTimeout(65);
    }
    await page.waitForTimeout(1800);
  });

  await scenario('B. down then up -900 (65ms)', async (page, steps) => {
    for (let i = 0; i < steps; i++) {
      await page.mouse.wheel(0, 600);
      await page.waitForTimeout(65);
    }
    await page.waitForTimeout(1600);
    for (let i = 0; i < steps + 4; i++) {
      await page.mouse.wheel(0, -900);
      await page.waitForTimeout(40);
    }
    await page.waitForTimeout(900);
  });

  await scenario('C. down then up -600 (80ms)', async (page, steps) => {
    for (let i = 0; i < steps; i++) {
      await page.mouse.wheel(0, 600);
      await page.waitForTimeout(65);
    }
    await page.waitForTimeout(1600);
    for (let i = 0; i < steps + 4; i++) {
      await page.mouse.wheel(0, -600);
      await page.waitForTimeout(80);
    }
    await page.waitForTimeout(900);
  });
})();
