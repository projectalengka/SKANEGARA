/**
 * Produksi: kenapa hanya 13/55 yang ter-reveal, sementara dev 55/55?
 *
 * Hipotesis yang diuji:
 *   H1. Gerbang terbuka terlalu dini, sebelum semua elemen ada — lalu elemen
 *       yang datang setelahnya tidak pernah di-observe.
 *   H2. Gerbang TIDAK PERNAH terbuka (kunci fiber tidak terdeteksi di
 *       produksi, karena React produksi berbeda dari dev), dan reveal yang
 *       terjadi berasal dari jalur cadangan 800ms yang berjalan sebelum
 *       MutationObserver terpasang.
 *   H3. Observer terpasang, tapi elemen sudah punya `data-revealed` dari
 *       render server sehingga `attach()` melewatinya (tidak mungkin —
 *       server HTML bersih).
 *
 * Cara memisahkannya: catat apakah `start()` benar-benar dipanggil, kapan,
 * dan berapa target yang terlihat saat itu.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

(async () => {
  for (const [label, base] of [
    ['PROD', 'http://127.0.0.1:3000'],
    ['DEV ', 'http://127.0.0.1:3001'],
  ]) {
    const browser = await chromium.launch({ executablePath: CHROME, headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    await page.addInitScript(() => {
      const t0 = performance.now();
      window.__diag = { events: [] };
      const at = () => Number((performance.now() - t0).toFixed(0));

      const targets = () =>
        Array.from(document.querySelectorAll('[data-reveal], [data-image-reveal]'));

      const claimedCount = () => {
        const t = targets();
        return {
          total: t.length,
          claimed: t.filter((e) => Object.keys(e).some((k) => k.startsWith('__reactFiber$'))).length,
        };
      };

      // Pantau: kapan jumlah target berubah, kapan klaim berubah.
      let lastTotal = -1;
      let lastClaimed = -1;
      const poll = () => {
        const c = claimedCount();
        if (c.total !== lastTotal || c.claimed !== lastClaimed) {
          lastTotal = c.total;
          lastClaimed = c.claimed;
          window.__diag.events.push({ at: at(), kind: 'state', ...c });
        }
        requestAnimationFrame(poll);
      };
      requestAnimationFrame(poll);

      const mo = new MutationObserver((rs) => {
        for (const r of rs) {
          if (r.type === 'attributes' && r.attributeName === 'data-revealed') {
            window.__diag.events.push({ at: at(), kind: 'reveal' });
          }
        }
      });
      const go = () => mo.observe(document.documentElement, { attributes: true, subtree: true });
      if (document.documentElement) go();
      else document.addEventListener('readystatechange', go, { once: true });
    });

    await page.goto(base + '/', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(3000);

    const d = await page.evaluate(() => window.__diag);
    console.log(`\n=== ${label} ${base} ===`);
    // Ringkas: state transition terakhir + jumlah reveal per 200ms.
    const states = d.events.filter((e) => e.kind === 'state');
    for (const s of states.slice(-8)) console.log(`   ${String(s.at).padStart(6)}ms state total=${s.total} claimed=${s.claimed}`);
    const reveals = d.events.filter((e) => e.kind === 'reveal');
    console.log(`   reveal writes at load: ${reveals.length}`);
    const after = await page.evaluate(() => {
      const t = Array.from(document.querySelectorAll('[data-reveal], [data-image-reveal]'));
      return {
        total: t.length,
        revealed: t.filter((e) => e.hasAttribute('data-revealed')).length,
        hasJs: document.documentElement.classList.contains('js'),
      };
    });
    console.log(`   at rest: revealed=${after.revealed}/${after.total} js=${after.hasJs}`);
    await browser.close();
  }
})();
