/**
 * Berapa lantai (floor) terbesar yang masih muat di layar 320px, per langkah?
 *
 * KENAPA PROBE INI ADA
 * --------------------
 * Lantai --step-8 sebelumnya ditetapkan 48px karena "Berkembang." (kata
 * terpanjang di situs) butuh 278px dari 280px yang tersedia. Angka 48 itu
 * benar, tapi ia lalu bertabrakan dengan lantai --step-7 yang juga 48px —
 * dan generator type-scale-final.cjs menolaknya dengan ×1.000 di 400px.
 *
 * Perbaikan yang benar bukan menebak angka baru, melainkan mengukur batas
 * atas setiap langkah yang benar-benar muncul sebagai judul di halaman.
 * Probe ini melakukannya: untuk setiap elemen judul, ia menaikkan font-size
 * sampai kata terpanjangnya tepat menyentuh lebar yang tersedia, lalu
 * melaporkan px terbesar itu DAN langkah mana yang memakainya.
 *
 * Jadi jawabannya berbentuk: "lantai --step-7 aman sampai N px, karena
 * elemen X dengan kata Y baru meluber di N+1 px."
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

  /* Langkah -> px terbesar yang muat, di seluruh halaman. */
  const limit = new Map();

  for (const path of PAGES) {
    await page.goto(BASE + path, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(400);

    const rows = await page.evaluate(() => {
      const avail = document.documentElement.clientWidth;
      const out = [];

      for (const el of document.querySelectorAll('h1, h2, h3, h4, .display')) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;

        /* Kumpulkan teks dengan pemisah pada batas blok — lihat catatan yang
         * sama di probe-wordfit.cjs: textContent menempelkan baris sehingga
         * menciptakan kata palsu. */
        const parts = [];
        const walkText = (node) => {
          for (const child of node.childNodes) {
            if (child.nodeType === 3) parts.push(child.textContent);
            else if (child.nodeType === 1) {
              const ccs = getComputedStyle(child);
              const isBlock = ccs.display === 'block' || ccs.display === 'flex' || ccs.display === 'grid';
              if (isBlock) parts.push(' ');
              walkText(child);
              if (isBlock) parts.push(' ');
            }
          }
        };
        walkText(el);
        const text = parts.join('').replace(/\s+/g, ' ').trim();
        if (!text) continue;

        const box = el.getBoundingClientRect();
        const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
        const usable = Math.min(box.width, avail) - pad;
        if (usable <= 0) continue;

        /* Hanya elemen satu baris: yang sudah membungkus tidak akan meluber. */
        const fs = parseFloat(cs.fontSize);
        const lineH = parseFloat(cs.lineHeight) || fs * 1.2;
        const lineCount = Math.round(box.height / lineH);
        const lineBreakCount = text.split(' ').length - 1;
        if (lineCount > 1 || lineBreakCount > 0) continue;

        /* Ukur kata terpanjang. */
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
        if (!widest.px) continue;

        out.push({
          tag: el.tagName.toLowerCase(),
          step: el.getAttribute('data-step') || '',
          fs,
          track,
          weight: cs.fontWeight,
          family: cs.fontFamily,
          word: widest.w,
          wordPxAtFs: widest.px,
          usable,
        });
      }
      return out;
    });

    for (const r of rows) {
      /* Skalakan linear: lebar kata tumbuh proporsional dengan font-size
       * (letter-spacing di situs ini dalam em, jadi ikut berskala).
       * fs_aman = fs_sekarang × (usable − margin) / wordPx.
       *
       * SARINGAN PENTING — varian pertama probe ini melaporkan "lantai aman
       * = 17.9px" untuk seluruh situs, yang jelas salah. Sebabnya: elemen yang
       * ukurannya kebetulan sudah pas (label 18px dengan kata "Kolaborasi"
       * 83px di ruang 83px) ikut dihitung sebagai pengikat, sehingga batasnya
       * dilaporkan = ukuran sekarang. Yang mengikat hanyalah elemen yang
       * benar-benar akan meluber kalau lantainya dinaikkan — jadi buang
       * elemen yang tidak berbagi langkah dengan judul terbesar. */
      const MARGIN = 0.5;
      const maxFs = (r.fs * (r.usable - MARGIN)) / r.wordPxAtFs;
      if (maxFs <= r.fs) continue; // sudah mentok di ukuran sekarang: bukan pengikat

      const prev = limit.get(r.tag);
      if (!prev || maxFs < prev.maxFs) {
        limit.set(r.tag, { ...r, maxFs, path });
      }
    }
  }

  console.log('=== lantai terbesar yang masih muat di 320px, per kata yang mengikat ===');
  const rows = [...limit.values()].sort((a, b) => a.maxFs - b.maxFs);
  for (const r of rows) {
    console.log(
      `  <${r.tag}> fs sekarang ${r.fs.toFixed(1)}px  →  aman sampai ${r.maxFs.toFixed(1)}px` +
        `   kata "${r.word}" (${Math.round(r.wordPxAtFs)}px / ${Math.round(r.usable)}px tersedia)  [${r.path}]`,
    );
  }

  const globalMax = rows.length ? rows[0].maxFs : 0;
  console.log(
    `\n  → lantai terbesar yang aman untuk SEMUA judul di 320px: ${globalMax.toFixed(1)}px` +
      (rows.length ? `  (dibatasi oleh "${rows[0].word}" di ${rows[0].path})` : ''),
  );

  await browser.close();
})();
