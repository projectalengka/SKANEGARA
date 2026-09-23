/**
 * Close-up screenshot of a single selector.
 *
 * A full-page shot hides element-level artefacts: a reveal animation that never
 * completed, text sitting under a line mask, an image at zero opacity. The
 * brief's own lesson is that a full-width capture conceals exactly what you are
 * looking for, so this zooms in on one element and reports its measured
 * geometry and computed styles — the numbers, not just the picture.
 *
 * Usage: node outputs/audit/shot-el.cjs <baseUrl> <selector> <out> [width]
 */
const { createRequire } = require('node:module');
const require2 = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = require2('playwright-core');

const BASE = process.argv[2] ?? 'http://127.0.0.1:3013';
const SELECTOR = process.argv[3] ?? 'main';
const OUT = process.argv[4] ?? 'outputs/audit/el.png';
const WIDTH = Number(process.argv[5] ?? 1440);

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });

  const page = await browser.newPage({ viewport: { width: WIDTH, height: 1100 } });
  await page.goto(`${BASE}${process.argv[6] ?? '/'}`, { waitUntil: 'load' });

  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1800);

  const target = page.locator(SELECTOR).first();
  const count = await page.locator(SELECTOR).count();

  // Measure what the eye cannot: opacity, transforms left mid-animation, and
  // whether an image actually decoded.
  const measured = await target.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const style = window.getComputedStyle(node);
    const images = Array.from(node.querySelectorAll('img')).map((img) => ({
      src: img.getAttribute('src') ?? img.currentSrc,
      complete: img.complete,
      naturalWidth: img.naturalWidth,
      opacity: window.getComputedStyle(img).opacity,
    }));
    const text = (node.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 120);
    return {
      rect: { w: Math.round(rect.width), h: Math.round(rect.height) },
      opacity: style.opacity,
      transform: style.transform,
      visibility: style.visibility,
      text,
      images,
    };
  });

  console.log(`selector "${SELECTOR}" — ${count} match(es)`);
  console.log(`  box: ${measured.rect.w}x${measured.rect.h}`);
  console.log(`  opacity: ${measured.opacity}  visibility: ${measured.visibility}`);
  console.log(`  transform: ${measured.transform}`);
  console.log(`  text: ${measured.text}`);
  for (const img of measured.images) {
    console.log(`  img: w=${img.naturalWidth} complete=${img.complete} opacity=${img.opacity} ${img.src}`);
  }

  await target.screenshot({ path: OUT });
  console.log(`  saved: ${OUT}`);

  await browser.close();
})();
