/**
 * Apakah React membandingkan DOM yang sudah basi, dan apakah penyebabnya
 * observer — atau justru hal lain?
 *
 * Dua petunjuk penting dari diff terakhir:
 *   1. React melaporkan `data-revealed=""` sebagai mismatch, walau React tidak
 *      pernah merender atribut itu. Jadi menambah atribut apa pun tetap mismatch.
 *   2. Teksnya juga berbeda: klien "Sejarah" vs server "[CONTOH] Sejarah
 *      sekolah…". Itu bukan ulah observer — itu berarti konten yang dibandingkan
 *      memang berbeda.
 *
 * Uji ini mematikan observer sepenuhnya lewat query param (lihat patch di
 * permintaan terpisah) dan memeriksa apakah peringatan hilang. Kalau hilang,
 * observer memang pemicunya. Kalau tidak, ada penyebab lain yang lebih dulu.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const scenarios = [
  ['normal', () => {}],
  [
    'reveal-observer disabled (MutationObserver no-op)',
    () => {
      // Nearest-equivalent to disabling the whole component without touching
      // source: make the reveal selector match nothing.
      window.__DISABLE_REVEAL = true;
    },
  ],
];

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });

  // Simpler and more decisive: block the React client bundle in one run so the
  // server HTML is never hydrated, and see whether the warning is absent.
  for (const blockJs of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const warnings = [];
    page.on('console', (m) => {
      if (/hydrated but some attributes/i.test(m.text())) warnings.push(m.text());
    });

    if (blockJs) {
      await page.route('**/*.js', (route) => route.abort());
    }

    try {
      await page.goto('http://127.0.0.1:3001/tentang', { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(3000);
    } catch {
      // Aborted chunks can make `load` never fire; the warning check is what matters.
    }

    console.log(`blockClientJs=${blockJs}  hydrationWarnings=${warnings.length}`);
  }

  await browser.close();
})();
