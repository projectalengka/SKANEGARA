/**
 * Kenapa gulir roda men-reveal 55/55 di dev tapi hanya 13/55 di produksi?
 *
 * Bedanya: produksi jauh lebih cepat, dan Lenis menyelesaikan gulir lebih
 * cepat juga. Kalau observer memakai `rootMargin: 0 0 -10% 0` + `threshold:
 * 0.05`, elemen harus benar-benar bertahan di viewport selama satu siklus
 * observer. Dengan gulir 600px/65ms, elemen bisa melompat melewati viewport
 * seluruhnya di antara dua callback.
 *
 * Diuji: gulir cepat vs gulir lambat, di produksi.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:3000';

async function scrollTest(label, stepPx, delayMs) {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1500);

  const height = await page.evaluate(() => document.body.scrollHeight);
  const steps = Math.ceil(height / stepPx) + 6;
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, stepPx);
    await page.waitForTimeout(delayMs);
  }
  await page.waitForTimeout(2000);

  const r = await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('[data-reveal], [data-image-reveal]'));
    const pending = t.filter((e) => !e.hasAttribute('data-revealed'));
    return {
      total: t.length,
      revealed: t.length - pending.length,
      // Di mana elemen yang belum ter-reveal? Atas atau bawah viewport?
      stuckTop: pending.filter((e) => e.getBoundingClientRect().bottom < 0).length,
      stuckBottom: pending.filter((e) => e.getBoundingClientRect().top > window.innerHeight).length,
      scrollY: Math.round(window.scrollY),
      docH: document.body.scrollHeight,
    };
  });
  console.log(
    `${label.padEnd(26)} revealed=${r.revealed}/${r.total}  scrollY=${r.scrollY}/${r.docH}  above=${r.stuckTop} below=${r.stuckBottom}`,
  );
  await browser.close();
}

(async () => {
  await scrollTest('600px / 65ms (fast)', 600, 65);
  await scrollTest('600px / 150ms', 600, 150);
  await scrollTest('400px / 250ms (slow)', 400, 250);
  await scrollTest('900px / 90ms (very fast)', 900, 90);
})();
