/**
 * Asersi yang benar.
 *
 * Probe sebelumnya menuntut `revealed === targets`, dan itu salah: reveal
 * memang dipicu scroll, jadi elemen di bawah lipatan HARUS masih tersembunyi
 * setelah halaman dimuat. Yang benar:
 *
 *   1. Tidak ada warning hidrasi (ini yang diperbaiki).
 *   2. Elemen yang terlihat di viewport awal SUDAH ter-reveal (tidak ada yang
 *      macet tersembunyi).
 *   3. Setelah digulir penuh, TIDAK ADA elemen tersisa yang belum ter-reveal
 *      (kecuali yang memang dikendalikan GSAP, yang punya jalur sendiri).
 *
 * Catatan: `window.scrollTo` TIDAK menggulir halaman ber-Lenis, jadi gulir
 * dilakukan lewat roda mouse seperti pengguna sungguhan.
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:3001';

const PAGES = [
  '/',
  '/tentang',
  '/program-keahlian',
  '/kegiatan',
  '/karya',
  '/galeri',
  '/berita',
  '/kontak',
];

(async () => {
  let warns = 0;
  let stuck = 0;
  for (const path of PAGES) {
    const browser = await chromium.launch({ executablePath: CHROME, headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    let w = 0;
    page.on('console', (m) => {
      if (/hydrated but some attributes/i.test(m.text())) w++;
    });

    await page.goto(BASE + path, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(1200);

    // Elemen yang beririsan dengan viewport awal harus sudah ter-reveal.
    //
    // PENTING: "beririsan" menurut `getBoundingClientRect` BUKAN kriteria yang
    // dipakai observer. Observer memasang `rootMargin: 0 0 -10% 0` dan
    // `threshold: 0.05`, jadi elemen tinggi yang baru menyembul beberapa piksel
    // di dasar viewport memang belum memenuhi syarat — dan itu benar, karena ia
    // ter-reveal saat digulir. Yang diuji di sini karena itu hanya elemen yang
    // sudah lewat 5% dari garis 90% tinggi viewport.
    const initial = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('[data-reveal], [data-image-reveal]'));
      const qualifying = all.filter((e) => {
        const r = e.getBoundingClientRect();
        const visTop = Math.max(r.top, 0);
        const visBottom = Math.min(r.bottom, window.innerHeight * 0.9);
        if (visBottom <= visTop) return false;
        const visible = (visBottom - visTop) / r.height;
        return visible >= 0.05;
      });
      const revealed = qualifying.filter((e) => e.hasAttribute('data-revealed'));
      return {
        total: all.length,
        inView: qualifying.length,
        revealedInView: revealed.length,
        pending: qualifying
          .filter((e) => !e.hasAttribute('data-revealed'))
          .map((e) => String(e.className).slice(0, 40)),
      };
    });

    // Gulir ke bawah memakai roda mouse (Lenis mengabaikan scrollTo).
    for (let i = 0; i < 38; i++) {
      await page.mouse.wheel(0, 700);
      await page.waitForTimeout(90);
    }
    await page.waitForTimeout(1400);

    const after = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('[data-reveal], [data-image-reveal]'));
      const notRevealed = all.filter((e) => !e.hasAttribute('data-revealed'));
      return {
        total: all.length,
        revealed: all.length - notRevealed.length,
        samples: notRevealed.slice(0, 4).map((e) => ({
          cls: String(e.className).slice(0, 45),
          inDoc: !!e.offsetParent || e.getClientRects().length > 0,
        })),
      };
    });

    const stuckCount = after.total - after.revealed;
    const ok = w === 0 && initial.revealedInView === initial.inView && stuckCount === 0;
    console.log(
      `${ok ? 'OK  ' : 'FAIL'} ${path.padEnd(20)} warnings=${w} ` +
        `inView=${initial.revealedInView}/${initial.inView} ` +
        `afterScroll=${after.revealed}/${after.total}`,
    );
    if (!ok) {
      for (const s of initial.pending) console.log(`       in-view but pending: ${s}`);
      for (const s of after.samples) console.log(`       stuck: ${s.inDoc ? 'in-doc' : 'detached'} ${s.cls}`);
    }
    warns += w;
    stuck += stuckCount;
    await browser.close();
  }
  console.log(`\ntotal hydration warnings: ${warns}`);
  console.log(`total elements left unrevealed after scrolling: ${stuck}`);
})();
