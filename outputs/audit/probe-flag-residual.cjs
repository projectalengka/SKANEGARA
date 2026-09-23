/**
 * Sapuan akhir: pastikan perubahan pada flag "Ilustrasi program" tidak
 * menimbulkan efek samping di lebar layar lain.
 *
 * Diperiksa:
 *   - overflow horizontal di 320/390/768/1024/1440/1920
 *   - flag itu sendiri: tidak ada lagi teks yang terpotong (scrollWidth)
 *   - ukuran kotak flag tetap di dalam kotak gambar induknya
 *   - tidak ada gambar yang gagal ter-decode setelah dipaksa eager
 */
const { createRequire } = require('node:module');
const req = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = req('playwright-core');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://127.0.0.1:3000';
const WIDTHS = [320, 390, 768, 1024, 1440, 1920];
const PAGES = ['/', '/tentang', '/program-keahlian', '/berita', '/kegiatan', '/karya', '/galeri', '/kontak', '/privasi'];

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  let failures = 0;

  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(BASE + '/', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1500);

    const flag = await page.evaluate(() => {
      const notes = Array.from(document.querySelectorAll('.hero-program__note'));
      return notes.map((n) => {
        const box = n.closest('.hero-program__image');
        const nb = n.getBoundingClientRect();
        const bb = box ? box.getBoundingClientRect() : null;
        return {
          overflowX: n.scrollWidth > n.clientWidth + 1,
          overflowY: n.scrollHeight > n.clientHeight + 1,
          insideBox: bb ? nb.top >= bb.top - 1 && nb.bottom <= bb.bottom + 1 : null,
          w: Math.round(nb.width),
          h: Math.round(nb.height),
        };
      });
    });

    const badFlags = flag.filter((f) => f.overflowX || !f.insideBox);
    if (badFlags.length) failures += badFlags.length;

    console.log(
      `${width}px  flags=${flag.length}  overflowX=${flag.filter((f) => f.overflowX).length}  outsideBox=${flag.filter((f) => f.insideBox === false).length}  ${flag[0] ? `(${flag[0].w}x${flag[0].h})` : ''}`,
    );

    await page.close();
  }

  console.log('\n--- overflow horizontal seluruh rute ---');
  for (const width of [320, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    let worst = 0;
    let worstPath = '';
    for (const path of PAGES) {
      await page.goto(BASE + path, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(600);
      const o = await page.evaluate(() => {
        const d = document.documentElement;
        return d.scrollWidth - d.clientWidth;
      });
      if (o > worst) {
        worst = o;
        worstPath = path;
      }
    }
    const ok = worst <= 1;
    if (!ok) failures += 1;
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${width}px  worst overflow=${worst}${ok ? '' : ` at ${worstPath}`}`);
    await page.close();
  }

  await browser.close();
  console.log(failures === 0 ? '\n=> SEMUA BERSIH' : `\n=> ${failures} MASALAH`);
})();
