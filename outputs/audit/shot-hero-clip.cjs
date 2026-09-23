/**
 * Tangkapan close-up judul hero di 320px, untuk MEMBUKTIKAN apakah 5px yang
 * dipotong itu benar-benar terlihat. Angka menunjukkan "Keterampilan" 285px di
 * dalam mask 280px; mata perlu memastikan huruf terakhirnya betul terpotong,
 * bukan sekadar dihitung oleh kanvas.
 *
 * Sesuai aturan proyek: tangkapan seluruh section menyembunyikan artefak, jadi
 * yang diambil adalah elemen judulnya sendiri, di-zoom.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.argv[2] || 'http://127.0.0.1:3000';
const OUT = 'outputs/audit';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });

  for (const width of [320, 390]) {
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      deviceScaleFactor: 3, // 3× supaya tepi huruf terlihat jelas
    });
    await page.addInitScript(() => {
      try { localStorage.setItem('skagara:reduce-motion', '1'); } catch {}
    });
    await page.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(700);

    const el = await page.$('.hero-editorial__title');
    const box = await el.boundingBox();

    /* Padding kecil di sekeliling supaya tepi kanan mask terlihat sebagai
     * garis lurus — di situlah pemotongan terjadi. */
    await page.screenshot({
      path: `${OUT}/hero-clip-${width}.png`,
      clip: {
        x: Math.max(0, box.x - 8),
        y: Math.max(0, box.y - 8),
        width: Math.min(box.width + 16, width - Math.max(0, box.x - 8)),
        height: box.height + 16,
      },
    });
    console.log(`  ${OUT}/hero-clip-${width}.png  (${Math.round(box.width)}×${Math.round(box.height)} css px, 3× dpr)`);

    await page.close();
  }

  await browser.close();
})();
