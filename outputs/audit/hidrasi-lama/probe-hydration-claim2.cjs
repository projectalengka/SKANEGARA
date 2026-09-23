/**
 * Probe ini mengukur kandidat sinyal DARI DALAM titik yang sama dengan
 * `useEffect` RevealObserver, terhadap momen React mengklaim node sasaran
 * (dikenali dari kunci `__reactFiber$` yang React tempelkan pada node DOM).
 *
 * Caranya: halaman diberi komponen klien kecil yang menjalankan kandidat
 * sinyal dan mencatat waktunya. Karena komponen itu ada di pohon yang sama
 * dengan RevealObserver, `useEffect`-nya berjalan pada commit yang sama.
 *
 * Hasil yang dicari: kandidat yang SELALU >= waktu klaim, di ketiga run.
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
      window.__r = { probes: [] };
      window.__at = at;

      // Kapan React mengklaim SEMUA node sasaran? Diperiksa tiap commit.
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
        if (!els.length) return;
        const claimed = els.every((e) =>
          Object.keys(e).some((k) => k.startsWith('__reactFiber$')),
        );
        const partial = els.filter((e) =>
          Object.keys(e).some((k) => k.startsWith('__reactFiber$')),
        ).length;
        window.__r.probes.push({ k: 'commitClaim', v: at(), n: `${partial}/${els.length}` });
        if (claimed && !window.__r.allClaimed) window.__r.allClaimed = at();
      };

      const origErr = console.error;
      console.error = function (...a) {
        const t = a.map((x) => (typeof x === 'string' ? x : '')).join(' ');
        if (/hydrated but some attributes/i.test(t)) {
          window.__r.probes.push({ k: 'reactWarning', v: at() });
        }
        return origErr.apply(this, a);
      };

      // Probe dari context utama terpisah: kita pantau kapan node sasaran
      // mendapatkan kunci fiber lewat polling rAF berkelanjutan.
      let seen = 0;
      const poll = () => {
        const els = Array.from(document.querySelectorAll('[data-image-reveal]'));
        const now = els.filter((e) =>
          Object.keys(e).some((k) => k.startsWith('__reactFiber$')),
        ).length;
        if (now > seen) {
          seen = now;
          window.__r.probes.push({ k: 'rafPollClaim', v: at(), n: `${now}/${els.length}` });
        }
        requestAnimationFrame(poll);
      };
      requestAnimationFrame(poll);
    });

    await page.goto(BASE + '/kegiatan', { waitUntil: 'load', timeout: 60000 });

    // Ukur kandidat sinyal dari dalam halaman, dijadwalkan pada task yang sama
    // dengan commit React (microtask setelah load event handler Next selesai
    // tidak bisa dijamin; jadi kita jadwalkan dari rAF pertama setelah load).
    await page.waitForTimeout(4000);

    const r = await page.evaluate(() => ({
      allClaimed: window.__r.allClaimed,
      probes: window.__r.probes.slice(0, 12),
    }));
    console.log(`--- run ${run} --- React claimed all nodes at ${r.allClaimed ?? 'never'}ms`);
    for (const p of r.probes) {
      console.log(`     ${String(p.v).padStart(8)}ms  ${p.k} ${p.n ?? ''}`);
    }
    await browser.close();
  }
})();
