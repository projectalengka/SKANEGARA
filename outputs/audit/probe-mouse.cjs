const { createRequire } = require('node:module');
const require2 = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = require2('playwright-core');
const BASE = process.argv[2] ?? 'http://127.0.0.1:3014';
const ROUTE = process.argv[3] ?? '/karya';
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(BASE + ROUTE, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  await page.mouse.move(720, 500);
  for (let i = 0; i < 26; i++) {
    await page.mouse.wheel(0, 620);
    await page.waitForTimeout(190);
  }
  await page.waitForTimeout(2200);
  const r = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('[data-image-reveal],[data-reveal]'));
    let hidden = 0;
    for (const el of all) {
      const c = window.getComputedStyle(el).clipPath || '';
      const m = c.match(/inset\(([^)]+)\)/);
      const p = m ? m[1].trim().split(/\s+/) : [];
      const b = p[2] ?? p[0] ?? '0px';
      if (c.includes('inset') && parseFloat(b) >= 99) hidden++;
    }
    return { total: all.length, hidden, scrollY: Math.round(window.scrollY), max: Math.round(document.body.scrollHeight) };
  });
  console.log('route ' + ROUTE);
  console.log('scrollY=' + r.scrollY + ' docHeight=' + r.max);
  console.log('visible=' + (r.total - r.hidden) + '/' + r.total + ' hidden=' + r.hidden);
  await browser.close();
})();
