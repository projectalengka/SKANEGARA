/**
 * Probe — berapa ukuran gambar yang sebaiknya disiapkan pemilik proyek.
 *
 * ## Kenapa ada
 *
 * Pertanyaan pemilik proyek, 24 September 2026: "saya belum tau ukuran gambar
 * yang perlu saya siapkan, berapa rasionya, buatkan catatan dong — agar saya
 * menyiapkan gambar yang presisi dan tidak terpotong."
 *
 * Pertanyaan itu tidak bisa dijawab dari niat baik. Jawabannya ada di dua
 * tempat, dan keduanya harus dibaca:
 *
 *   1. **Rasio kotaknya** — ditentukan CSS (`aspect-*`), bukan oleh gambarnya.
 *      Semua `<Image>` di proyek ini memakai `fill` + `object-cover`, artinya
 *      gambar **selalu** memenuhi kotak dan **dipotong** (crop) di sisi yang
 *      berlebih. Jadi rasio berkas yang diunggah tidak mengubah tampilannya
 *      sama sekali — yang menentukan hanya rasio kotaknya.
 *   2. **Ukuran kotaknya dalam piksel** — bergantung lebar viewport, lebar
 *      kolom grid, dan padding. Inilah yang menentukan berapa piksel gambar
 *      yang benar-benar dibutuhkan. Mengarang angka "1920×1080" tanpa mengukur
 *      berarti menyuruh orang menyiapkan berkas yang terlalu besar (buang
 *      kuota) atau terlalu kecil (terlihat pecah).
 *
 * Probe ini mengukur nomor 2 di enam lebar layar, lalu melaporkan rasio yang
 * benar-benar tergambar — bukan rasio yang kita kira tertulis di CSS.
 *
 * ## Cara membaca hasilnya
 *
 * Kolom `kotak` adalah ukuran container dalam piksel CSS pada lebar layar itu.
 * Kolom `rasio` dihitung dari angka yang terukur, jadi kalau ada yang tidak
 * sesuai harapan (misalnya kolomnya jadi lebih sempit dari dugaan), itu
 * kelihatan di sini, bukan di asumsi.
 *
 * `object-cover` berarti: **gambar akan dipotong**. Karena itu angka pada
 * catatan bukan sekadar "ukuran minimal", melainkan "ukuran yang aman supaya
 * pemotongan tidak menghilangkan bagian penting".
 *
 * ## Pakai
 *
 *   npm run start &                                     # atau BASE produksi
 *   node --env-file=.env outputs/probe-image-ratios.mjs
 *   BASE=https://skagara.vercel.app node --env-file=.env outputs/probe-image-ratios.mjs
 */

const BASE = process.env.BASE ?? 'http://127.0.0.1:3000';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const { createRequire } = await import('node:module');
const require = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = require('playwright-core');

/** Lebar layar yang diukur. 320 adalah Android terkecil, 1920 monitor kantor. */
const VIEWPORTS = [320, 390, 768, 1024, 1440, 1920];

/**
 * Rute yang punya gambar. Rute tanpa gambar (mis. /kontak) sengaja dilewati
 * supaya laporannya tidak penuh baris kosong.
 */
const ROUTES = [
  '/',
  '/tentang',
  '/program-keahlian',
  '/program-keahlian/desain-komunikasi-visual',
  '/kegiatan',
  '/karya',
  '/galeri',
  '/berita',
];

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

/** Ubah 1600×1000 jadi "8:5" supaya rasionya bisa dibaca sekilas. */
function ratioLabel(w, h) {
  if (!w || !h) return '—';
  const d = gcd(Math.round(w), Math.round(h));
  const rw = Math.round(w) / d;
  const rh = Math.round(h) / d;
  // Rasio seperti 4:5 enak dibaca; 1080:1350 tidak. Kecilkan ke bentuk
  // sederhana yang paling dekat supaya bisa dibandingkan dengan CSS.
  return `${rw}:${rh}`;
}

/** Rasio desimal, untuk membandingkan dengan `aspect-ratio` di CSS. */
const ratioNum = (w, h) => (h ? +(w / h).toFixed(3) : 0);

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

/** @type {Map<string, Map<string, any>>} */
const found = new Map();

