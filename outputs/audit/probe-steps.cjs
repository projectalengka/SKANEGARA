/**
 * Apakah clamp()-nya benar-benar bekerja?
 *
 * Probe sebelumnya melaporkan hero=56px di SEMUA lebar layar — termasuk 1440px.
 * Kalau benar, clamp tidak resolve dan skala tidak fluid sama sekali. Tapi
 * probe itu sendiri baru saja terbukti salah hitung di dua tempat lain, jadi
 * jangan percaya angkanya. Tanyakan langsung ke browser.
 *
 * Yang diperiksa:
 *   1. Nilai --step-N yang benar-benar dipakai browser (bukan yang tertulis)
 *   2. Ukuran computed dari elemen h1 terbesar di halaman
 *   3. Apakah panjang stylesheet benar-benar memuat --step-8
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.argv[2] || 'http://127.0.0.1:3000';

const STEPS = ['--step--2', '--step--1', '--step-0', '--step-1', '--step-2', '--step-3',
  '--step-4', '--step-5', '--step-6', '--step-7', '--step-8'];

(async () => {
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    const browser = await chromium.launch({ executablePath: CHROME, headless: true });
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(250);

    const r = await page.evaluate((steps) => {
      const cs = getComputedStyle(document.documentElement);
      const vals = {};
      for (const s of steps) vals[s] = parseFloat(cs.getPropertyValue(s));

      /* The actual rendered hero: the largest h1 on the page. */
      const h1s = Array.from(document.querySelectorAll('h1'));
      const heroPx = h1s.length
        ? Math.max(...h1s.map((h) => parseFloat(getComputedStyle(h).fontSize)))
        : 0;

      /* Is --step-8 even in the served CSS? */
      let foundDecl = false;
      let sheetCount = 0;
      for (const sheet of document.styleSheets) {
        sheetCount++;
        try {
          const txt = Array.from(sheet.cssRules).map((x) => x.cssText).join('');
          if (txt.includes('--step-8')) foundDecl = true;
        } catch {}
      }

      /* Longest-prose element: the real body copy. */
      let bodyPx = 0;
      for (const el of document.querySelectorAll('p, li')) {
        const own = Array.from(el.childNodes).some(
          (n) => n.nodeType === 3 && n.textContent.trim().length > 80,
        );
        if (!own) continue;
        bodyPx = Math.max(bodyPx, parseFloat(getComputedStyle(el).fontSize));
      }

      return { vals, heroPx, bodyPx, foundDecl, sheetCount, h1count: h1s.length };
    }, STEPS);

    const stepsLine = STEPS.map((s) => `${s.replace('--step-', 's')}=${r.vals[s]}`).join(' ');
    console.log(`\n── ${width}px ` + '─'.repeat(46));
    console.log(`   ${stepsLine}`);
    console.log(`   h1 count=${r.h1count}  hero=${r.heroPx}px  body=${r.bodyPx}px  ` +
      `hero/body=${r.bodyPx ? (r.heroPx / r.bodyPx).toFixed(2) : '—'}×`);
    console.log(`   --step-8 ada di CSS tersaji: ${r.foundDecl}  (${r.sheetCount} stylesheet)`);

    await browser.close();
  }
})();
