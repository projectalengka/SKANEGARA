/**
 * Cari peringatan hidrasi di mode pengembangan.
 *
 * Overlay yang dilaporkan pemilik berasal dari dev mode. Di produksi React
 * hanya diam (ia memilih markup klien dan menyerah); di dev ia menyebutkan
 * atribut mana yang berbeda. Jadi dev mode adalah tempat menanyakannya.
 *
 * Tiap rute dibuka di konteks browser baru supaya peringatan tidak tercampur.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:3001';

const PAGES = ['/', '/tentang', '/program-keahlian', '/berita', '/kegiatan', '/karya', '/galeri', '/kontak', '/privasi', '/admin/masuk'];

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });

  for (const path of PAGES) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const logs = [];
    page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
    page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

    await page.goto(BASE + path, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(4000);

    const hits = logs.filter((l) =>
      /hydrat|did not match|didn't match|Text content does not match|server rendered HTML|tree hydrated/i.test(l),
    );

    console.log(`\n########## ${path} ##########`);
    if (!hits.length) {
      console.log('  (bersih)');
    } else {
      for (const h of hits) console.log(h.slice(0, 2500));
    }

    await context.close();
  }

  await browser.close();
})();
