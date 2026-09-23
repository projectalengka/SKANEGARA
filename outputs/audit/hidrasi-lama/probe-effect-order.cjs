/**
 * Apakah `useEffect` di root layout benar-benar berjalan SETELAH hidrasi selesai?
 *
 * Efek React berjalan dari anak ke induk, jadi efek milik layout seharusnya
 * menjadi salah satu yang terakhir. Kalau itu benar, mutasi DOM dari sana aman
 * tanpa penundaan apa pun — dan penundaan berbasis rAF tidak diperlukan.
 *
 * Diuji dengan mencatat waktu: mutasi dari efek layout vs waktu peringatan
 * hidrasi React. Bila mutasi selalu SETELAH peringatan (atau peringatan tidak
 * muncul sama sekali), urutannya benar.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.addInitScript(() => {
    const t0 = performance.now();
    window.__timeline = [];
    const mark = (n) => window.__timeline.push(`${n}@${(performance.now() - t0).toFixed(0)}`);

    window.addEventListener('load', () => mark('load'));

    const orig = console.error;
    console.error = function (...args) {
      if (String(args[0]).includes('hydrated but some attributes')) mark('REACT-WARNING');
      return orig.apply(this, args);
    };

    // Catat kapan atribut reveal pertama kali ditulis.
    let firstWrite = null;
    const desc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'dataset');
    void desc;
    const origSet = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name, value) {
      if (name === 'data-revealed' && firstWrite === null) {
        firstWrite = (performance.now() - t0).toFixed(0);
        mark(`FIRST data-revealed@${firstWrite}`);
      }
      return origSet.call(this, name, value);
    };
  });

  await page.goto('http://127.0.0.1:3001/kegiatan', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(4000);

  const tl = await page.evaluate(() => window.__timeline);
  console.log('timeline:');
  for (const t of tl) console.log(`  ${t}`);

  await context.close();
  await browser.close();
})();
