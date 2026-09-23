/**
 * React menampilkan diff sebagai pohon adegan. Konvensinya:
 *
 *   `- prop` = ada di pohon SATU sisi saja, sisi yang ditandai header pohon itu.
 *
 * Pada warning hidrasi React menandai pohon dengan header `Server` / `Client`.
 * Di probe sebelumnya header itu TIDAK tertangkap karena React mencetaknya
 * sebagai argumen %s%s terpisah, bukan sebagai bagian pesan utama.
 *
 * Di sini saya cetak SEMUA argumen mentah sebagai JSON, tanpa merangkai, supaya
 * tidak ada lagi yang hilang.
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
    window.__raw = [];
    const orig = console.error;
    console.error = function (...args) {
      const joined = args.map((a) => (typeof a === 'string' ? a : '')).join(' ');
      if (/hydrated but some attributes/i.test(joined)) {
        window.__raw.push(
          args.map((a) => {
            if (typeof a === 'string') return a;
            if (a instanceof Error) return 'Error: ' + a.message;
            if (a && typeof a === 'object') {
              const o = {};
              for (const k of Object.keys(a)) {
                const v = a[k];
                o[k] = typeof v === 'string' ? v : v === null ? null : String(v);
              }
              return o;
            }
            return String(a);
          }),
        );
      }
      return orig.apply(this, args);
    };
  });

  await page.goto(BASE + '/kegiatan', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(4000);

  const raw = await page.evaluate(() => window.__raw);
  console.log('calls:', raw.length);
  raw.forEach((call, i) => {
    console.log(`\n===== call ${i} (${call.length} args) =====`);
    call.forEach((a, j) => {
      console.log(`  arg[${j}] ${typeof a === 'string' ? 'string' : 'other'}`);
      console.log(JSON.stringify(a).slice(0, 4000));
    });
  });

  await browser.close();
})();
