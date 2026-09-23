/**
 * Kandidat sinyal "hidrasi selesai", diukur terhadap momen React benar-benar
 * membandingkan elemen sasaran.
 *
 * Kandidat:
 *   A. useEffect (komponen klien)           -> kapan ia berjalan?
 *   B. rAF setelah useEffect
 *   C. rAF ganda setelah useEffect
 *   D. setTimeout(0) setelah useEffect
 *   E. React commit terakhir dari route ini
 *
 * Yang dibutuhkan: sinyal yang SELALU datang setelah perbandingan React.
 * Probe ini melaporkan selisihnya, bukan menebak.
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
      window.__t = {};
      const at = () => Number((performance.now() - t0).toFixed(1));

      const hook = (window.__REACT_DEVTOOLS_GLOBAL_HOOK__ =
        window.__REACT_DEVTOOLS_GLOBAL_HOOK__ || {});
      hook.supportsFiber = true;
      hook.renderers = hook.renderers || new Map();
      hook.inject = function (r) {
        hook.renderers.set(hook.renderers.size + 1, r);
        return hook.renderers.size;
      };
      window.__commits = [];
      hook.onCommitFiberRoot = function () {
        window.__commits.push(at());
      };

      const origErr = console.error;
      console.error = function (...a) {
        const t = a.map((x) => (typeof x === 'string' ? x : '')).join(' ');
        if (/hydrated but some attributes/i.test(t)) {
          window.__t.reactWarning = at();
        }
        return origErr.apply(this, a);
      };
      window.__at = at;
    });

    await page.goto(BASE + '/kegiatan', { waitUntil: 'load', timeout: 60000 });

    // Ukur kandidat A–D dari dalam halaman, dijadwalkan sedini mungkin lewat
    // hook rAF yang dipasang sebelum bundle.
    await page.evaluate(() => {
      const at = window.__at;
      const rec = (k) => {
        window.__t[k] = at();
      };
      requestAnimationFrame(() => {
        rec('rafA');
        requestAnimationFrame(() => {
          rec('rafB');
          requestAnimationFrame(() => rec('rafC'));
        });
      });
      setTimeout(() => rec('timeout0'), 0);
      setTimeout(() => rec('timeout50'), 50);
    });

    await page.waitForTimeout(4000);

    const t = await page.evaluate(() => window.__t);
    const commits = await page.evaluate(() => window.__commits);
    const lastCommit = commits.length ? commits[commits.length - 1] : null;
    const cmp = (v) => (v === undefined ? '   n/a' : String(v).padStart(7));
    console.log(`--- run ${run} ---`);
    console.log(`  earliest rAF      ${cmp(t.rafA)}ms`);
    console.log(`  rAF x2            ${cmp(t.rafB)}ms`);
    console.log(`  rAF x3            ${cmp(t.rafC)}ms`);
    console.log(`  setTimeout(0)     ${cmp(t.timeout0)}ms`);
    console.log(`  setTimeout(50)    ${cmp(t.timeout50)}ms`);
    console.log(`  last react commit ${cmp(lastCommit)}ms`);
    console.log(`  REACT WARNING     ${cmp(t.reactWarning)}ms`);
    if (t.reactWarning !== undefined && t.rafB !== undefined) {
      console.log(
        `  => rAF x2 is ${t.rafB > t.reactWarning ? 'AFTER' : 'BEFORE'} the warning by ${Math.abs(t.rafB - t.reactWarning).toFixed(1)}ms`,
      );
    }
    await browser.close();
  }
})();
