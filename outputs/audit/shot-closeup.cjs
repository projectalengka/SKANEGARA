/**
 * Close-up elemen yang dulu gagal hidrasi.
 *
 * Ukuran penuh tidak membuktikan apa pun di sini: `opacity: 1` dan
 * `clip-path: inset(0 0 0 0)` bisa benar sementara gambarnya tetap terpotong
 * oleh elemen induk. Karena itu diukur juga `clip-path` terhitung DAN
 * bounding-box anaknya.
 *
 * Usage: node outputs/audit/shot-closeup.cjs <base> <route> <selector> <out>
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.argv[2] || 'http://127.0.0.1:3000';
const ROUTE = process.argv[3] || '/kegiatan';
const SELECTOR = process.argv[4] || '[data-image-reveal]';
const OUT = process.argv[5] || 'outputs/audit/closeup.png';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(BASE + ROUTE, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1500);

  // Turunkan sedikit supaya sasaran masuk viewport dan reveal berjalan.
  await page.mouse.wheel(0, 700);
  await page.waitForTimeout(2200);

  const info = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const child = el.firstElementChild;
    const cs = getComputedStyle(el);
    const ccs = child ? getComputedStyle(child) : null;
    const cb = child ? child.getBoundingClientRect() : null;
    const eb = el.getBoundingClientRect();
    return {
      revealed: el.hasAttribute('data-revealed'),
      opacity: cs.opacity,
      parentClip: cs.clipPath,
      childClip: ccs ? ccs.clipPath : null,
      childTransform: ccs ? ccs.transform : null,
      elBox: `${Math.round(eb.width)}x${Math.round(eb.height)}`,
      childBox: cb ? `${Math.round(cb.width)}x${Math.round(cb.height)}` : null,
      // Anak terpotong? Bandingkan lebar anak dengan induk.
      childFillsParent: cb ? Math.abs(cb.width - eb.width) < 2 : null,
    };
  }, SELECTOR);

  console.log(`route ${ROUTE} selector ${SELECTOR}`);
  console.log(JSON.stringify(info, null, 2));

  const el = await page.$(SELECTOR);
  if (el) await el.screenshot({ path: OUT });
  console.log(`saved ${OUT}`);

  await browser.close();
})();
