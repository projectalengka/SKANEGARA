/**
 * Dua hal yang belum pernah diukur bersama:
 *
 *  1. Teks warning lengkap dari React. Selama ini hanya dihitung jumlahnya,
 *     jadi elemen mana yang dikeluhkan tidak pernah dibaca.
 *  2. Urutan relatif antara "React mulai hidrasi root" dan penulisan
 *     `data-revealed`, memakai kait devtools resmi React.
 *
 * `__REACT_DEVTOOLS_GLOBAL_HOOK__` dipasang SEBELUM bundle React dimuat, jadi
 * React mendaftarkan dirinya ke kait itu. `onCommitFiberRoot` adalah sinyal
 * hidrasi yang sebenarnya: React memanggilnya setelah root selesai di-commit.
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

    // Kait devtools harus ada sebelum React dimuat, dan harus memanggil
    // `inject` untuk setiap renderer yang mendaftar.
    const hook = (window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = window.__REACT_DEVTOOLS_GLOBAL_HOOK__ || {});
    hook.supportsFiber = true;
    hook.renderers = hook.renderers || new Map();
    hook.inject = function (renderer) {
      mark('react-inject', { v: String(renderer && renderer.version) });
      const id = (hook.renderers.size || 0) + 1;
      hook.renderers.set(id, renderer);
      return id;
    };
    const prevCommit = hook.onCommitFiberRoot;
    hook.onCommitFiberRoot = function (id, root, priority, didError) {
      // React memanggil ini tiap commit. Yang pertama menandai hidrasi selesai
      // untuk pohon awal.
      if (!window.__firstCommit) {
        window.__firstCommit = true;
        mark('first-commit', { didError: String(!!didError) });
      }
      if (prevCommit) return prevCommit.apply(this, arguments);
    };

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
  });

  const warnings = [];
  page.on('console', (m) => {
    const t = m.text();
    if (/hydrated but some attributes/i.test(t)) warnings.push(t);
  });

  await page.goto(BASE + '/kegiatan', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(4000);

  const ev = await page.evaluate(() => window.__ev);
  console.log(`hydration warnings: ${warnings.length}`);
  for (const w of warnings) console.log('  TEXT: ' + w.replace(/\s+/g, ' ').slice(0, 600));
  console.log('--- timeline ---');
  for (const e of ev) {
    const extra = Object.entries(e)
      .filter(([k]) => k !== 'what' && k !== 'at')
      .map(([k, v]) => `${k}=${v}`)
      .join(' ');
    console.log(`  ${String(e.at).padStart(6)}ms  ${e.what}  ${extra}`);
  }

  await browser.close();
})();
