/**
 * Kontrak yang paling mudah rusak oleh sebuah gerbang: kalau gerbangnya tidak
 * pernah terbuka, konten selamanya tersembunyi.
 *
 * Dua skenario yang diuji:
 *
 *   1. Tanpa JavaScript. `.js` tidak pernah ditambahkan ke <html>, jadi aturan
 *      `opacity: 0` tidak berlaku dan konten harus terlihat penuh.
 *   2. Reduced motion. Observer mengambil jalur `staticMode`; konten harus
 *      terlihat, dan tidak boleh ada transisi.
 *
 * Yang diukur adalah opasitas terhitung elemen sasaran — bukan sekadar
 * keberadaan atribut. "Atribut ada" tidak membuktikan teks terlihat.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:3001';
const PAGES = ['/', '/tentang', '/program-keahlian', '/kegiatan', '/karya', '/galeri'];

async function check(label, contextOpts, wait) {
  let worst = 1;
  let hidden = 0;
  let withJsClass = 0;
  for (const path of PAGES) {
    const browser = await chromium.launch({ executablePath: CHROME, headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...contextOpts });
    const page = await context.newPage();
    await page.goto(BASE + path, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(wait);

    const r = await page.evaluate(() => {
      const hasJs = document.documentElement.classList.contains('js');
      const all = Array.from(document.querySelectorAll('[data-reveal], [data-image-reveal]'));
      let min = 1;
      let zero = 0;
      for (const e of all) {
        const o = parseFloat(getComputedStyle(e).opacity);
        if (o < min) min = o;
        if (o === 0) zero++;
      }
      return { hasJs, total: all.length, min, zero };
    });

    if (r.hasJs) withJsClass++;
    if (r.zero > 0) hidden += r.zero;
    if (r.min < worst) worst = r.min;
    console.log(
      `  ${path.padEnd(18)} .js=${r.hasJs ? 'yes' : 'no '}  targets=${String(r.total).padStart(3)}  minOpacity=${r.min.toFixed(2)}  fullyHidden=${r.zero}`,
    );
    await browser.close();
  }
  console.log(`  => ${label}: pages with .js = ${withJsClass}/${PAGES.length}, fully-hidden elements = ${hidden}, worst opacity = ${worst}\n`);
  return hidden;
}

(async () => {
  console.log('=== 1. JavaScript disabled ===');
  await check('no-JS', { javaScriptEnabled: false }, 1200);

  console.log('=== 2. prefers-reduced-motion: reduce ===');
  await check('reduced-motion', { reducedMotion: 'reduce' }, 1500);
})();
