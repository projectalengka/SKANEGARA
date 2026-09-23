/**
 * Pembuktian terakhir: wordmark footer yang dilaporkan "semu" (291px / 280px)
 * itu benar-benar menumpuk dua baris — bukan kata tunggal yang terpotong.
 *
 * Probe menandainya "semu" berdasarkan lines=2, tapi flag itu sendiri adalah
 * asumsi. Aturan proyek: lihat bendanya. Jadi footer diambil close-up di 320px
 * dan diperiksa dengan mata.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.argv[2] || 'http://127.0.0.1:3000';
const OUT = 'outputs/audit';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: 320, height: 900 }, deviceScaleFactor: 3 });
  await page.addInitScript(() => {
    try { localStorage.setItem('skagara:reduce-motion', '1'); } catch {}
  });
  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(800);

  /* Cari <p> wordmark di footer: elemen dengan teks "SMK" + "Jayanegara". */
  const info = await page.evaluate(() => {
    for (const el of document.querySelectorAll('footer p')) {
      const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!/SMK\s*Jayanegara/.test(t)) continue;
      const cs = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      return {
        found: true,
        text: t,
        px: parseFloat(cs.fontSize),
        h: Math.round(box.height),
        w: Math.round(box.width),
        lineHeight: parseFloat(cs.lineHeight),
        /* Berapa baris kalau tingginya dibagi line-height? */
        impliedLines: Math.round(box.height / parseFloat(cs.lineHeight)),
        /* Apakah ada <br> di dalamnya? Itu yang memaksa baris. */
        hasBr: !!el.querySelector('br'),
        innerHTML: el.innerHTML.slice(0, 90),
      };
    }
    return { found: false };
  });

  console.log(`  wordmark footer: ${JSON.stringify(info, null, 2)}`);

  if (info.found) {
    const el = await page.evaluateHandle(() => {
      for (const p of document.querySelectorAll('footer p')) {
        if (/SMK\s*Jayanegara/.test((p.textContent || '').replace(/\s+/g, ' '))) return p;
      }
      return null;
    });
    const handle = el.asElement();
    if (handle) {
      await handle.screenshot({ path: `${OUT}/footer-wordmark-320.png` });
      console.log(`  ${OUT}/footer-wordmark-320.png`);
    }
  }

  await browser.close();
})();
