/**
 * Verifikasi — panel menu seluler tidak boleh menggambar apa pun saat tertutup.
 *
 * ## Hipotesis yang diuji
 *
 * `SiteHeader.tsx` menaruh `border-b` pada `<li>`, tetapi `opacity-0` pada
 * `<Link>` **di dalamnya**. Opacity tidak merambat ke atas, jadi saat menu
 * tertutup teksnya hilang sementara garisnya tetap tergambar. Panelnya
 * `fixed inset-0 z-40`, sehingga garis-garis itu melayang di atas konten dan
 * ikut diam saat halaman digulir — persis keluhan "garis yang muncul gajelas".
 *
 * `primaryNav` berisi enam item dan yang terakhir memakai `last:border-b-0`,
 * jadi jumlah garis yang bocor seharusnya **lima**.
 *
 * ## Cara mengujinya
 *
 * Bukan dengan membaca kode, melainkan dengan piksel. Tiga potret dari posisi
 * yang sama:
 *
 *   1. menu tertutup, apa adanya;
 *   2. panel menu dipaksa `display: none` — ini patokan "tanpa panel";
 *   3. menu dibuka dengan menekan tombolnya.
 *
 * Selisih (1) terhadap (2) = garis yang bocor saat tertutup. Harus **nol**.
 * Selisih (3) terhadap (2) = garis yang memang milik panel. Harus **lima** —
 * kalau nol juga, berarti perbaikannya membunuh menunya, bukan menyembunyikannya.
 *
 * ## Pakai
 *
 *   BASE=https://skagara.vercel.app node outputs/verify-mobile-menu-lines.mjs
 */

const BASE = process.env.BASE ?? 'http://127.0.0.1:3000';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const WIDTH = 390;
const HEIGHT = 844;

const { createRequire } = await import('node:module');
const workspaceRequire = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const projectRequire = createRequire(new URL('../package.json', import.meta.url));
const { chromium } = workspaceRequire('playwright-core');
const sharp = projectRequire('sharp');

/**
 * Baris mana yang berisi garis horizontal?
 *
 * Ukurannya sederhana dan sengaja tidak pintar: sebuah garis selebar viewport
 * membuat satu baris piksel yang hampir seluruhnya bukan warna kertas. Jadi
 * untuk setiap baris dihitung berapa piksel yang berbeda dari warna latar
 * (diambil dari piksel paling kiri-atas). Baris dengan proporsi di atas ambang
 * dianggap garis.
 */
async function findLines(buffer) {
  const { data, info } = await sharp(buffer).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const bg = [data[0], data[1], data[2]];
  const rows = [];

  for (let y = 0; y < height; y += 1) {
    let differing = 0;
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * channels;
      const diff =
        Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]);
      if (diff > 24) differing += 1;
    }
    if (differing / width > 0.85) rows.push(y);
  }

  // Gabungkan baris berdampingan menjadi satu garis.
  const grouped = [];
  for (const y of rows) {
    const last = grouped[grouped.length - 1];
    if (last && y - last.end <= 1) last.end = y;
    else grouped.push({ start: y, end: y });
  }
  // deviceScaleFactor 2 → koordinat piksel = 2× koordinat CSS.
  return grouped.map((g) => +(g.start / 2).toFixed(1));
}

const missing = (a, b) => a.filter((y) => !b.some((other) => Math.abs(other - y) < 3));

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

try {
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await page.waitForTimeout(2200);

  const panelClosed = await page.evaluate(() => {
    const panel = document.querySelector('#menu-seluler');
    return panel ? panel.hasAttribute('inert') : null;
  });
  console.log(`panel tertutup (inert): ${panelClosed === true ? 'ya' : 'TIDAK — pengukuran tidak sah'}`);

  const closedShot = await page.screenshot();
  await sharp(closedShot).toFile('outputs/screenshots/menu-lines-closed.png');
  const closed = await findLines(closedShot);

  await page.addStyleTag({ content: '#menu-seluler { display: none !important; }' });
  await page.waitForTimeout(250);
  const baselineShot = await page.screenshot();
  await sharp(baselineShot).toFile('outputs/screenshots/menu-lines-baseline.png');
  const baseline = await findLines(baselineShot);

  // Kembalikan, lalu buka menunya seperti pengunjung membukanya.
  await page.evaluate(() => {
    const style = [...document.querySelectorAll('style')].find((s) =>
      s.textContent?.includes('#menu-seluler'),
    );
    style?.remove();
  });
  await page.getByRole('button', { name: /menu/i }).first().click();
  await page.waitForTimeout(1400);
  const openShot = await page.screenshot();
  await sharp(openShot).toFile('outputs/screenshots/menu-lines-open.png');
  const open = await findLines(openShot);

  const leaked = missing(closed, baseline);
  const ownLines = missing(open, baseline);

  console.log(`\ngaris terdeteksi — menu TERTUTUP   : ${closed.length}  [${closed.join(', ')}]`);
  console.log(`garis terdeteksi — tanpa panel     : ${baseline.length}  [${baseline.join(', ')}]`);
  console.log(`garis terdeteksi — menu TERBUKA    : ${open.length}  [${open.join(', ')}]`);

  console.log(`\ngaris BOCOR saat menu tertutup : ${leaked.length}  [${leaked.join(', ')}]`);
  console.log(`garis milik panel saat terbuka : ${ownLines.length}  [${ownLines.join(', ')}]`);

  const ok = leaked.length === 0 && ownLines.length >= 4;
  console.log(
    `\nHASIL: ${
      ok
        ? 'panel tertutup tidak menggambar apa pun, dan panel terbuka tetap menggambar garisnya.'
        : leaked.length > 0
          ? `MASIH BOCOR — ${leaked.length} garis berasal dari panel tertutup.`
          : 'panel terbuka tidak menggambar garis apa pun — menunya kemungkinan rusak.'
    }`,
  );

  console.log('\ntangkapan layar: outputs/screenshots/menu-lines-{closed,baseline,open}.png\n');

  await context.close();
} finally {
  await browser.close();
}
