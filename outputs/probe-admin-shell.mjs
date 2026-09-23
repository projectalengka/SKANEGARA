/**
 * Probe — shell situs publik bocor ke halaman dasbor.
 *
 * ## Kenapa ada
 *
 * `src/app/layout.tsx` merender `SiteHeader`, `SiteFooter`, `CustomCursor`,
 * `SmoothScroll`, dan `RevealObserver` untuk **setiap** rute, termasuk
 * `/admin/*`. Layout dasbor tidak punya cara membatalkannya, jadi header situs
 * yang `fixed` menimpa sidebar dasbor.
 *
 * Tangkapan layar pemilik proyek (2026-09-24) memperlihatkan akibatnya: merek
 * situs "SMK / Jayanegara" bertumpuk dengan judul sidebar "Dasbor", nav publik
 * mengapung di atas judul halaman, dan titik kursor kustom terlihat di tengah
 * halaman admin.
 *
 * Tangkapan layar membuktikan gejalanya; skrip ini mengukur sebabnya, supaya
 * "sudah diperbaiki" bisa dibandingkan angka sebelum dan sesudah:
 *
 *   1. Berapa elemen `<main>` di halaman admin? Satu halaman, satu `<main>`.
 *   2. Apakah header situs publik ada di dalam DOM admin?
 *   3. Apakah footer publik ada di dalam DOM admin?
 *   4. Apakah titik kursor kustom ada?
 *   5. Seberapa besar tumpang tindih merek situs dengan judul sidebar?
 *      (diukur dalam piksel persegi, bukan "kelihatan menumpuk")
 *
 * Jalankan sebelum dan sesudah perbaikan; angka 2–5 harus menjadi 0/null.
 *
 * ## Pakai
 *
 *   node --env-file=.env outputs/probe-admin-shell.mjs
 *   BASE=http://127.0.0.1:3000 node --env-file=.env outputs/probe-admin-shell.mjs
 */

const BASE = process.env.BASE ?? 'http://127.0.0.1:3000';
const EMAIL = process.env.ADMIN_EMAIL ?? '';
const PASSWORD = process.env.ADMIN_PASSWORD ?? '';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const TAG = process.env.TAG ?? 'before';

const { createRequire } = await import('node:module');
// `playwright-core` tinggal di workspace Node terkelola, bukan di node_modules
// proyek — sama seperti probe lain di folder ini.
const require = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = require('playwright-core');

