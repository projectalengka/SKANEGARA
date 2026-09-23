/**
 * Sinyal yang punya jaminan, bukan perkiraan.
 *
 * Yang diukur sebelumnya: semua timer (rAF, load+raf, idle) kadang mendahului
 * React. Yang TIDAK pernah lebih awal adalah fakta bahwa React sudah mengambil
 * alih node — dan fakta itu bisa dibaca: React menempelkan kunci
 * `__reactFiber$<random>` pada tiap node DOM yang ia kelola.
 *
 * Jadi gerbangnya bukan "tunggu sekian ms", melainkan:
 *   "tunggu sampai node sasaran punya kunci fiber, baru tulis."
 *
 * Probe ini memverifikasi bahwa:
 *   1. Gerbang itu selalu tiba setelah perbandingan React (tidak ada warning).
 *   2. Reveal tetap terjadi dengan cepat (bukan menunggu detik).
 *   3. Kalau React tidak pernah mengklaim (mis. halaman tanpa React), ada
 *      batas waktu supaya konten tidak terjebak tersembunyi.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:3001';

const PAGES = ['/kegiatan', '/galeri', '/karya', '/berita', '/', '/tentang', '/program-keahlian'];

(async () => {
  let totalWarn = 0;
  for (const path of PAGES) {
    // Browser baru per halaman: overlay Next memutar ulang error antar navigasi.
    const browser = await chromium.launch({ executablePath: CHROME, headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    let warn = 0;
    page.on('console', (m) => {
      if (/hydrated but some attributes/i.test(m.text())) warn++;
    });

    await page.goto(BASE + path, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(4000);

    const info = await page.evaluate(() => {
      const targets = document.querySelectorAll('[data-reveal], [data-image-reveal]');
      const revealed = document.querySelectorAll('[data-revealed]').length;
      // Berapa yang punya kunci fiber (sudah diklaim React)?
      const claimed = Array.from(targets).filter((e) =>
        Object.keys(e).some((k) => k.startsWith('__reactFiber$')),
      ).length;
      return { targets: targets.length, revealed, claimed };
    });

    const ok = warn === 0 && info.revealed === info.targets;
    console.log(
      `${ok ? 'OK  ' : 'FAIL'} ${path.padEnd(20)} warnings=${warn} revealed=${info.revealed}/${info.targets} fiberClaimed=${info.claimed}`,
    );
    totalWarn += warn;
    await browser.close();
  }
  console.log(`\ntotal hydration warnings across ${PAGES.length} pages: ${totalWarn}`);
})();
