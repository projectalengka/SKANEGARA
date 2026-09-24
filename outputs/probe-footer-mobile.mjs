/**
 * Pemeriksaan footer pada layar sempit.
 *
 * Tangkapan layar ketiga pemilik proyek memperlihatkan footer (panel gelap)
 * dengan garis di bawah setiap tautan navigasinya. `.link-line::after` seharusnya
 * `scaleX(0)` sampai disorot, jadi garis itu perlu dijelaskan — atau dibuktikan
 * memang tidak ada.
 *
 * Skrip ini memotret footer apa adanya dan sekaligus melaporkan, untuk setiap
 * tautan di dalamnya, apakah garis bawahnya sedang tergambar (`transform`
 * pada pseudo-elemennya) dan elemen mana saja di footer yang punya border.
 */

const BASE = process.env.BASE ?? 'http://127.0.0.1:3000';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const { createRequire } = await import('node:module');
const require = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = require('playwright-core');

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'load' });

  // Reveal butuh elemen masuk viewport; gulir sampai dasar halaman.
  for (let i = 0; i < 30; i += 1) {
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(1500);

  const report = await page.evaluate(() => {
    const footer = document.querySelector('footer');
    if (!footer) return null;

    const links = [...footer.querySelectorAll('a.link-line')].map((a) => ({
      text: (a.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 26),
      after: getComputedStyle(a, '::after').transform,
      width: Math.round(a.getBoundingClientRect().width),
    }));

    const bordered = [...footer.querySelectorAll('*')]
      .map((el) => {
        const cs = getComputedStyle(el);
        const top = parseFloat(cs.borderTopWidth) || 0;
        const bottom = parseFloat(cs.borderBottomWidth) || 0;
        if (!top && !bottom) return null;
        const r = el.getBoundingClientRect();
        return {
          cls: (el.className ?? '').toString().slice(0, 52),
          w: Math.round(r.width),
          h: Math.round(r.height),
          top,
          bottom,
        };
      })
      .filter(Boolean);

    return { links, bordered };
  });

  if (!report) {
    console.log('footer tidak ditemukan di halaman ini');
  } else {
    console.log('\nGaris bawah tautan footer (transform pseudo-elemen ::after):');
    for (const l of report.links) {
      const hidden = /matrix\(0,\s*0,\s*0,\s*1/.test(l.after) || l.after === 'none';
      console.log(`  ${hidden ? 'tersembunyi' : 'TERGAMBAR  '}  w=${String(l.width).padStart(4)}  "${l.text}"  ${l.after}`);
    }

    console.log(`\nElemen di dalam footer yang punya border (${report.bordered.length}):`);
    for (const b of report.bordered) {
      console.log(`  w=${String(b.w).padStart(4)} h=${String(b.h).padStart(4)}  b=${b.top ? 'T' : '-'}${b.bottom ? 'B' : '-'}  .${b.cls}`);
    }
  }

  const footer = page.locator('footer');
  await footer.screenshot({ path: 'outputs/screenshots/footer-mobile-390.png' });
  console.log('\ntangkapan layar footer: outputs/screenshots/footer-mobile-390.png\n');

  await context.close();
} finally {
  await browser.close();
}
