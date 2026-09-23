/**
 * Tangkapan layar penuh DAN close-up, sesuai aturan di SOUL.md.
 *
 * Layar penuh menyembunyikan artefak; close-up elemen yang wajib. Karena itu
 * setiap halaman diambil dua kali: seluruh halaman, lalu satu elemen
 * representatif pada ukuran aslinya.
 *
 * Gambar diambil setelah animasi mengendap, bukan setelah `load` — kalau tidak,
 * yang tertangkap adalah keadaan awal reveal, bukan yang dilihat pengunjung.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');
const fs = require('node:fs');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:3000';
const OUT = 'outputs/audit';

const SHOTS = [
  ['/', 'home', 'main section:first-of-type'],
  ['/program-keahlian', 'program', 'section'],
  ['/karya', 'karya', 'main section:nth-of-type(2)'],
  ['/galeri', 'galeri', 'main section:nth-of-type(2)'],
];

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });

  for (const [path, name, selector] of SHOTS) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(BASE + path, { waitUntil: 'load', timeout: 30000 });

    // Scroll through so reveals fire and lazy images load.
    for (let i = 0; i < 70; i += 1) {
      await page.mouse.wheel(0, 900);
      await page.waitForTimeout(50);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(2000);

    await page.screenshot({ path: `${OUT}/final2-${name}-full-1440.png`, fullPage: true });

    const el = page.locator(selector).first();
    if (await el.count()) {
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1400);
      await el.screenshot({ path: `${OUT}/final2-${name}-detail-1440.png` });
      console.log(`shot ${name}: full + detail`);
    } else {
      console.log(`shot ${name}: full only (selector not found: ${selector})`);
    }

    await page.close();
  }

  await browser.close();
  const made = fs.readdirSync(OUT).filter((f) => f.startsWith('final2-'));
  console.log(`\nfiles: ${made.length}`);
})();
