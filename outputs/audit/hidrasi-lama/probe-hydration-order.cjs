/**
 * MutationObserver memberi waktu *callback*, bukan waktu penulisan. Callback
 * dijalankan sebagai microtask setelah semua mutasi pada task itu terkumpul,
 * jadi "986ms" bisa berarti penulisan terjadi jauh lebih awal.
 *
 * Di sini saya tambal `Element.prototype.setAttribute` dan properti
 * `dataset.revealed` secara langsung supaya waktu penulisan sebenarnya
 * terbaca, plus laporkan urutannya relatif terhadap console.error React.
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
    window.__log = [];
    const stamp = () => Number((performance.now() - t0).toFixed(1));

    // Jejak stack saat penulisan pertama: siapa yang menulis?
    const origSet = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name, value) {
      if (name === 'data-revealed' && window.__log.length < 40) {
        let stack = '';
        try {
          throw new Error('trace');
        } catch (e) {
          stack = String(e.stack || '')
            .split('\n')
            .slice(2, 5)
            .map((l) => l.trim().slice(0, 110))
            .join(' | ');
        }
        window.__log.push({ what: 'setAttribute', name, at: stamp(), stack });
      }
      return origSet.call(this, name, value);
    };

    // Patok kedua: kapan React melaporkan mismatch, lewat console.error.
    const origErr = console.error;
    console.error = function (...args) {
      const text = args.map((a) => (typeof a === 'string' ? a : '')).join(' ');
      if (/hydrated but some attributes/i.test(text)) {
        window.__log.push({ what: 'react-warning', at: stamp() });
      }
      return origErr.apply(this, args);
    };

    // Patok ketiga: devtools hook -> commit React.
    const hook = (window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = window.__REACT_DEVTOOLS_GLOBAL_HOOK__ || {});
    hook.supportsFiber = true;
    hook.renderers = hook.renderers || new Map();
    hook.inject = function (renderer) {
      hook.renderers.set(hook.renderers.size + 1, renderer);
      return hook.renderers.size;
    };
    hook.onCommitFiberRoot = function (id, root, priority, didError) {
      window.__log.push({ what: 'react-commit', at: stamp(), didError: String(!!didError) });
    };
  });

  await page.goto(BASE + '/kegiatan', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(4000);

  const log = await page.evaluate(() => window.__log);
  for (const e of log) {
    const extra = Object.entries(e)
      .filter(([k]) => k !== 'what' && k !== 'at')
      .map(([k, v]) => ` ${k}=${v}`)
      .join('');
    console.log(`${String(e.at).padStart(8)}ms  ${e.what}${extra}`);
  }

  await browser.close();
})();
