/**
 * Cari judul yang kata terpanjangnya lebih lebar dari viewport 320px.
 *
 * Ini kelas bug yang tidak terlihat dari membaca kode: ukuran langkahnya benar,
 * skalanya proporsional, tapi satu kata panjang pada langkah terbesar melebihi
 * lebar layar ponsel. `body { overflow-x: clip }` menyembunyikannya, jadi
 * halaman tampak baik-baik saja sambil diam-diam memotong huruf.
 *
 * Yang dilakukan: untuk setiap elemen heading, ukur lebar kata terpanjangnya
 * yang dirender, lalu bandingkan dengan lebar yang tersedia di dalam gutter.
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

  let problems = 0;

  for (const path of PAGES) {
    await page.goto(BASE + path, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(500);

    const r = await page.evaluate(() => {
      const avail = document.documentElement.clientWidth;
      const out = [];

      for (const el of document.querySelectorAll('h1, h2, h3, h4, .display')) {
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;

        const fs = parseFloat(cs.fontSize);

        /* textContent menempelkan baris tanpa pemisah, sehingga
         * <span class="block">Sekilas</span><span class="block">Jayanegara.</span>
         * terbaca "SekilasJayanegara." — kata palsu yang lalu dilaporkan sebagai
         * overflow. Sisipkan spasi pada setiap batas elemen blok dulu. */
        const parts = [];
        const walkText = (node) => {
          for (const child of node.childNodes) {
            if (child.nodeType === 3) {
              parts.push(child.textContent);
            } else if (child.nodeType === 1) {
              const ccs = getComputedStyle(child);
              const isBlock =
                ccs.display === 'block' || ccs.display === 'flex' || ccs.display === 'grid';
              if (isBlock) parts.push(' ');
              walkText(child);
              if (isBlock) parts.push(' ');
            }
          }
        };
        walkText(el);
        const text = parts.join('').replace(/\s+/g, ' ').trim();
        if (!text) continue;

        /* Ukur setiap kata secara terpisah dengan kanvas, memakai font dan
         * ukuran yang benar-benar dipakai elemen ini. Tidak bisa memakai
         * getBoundingClientRect elemen karena elemen sudah membungkus baris. */
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = `${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
        const track = parseFloat(cs.letterSpacing) || 0;

        const words = text.split(/\s+/).filter((w) => w.length > 1);
        let widest = 0;
        let widestWord = '';
        for (const w of words) {
          const wpx = ctx.measureText(w).width + track * w.length;
          if (wpx > widest) {
            widest = wpx;
            widestWord = w;
          }
        }
        if (!widest) continue;

        /* Lebar yang tersedia: viewport dikurangi padding horizontal elemen. */
        const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
        const box = el.getBoundingClientRect();
        const usable = Math.min(box.width, avail) - pad;

        /* Saring artefak probe: kalau elemennya memang lebih tinggi dari satu
         * baris teks, kata-kata di dalamnya sudah dibungkus oleh browser dan
         * tidak mungkin meluber. Selain itu, kalau kata terpanjang berasal dari
         * potongan yang dipisahkan elemen bersarang (mis. wordmark footer yang
         * menumpuk "SMK" di atas "Jayanegara"), kata itu tidak pernah dirender
         * sebagai satu kata. */
        const lineH = parseFloat(cs.lineHeight) || fs * 1.2;
        const lineCount = Math.round(box.height / lineH);
        const lineBreakCount = text.split(' ').length - 1;

        if (widest > usable + 0.5 && lineCount <= 1 && lineBreakCount === 0) {
          out.push({
            tag: el.tagName.toLowerCase(),
            fs: Math.round(fs * 10) / 10,
            word: widestWord,
            wordW: Math.round(widest),
            usable: Math.round(usable),
            over: Math.round(widest - usable),
          });
        }
      }
      return out;
    });

    if (r.length) {
      problems += r.length;
      console.log(`\nFAIL ${path}`);
      r.forEach((x) => {
        console.log(
          `       <${x.tag}> ${x.fs}px  kata "${x.word}" = ${x.wordW}px, ` +
            `tersedia ${x.usable}px  → lebih ${x.over}px`,
        );
      });
    } else {
      console.log(`OK   ${path}`);
    }
  }

  console.log(
    problems
      ? `\n  → ${problems} kata melebihi lebar 320px`
      : '\n  → tidak ada kata yang melebihi lebar 320px',
  );
  await browser.close();
})();
