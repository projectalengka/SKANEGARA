/**
 * Tangkap peringatan hidrasi selengkapnya, bukan hanya ringkasannya.
 *
 * Overlay Next hanya menampilkan pesan umum. Yang menentukan letak masalahnya
 * adalah pesan konsol penuh (React menyebutkan atribut mana yang berbeda) dan
 * elemen yang ditandai. Jadi di sini: kumpulkan seluruh konsol, buka overlay,
 * dan catat juga markup server vs klien untuk elemen yang dicurigai.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:3000';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const logs = [];
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack || ''}`));

  for (const path of ['/', '/tentang', '/program-keahlian', '/berita', '/kegiatan', '/karya', '/galeri', '/kontak', '/privasi', '/admin/masuk']) {
    logs.length = 0;
    await page.goto(BASE + path, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(2500);

    const relevant = logs.filter(
      (l) =>
        /hydrat|did not match|didn't match|Warning:|Text content does not match|server rendered HTML/i.test(l),
    );

    console.log(`\n########## ${path} ##########`);
    if (!relevant.length) {
      console.log('  (tidak ada peringatan hidrasi)');
    } else {
      for (const r of relevant) console.log(`  ${r.slice(0, 1200)}`);
    }
  }

  await browser.close();
})();
