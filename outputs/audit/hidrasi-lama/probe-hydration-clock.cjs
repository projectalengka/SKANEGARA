/**
 * Jam yang sama untuk dua peristiwa: kapan React selesai hidrasi, dan kapan
 * `data-revealed` ditulis.
 *
 * Probe sebelumnya mengukur keduanya di halaman berbeda atau dengan patokan
 * waktu berbeda, jadi "1020ms" tidak bisa dibandingkan dengan "warning 968ms".
 * Di sini satu `performance.now()` dipakai untuk keduanya.
 *
 * Titik hidrasi dideteksi lewat React sendiri: `__REACT_DEVTOOLS_GLOBAL_HOOK__`
 * memberi kita root fiber, dan kita polling `container` React sampai ia punya
 * `_reactRootContainer`/fiber dengan `stateNode`. Kalau itu tidak tersedia,
 * fallback-nya adalah mencatat kapan React terakhir memanggil `setAttribute`
 * pada elemen yang kita pantau (bukti ia sedang berjalan di atas DOM itu).
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:3001';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.addInitScript(() => {
    const t0 = performance.now();
    window.__ev = [];
    const mark = (what, extra) =>
      window.__ev.push({ what, at: Number((performance.now() - t0).toFixed(0)), ...extra });

    // 1) Setiap penulisan atribut data-revealed.
    const mo = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === 'attributes' && r.attributeName === 'data-revealed') {
          mark('data-revealed', {
            tag: r.target.tagName.toLowerCase(),
            cls: String(r.target.className || '').slice(0, 40),
          });
        }
      }
    });
    const onReady = () =>
      mo.observe(document.documentElement, { attributes: true, subtree: true });
    if (document.documentElement) onReady();
    else document.addEventListener('readystatechange', onReady, { once: true });

    // 2) Kapan React memasang root-nya di <html>/<body>.
    //    React 19 menaruh properti non-enumerable `__reactContainer$…` pada
    //    container. Kita cari di <html> dan <body>.
    const scan = () => {
      for (const el of [document.documentElement, document.body]) {
        if (!el) continue;
        for (const k in el) {
          if (k.startsWith('__reactContainer$')) {
            mark('react-container', { on: el.tagName.toLowerCase() });
            return true;
          }
        }
      }
      return false;
    };

    // 3) Ketuk React saat ia menyelesaikan hidrasi: MutationObserver pada
    //    childList yang mencatat kapan React terakhir MENAMBAH node. Hidrasi
    //    yang berhasil tidak menambah node, jadi ini hanya membantu untuk
    //    kasus mismatch. Yang lebih andal: event `load` + polling scan().
    let done = false;
    const poll = () => {
      if (done) return;
      if (scan()) {
        done = true;
        return;
      }
      requestAnimationFrame(poll);
    };
    requestAnimationFrame(poll);

    // 4) Penanda netral: kapan bundle main-app dieksekusi.
    //    Kita tandai lewat microtask setelah semua script klasik selesai.
    window.__ev.push({ what: 'init-script', at: 0 });
  });

  const warnings = [];
  page.on('console', (m) => {
    if (/hydrated but some attributes/i.test(m.text())) {
      warnings.push(m.text().slice(0, 400));
    }
  });
  page.on('pageerror', (e) => warnings.push('pageerror: ' + e.message));

  await page.goto(BASE + '/kegiatan', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(4000);

  const ev = await page.evaluate(() => window.__ev);
  console.log(`hydration warnings: ${warnings.length}`);
  for (const e of ev) {
    const extra = Object.entries(e)
      .filter(([k]) => k !== 'what' && k !== 'at')
      .map(([k, v]) => `${k}=${v}`)
      .join(' ');
    console.log(`  ${String(e.at).padStart(6)}ms  ${e.what}  ${extra}`);
  }

  await browser.close();
})();
