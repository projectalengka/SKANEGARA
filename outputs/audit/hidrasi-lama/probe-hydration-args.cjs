/**
 * React memotong teksnya sendiri, jadi bagian akhir warning — yang menyebut
 * elemen bersangkutan — tidak pernah terbaca. React juga mengirim objek
 * tambahan ke console.error; Playwright hanya memberi kita teks.
 *
 * Di sini kita bajak `console.error` lebih dulu, simpan SEMUA argumen, dan
 * serialisasi objeknya pendek-pendek. Itu memberi daftar atribut yang berbeda.
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
    window.__errors = [];
    const orig = console.error;
    console.error = function (...args) {
      try {
        const text = args.map((a) => (typeof a === 'string' ? a : '')).join(' ');
        if (/hydrated but some attributes/i.test(text)) {
          window.__errors.push(
            args.map((a) => {
              if (typeof a === 'string') return { kind: 'str', v: a };
              if (a === null) return { kind: 'null' };
              if (a === undefined) return { kind: 'undefined' };
              if (a instanceof Error) return { kind: 'error', v: a.message };
              if (Array.isArray(a)) return { kind: 'array', v: a.map((x) => String(x)) };
              if (typeof a === 'object') {
                const out = {};
                for (const k of Object.keys(a)) {
                  const val = a[k];
                  out[k] = typeof val === 'string' ? val : val === null ? null : String(val);
                }
                return {
                  kind: 'object',
                  ctor: a.constructor ? a.constructor.name : '?',
                  v: out,
                };
              }
              return { kind: typeof a, v: String(a) };
            }),
          );
        }
      } catch (e) {
        window.__errors.push([{ kind: 'threw', v: String(e) }]);
      }
      return orig.apply(this, args);
    };
  });

  await page.goto(BASE + '/kegiatan', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(4000);

  const errs = await page.evaluate(() => window.__errors);
  console.log(`captured console.error calls: ${errs.length}`);
  for (const call of errs) {
    console.log('---');
    for (const a of call) {
      console.log(`  [${a.kind}${a.ctor ? ' ' + a.ctor : ''}] ` + JSON.stringify(a.v));
    }
  }

  await browser.close();
})();
