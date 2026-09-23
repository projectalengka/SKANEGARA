/**
 * Cari elemen yang menyebabkan overflow horizontal di 320px.
 *
 * Aturan proyek: nol overflow horizontal di 320px. body sudah memakai
 * `overflow-x: clip` sebagai sabuk pengaman, jadi scrollWidth > clientWidth
 * pada documentElement berarti ada elemen yang lebih lebar dari viewport dan
 * clip-nya tidak menutupinya (clip hanya menyembunyikan, tapi elemen yang
 * memaksa layout tetap terdeteksi di scrollWidth).
 *
 * Yang dilaporkan: elemen mana, selebar apa, dan di mana batasnya.
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
  await page.waitForTimeout(900);

  const r = await page.evaluate(() => {
    const docW = document.documentElement.clientWidth;
    const offenders = [];

    for (const el of document.querySelectorAll('body *')) {
      const box = el.getBoundingClientRect();
      if (box.width < 1 || box.height < 1) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;

      const right = box.right;
      const left = box.left;
      /* Elemen yang melewati tepi kanan, atau mulai di sebelah kiri nol. */
      if (right > docW + 0.5 || left < -0.5) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: String(el.className).split(/\s+/).filter(Boolean).slice(0, 4).join(' '),
          left: Math.round(left),
          right: Math.round(right),
          width: Math.round(box.width),
          overflow: Math.round(right - docW),
          text: (el.textContent || '').trim().slice(0, 40),
          /* Apakah induknya sudah di-clip? Kalau iya, ini bukan penyebab. */
          clipped: (() => {
            let p = el.parentElement;
            while (p && p !== document.body) {
              const c = getComputedStyle(p);
              if (c.overflowX === 'hidden' || c.overflowX === 'clip') return true;
              p = p.parentElement;
            }
            return false;
          })(),
        });
      }
    }

    return {
      docW,
      scrollW: document.documentElement.scrollWidth,
      bodyScrollW: document.body.scrollWidth,
      offenders,
    };
  });

  console.log(`clientWidth=${r.docW}  documentElement.scrollWidth=${r.scrollW}  body.scrollWidth=${r.bodyScrollW}`);
  console.log(`overflow: ${r.scrollW - r.docW}px\n`);

  const real = r.offenders.filter((o) => !o.clipped);
  const clipped = r.offenders.filter((o) => o.clipped);

  console.log(`elemen melewati tepi: ${r.offenders.length}  (${real.length} tanpa induk ter-clip)\n`);

  const show = (list, label) => {
    if (!list.length) return;
    console.log(`--- ${label} ---`);
    list.sort((a, b) => b.overflow - a.overflow).slice(0, 14).forEach((o) => {
      console.log(`  +${String(o.overflow).padStart(4)}px  ${o.tag}.${o.cls}`.slice(0, 100));
      console.log(`          left=${o.left} right=${o.right} w=${o.width}  "${o.text}"`);
    });
    console.log();
  };
  show(real, 'PENYEBAB (tanpa induk ter-clip)');
  show(clipped, 'ter-clip induknya (bukan penyebab)');

  await browser.close();
})();
