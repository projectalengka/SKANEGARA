/**
 * Quick screenshot helper for the visual audit.
 *
 * Uses the same isolated playwright-core + system Chrome setup as outputs/qa.mjs
 * so nothing is installed into the project or the user's global environment.
 *
 * Usage: node outputs/audit/shot.cjs <baseUrl> <prefix> [route...]
 */
const { createRequire } = require('node:module');
const require2 = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = require2('playwright-core');

const BASE = process.argv[2] ?? 'http://127.0.0.1:3001';
const PREFIX = process.argv[3] ?? 'shot';
const ROUTES = process.argv.slice(4);
if (ROUTES.length === 0) ROUTES.push('/');

const VIEWPORTS = [
  ['320', 320, 900],
  ['390', 390, 844],
  ['768', 768, 1024],
  ['1440', 1440, 1000],
];

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });

  for (const route of ROUTES) {
    const slug = route === '/' ? 'home' : route.replace(/^\//, '').replace(/\//g, '_');
    for (const [name, width, height] of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width, height } });
      await page.goto(`${BASE}${route}`, { waitUntil: 'load' });
      await page.waitForTimeout(3000);
      await page.screenshot({
        path: `outputs/audit/${PREFIX}-${slug}-${name}.png`,
      });
      await page.close();
    }
  }

  await browser.close();
  console.log(`${PREFIX}: ${ROUTES.length} route(s) captured`);
})();
