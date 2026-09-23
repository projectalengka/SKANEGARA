/**
 * Sinyal waktu mana yang jatuh SETELAH React selesai hidrasi?
 *
 * Peringatan mismatch React sendiri adalah penanda yang andal: ia muncul tepat
 * saat React membandingkan markup server dengan DOM. Jadi: catat waktu tiap
 * kandidat sinyal, dan catat kapan peringatan itu muncul (lewat konsol, yang
 * diteruskan ke Node). Sinyal yang berada di atas waktu peringatan adalah
 * sinyal yang aman dipakai untuk memulai mutasi DOM.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  let hydrationWarnAt = null;

  await page.addInitScript(() => {
    const t0 = performance.now();
    window.__marks = [];
    Math;
    const mark = (name) => window.__marks.push(`${name}@${(performance.now() - t0).toFixed(0)}`);

    window.addEventListener('DOMContentLoaded', () => mark('DOMContentLoaded'));
    window.addEventListener('load', () => mark('load'));
    requestAnimationFrame(() => {
      mark('raf#1');
      requestAnimationFrame(() => {
        mark('raf#2');
        requestAnimationFrame(() => mark('raf#3'));
      });
    });
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => mark('idleCallback#1'));
    }
    setTimeout(() => mark('setTimeout0'), 0);
    setTimeout(() => mark('setTimeout50'), 50);

    // React memanggil ini saat ada masalah pemulihan; hidrasi React 19 selesai
    // sebelum paint pertama yang mengikuti commit, jadi raf#2 ke atas sudah aman.
    const origError = console.error;
    console.error = function (...args) {
      if (String(args[0]).includes('hydrated but some attributes')) mark('REACT-HYDRATION-WARNING');
      return origError.apply(this, args);
    };
  });

  await page.goto('http://127.0.0.1:3001/tentang', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(4000);

  const marks = await page.evaluate(() => window.__marks);
  console.log('timeline (ms from page start):');
  for (const m of marks) console.log(`  ${m}`);

  await context.close();
  await browser.close();
})();
