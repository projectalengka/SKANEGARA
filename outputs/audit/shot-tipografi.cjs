/**
 * Tangkap layar hierarki tipografi: section penuh DAN close-up.
 *
 * Catatan proyek: tangkapan layar section selebar penuh menyembunyikan
 * artefak. Jadi setiap halaman diambil dua kali — sekali utuh untuk melihat
 * proporsi, sekali close-up pada elemen hero untuk melihat hurufnya.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');
const path = require('node:path');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.argv[2] || 'http://127.0.0.1:3000';
const OUT = path.resolve(__dirname, '..', 'grafik');

const PAGES = [
  ['beranda', '/'],
  ['tentang', '/tentang'],
  ['program', '/program-keahlian'],
  ['kegiatan', '/kegiatan'],
  ['karya', '/karya'],
];

(async () => {
  const fs = require('node:fs');
  fs.mkdirSync(OUT, { recursive: true });

  for (const [name, url] of PAGES) {
    for (const width of [390, 1440]) {
      const browser = await chromium.launch({ executablePath: CHROME, headless: true });
      const page = await browser.newPage({
        viewport: { width, height: 900 },
        deviceScaleFactor: 2,
      });
      await page.addInitScript(() => {
        try { localStorage.setItem('skagara:reduce-motion', '1'); } catch {}
      });
      await page.goto(BASE + url, { waitUntil: 'load', timeout: 60000 });
      await page.waitForTimeout(900);

      /* Tutup overlay gerak kalau ada. */
      await page.evaluate(() => {
        document.querySelectorAll('[data-reveal]').forEach((e) => {
          e.setAttribute('data-revealed', '');
          e.style.opacity = '1';
          e.style.transform = 'none';
        });
      });
      await page.waitForTimeout(250);

      const full = path.join(OUT, `tipografi-${name}-${width}.png`);
      await page.screenshot({ path: full, fullPage: true });

      /* Close-up hero: yang mengungkap apakah hurufnya benar-benar bagus,
         bukan cuma apakah ukurannya proporsional. */
      const hero = await page.$('h1');
      if (hero) {
        const close = path.join(OUT, `tipografi-${name}-hero-${width}.png`);
        await hero.screenshot({ path: close });
        console.log(`  ${name}@${width}: hero close-up ok`);
      }
      console.log(`  ${name}@${width}: ${full.replace(__dirname, '')}`);
      await browser.close();
    }
  }
})();
