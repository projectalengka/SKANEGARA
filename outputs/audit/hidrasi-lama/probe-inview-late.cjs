/**
 * Apakah elemen in-view yang belum ter-reveal pada 1200ms akhirnya ter-reveal
 * juga, atau memang macet? Sampel di beberapa titik waktu.
 *
 * Catatan: waktu dijaga eksplisit (bukan akumulasi waitForTimeout) supaya label
 * pada output benar-benar sesuai waktu pengukuran.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:3001';

(async () => {
  for (const path of ['/tentang', '/program-keahlian']) {
    const browser = await chromium.launch({ executablePath: CHROME, headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    // Patok waktu di dalam halaman, di samping `load`.
    await page.addInitScript(() => {
      window.__t0 = 0;
      window.addEventListener('load', () => {
        window.__t0 = performance.now();
      });
    });

    await page.goto(BASE + path, { waitUntil: 'load', timeout: 60000 });

    const marks = [300, 700, 1200, 2000, 3500];
    let prev = 0;
    for (const mark of marks) {
      await page.waitForTimeout(mark - prev);
      prev = mark;
      const r = await page.evaluate((target) => {
        const since = Math.round(performance.now() - (window.__t0 || 0));
        const all = Array.from(document.querySelectorAll('[data-reveal], [data-image-reveal]'));
        const inView = all.filter((e) => {
          const b = e.getBoundingClientRect();
          return b.top < window.innerHeight && b.bottom > 0;
        });
        return {
          since,
          inView: inView.length,
          revealed: inView.filter((e) => e.hasAttribute('data-revealed')).length,
          pending: inView
            .filter((e) => !e.hasAttribute('data-revealed'))
            .map((e) => String(e.className).slice(0, 40)),
          target,
        };
      }, mark);
      console.log(
        `${path.padEnd(18)} marked=${String(mark).padStart(4)}ms actual=${String(r.since).padStart(5)}ms  revealed=${r.revealed}/${r.inView}  pending=${JSON.stringify(r.pending)}`,
      );
    }
    await browser.close();
  }
})();
