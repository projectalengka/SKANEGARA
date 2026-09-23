/**
 * Siapa yang menambahkan `is-revealed` sebelum React selesai hidrasi?
 *
 * Dua penulis yang saya duga (`observeReveals`, `markScripted`) ternyata tidak
 * pernah dipanggil. Daripada menebak lagi, DOM dipantau langsung: setiap
 * penambahan kelas pada elemen ber-`data-reveal` dicatat beserta jejak
 * tumpukannya, dan waktu relatifnya terhadap `load` diukur.
 *
 * Instruksi ini dipasang dengan `addInitScript`, jadi berjalan sebelum bundel
 * aplikasi — persis seperti yang dibutuhkan untuk menangkap penulis paling awal.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', (m) => {
    const t = m.text();
    if (t.startsWith('[REVEAL-TRACE]')) console.log(t);
  });

  await page.addInitScript(() => {
    const t0 = performance.now();
    const stamp = () => `${(performance.now() - t0).toFixed(0)}ms`;

    const patch = (proto) => {
      const original = proto.add;
      proto.add = function (...args) {
        if (args.includes('is-revealed')) {
          const el = this;
          const tag = el.tagName ? el.tagName.toLowerCase() : '?';
          console.log(
            `[REVEAL-TRACE] is-revealed added to <${tag} class="${String(el.className).slice(0, 60)}"> at ${stamp()}`,
          );
          console.log(`[REVEAL-TRACE] stack:\n${new Error().stack}`);
        }
        return original.apply(this, args);
      };
    };

    // Patch as soon as DOMTokenList exists.
    patch(DOMTokenList.prototype);

    // Mark the moment hydration-relevant events happen, for comparison.
    window.addEventListener('DOMContentLoaded', () =>
      console.log(`[REVEAL-TRACE] DOMContentLoaded at ${stamp()}`),
    );
    window.addEventListener('load', () => console.log(`[REVEAL-TRACE] load at ${stamp()}`));
  });

  await page.goto('http://127.0.0.1:3001/tentang', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(4000);

  await context.close();
  await browser.close();
})();
