/**
 * Full-page screenshot helper.
 *
 * The existing shot.cjs captures the viewport, which is right for judging a
 * hero. It is wrong for judging a page whose content starts below the fold —
 * "the section is empty" and "the section is further down" look identical in a
 * viewport shot. This captures the whole document instead.
 *
 * Usage: node outputs/audit/shot-full.cjs <baseUrl> <prefix> <route> [width]
 */
const { createRequire } = require('node:module');
const require2 = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = require2('playwright-core');

const BASE = process.argv[2] ?? 'http://127.0.0.1:3013';
const PREFIX = process.argv[3] ?? 'full';
const ROUTE = process.argv[4] ?? '/';
const WIDTH = Number(process.argv[5] ?? 1440);

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });

  const page = await browser.newPage({ viewport: { width: WIDTH, height: 1000 } });
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));

  await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'load' });

  // Scroll the whole document so lazy images and scroll-triggered reveals fire,
  // then return to the top. A screenshot that skips this shows empty reveal
  // states and un-loaded `loading="lazy"` images, which reads as a bug that is
  // not there.
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1500);

  const slug = ROUTE === '/' ? 'home' : ROUTE.replace(/^\//, '').replace(/\//g, '_');
  await page.screenshot({
    path: `outputs/audit/${PREFIX}-${slug}-${WIDTH}.png`,
    fullPage: true,
  });

  // Images that failed to load are the single most common silent breakage, and
  // a screenshot alone will not tell you whether a plate is missing or simply
  // faint. Report them explicitly.
  const broken = await page.evaluate(() =>
    Array.from(document.images)
      .filter((img) => img.complete && img.naturalWidth === 0)
      .map((img) => img.currentSrc || img.src),
  );

  console.log(`${ROUTE} @${WIDTH}: captured`);
  console.log(`  console errors: ${errors.length}`);
  errors.slice(0, 5).forEach((error) => console.log(`    - ${error.slice(0, 160)}`));
  console.log(`  broken images: ${broken.length}`);
  broken.slice(0, 5).forEach((src) => console.log(`    - ${src}`));

  await browser.close();
})();
