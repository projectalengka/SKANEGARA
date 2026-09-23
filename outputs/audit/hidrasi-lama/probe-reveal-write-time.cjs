/**
 * Tangkap penulisan `data-revealed` paling awal, tanpa menambal setAttribute.
 *
 * Tambalan `setAttribute` sebelumnya tidak pernah mencatat apa pun, kemungkinan
 * karena observer berjalan sebelum tambalan itu terpasang, atau karena atribut
 * ditulis lewat `dataset` (yang juga memakai setAttribute, tetapi jalur
 * internalnya bisa berbeda di mesin ini).
 *
 * MutationObserver dipasang di `document.documentElement` dengan `attributes:
 * true` sejak awal, jadi tidak ada penulisan yang bisa lolos.
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
    window.__writes = [];
    const t0 = performance.now();
    const start = () => {
      const mo = new MutationObserver((records) => {
        for (const r of records) {
          if (r.type === 'attributes' && r.attributeName === 'data-revealed') {
            const el = r.target;
            window.__writes.push({
              tag: el.tagName ? el.tagName.toLowerCase() : '?',
              at: (performance.now() - t0).toFixed(0),
              cls: String(el.className || '').slice(0, 50),
            });
          }
        }
      });
      mo.observe(document.documentElement, { attributes: true, subtree: true });
    };
    if (document.documentElement) start();
    else document.addEventListener('readystatechange', start, { once: true });
  });

  const warnings = [];
  page.on('console', (m) => {
    if (/hydrated but some attributes/i.test(m.text())) warnings.push(m.text());
  });

  await page.goto(BASE + '/kegiatan', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(3500);

  const writes = await page.evaluate(() => window.__writes);
  const total = await page.evaluate(
    () => document.querySelectorAll('[data-revealed]').length,
  );

  console.log(`hydration warnings: ${warnings.length}`);
  console.log(`data-revealed writes observed: ${writes.length} (elements now revealed: ${total})`);
  for (const w of writes.slice(0, 10)) console.log(`  ${w.at}ms  <${w.tag}> ${w.cls}`);

  await browser.close();
})();
