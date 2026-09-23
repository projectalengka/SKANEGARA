/**
 * Judul hero di 1440px — pembuktian bahwa skala benar-benar fluid.
 *
 * Sebelum perbaikan koefisien, hero dirender 47px di SEMUA lebar: suku pilihan
 * hanya mencapai ~50px di 1440px, jadi clamp menempel di lantai. Tangkapan ini
 * menunjukkan apakah ia sekarang benar-benar tumbuh ke 104px.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.argv[2] || 'http://127.0.0.1:3000';
const OUT = 'outputs/audit';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });

  for (const width of [768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    await page.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(1500);

    const el = await page.$('.hero-editorial__title');
    const px = await page.evaluate(() =>
      parseFloat(getComputedStyle(document.querySelector('.hero-editorial__title')).fontSize),
    );

    await el.screenshot({ path: `${OUT}/hero-desktop-${width}.png` });

    /* Seluruh bagian hero, untuk menilai proporsinya dalam konteks. */
    const copy = await page.$('.hero-editorial__copy');
    if (copy) await copy.screenshot({ path: `${OUT}/hero-copy-${width}.png` });

    console.log(`  ${width}px -> h1 = ${px}px   ${OUT}/hero-desktop-${width}.png`);

    await page.close();
  }

  await browser.close();
})();
