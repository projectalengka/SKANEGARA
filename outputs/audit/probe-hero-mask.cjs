/**
 * Mengapa close-up judul hero terlihat KOSONG padahal h1 punya teks?
 *
 * Screenshot hero-clip-320.png hanya memperlihatkan garis tipis — teksnya tidak
 * ada. Ini persis pelajaran yang sudah tercatat untuk proyek ini: "opacity
 * benar tidak membuktikan teks terlihat". Reveal memakai line-mask + pergeseran
 * y lewat GSAP, jadi kemungkinan besar barisnya masih berada DI LUAR mask-nya
 * saat tangkapan diambil — entah karena animasi belum jalan (reduce-motion
 * mematikannya) atau karena probe menangkap sebelum GSAP menyelesaikan set-nya.
 *
 * Probe ini mengukur transform/opacity setiap lapisan mask dan barisnya, jadi
 * jawabannya berupa angka, bukan dugaan.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.argv[2] || 'http://127.0.0.1:3000';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });

  for (const rm of [true, false]) {
    const page = await browser.newPage({ viewport: { width: 320, height: 900 } });
    await page.addInitScript((reduce) => {
      try {
        if (reduce) localStorage.setItem('skagara:reduce-motion', '1');
        else localStorage.removeItem('skagara:reduce-motion');
      } catch {}
    }, rm);
    await page.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });
    /* Beri waktu penuh untuk GSAP menyelesaikan set awal + reveal. */
    await page.waitForTimeout(2500);

    const r = await page.evaluate(() => {
      const rows = [];
      for (const el of document.querySelectorAll('.hero-editorial__title [class*="line-mask"], .hero-editorial__title [data-hero-line]')) {
        const cs = getComputedStyle(el);
        const box = el.getBoundingClientRect();
        rows.push({
          cls: String(el.className || '').slice(0, 40),
          text: (el.textContent || '').trim().slice(0, 22),
          transform: cs.transform,
          opacity: cs.opacity,
          visibility: cs.visibility,
          top: Math.round(box.top),
          height: Math.round(box.height),
          clip: cs.clipPath,
        });
      }
      const h1 = document.querySelector('.hero-editorial__title');
      const h1box = h1.getBoundingClientRect();
      return {
        reduced: document.documentElement.dataset.reduceMotion || (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'media' : '-'),
        h1: { top: Math.round(h1box.top), height: Math.round(h1box.height) },
        rows,
      };
    });

    console.log(`\n=== reduce-motion diminta: ${rm}  (terdeteksi: ${r.reduced}) ===`);
    console.log(`  h1 box: top=${r.h1.top} height=${r.h1.height}`);
    for (const x of r.rows) {
      console.log(
        `  "${x.text}" ${x.cls}\n      transform=${x.transform} opacity=${x.opacity} vis=${x.visibility} top=${x.top} h=${x.height} clip=${x.clip}`,
      );
    }

    await page.close();
  }

  await browser.close();
})();
