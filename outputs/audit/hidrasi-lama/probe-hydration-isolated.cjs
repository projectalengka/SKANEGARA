/**
 * Apakah peringatan itu milik halaman ini, atau diputar ulang dari kunjungan
 * sebelumnya oleh overlay dev?
 *
 * Dua probe sebelumnya memberi jawaban berbeda (`/tentang` melaporkan 1 vs 0)
 * padahal menunjuk server yang sama. Bedanya: satu memakai `newContext()` per
 * halaman dalam SATU browser, yang lain satu konteks. Overlay Next menyimpan
 * daftar galat dan memutarnya kembali lintas navigasi — jadi jumlahnya bisa
 * berasal dari kunjungan lain.
 *
 * Uji ini membuka SATU halaman saja, di browser yang benar-benar baru, tanpa
 * navigasi lain apa pun. Itu satu-satunya cara memastikan peringatannya milik
 * halaman tersebut.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:3001';

const PAGES = ['/kegiatan', '/galeri'];

(async () => {
  for (const path of PAGES) {
    // A brand-new browser per page: no shared overlay state, no replay.
    const browser = await chromium.launch({ executablePath: CHROME, headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    const warnings = [];
    page.on('console', (m) => {
      if (/hydrated but some attributes/i.test(m.text())) warnings.push(m.text());
    });

    await page.goto(BASE + path, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(3500);

    console.log(`${warnings.length === 0 ? 'OK  ' : 'FAIL'} ${path.padEnd(20)} warnings=${warnings.length}`);
    if (warnings.length) {
      const w = warnings[0];
      const diff = w.split('\n').filter((l) => /^\s*[+-]\s+\S/.test(l));
      console.log('    diff lines:');
      for (const d of diff) console.log('    ' + d.trim());
    }

    await browser.close();
  }
})();

// Additionally print only the +/- diff lines, which is what identifies the fix.
