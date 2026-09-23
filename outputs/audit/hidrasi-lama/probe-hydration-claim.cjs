/**
 * Mengukur apakah ada sinyal yang punya JAMINAN berada setelah React selesai
 * membandingkan pohon halaman — bukan sekadar kebetulan.
 *
 * Kandidat yang diuji:
 *   - rAF x2 sesudah useEffect           (dipakai sekarang)
 *   - setTimeout(0) x2
 *   - MessageChannel (macrotask, sama seperti rAF tapi tanpa kaitan frame)
 *   - sebuah komponen klien DI DALAM halaman, useEffect-nya
 *
 * Untuk setiap kandidat dilaporkan: apakah ia dieksekusi SEBELUM atau SESUDAH
 * commit React yang menghidrasi <main>. Commit itu dikenali dengan memeriksa
 * apakah elemen [data-image-reveal] sudah "milik" fiber (React menempelkan
 * `__reactFiber$…` pada node DOM yang ia kelola).
 *
 * Kalau elemen sudah punya kunci `__reactFiber$`, React sudah mengambil alih
 * node itu — artinya perbandingan hidrasi untuk node itu sudah lewat.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:3001';

(async () => {
  for (let run = 1; run <= 3; run++) {
    const browser = await chromium.launch({ executablePath: CHROME, headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    await page.addInitScript(() => {
      const t0 = performance.now();
      const at = () => Number((performance.now() - t0).toFixed(1));
      window.__r = { probes: {}, claims: {} };
      const rec = (k, v) => {
        window.__r.probes[k] = v;
      };

      // Kapan React menempelkan kunci fiber ke elemen sasaran?
      // Setiap commit diperiksa; commit pertama yang menemukan kunci fiber pada
      // SEMUA elemen sasaran adalah momen "node ini sudah diklaim React".
      const hook = (window.__REACT_DEVTOOLS_GLOBAL_HOOK__ =
        window.__REACT_DEVTOOLS_GLOBAL_HOOK__ || {});
      hook.supportsFiber = true;
      hook.renderers = hook.renderers || new Map();
      hook.inject = function (r) {
        hook.renderers.set(hook.renderers.size + 1, r);
        return hook.renderers.size;
      };
      hook.onCommitFiberRoot = function () {
        const els = Array.from(document.querySelectorAll('[data-image-reveal]'));
        if (els.length === 0) return;
        const claimed = els.filter((e) =>
          Object.keys(e).some((k) => k.startsWith('__reactFiber$') || k.startsWith('__reactProps$')),
        ).length;
        if (claimed === els.length && !window.__r.allClaimed) {
          window.__r.allClaimed = at();
        }
      };

      // Kandidat sinyal, dijadwalkan LANGSUNG (bukan dari useEffect), supaya
      // mengukur batas bawah terbaik yang bisa dicapai tanpa React.
      requestAnimationFrame(() => {
        rec('rafA', at());
        requestAnimationFrame(() => rec('rafB', at()));
      });
      const mc = new MessageChannel();
      mc.port1.onmessage = () => rec('messageChannel', at());
      mc.port2.postMessage(0);
      setTimeout(() => {
        rec('t0x1', at());
        setTimeout(() => rec('t0x2', at()), 0);
      }, 0);
    });

    await page.goto(BASE + '/kegiatan', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(4000);

    const r = await page.evaluate(() => window.__r);
    const claimed = r.allClaimed;
    console.log(`--- run ${run} ---  (React claimed all target nodes at ${claimed ?? 'n/a'}ms)`);
    for (const [k, v] of Object.entries(r.probes)) {
      const verdict =
        claimed === undefined ? '      ?' : v >= claimed ? ' AFTER' : 'BEFORE';
      console.log(`  ${k.padEnd(16)} ${String(v).padStart(7)}ms  ${verdict}`);
    }
    await browser.close();
  }
})();
