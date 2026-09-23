/**
 * Dump setiap judul di 320px beserta metriknya — bahan mentah untuk
 * probe-floor.cjs. Dibuat karena varian pertama probe-floor melaporkan
 * "lantai aman = 17.9px", yang jelas salah: itu berarti seluruh judul besar
 * di situs sedang meluber, padahal probe-overflow melaporkan bersih.
 *
 * Tersangka: elemen yang ukurannya sudah pas (mis. label 18px dengan kata
 * "Kolaborasi" 83px di ruang 83px) ikut dihitung sebagai pengikat, sehingga
 * batasnya dilaporkan = ukuran sekarang. Dump ini membuktikannya.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.argv[2] || 'http://127.0.0.1:3000';
const PAGES = ['/', '/tentang', '/program-keahlian', '/kegiatan', '/karya', '/galeri', '/berita', '/kontak'];

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: 320, height: 800 } });
  await page.addInitScript(() => {
    try { localStorage.setItem('skagara:reduce-motion', '1'); } catch {}
  });

  for (const path of PAGES) {
    await page.goto(BASE + path, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(400);

    const rows = await page.evaluate(() => {
      const avail = document.documentElement.clientWidth;
      const out = [];

      for (const el of document.querySelectorAll('h1, h2, h3, h4, .display')) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;

        const parts = [];
        const walk = (n) => {
          for (const c of n.childNodes) {
            if (c.nodeType === 3) parts.push(c.textContent);
            else if (c.nodeType === 1) {
              const x = getComputedStyle(c);
              const b = x.display === 'block' || x.display === 'flex' || x.display === 'grid';
              if (b) parts.push(' ');
              walk(c);
              if (b) parts.push(' ');
            }
          }
        };
        walk(el);
        const text = parts.join('').replace(/\s+/g, ' ').trim();
        if (!text) continue;

        const box = el.getBoundingClientRect();
        const fs = parseFloat(cs.fontSize);
        const lineH = parseFloat(cs.lineHeight) || fs * 1.2;
        const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
        const usable = Math.min(box.width, avail) - pad;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const track = parseFloat(cs.letterSpacing) || 0;
        ctx.font = `${cs.fontWeight} ${fs}px ${cs.fontFamily}`;

        const words = text.split(/\s+/).filter((w) => w.length > 1);
        let widest = { w: '', px: 0 };
        for (const w of words) {
          const px = ctx.measureText(w).width + track * w.length;
          if (px > widest.px) widest = { w, px };
        }

        out.push({
          tag: el.tagName.toLowerCase(),
          cls: String(el.className || '').slice(0, 40),
          fs: +fs.toFixed(1),
          lineCount: Math.round(box.height / lineH),
          breaks: text.split(' ').length - 1,
          word: widest.w,
          wordPx: Math.round(widest.px),
          usable: Math.round(usable),
          text: text.slice(0, 32),
        });      }
      return out;
    });

    console.log(`\n--- ${path}`);
    for (const r of rows) {
      /* Tandai mana yang BENAR-BENAR meluber. Elemen multi-baris tidak bisa
       * meluber secara horizontal: browser sudah membungkusnya. Ini yang
       * membuat wordmark footer ("SMK" di atas "Jayanegara") dan judul dengan
       * <br> ("Agenda" + "sekolah.") terlihat seperti bug padahal bukan —
       * textContent menempelkan barisnya menjadi satu kata palsu. */
      const real = r.wordPx > r.usable + 0.5 && r.lineCount <= 1 && r.breaks === 0;
      const over = r.wordPx > r.usable + 0.5;
      const mark = real ? 'LUBER' : over ? 'semu ' : 'muat ';
      console.log(
        `  ${mark} <${r.tag}> ${String(r.fs).padStart(5)}px  lines=${r.lineCount} breaks=${r.breaks}` +
          ` | "${r.word}" ${r.wordPx}/${r.usable} | "${r.text}" | ${r.cls}`,
      );
    }
  }

  await browser.close();
})();
