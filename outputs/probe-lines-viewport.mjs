/**
 * Potret VIEWPORT (bukan potret elemen) pada beberapa posisi gulir.
 *
 * ## Kenapa skrip ini ada
 *
 * Panel menu seluler adalah `position: fixed`, jadi garis-garis yang bocor
 * melayang pada koordinat viewport yang tetap. `footer.screenshot()` milik
 * Playwright memotret KOTAK elemen, dan elemen `fixed` yang jatuh di luar kotak
 * itu tidak ikut terekam — jadi potret elemen selalu tampak bersih dan menutupi
 * bug-nya. Yang dialami pengunjung di ponsel adalah viewport, jadi yang harus
 * dipotret juga viewport.
 *
 * Skrip ini juga melaporkan, untuk setiap posisi gulir, berapa baris piksel yang
 * hampir seluruhnya berbeda dari warna latar. Angka itu bisa dibandingkan
 * sebelum/sesudah perbaikan tanpa harus memandangi gambar.
 *
 * ## Pakai
 *
 *   BASE=https://skagara.vercel.app node outputs/probe-lines-viewport.mjs
 *   TAG=sesudah node outputs/probe-lines-viewport.mjs
 */

const BASE = process.env.BASE ?? 'http://127.0.0.1:3000';
const TAG = process.env.TAG ?? 'sebelum';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const ROUTES = [
  { path: '/', name: 'beranda' },
  { path: '/program-keahlian', name: 'program' },
];

const { createRequire } = await import('node:module');
const workspaceRequire = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const projectRequire = createRequire(new URL('../package.json', import.meta.url));
const { chromium } = workspaceRequire('playwright-core');
const sharp = projectRequire('sharp');

/**
 * Cari baris yang hampir seluruhnya bukan warna latar.
 *
 * Ambangnya sengaja tinggi (85%) supaya teks — yang hanya menutupi sebagian
 * lebar baris — tidak ikut terhitung sebagai garis.
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

  const grouped = [];
  for (const y of rows) {
    const last = grouped[grouped.length - 1];
    if (last && y - last.end <= 1) last.end = y;
    else grouped.push({ start: y, end: y });
  }
  // deviceScaleFactor 2 → koordinat piksel = 2× koordinat CSS.
  return grouped.map((g) => +(g.start / 2).toFixed(1));
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  console.log(`BASE=${BASE}  TAG=${TAG}`);

  for (const route of ROUTES) {
    await page.goto(`${BASE}${route.path}`, { waitUntil: 'load' });
    await page.waitForTimeout(2200);

    const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    // Tiga posisi: puncak, tengah, dasar — garis `fixed` muncul di semuanya.
    const stops = [0, Math.round(total / 2), total];

    for (const [i, y] of stops.entries()) {
      // `window.scrollTo` tidak menggerakkan viewport di halaman ber-Lenis.
      await page.evaluate((target) => window.scrollTo(0, target), y);
      await page.waitForTimeout(1200);

      const shot = await page.screenshot();
      const label = `${route.name}-${i}`;
      const file = `outputs/screenshots/lines-${TAG}-${label}.png`;
      await sharp(shot).toFile(file);

      const lines = await findLines(shot);
      const real = await page.evaluate(() => Math.round(window.scrollY));
      console.log(`\n${route.path}  posisi ${i}  scrollY=${real}`);
      console.log(`  garis terdeteksi: ${lines.length}  [${lines.join(', ')}]`);
      console.log(`  potret: ${file}`);
    }
  }

  console.log('');
  await context.close();
} finally {
  await browser.close();
}
