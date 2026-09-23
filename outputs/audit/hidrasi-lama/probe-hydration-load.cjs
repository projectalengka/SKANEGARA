/**
 * Kandidat sinyal yang lebih lambat, diukur terhadap saat React MENGKLAIM node
 * sasaran (kunci `__reactFiber$`) — bukan terhadap rAF.
 *
 * Kenapa ambangnya "klaim fiber": React membandingkan atribut pada saat ia
 * mengambil alih node itu. Setelah node punya `__reactFiber$`, perbandingan
 * untuk node tersebut sudah terjadi.
 *
 * Kandidat:
 *   window.load + rAF
 *   window.load + 2 rAF
 *   window.load + 100ms
 *   window.load + 200ms
 *   window.load + 400ms
 *   requestIdleCallback
 *
 * Tujuan: menemukan kandidat yang >= klaim di SEMUA run, dan selisihnya sekecil
 * mungkin supaya reveal tidak terasa lambat.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:3001';

(async () => {
  for (let run = 1; run <= 4; run++) {
    const browser = await chromium.launch({ executablePath: CHROME, headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    await page.addInitScript(() => {
      const t0 = performance.now();
      const at = () => Number((performance.now() - t0).toFixed(1));
      window.__r = { candidates: {}, poll: [] };

      const claimedCount = () => {
        const els = Array.from(document.querySelectorAll('[data-image-reveal]'));
        if (!els.length) return null;
        const n = els.filter((e) =>
          Object.keys(e).some((k) => k.startsWith('__reactFiber$')),
        ).length;
        return { n, total: els.length };
      };

      // Polling rAF berkelanjutan: kapan tepatnya klaim terjadi.
      let last = -1;
      const poll = () => {
        const c = claimedCount();
        if (c && c.n !== last) {
          last = c.n;
          window.__r.poll.push({ at: at(), n: `${c.n}/${c.total}` });
        }
        requestAnimationFrame(poll);
      };
      requestAnimationFrame(poll);

      const sched = () => {
        requestAnimationFrame(() => {
          window.__r.candidates['load+raf'] = at();
          requestAnimationFrame(() => {
            window.__r.candidates['load+raf2'] = at();
            requestAnimationFrame(() => {
              window.__r.candidates['load+raf3'] = at();
            });
          });
        });
        setTimeout(() => (window.__r.candidates['load+100'] = at()), 100);
        setTimeout(() => (window.__r.candidates['load+200'] = at()), 200);
        setTimeout(() => (window.__r.candidates['load+400'] = at()), 400);
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => (window.__r.candidates['idle'] = at()), {
            timeout: 2000,
          });
        }
      };
      if (document.readyState === 'complete') sched();
      else window.addEventListener('load', sched, { once: true });
    });

    await page.goto(BASE + '/kegiatan', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(4500);

    const r = await page.evaluate(() => window.__r);
    // Momen klaim PENUH. `0/4` juga berakhir `/4`, jadi harus dibandingkan
    // kedua sisinya — bug ini sempat membuat seluruh perbandingan terbalik.
    const full = r.poll.filter((p) => {
      const [a, b] = p.n.split('/').map(Number);
      return a === b && b > 0;
    });
    const claim = full.length ? full[0].at : null;
    console.log(`--- run ${run} --- React claimed all 4 at ${claim ?? 'not seen'}ms`);
    console.log('    poll: ' + r.poll.map((p) => `${p.at}:${p.n}`).join('  '));
    for (const [k, v] of Object.entries(r.candidates)) {
      const ok = claim === null ? '?' : v >= claim ? 'AFTER ' : 'BEFORE';
      const d = claim === null ? '' : `${(v - claim).toFixed(0)}ms`;
      console.log(`      ${k.padEnd(12)} ${String(v).padStart(7)}ms  ${ok} ${d}`);
    }
    await browser.close();
  }
})();