try {
  for (const width of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce', // mematikan reveal supaya tata letaknya tenang
    });
    const page = await context.newPage();

    for (const route of ROUTES) {
      await page.goto(`${BASE}${route}`, { waitUntil: 'load' });

      // Reveal berbasis IntersectionObserver hanya jalan setelah elemen masuk
      // viewport. Tata letaknya sendiri tidak berubah, tetapi menunggu sebentar
      // membuat transisi transform selesai sehingga rect-nya stabil.
      await page.waitForTimeout(400);

      const rows = await page.evaluate(() => {
        const out = [];

        /** Label konteks: judul bagian + judul item, kalau ada. */
        function labelFor(el) {
          const section = el.closest('section');
          const heading = section?.querySelector('h1, h2, h3');
          const sectionText = (heading?.textContent ?? '').trim().replace(/\s+/g, ' ');
          const li = el.closest('li');
          const itemText = (li?.querySelector('.display')?.textContent ?? '').trim().replace(/\s+/g, ' ');
          const parts = [sectionText.slice(0, 40), itemText.slice(0, 26)].filter(Boolean);
          return parts.join(' › ') || '(tanpa judul)';
        }

        /**
         * Kotak yang benar-benar memotong gambar.
         *
         * Bukan selalu induk langsung `<img>`-nya. Di galeri, `next/image`
         * dengan `fill` duduk di dalam `<span class="absolute inset-0">`, dan
         * `aspect-ratio`-nya ada di **kakek**-nya. Mengukur induk langsung di
         * sana menghasilkan `aspect-ratio: auto` — angka yang benar tetapi
         * milik elemen yang salah. Jadi elemen ber-`data-image-reveal` dicari
         * lebih dulu, baru elemen terdekat yang punya rasio nyata.
         */
        function frameFor(img) {
          const reveal = img.closest('[data-image-reveal]');
          if (reveal) return reveal;

          let node = img.parentElement;
          while (node && node !== document.body) {
            const cs = getComputedStyle(node);
            if (cs.aspectRatio && cs.aspectRatio !== 'auto') return node;
            node = node.parentElement;
          }
          return img.parentElement;
        }

        for (const img of document.querySelectorAll('img')) {
          const src = img.currentSrc || img.src || '';
          if (src.startsWith('data:')) continue;

          const frame = frameFor(img);
          if (!frame) continue;

          const box = frame.getBoundingClientRect();
          if (box.width < 4 || box.height < 4) continue;

          const cs = getComputedStyle(frame);
          const imgCs = getComputedStyle(img);

          out.push({
            section: labelFor(img),
            w: Math.round(box.width),
            h: Math.round(box.height),
            cssRatio: cs.aspectRatio,
            fit: imgCs.objectFit,
            file: src.split('/').pop()?.slice(0, 28) ?? '',
          });
        }
        return out;
      });

      for (const row of rows) {
        // Kunci = bagian + rasio CSS + ukuran kotak. Kalau dua gambar punya
        // geometri identik, keduanya memang satu slot yang sama.
        const key = `${row.section} | ${row.cssRatio} | ${row.w}x${row.h}`;
        if (!found.has(route)) found.set(route, new Map());
        const perRoute = found.get(route);
        if (!perRoute.has(key)) perRoute.set(key, { ...row, widths: [] });
        perRoute.get(key).widths.push(width);
      }
    }

    await context.close();
    console.log(`terukur pada ${width}px`);
  }
} finally {
  await browser.close();
}

// ---------------------------------------------------------------------------
// Laporan
// ---------------------------------------------------------------------------

console.log('\nRasio dan ukuran kotak gambar yang benar-benar dirender\n');

for (const [route, perRoute] of found) {
  const rows = [...perRoute.values()];
  if (!rows.length) continue;

  console.log(`\n${route}`);

  for (const row of rows.sort((a, b) => b.h * b.w - a.h * a.w)) {
    const widths = row.widths.sort((a, b) => a - b);
    console.log(
      `  ${String(row.w).padStart(4)}×${String(row.h).padStart(4)}  ` +
        `rasio ${ratioLabel(row.w, row.h).padEnd(6)} (${String(ratioNum(row.w, row.h)).padEnd(6)})  ` +
        `css ${row.cssRatio.padEnd(9)}  ${row.fit.padEnd(12)}  ${row.section}`,
    );
    console.log(`        terlihat pada lebar layar: ${widths.join(', ')} px`);
  }
}

// ---------------------------------------------------------------------------
// Ringkasan per rasio CSS — inilah yang dipakai menyusun catatan
// ---------------------------------------------------------------------------

/** @type {Map<string, {maxW:number, maxH:number, minW:number, sections:Set<string>}>} */
const byRatio = new Map();

for (const perRoute of found.values()) {
  for (const row of perRoute.values()) {
    // Pemisahnya sengaja bukan ' / ': rasio CSS-nya sendiri berbunyi "4 / 5",
    // dan memakai pemisah yang sama membuat `split` memotongnya jadi "4".
    const key = `${row.cssRatio} ||| ${row.fit}`;
    if (!byRatio.has(key)) {
      byRatio.set(key, { maxW: 0, maxH: 0, minW: Infinity, sections: new Set() });
    }
    const agg = byRatio.get(key);
    agg.maxW = Math.max(agg.maxW, row.w);
    agg.maxH = Math.max(agg.maxH, row.h);
    agg.minW = Math.min(agg.minW, row.w);
    agg.sections.add(row.section);
  }
}

console.log('\n\nRingkasan: rasio CSS → kotak terbesar yang pernah dirender\n');
console.log('  rasio css    terbesar    terkecil    object-fit');
console.log('  ' + '-'.repeat(58));

for (const [key, agg] of [...byRatio].sort((a, b) => b[1].maxW - a[1].maxW)) {
  const [cssRatio, fit] = key.split(' ||| ');
  console.log(
    `  ${cssRatio.padEnd(12)} ${String(`${agg.maxW}×${agg.maxH}`).padEnd(11)} ` +
      `${String(`${agg.minW}px`).padEnd(11)} ${fit}`,
  );
}

console.log('\nSelesai. Angka di atas dipakai menyusun catatan ukuran gambar.\n');
