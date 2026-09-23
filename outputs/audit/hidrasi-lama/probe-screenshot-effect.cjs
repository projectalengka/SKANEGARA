/**
 * Apakah `page.screenshot({ fullPage: true })` sendiri yang mengubah jumlah
 * reveal? Chromium mengambil fullPage dengan mengubah area capture, dan pada
 * halaman ber-Lenis itu bisa memicu reflow yang me-remount elemen — sehingga
 * jumlah yang diukur SESUDAH screenshot berbeda dari sebelumnya.
 *
 * Diuji: ukur sebelum screenshot, sesudah screenshot, dan sesudah jeda.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.argv[2] || 'http://127.0.0.1:3000';

const snap = (page) =>
  page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('[data-reveal], [data-image-reveal]'));
    const pending = t.filter((e) => !e.hasAttribute('data-revealed'));
    return {
      total: t.length,
      revealed: t.length - pending.length,
      lowOpacity: t.filter((e) => parseFloat(getComputedStyle(e).opacity) < 0.9).length,
      docH: document.body.scrollHeight,
      vh: window.innerHeight,
    };
  });

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1500);

  const height = await page.evaluate(() => document.body.scrollHeight);
  const steps = Math.ceil(height / 600) + 6;
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(65);
  }
  await page.waitForTimeout(1600);
  for (let i = 0; i < steps + 4; i++) {
    await page.mouse.wheel(0, -900);
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(900);

  console.log('before screenshot :', JSON.stringify(await snap(page)));
  await page.screenshot({ path: 'outputs/audit/tmp-fullpage-test.png', fullPage: true });
  console.log('after  screenshot :', JSON.stringify(await snap(page)));
  await page.waitForTimeout(2000);
  console.log('after  2s wait    :', JSON.stringify(await snap(page)));

  await browser.close();
})();
