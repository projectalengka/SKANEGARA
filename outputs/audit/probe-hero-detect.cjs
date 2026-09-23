/**
 * Unsur mana yang dianggap "judul terbesar" oleh probe-type, dan mengapa
 * nilainya 47px di 1440px (seharusnya 104px)?
 *
 * probe-type memilih hero = Math.max dari ukuran elemen yang lolos saringannya.
 * Saringannya mensyaratkan elemen memiliki node teks LANGSUNG (bukan hanya
 * berisi elemen lain). Judul hero berbentuk
 *   <h1><span class="sr-only">…</span><span aria-hidden><span class=line-mask>…</span></span></h1>
 * jadi h1 tidak punya teks langsung dan dilewati.
 *
 * Probe ini mencetak 10 elemen terbesar di / pada 1440px, jadi terlihat mana
 * yang sebenarnya terdeteksi dan mana yang hilang.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.argv[2] || 'http://127.0.0.1:3000';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });

  for (const width of [320, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.addInitScript(() => {
      try { localStorage.setItem('skagara:reduce-motion', '1'); } catch {}
    });
    await page.goto(BASE + '/', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(600);

    const r = await page.evaluate(() => {
      /* 1. Yang lolos saringan probe-type (punya node teks langsung). */
      const kept = [];
      for (const el of document.querySelectorAll('body *')) {
        const own = Array.from(el.childNodes).some(
          (n) => n.nodeType === 3 && n.textContent.trim().length > 1,
        );
        if (!own) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const box = el.getBoundingClientRect();
        if (box.width < 2 || box.height < 2) continue;
        if (parseFloat(cs.opacity) < 0.05) continue;
        kept.push({
          px: parseFloat(cs.fontSize),
          tag: el.tagName.toLowerCase(),
          cls: String(el.className).split(/\s+/).filter(Boolean).slice(0, 2).join(' '),
          text: (el.textContent || '').trim().slice(0, 26),
        });
      }

      /* 2. Judul hero yang sebenarnya, terlepas dari saringan. */
      const h1 = document.querySelector('.hero-editorial__title');
      const heroReal = h1 ? parseFloat(getComputedStyle(h1).fontSize) : null;

      /* 3. Elemen mana yang punya node teks langsung di dalam h1? */
      const ownInH1 = [];
      if (h1) {
        for (const el of h1.querySelectorAll('*')) {
          const own = Array.from(el.childNodes).some(
            (n) => n.nodeType === 3 && n.textContent.trim().length > 1,
          );
          ownInH1.push({
            tag: el.tagName.toLowerCase(),
            cls: String(el.className).slice(0, 34),
            ownText: own,
            px: parseFloat(getComputedStyle(el).fontSize),
          });
        }
      }

      return { kept, heroReal, ownInH1 };
    });

    console.log(`\n=== ${width}px ===`);
    console.log(`  judul hero sebenarnya (h1 .hero-editorial__title): ${r.heroReal}px`);
    console.log(`  terbesar yang LOLOS saringan probe-type: ${Math.max(...r.kept.map((k) => k.px))}px`);
    console.log('  5 elemen terbesar yang lolos:');
    for (const k of r.kept.sort((a, b) => b.px - a.px).slice(0, 5)) {
      console.log(`    ${String(k.px).padStart(6)}px  <${k.tag}> ${k.cls}  "${k.text}"`);
    }
    console.log('  di dalam h1, mana yang punya teks langsung:');
    for (const o of r.ownInH1) {
      console.log(`    ${o.ownText ? 'ya  ' : 'tidak'} ${String(o.px).padStart(6)}px  <${o.tag}> ${o.cls}`);
    }

    await page.close();
  }

  await browser.close();
})();
