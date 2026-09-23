/**
 * Berapa sebenarnya nilai 0.3425vw pada viewport 1440px, dan berapa hasil
 * calc(1.5673rem + 0.3425vw)?
 *
 * Perhitungan JS saya mengatakan suku itu = 104px di 1440px. Browser
 * mengatakan clamp-nya menempel di lantai 47px. Salah satu dari keduanya
 * salah, dan cara memutuskan bukan dengan berdebat melainkan dengan mengukur
 * langsung di mesin yang mengevaluasinya.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });

  for (const width of [400, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    await page.goto('about:blank');

    const r = await page.evaluate(() => {
      const mk = (css) => {
        const d = document.createElement('div');
        d.style.cssText =
          'position:absolute;visibility:hidden;font-size:1000px;width:' + css + ';height:0';
        document.body.appendChild(d);
        const w = d.getBoundingClientRect().width;
        d.remove();
        return w;
      };
      const mkFont = (css) => {
        const d = document.createElement('div');
        d.style.cssText = 'position:absolute;visibility:hidden;font-size:' + css;
        document.body.appendChild(d);
        const w = parseFloat(getComputedStyle(d).fontSize);
        d.remove();
        return w;
      };
      return {
        rootFont: parseFloat(getComputedStyle(document.documentElement).fontSize),
        vw1: mk('1vw'),
        vw03425: mk('0.3425vw'),
        vw02404: mk('0.2404vw'),
        rem1: mk('1rem'),
        font_step8: mkFont('clamp(2.9375rem, 1.5673rem + 0.3425vw, 6.5rem)'),
        font_plain: mkFont('calc(1.5673rem + 0.3425vw)'),
        font_A_only: mkFont('1.5673rem'),
        font_B_only: mkFont('0.3425vw'),
      };
    });

    console.log(`\n=== viewport ${width}px (root font ${r.rootFont}px) ===`);
    console.log(`  1vw        = ${r.vw1.toFixed(3)}px`);
    console.log(`  0.3425vw   = ${r.vw03425.toFixed(3)}px`);
    console.log(`  0.2404vw   = ${r.vw02404.toFixed(3)}px`);
    console.log(`  1rem       = ${r.rem1.toFixed(3)}px`);
    console.log(`  1.5673rem  = ${r.font_A_only.toFixed(3)}px   (suku A saja)`);
    console.log(`  0.3425vw   = ${r.font_B_only.toFixed(3)}px   (suku B saja, sebagai font-size)`);
    console.log(`  calc(A+B)  = ${r.font_plain.toFixed(3)}px   (suku pilihan telanjang)`);
    console.log(`  clamp(...) = ${r.font_step8.toFixed(3)}px   (setelah clamp)`);
    console.log(`  A+B px     = ${(r.font_A_only + r.font_B_only).toFixed(3)}px  (jumlah manual)`);

    await page.close();
  }

  await browser.close();
})();
