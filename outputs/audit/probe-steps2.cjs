/**
 * Ukur ukuran render sebenarnya dari setiap tingkat hierarki.
 *
 * Dua probe sebelumnya salah. Yang pertama menandai "body" hanya kalau elemen
 * punya simpul teks >60 karakter, jadi halaman yang teksnya lebih pendek
 * dilaporkan body=0. Yang kedua membaca custom property dari
 * getComputedStyle(documentElement) dan dapat NaN, karena browser tidak
 * menyelesaikan clamp() di properti kustom :root pada konteks itu.
 *
 * Pelajaran yang sama seperti catatan proyek: opacity yang benar tidak
 * membuktikan teks terlihat. Jadi di sini setiap tingkat diukur dari
 * getBoundingClientRect dan fontSize elemen yang benar-benar dirender, dengan
 * selector yang bisa diperiksa ulang.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.argv[2] || 'http://127.0.0.1:3000';

(async () => {
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    const browser = await chromium.launch({ executablePath: CHROME, headless: true });
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(300);

    const r = await page.evaluate(() => {
      const px = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const cs = getComputedStyle(el);
        const box = el.getBoundingClientRect();
        return {
          px: parseFloat(cs.fontSize),
          w: Math.round(box.width),
          fit: el.scrollWidth <= el.clientWidth + 1,
          text: (el.textContent || '').trim().slice(0, 26),
        };
      };

      /* Resolve the clamp by measuring a throwaway element that uses it. */
      const probe = document.createElement('div');
      probe.style.position = 'absolute';
      probe.style.visibility = 'hidden';
      document.body.appendChild(probe);
      const steps = {};
      for (const s of ['--step--2', '--step--1', '--step-0', '--step-1', '--step-2',
        '--step-3', '--step-4', '--step-5', '--step-6', '--step-7', '--step-8']) {
        probe.style.fontSize = `var(${s})`;
        steps[s] = parseFloat(getComputedStyle(probe).fontSize);
      }
      probe.remove();

      return {
        steps,
        hero: px('h1'),
        kicker: px('.label'),
      };
    });

    const s = r.steps;
    console.log(`\n── ${width}px ` + '─'.repeat(44));
    console.log(
      '   s-2=' + s['--step--2'] + '  s-1=' + s['--step--1'] + '  s0=' + s['--step-0'] +
      '  s1=' + s['--step-1'] + '  s2=' + s['--step-2'] + '  s3=' + s['--step-3'],
    );
    console.log(
      '   s4=' + s['--step-4'] + '  s5=' + s['--step-5'] + '  s6=' + s['--step-6'] +
      '  s7=' + s['--step-7'] + '  s8=' + s['--step-8'],
    );
    if (r.hero) {
      console.log(
        `   hero h1 = ${r.hero.px}px  (${r.hero.w}px lebar, muat=${r.hero.fit})  "${r.hero.text}"`,
      );
    }
    if (r.kicker) console.log(`   label   = ${r.kicker.px}px  "${r.kicker.text}"`);
    console.log(
      `   hero/body = ${(r.hero.px / s['--step-0']).toFixed(2)}×   ` +
      `hero/label = ${(r.hero.px / s['--step--2']).toFixed(2)}×`,
    );

    await browser.close();
  }
})();
