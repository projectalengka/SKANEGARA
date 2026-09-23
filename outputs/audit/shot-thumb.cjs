/**
 * Close-up of the two program thumbnails in the hero's right column.
 *
 * The full-hero screenshot showed a small dark box with what appears to be
 * "ILUSTRASI PROGRAM" text escaping its frame. This crops just that slot at a
 * high device scale so the defect is legible rather than squinted at.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 3,
  });
  await page.goto('http://127.0.0.1:3000/', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(2500);

  // The list item containing the DKV entry.
  const item = page.locator('a[href*="program"], li').filter({ hasText: 'Desain Komunikasi Visual' }).first();
  if (await item.count()) {
    await item.screenshot({ path: 'outputs/audit/detail-program-thumb.png' });
    console.log('captured program row');
  }

  const details = await page.evaluate(() => {
    const span = Array.from(document.querySelectorAll('span')).find((s) =>
      s.className.toString().includes('h-16'),
    );
    if (!span) return null;
    const img = span.querySelector('img');
    const r = span.getBoundingClientRect();
    const ir = img ? img.getBoundingClientRect() : null;
    const cs = getComputedStyle(span);
    return {
      spanClass: span.className.toString(),
      spanBox: `${Math.round(r.width)}x${Math.round(r.height)}`,
      imgBox: ir ? `${Math.round(ir.width)}x${Math.round(ir.height)}` : 'none',
      imgSrc: img ? img.getAttribute('src') : 'none',
      imgNatural: img ? `${img.naturalWidth}x${img.naturalHeight}` : 'none',
      objectFit: img ? getComputedStyle(img).objectFit : 'none',
      overflow: cs.overflow,
      position: cs.position,
      html: span.outerHTML.slice(0, 400),
    };
  });
  console.log(JSON.stringify(details, null, 2));

  await browser.close();
})();
