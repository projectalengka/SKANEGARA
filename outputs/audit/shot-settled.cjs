/**
 * Full-page screenshot for pages whose reveals are one-shot.
 *
 * `fullPage: true` combined with a scroll-then-return produces a misleading
 * image on this site: elements that revealed correctly get captured mid-state
 * or showing the pre-reveal clip, because the capture is stitched from a
 * viewport that has scrolled back to the top.
 *
 * The fix is to force every reveal target into its final state before capturing
 * — which is honest, because the one-shot observer guarantees the final state is
 * what a visitor ends up seeing. It is not faking a result; it is skipping the
 * wait.
 *
 * Usage: node outputs/audit/shot-settled.cjs <baseUrl> <prefix> <route> [width]
 */

const { createRequire } = require('node:module');
const require2 = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = require2('playwright-core');

const BASE = process.argv[2] ?? 'http://127.0.0.1:3015';
const PREFIX = process.argv[3] ?? 'settled';
const ROUTE = process.argv[4] ?? '/';
const WIDTH = Number(process.argv[5] ?? 1440);

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });
  const page = await browser.newPage({ viewport: { width: WIDTH, height: 1000 } });
  await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'load' });

  // Scroll through so lazy images load and any ScrollTriggers resolve.
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 140));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1200);

  // Pin every reveal to its finished state and kill the transitions, so the
  // stitched capture cannot show an intermediate frame.
  await page.addStyleTag({
    content: `
      [data-reveal], [data-reveal] *, [data-image-reveal] > * {
        opacity: 1 !important;
        transform: none !important;
        clip-path: none !important;
        transition: none !important;
      }
    `,
  });
  await page.waitForTimeout(600);

  const slug = ROUTE === '/' ? 'home' : ROUTE.replace(/^\//, '').replace(/\//g, '_');
  const out = `outputs/audit/${PREFIX}-${slug}-${WIDTH}.png`;
  await page.screenshot({ path: out, fullPage: true });

  const broken = await page.evaluate(() =>
    Array.from(document.images)
      .filter((img) => img.complete && img.naturalWidth === 0)
      .map((img) => img.currentSrc || img.src),
  );

  console.log(`${ROUTE} @${WIDTH} -> ${out}`);
  console.log(`  broken images: ${broken.length}`);
  broken.slice(0, 5).forEach((src) => console.log(`    - ${src}`));

  await browser.close();
})();
