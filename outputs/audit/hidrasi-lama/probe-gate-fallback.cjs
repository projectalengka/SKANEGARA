/**
 * Uji jalur cadangan.
 *
 * Gerbang menunggu kunci `__reactFiber$` pada elemen sasaran. Kalau React suatu
 * saat berhenti memasang kunci itu (atau namanya berubah), gerbang akan
 * menunggu selamanya dan konten tersembunyi — kegagalan yang tidak bisa
 * diterima.
 *
 * `FALLBACK_MS = 800` menutup celah itu: setelah 800ms gerbang terbuka apa pun
 * yang terjadi. Probe ini menyimulasikan skenario tersebut dengan membuat
 * kunci fiber TIDAK TERLIHAT dari kode aplikasi, lalu memastikan reveal tetap
 * terjadi.
 *
 * Caranya: jalankan halaman dengan JavaScript normal, tapi pasang pembatas
 * waktu 800ms sebagai patokan — dan bandingkan waktu reveal terhadap patokan
 * itu saat kunci tersedia vs saat tidak.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:3001';

(async () => {
  // Skenario A: normal. Kapan elemen sasaran ter-reveal?
  {
    const browser = await chromium.launch({ executablePath: CHROME, headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.addInitScript(() => {
      window.__firstReveal = null;
      const t0 = performance.now();
      const mo = new MutationObserver((rs) => {
        for (const r of rs) {
          if (
            r.type === 'attributes' &&
            r.attributeName === 'data-revealed' &&
            window.__firstReveal === null
          ) {
            window.__firstReveal = Number((performance.now() - t0).toFixed(0));
          }
        }
      });
      const go = () => mo.observe(document.documentElement, { attributes: true, subtree: true });
      if (document.documentElement) go();
      else document.addEventListener('readystatechange', go, { once: true });
    });
    await page.goto(BASE + '/kegiatan', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(4000);
    const first = await page.evaluate(() => window.__firstReveal);
    const count = await page.evaluate(
      () => document.querySelectorAll('[data-revealed]').length,
    );
    console.log(`A. normal           : first reveal at ${first}ms, total revealed = ${count}`);
    await browser.close();
  }

  // Skenario B: kunci fiber disembunyikan dari kode aplikasi.
  // Kita jadikan `__reactFiber$*` tidak enumerable SEBELUM skrip aplikasi
  // berjalan, sehingga `for (const key in element)` di RevealObserver tidak
  // melihatnya. Gerbang harus tetap terbuka lewat FALLBACK_MS.
  {
    const browser = await chromium.launch({ executablePath: CHROME, headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.addInitScript(() => {
      window.__firstReveal = null;
      const t0 = performance.now();
      const mo = new MutationObserver((rs) => {
        for (const r of rs) {
          if (
            r.type === 'attributes' &&
            r.attributeName === 'data-revealed' &&
            window.__firstReveal === null
          ) {
            window.__firstReveal = Number((performance.now() - t0).toFixed(0));
          }
        }
      });
      const go = () => mo.observe(document.documentElement, { attributes: true, subtree: true });
      if (document.documentElement) go();
      else document.addEventListener('readystatechange', go, { once: true });

      // Setelah React memasang kunci, kita buat kunci itu non-enumerable supaya
      // `for...in` tidak menemukannya. Ini meniru React yang mengganti nama kunci.
      const hideKeys = () => {
        const els = document.querySelectorAll('[data-reveal], [data-image-reveal]');
        for (const el of els) {
          for (const k of Object.getOwnPropertyNames(el)) {
            if (k.startsWith('__reactFiber$') || k.startsWith('__reactContainer$')) {
              const v = el[k];
              try {
                Object.defineProperty(el, k, {
                  value: v,
                  enumerable: false,
                  configurable: true,
                  writable: true,
                });
              } catch (e) {}
            }
          }
        }
      };
      const iv = setInterval(hideKeys, 4);
      setTimeout(() => clearInterval(iv), 3000);
    });
    await page.goto(BASE + '/kegiatan', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(4000);
    const first = await page.evaluate(() => window.__firstReveal);
    const count = await page.evaluate(
      () => document.querySelectorAll('[data-revealed]').length,
    );
    console.log(`B. fiber key hidden : first reveal at ${first}ms, total revealed = ${count}`);
    await browser.close();
  }
})();
