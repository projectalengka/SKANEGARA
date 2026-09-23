const { createRequire } = require('node:module');
const require2 = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = require2('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('http://127.0.0.1:3015/karya', { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const r = await page.evaluate(() => {
    const ul = document.querySelector('ul.grid');
    if (!ul) return { found: false };
    const cs = getComputedStyle(ul);
    const lis = Array.from(ul.querySelectorAll(':scope > li'));
    return {
      found: true,
      display: cs.display,
      cols: cs.gridTemplateColumns,
      liCount: lis.length,
      liWidths: lis.slice(0,4).map(li => Math.round(li.getBoundingClientRect().width)),
      liTops: lis.slice(0,4).map(li => Math.round(li.getBoundingClientRect().top)),
    };
  });
  console.log(JSON.stringify(r, null, 2));
  await browser.close();
})();
