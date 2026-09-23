/**
 * Apakah "Keterampilan" 285/280 itu asli, atau artefak dari salinan sr-only?
 *
 * Hero.tsx menaruh judul dua kali: satu <span className="sr-only"> berisi
 * teks utuh untuk pembaca layar, satu lagi aria-hidden untuk mata. Probe yang
 * menelusuri seluruh node teks akan mengukur keduanya. Kalau kata terpanjang
 * hanya muncul di salinan sr-only, maka itu BUKAN luber yang terlihat —
 * sr-only diposisikan absolut dan di-clip, jadi ia tidak pernah meluber.
 *
 * Probe ini memisahkan keduanya dan melaporkan sumber setiap pengukuran.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.argv[2] || 'http://127.0.0.1:3000';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: 320, height: 800 } });
  await page.addInitScript(() => {
    try { localStorage.setItem('skagara:reduce-motion', '1'); } catch {}
  });

  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(500);

  const r = await page.evaluate(() => {
    const h1 = document.querySelector('.hero-editorial__title');
    const h1cs = getComputedStyle(h1);
    const h1box = h1.getBoundingClientRect();
    const avail = document.documentElement.clientWidth;
    const pad = parseFloat(h1cs.paddingLeft) + parseFloat(h1cs.paddingRight);
    const h1usable = Math.min(h1box.width, avail) - pad;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = `${h1cs.fontWeight} ${parseFloat(h1cs.fontSize)}px ${h1cs.fontFamily}`;
    const track = parseFloat(h1cs.letterSpacing) || 0;
    const measure = (w) => ctx.measureText(w).width + track * w.length;

    const out = { h1usable: Math.round(h1usable), h1font: parseFloat(h1cs.fontSize), parts: [] };

    /* Setiap bagian judul, terpisah, beserta apakah ia terlihat. */
    for (const el of h1.querySelectorAll(':scope > span, :scope span')) {
      const cs = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text) continue;
      const words = text.split(/\s+/).filter((w) => w.length > 1);
      let widest = { w: '', px: 0 };
      for (const w of words) {
        const px = measure(w);
        if (px > widest.px) widest = { w, px };
      }
      out.parts.push({
        cls: String(el.className || '').slice(0, 44),
        visible: cs.position !== 'absolute' || (parseFloat(cs.width) || 0) > 1,
        pos: cs.position,
        w: Math.round(box.width),
        h: Math.round(box.height),
        overflow: cs.overflow,
        widest: widest.w,
        widestPx: Math.round(widest.px),
        fits: Math.round(widest.px) <= Math.round(h1usable),
      });
    }

    /* Dan baris-baris yang benar-benar terlihat. */
    out.lines = [...h1.querySelectorAll('[data-hero-line]')].map((el) => {
      const t = (el.textContent || '').trim();
      const box = el.getBoundingClientRect();
      return { text: t, w: Math.round(box.width), px: Math.round(measure(t)), fits: measure(t) <= h1usable + 0.5 };
    });

    return out;
  });

  console.log(`h1 font-size ${r.h1font}px, lebar tersedia ${r.h1usable}px\n`);
  console.log('--- bagian di dalam h1 ---');
  for (const p of r.parts) {
    console.log(
      `  ${p.fits ? 'muat  ' : 'LUBER '} "${p.widest}" = ${p.widestPx}px  box ${p.w}x${p.h} pos=${p.pos} ovf=${p.overflow} | ${p.cls}`,
    );
  }
  console.log('\n--- baris yang terlihat ([data-hero-line]) ---');
  for (const l of r.lines) {
    console.log(`  ${l.fits ? 'muat  ' : 'LUBER '} "${l.text}" = ${l.px}px (box ${l.w}px)`);
  }

  await browser.close();
})();