const shots = new URL('./', import.meta.url).pathname.replace(/^\//, '');

/** Luas irisan dua kotak, dalam piksel persegi. */
function overlapArea(a, b) {
  if (!a || !b) return null;
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? Math.round(w * h) : 0;
}

const browser = await chromium.launch({ executablePath: CHROME });
const report = {};

try {
  if (!EMAIL || !PASSWORD) {
    console.error('ADMIN_EMAIL / ADMIN_PASSWORD belum diset (pakai --env-file=.env).');
    process.exit(1);
  }

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Masuk.
  await page.goto(`${BASE}/admin/masuk`, { waitUntil: 'load' });
  await page.fill('input[name=email]', EMAIL);
  await page.fill('input[name=password]', PASSWORD);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load', timeout: 20000 }).catch(() => {}),
    page.click('button[type=submit], button:has-text("Masuk")'),
  ]);

  for (const route of ['/admin/profil', '/admin/galeri', '/admin/dasbor']) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'load' });
    // Beri waktu React mengambil alih, supaya kursor kustom dan Lenis sempat
    // dipasang kalau memang dipasang.
    await page.waitForTimeout(1500);

    const measured = await page.evaluate(() => {
      const box = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      };

      const siteHeader = document.querySelector('header.site-header');
      const sidebarTitle = document.querySelector('#dasbor-nav .display');
      const brand = siteHeader?.querySelector('a[aria-label]') ?? null;

      return {
        mains: document.querySelectorAll('main').length,
        mainIds: [...document.querySelectorAll('main')].map((m) => m.id || '(tanpa id)'),
        siteHeaderPresent: Boolean(siteHeader),
        siteHeaderNavLinks: siteHeader ? siteHeader.querySelectorAll('nav a').length : 0,
        siteFooterPresent: Boolean(document.querySelector('footer')),
        customCursorPresent: Boolean(document.querySelector('.mix-blend-difference')),
        lenisActive: document.documentElement.classList.contains('lenis'),
        brandBox: box(brand),
        sidebarTitleBox: box(sidebarTitle),
        sidebarTitleText: sidebarTitle?.textContent?.trim() ?? null,
      };
    });

    report[route] = {
      ...measured,
      brandOverlapWithSidebarTitle: overlapArea(measured.brandBox, measured.sidebarTitleBox),
    };
  }

  // Bukti visual: potret penuh + close-up bagian atas sidebar, tempat tumpang
  // tindih terjadi.
  await page.goto(`${BASE}/admin/profil`, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${shots}screenshots/admin-shell-${TAG}-full.png`, fullPage: false });
  await page.screenshot({
    path: `${shots}screenshots/admin-shell-${TAG}-sidebar.png`,
    clip: { x: 0, y: 0, width: 520, height: 320 },
  });

  // Pemberitahuan di kaki sidebar: status mode konten, mode contoh, dan
  // penyimpanan gambar. Bagian ini yang memberi tahu pemilik proyek *mengapa*
  // sebuah kemampuan tidak bekerja, jadi ia ikut diperiksa.
  const aside = page.locator('#dasbor-nav');
  await aside.evaluate((node) => node.scrollTo(0, node.scrollHeight));
  await page.waitForTimeout(400);

  report.notices = await aside.evaluate((node) => {
    const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
    return {
      storageWarning: /Unggah gambar belum aktif/.test(text),
      databaseBadge: /Basis data aktif|Mode cadangan/.test(text),
      text,
    };
  });
  await aside.screenshot({ path: `${shots}screenshots/admin-shell-${TAG}-notices.png` });

  await context.close();
} finally {
  await browser.close();
}

console.log(`\nShell dasbor (${TAG}) — ${BASE}\n`);
for (const [route, m] of Object.entries(report)) {
  if (route === 'notices') continue;
  console.log(`${route}`);
  console.log(`  <main> di halaman          : ${m.mains} ${JSON.stringify(m.mainIds)}`);
  console.log(`  header situs publik        : ${m.siteHeaderPresent ? `ADA (${m.siteHeaderNavLinks} tautan nav)` : 'tidak ada'}`);
  console.log(`  footer situs publik        : ${m.siteFooterPresent ? 'ADA' : 'tidak ada'}`);
  console.log(`  kursor kustom              : ${m.customCursorPresent ? 'ADA' : 'tidak ada'}`);
  console.log(`  Lenis menguasai gulir      : ${m.lenisActive ? 'ya' : 'tidak'}`);
  console.log(`  tumpang tindih merek×judul : ${m.brandOverlapWithSidebarTitle} px²`);
  console.log('');
}

console.log('Pemberitahuan sidebar');
console.log(`  "Unggah gambar belum aktif" : ${report.notices.storageWarning ? 'tampil' : 'tidak tampil'}`);
console.log(`  status basis data          : ${report.notices.databaseBadge ? 'tampil' : 'tidak tampil'}`);
console.log('');

const bad = Object.entries(report).filter(
  ([route, m]) =>
    route !== 'notices' &&
    (m.mains !== 1 || m.siteHeaderPresent || m.siteFooterPresent || m.customCursorPresent),
).length;

console.log(bad === 0 ? 'HASIL: shell dasbor bersih.\n' : `HASIL: ${bad} rute masih tercemar shell publik.\n`);
process.exitCode = bad === 0 ? 0 : 1;
