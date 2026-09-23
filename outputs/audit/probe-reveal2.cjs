/**
 * Measures whether reveal targets are actually visible after being scrolled past.
 *
 * ## The mistake this probe exists to correct
 *
 * The first version scrolled the whole page and then scrolled back to the top
 * before counting. That produces a misleading number twice over:
 *
 *   1. Elements below the fold have not been revealed yet — correctly, because
 *      the visitor has not looked at them.
 *   2. `observer.unobserve()` is one-shot by design, so once an element *has*
 *      revealed it stays revealed.
 *
 * So "18 of 55 revealed" on the homepage was not a bug count at all; it was
 * mostly elements waiting their turn. The number that matters is the one taken
 * **per element, while it is in the viewport**: was this thing visible when a
 * visitor was looking straight at it?
 *
 * That is what this measures. For each target it scrolls the element into view,
 * waits for the transition, and only then asks whether the clip-path is open.
 * A target that is clipped while centred in the viewport is the bug — loaded,
 * opaque, and masked out of the document.
 *
 * Usage: node outputs/audit/probe-reveal2.cjs <baseUrl> [route...]
 */

const { createRequire } = require('node:module');
const require2 = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = require2('playwright-core');

const BASE = process.argv[2] ?? 'http://127.0.0.1:3014';
const ROUTES = process.argv.slice(3);
if (ROUTES.length === 0) ROUTES.push('/');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });

  let totalChecked = 0;
  let totalHidden = 0;

  for (const route of ROUTES) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(`${BASE}${route}`, { waitUntil: 'load' });
    await page.waitForTimeout(800);

    const count = await page.locator('[data-reveal], [data-image-reveal]').count();
    const failures = [];

    for (let i = 0; i < count; i += 1) {
      const element = page.locator('[data-reveal], [data-image-reveal]').nth(i);

      // Centre the element in the viewport — the state in which a visitor is
      // unambiguously looking at it.
      await element.scrollIntoViewIfNeeded();
      await page.waitForTimeout(420);

      const state = await element.evaluate((node) => {
        const style = window.getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        // Parse `inset(a b c d)`. The top/bottom pair is what hides the element.
        const clip = style.clipPath || '';
        const match = clip.match(/inset\(([^)]+)\)/);
        const parts = match ? match[1].trim().split(/\s+/) : [];
        const bottom = parts[2] ?? parts[0] ?? '0px';
        const bottomPct = parseFloat(bottom);
        return {
          hidden: clip.includes('inset') && bottomPct >= 99,
          clip,
          opacity: style.opacity,
          height: Math.round(rect.height),
          tag: node.tagName,
          text: (node.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40),
        };
      });

      if (state.hidden) {
        failures.push({ index: i, ...state });
      }
    }

    totalChecked += count;
    totalHidden += failures.length;

    const badge = failures.length === 0 ? 'OK' : 'GAGAL';
    console.log(`${route.padEnd(20)} ${badge}  ${count - failures.length}/${count} terlihat`);

    for (const failure of failures.slice(0, 6)) {
      console.log(
        `    #${failure.index} <${failure.tag}> h=${failure.height} opacity=${failure.opacity} ` +
          `clip=${failure.clip} "${failure.text}"`,
      );
    }

    await page.close();
  }

  console.log(`\nTotal: ${totalChecked - totalHidden}/${totalChecked} terlihat saat berada di viewport`);
  console.log(totalHidden === 0 ? 'Tidak ada elemen yang tetap tersembunyi.' : `${totalHidden} elemen tetap tersembunyi.`);

  await browser.close();
  process.exitCode = totalHidden === 0 ? 0 : 1;
})();
