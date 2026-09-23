/**
 * Uji akhir terhadap build PRODUKSI.
 *
 * Yang diperbaiki adalah error overlay dev, jadi mudah lupa memeriksa bahwa
 * produksi juga bersih — dan produksi adalah yang dipakai murid. Dev dan
 * produksi memuat bundle dengan cara berbeda (HMR, dua kali mount di StrictMode
 * dev), jadi keduanya harus diuji.
 *
 * Dua hal yang diperiksa:
 *   1. Tidak ada warning hidrasi di konsol.
 *   2. Semua elemen ter-reveal setelah digulir penuh — tidak ada yang macet
 *      tersembunyi, yang justru risiko utama perubahan ini.
 *
 * Ditambah: console error apa pun yang bukan warning hidrasi tetap dilaporkan,
 * karena "nol warning hidrasi" tidak sama dengan "nol masalah".
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.argv[2] || 'http://127.0.0.1:3000';
const PAGES = [
  '/',
  '/tentang',
  '/program-keahlian',
  '/kegiatan',
  '/karya',
  '/galeri',
  '/berita',
  '/kontak',
  '/privasi',
];

(async () => {
  let hydrateWarn = 0;
  let otherErrors = 0;
  let stuckTotal = 0;

  for (const path of PAGES) {
    const browser = await chromium.launch({ executablePath: CHROME, headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    let h = 0;
    const others = [];
    page.on('console', (m) => {
      const t = m.text();
      if (m.type() !== 'error') return;
      if (/hydrated but some attributes/i.test(t)) h++;
      else others.push(t);
    });
    page.on('pageerror', (e) => others.push('pageerror: ' + e.message));

    await page.goto(BASE + path, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(1200);

    const height = await page.evaluate(() => document.body.scrollHeight);
    const steps = Math.ceil(height / 600) + 6;
    for (let i = 0; i < steps; i++) {
      await page.mouse.wheel(0, 600);
      await page.waitForTimeout(65);
    }
    await page.waitForTimeout(1800);

    const r = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('[data-reveal], [data-image-reveal]'));
      const notRevealed = all.filter((e) => !e.hasAttribute('data-revealed'));
      return {
        total: all.length,
        revealed: all.length - notRevealed.length,
        stuck: notRevealed.map((e) => String(e.className).slice(0, 45)),
        brokenImgs: Array.from(document.images).filter(
          (i) => i.complete && i.naturalWidth === 0,
        ).length,
      };
    });

    const stuck = r.total - r.revealed;
    const ok = h === 0 && stuck === 0 && r.brokenImgs === 0;
    console.log(
      `${ok ? 'OK  ' : 'FAIL'} ${BASE}${path}`.padEnd(46) +
        ` hydrateWarn=${h} revealed=${r.revealed}/${r.total} brokenImgs=${r.brokenImgs}`,
    );
    if (stuck) console.log(`       stuck: ${JSON.stringify(r.stuck)}`);
    others.slice(0, 3).forEach((e) => console.log(`       err: ${e.slice(0, 150)}`));

    hydrateWarn += h;
    otherErrors += others.length;
    stuckTotal += stuck;
    await browser.close();
  }

  console.log(`\n=== ${BASE} ===`);
  console.log(`hydration warnings : ${hydrateWarn}`);
  console.log(`other console errs : ${otherErrors}`);
  console.log(`elements stuck hidden: ${stuckTotal}`);
})();
