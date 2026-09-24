/**
 * Probe — garis horizontal apa saja yang tergambar di layar sempit, dan siapa
 * pemiliknya.
 *
 * ## Kenapa ada
 *
 * Laporan pemilik proyek, 24 September 2026: "ada bug pada tampilan mobile, ada
 * beberapa garis yang muncul gajelas" — dengan tiga tangkapan layar dari HP.
 *
 * "Garis yang muncul gajelas" adalah laporan yang mudah disalahtafsirkan. Garis
 * di situs ini semuanya `border-top`/`border-bottom` satu piksel dari token
 * `--color-line`, jadi tidak ada yang "muncul" begitu saja: setiap garis punya
 * elemen pemilik. Yang bisa salah ada tiga:
 *
 *   1. **Elemen pemiliknya kosong** — tingginya nol atau isinya tidak terlihat,
 *      sehingga yang tertinggal hanya garisnya. Ini yang paling sering terlihat
 *      seperti "garis entah dari mana".
 *   2. **Garisnya dobel** — dua elemen bersebelahan masing-masing menggambar
 *      garis, sehingga terbaca sebagai satu garis tebal atau dua garis rapat.
 *   3. **Garisnya memang sengaja**, tetapi jaraknya membuatnya terbaca sebagai
 *      kotak kosong alih-alih pemisah.
 *
 * Probe ini mengumpulkan **setiap** elemen yang menggambar garis, beserta
 * tinggi, lebar, teks miliknya sendiri, dan tetangga terdekatnya — supaya
 * ketiganya bisa dibedakan dari angka, bukan dari kesan.
 *
 * ## Pakai
 *
 *   BASE=https://skagara.vercel.app node outputs/probe-mobile-lines.mjs
 *   node outputs/probe-mobile-lines.mjs            # default 127.0.0.1:3000
 */

const BASE = process.env.BASE ?? 'http://127.0.0.1:3000';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const { createRequire } = await import('node:module');
const require = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = require('playwright-core');

const VIEWPORTS = [320, 390];

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

try {
  for (const width of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();

    await page.goto(`${BASE}/`, { waitUntil: 'load' });

    // Reveal berbasis IntersectionObserver hanya jalan saat elemen masuk
    // viewport. Digulir bertahap supaya seluruh halaman tenang sebelum diukur —
    // kalau tidak, elemen yang belum ter-reveal akan terukur dalam keadaan
    // bergeser dan laporannya menyesatkan.
    for (let i = 0; i < 14; i += 1) {
      await page.mouse.wheel(0, 700);
      await page.waitForTimeout(160);
    }
    await page.waitForTimeout(1200);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(600);

    const lines = await page.evaluate(() => {
      const out = [];

      /** Teks milik elemen itu sendiri, bukan seluruh keturunannya. */
      function ownText(el) {
        let text = '';
        for (const node of el.childNodes) {
          if (node.nodeType === Node.TEXT_NODE) text += node.textContent ?? '';
        }
        return text.trim().replace(/\s+/g, ' ').slice(0, 46);
      }

      /** Teks apa pun di dalamnya, untuk membedakan "kosong" dari "ada isinya". */
      function allText(el) {
        return (el.innerText ?? '').trim().replace(/\s+/g, ' ').slice(0, 46);
      }

      function classes(el) {
        return (el.className ?? '').toString().trim().split(/\s+/).slice(0, 3).join(' ');
      }

      const all = [...document.querySelectorAll('body *')];

      for (const el of all) {
        const cs = getComputedStyle(el);
        const top = parseFloat(cs.borderTopWidth) || 0;
        const bottom = parseFloat(cs.borderBottomWidth) || 0;
        if (top === 0 && bottom === 0) continue;

        const rect = el.getBoundingClientRect();
        if (rect.width < 8) continue;

        const docTop = rect.top + window.scrollY;

        out.push({
          y: Math.round(docTop),
          w: Math.round(rect.width),
          h: Math.round(rect.height),
          top,
          bottom,
          tag: el.tagName.toLowerCase(),
          cls: classes(el),
          own: ownText(el),
          inner: allText(el),
          // Elemen yang menggambar garis tetapi tidak memuat apa pun: inilah
          // kandidat "garis tanpa alasan".
          emptyish: allText(el).length === 0,
          children: el.children.length,
        });
      }

      return out.sort((a, b) => a.y - b.y);
    });

    console.log(`\n${'='.repeat(78)}`);
    console.log(`viewport ${width}px — ${lines.length} elemen menggambar garis`);
    console.log('='.repeat(78));

    for (const l of lines) {
      const flags = [];
      if (l.emptyish) flags.push('KOSONG');
      if (l.h <= 2) flags.push('tinggi<=2');
      if (l.top > 0 && l.bottom > 0) flags.push('garis atas+BAWAH');

      console.log(
        `y=${String(l.y).padStart(5)}  h=${String(l.h).padStart(4)}  w=${String(l.w).padStart(4)}  ` +
          `b=${l.top > 0 ? 'T' : '-'}${l.bottom > 0 ? 'B' : '-'}  ` +
          `${l.tag}.${l.cls}`,
      );
      if (l.own) console.log(`         teks sendiri: "${l.own}"`);
      else if (l.inner) console.log(`         teks di dalam: "${l.inner}"`);
      if (flags.length) console.log(`         >>> ${flags.join(', ')}`);
    }

    await page.screenshot({
      path: `outputs/screenshots/mobile-lines-${width}.png`,
      fullPage: true,
    });
    console.log(`\ntangkapan layar penuh: outputs/screenshots/mobile-lines-${width}.png`);

    await context.close();
  }
} finally {
  await browser.close();
}

console.log('\nSelesai.\n');
