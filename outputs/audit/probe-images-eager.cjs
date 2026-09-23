/**
 * Uji penentu: apakah gambar benar-benar rusak, atau hanya belum sempat dimuat?
 *
 * Jalankan pada server yang sudah hidup:
 *     npm run start
 *     node outputs/audit/probe-images-eager.cjs
 *
 * Latar belakangnya penting, karena probe yang lebih naif sudah dua kali
 * memberi jawaban salah. Sebuah gambar ter-layout 427x533 di dalam
 * `[data-image-reveal].is-revealed`, dengan gaya terhitung identik dengan
 * saudaranya yang BERHASIL dimuat, tetap melaporkan `naturalWidth === 0` tanpa
 * permintaan jaringan apa pun. Dua hipotesis cocok dengan gejala itu:
 *
 *   A) Browser menganggapnya di luar viewport, jadi `loading="lazy"`
 *      menundanya dengan benar — dan gulir programatik (`window.scrollTo`)
 *      memang tidak menggerakkan viewport di halaman ber-Lenis.
 *   B) Ada yang membuatnya tidak ter-render, sehingga browser menolak
 *      memuatnya — itu bug sungguhan yang terlihat pengunjung.
 *
 * Memaksa setiap gambar menjadi `loading="eager"` dan menunggu `decode()`
 * memisahkan keduanya.
 *
 * Hasil terakhir di proyek ini: A — 22/22 di `/`, 18/18 di `/karya`,
 * `stillFailed=0`, `httpErr=0`. Gambarnya tidak pernah rusak.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:3000';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });

  for (const path of ['/', '/karya', '/kegiatan', '/galeri', '/berita', '/program-keahlian', '/tentang']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const netFailures = [];
    page.on('response', (r) => {
      if (r.url().includes('/images/') && r.status() !== 200) {
        netFailures.push(`${r.status()} ${r.url().split('/').pop()}`);
      }
    });

    await page.goto(BASE + path, { waitUntil: 'load', timeout: 30000 });

    const result = await page.evaluate(async () => {
      const imgs = Array.from(document.querySelectorAll('img'));
      const zeroSized = imgs.filter((i) => i.getBoundingClientRect().width === 0).length;

      // Force every image to load regardless of viewport position.
      const candidates = imgs.filter((i) => i.getBoundingClientRect().width > 0);
      await Promise.all(
        candidates.map(
          (i) =>
            new Promise((resolve) => {
              if (i.complete && i.naturalWidth > 0) return resolve('already');
              i.loading = 'eager';
              const done = () => resolve('settled');
              i.addEventListener('load', done, { once: true });
              i.addEventListener('error', done, { once: true });
              // Re-assign src to kick a fresh fetch if it was deferred.
              const src = i.getAttribute('src');
              i.setAttribute('src', src);
              setTimeout(done, 8000);
            }),
        ),
      );

      const failed = candidates
        .filter((i) => !i.complete || i.naturalWidth === 0)
        .map((i) => i.getAttribute('src'));

      return {
        total: imgs.length,
        candidates: candidates.length,
        zeroSized,
        failed,
      };
    });

    const verdict = result.failed.length === 0 && netFailures.length === 0 ? 'OK  ' : 'FAIL';
    console.log(
      `${verdict} ${path.padEnd(20)} img=${String(result.total).padEnd(3)} sized=${String(result.candidates).padEnd(3)} zeroSize=${result.zeroSized} stillFailed=${result.failed.length} httpErr=${netFailures.length}`,
    );
    if (result.failed.length) console.log(`      ${result.failed.slice(0, 8).join(', ')}`);
    if (netFailures.length) console.log(`      net: ${netFailures.slice(0, 8).join(', ')}`);

    await page.close();
  }

  await browser.close();
})();
