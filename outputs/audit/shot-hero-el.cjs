/**
 * Tangkapan langsung elemen judul hero, memakai elementHandle.screenshot()
 * alih-alih clip manual. Versi clip manual menghasilkan gambar kosong, jadi
 * cara itu yang dicurigai salah — bukan halamannya.
 *
 * Ditambah satu tangkapan area hero yang lebih luas supaya konteksnya terlihat.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.argv[2] || 'http://127.0.0.1:3000';
const OUT = 'outputs/audit';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });

  for (const width of [320, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 2 });
    await page.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(2500);

    const el = await page.$('.hero-editorial__title');
    await el.screenshot({ path: `${OUT}/hero-el-${width}.png` });

    /* Area hero penuh, supaya terlihat hubungan judul dengan sekitarnya. */
    const hero = await page.$('.hero-editorial__copy');
    if (hero) await hero.screenshot({ path: `${OUT}/hero-copy-${width}.png` });

    const b = await el.boundingBox();
    console.log(`  ${OUT}/hero-el-${width}.png   elemen ${Math.round(b.width)}×${Math.round(b.height)} css px @2x`);

    await page.close();
  }

  await browser.close();
})();
