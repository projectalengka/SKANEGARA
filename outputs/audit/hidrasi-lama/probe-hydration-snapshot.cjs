/**
 * Pertanyaan yang belum terjawab: pada saat React membandingkan (saat commit),
 * apakah atribut `data-revealed` SUDAH ada di DOM?
 *
 * Cara menjawabnya tanpa menebak: pasang devtools hook, dan pada commit
 * PERTAMA, langsung periksa keempat elemen `[data-image-reveal]` dan laporkan
 * atributnya apa adanya. Kalau atributnya sudah ada di commit pertama, penulis
 * bukan kode saya (yang menulis belakangan) melainkan sesuatu di jalur SSR.
 *
 * Sekaligus: rekam `outerHTML` elemen itu sedini mungkin lewat
 * MutationObserver dengan `attributes` DAN `childList`, supaya transisi
 * "tanpa atribut -> dengan atribut" terlihat kalau memang ada.
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
    window.__snap = [];
    const snap = (why) => {
      const els = Array.from(document.querySelectorAll('[data-image-reveal]'));
      window.__snap.push({
        why,
        at: Number((performance.now() - t0).toFixed(1)),
        els: els.map((e) => ({
          has: e.hasAttribute('data-revealed'),
          cls: String(e.className).slice(0, 40),
          html: e.outerHTML.slice(0, 120),
        })),
      });
    };

    const hook = (window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = window.__REACT_DEVTOOLS_GLOBAL_HOOK__ || {});
    hook.supportsFiber = true;
    hook.renderers = hook.renderers || new Map();
    hook.inject = function (r) {
      hook.renderers.set(hook.renderers.size + 1, r);
      return hook.renderers.size;
    };
    let commits = 0;
    hook.onCommitFiberRoot = function () {
      commits++;
      // Commit 1..6: cukup untuk melihat apakah atribut muncul sebelum
      // hidrasi React yang sebenarnya (yang biasanya di commit ke sekian).
      if (commits <= 6) snap('commit#' + commits);
      if (commits === 1) window.__first = true;
    };

    const origErr = console.error;
    console.error = function (...a) {
      const t = a.map((x) => (typeof x === 'string' ? x : '')).join(' ');
      if (/hydrated but some attributes/i.test(t)) snap('REACT-WARNING');
      return origErr.apply(this, a);
    };

    const mo = new MutationObserver((rs) => {
      for (const r of rs) {
        if (r.type === 'attributes' && r.attributeName === 'data-revealed') {
          window.__snap.push({
            why: 'attr-write',
            at: Number((performance.now() - t0).toFixed(1)),
            cls: String(r.target.className).slice(0, 40),
          });
        }
      }
    });
    const attach = () => mo.observe(document.documentElement, { attributes: true, subtree: true });
    if (document.documentElement) attach();
    else document.addEventListener('readystatechange', attach, { once: true });

    // Snapshot sedini mungkin sesudah DOMContentLoaded.
    document.addEventListener('DOMContentLoaded', () => snap('DOMContentLoaded'));
  });

  await page.goto(BASE + '/kegiatan', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(4000);

  const snaps = await page.evaluate(() => window.__snap);
  for (const s of snaps) {
    if (s.els) {
      const yes = s.els.filter((e) => e.has).length;
      console.log(`${String(s.at).padStart(8)}ms  ${s.why}: ${yes}/${s.els.length} have data-revealed`);
      for (const e of s.els) {
        console.log(`            [${e.has ? 'X' : ' '}] ${e.html}`);
      }
    } else {
      console.log(`${String(s.at).padStart(8)}ms  ${s.why}: <${s.cls}>`);
    }
  }

  await browser.close();
})();
