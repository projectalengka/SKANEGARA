/**
 * Probe — panel "Perlu Dilengkapi" di dasbor saat mode contoh aktif.
 *
 * ## Kenapa ada
 *
 * Panel itu menjawab "apa yang belum saya tulis?", dan ia memutuskan dengan
 * `isPlaceholder` untuk bidang profil serta dengan **hitungan** untuk berita dan
 * galeri. Begitu mode contoh menjadi bawaan, dua item berhitungan itu melaporkan
 * "selesai" di situs yang belum punya satu berita atau satu foto asli pun —
 * daftar tugas yang berbohong.
 *
 * Skrip ini masuk, membuka dasbor, lalu membaca panelnya apa adanya. Yang
 * diharapkan: "Berita pertama" dan "Foto galeri" tetap terdaftar sebagai belum
 * lengkap selama yang ada hanya baris `[CONTOH]`.
 *
 * ## Pakai
 *
 *   node --env-file=.env outputs/probe-dasbor-kelengkapan.mjs
 *   BASE=https://skagara.vercel.app node --env-file=.env outputs/probe-dasbor-kelengkapan.mjs
 */

const BASE = process.env.BASE ?? 'http://127.0.0.1:3000';
const EMAIL = process.env.ADMIN_EMAIL ?? '';
const PASSWORD = process.env.ADMIN_PASSWORD ?? '';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const { createRequire } = await import('node:module');
const require = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = require('playwright-core');

if (!EMAIL || !PASSWORD) {
  console.error('ADMIN_EMAIL / ADMIN_PASSWORD belum diset. Jalankan dengan --env-file=.env\n');
  process.exit(1);
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
let failures = 0;

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  console.log(`\nMemeriksa panel kelengkapan dasbor di ${BASE}\n`);

  await page.goto(`${BASE}/admin/masuk`, { waitUntil: 'load' });
  await page.fill('input[name=email]', EMAIL);
  await page.fill('input[name=password]', PASSWORD);
  await Promise.all([
    page.waitForURL(/\/admin\//, { timeout: 20000 }).catch(() => {}),
    page.click('button[type=submit]'),
  ]);
  await page.waitForTimeout(2000);

  if (/\/admin\/masuk/.test(page.url())) {
    console.error(`  login ditolak, masih di ${page.url()}\n`);
    process.exit(1);
  }

  await page.goto(`${BASE}/admin/dasbor`, { waitUntil: 'load' });
  await page.waitForTimeout(1500);

  /** Baca satu AdminPanel berdasarkan judulnya. */
  const readPanel = (title) =>
    page.evaluate((wanted) => {
      const headings = [...document.querySelectorAll('h2, h3, p, span')];
      const heading = headings.find((el) => el.textContent?.trim() === wanted);
      const panel = heading?.closest('section, div');
      if (!panel) return null;
      const items = [...panel.querySelectorAll('li')].map((li) => {
        const spans = [...li.querySelectorAll('span')].map((s) => s.textContent?.trim() ?? '');
        const nonEmpty = spans.filter((s) => s && s !== '→');
        // Baris "Jumlah Konten": label di kiri, angka di kanan.
        if (nonEmpty.length >= 2) return `${nonEmpty[0]} = ${nonEmpty[nonEmpty.length - 1]}`;
        return nonEmpty[0] ?? li.textContent?.trim() ?? '';
      });
      return { items: items.filter(Boolean) };
    }, title);

  const pending = await readPanel('Perlu Dilengkapi');
  const counts = await readPanel('Jumlah Konten');

  const notice = await page.evaluate(() => {
    const el = [...document.querySelectorAll('p')].find((p) =>
      p.textContent?.includes('Mode contoh aktif'),
    );
    return el ? el.parentElement?.innerText?.replace(/\s+/g, ' ').trim() ?? '' : null;
  });

  console.log('Peringatan sidebar:');
  console.log(`  ${notice ?? '(tidak ada — mode contoh mungkin mati)'}\n`);

  console.log('Jumlah Konten:');
  for (const item of counts?.items ?? []) console.log(`  ${item}`);

  console.log('\nPerlu Dilengkapi:');
  for (const item of pending?.items ?? []) console.log(`  ${item}`);

  const list = pending?.items ?? [];
  const has = (label) => list.some((item) => item.includes(label));

  console.log('');
  const checks = [
    ['Mode contoh aktif dilaporkan', notice !== null],
    ['Berita pertama masih terdaftar', has('Berita pertama')],
    ['Foto galeri masih terdaftar', has('Foto galeri')],
    ['Sejarah sekolah masih terdaftar', has('Sejarah sekolah')],
    ['Visi sekolah masih terdaftar', has('Visi sekolah')],
    ['Nomor telepon masih terdaftar', has('Nomor telepon')],
  ];

  for (const [label, pass] of checks) {
    if (!pass) failures += 1;
    console.log(`  ${pass ? 'ok  ' : 'FAIL'}  ${label}`);
  }

  console.log(
    `\n${failures === 0 ? 'LOLOS: panel kelengkapan mengukur tulisan pemilik, bukan isian contoh.' : `${failures} pemeriksaan gagal.`}\n`,
  );

  await context.close();
} finally {
  await browser.close();
}

process.exitCode = failures === 0 ? 0 : 1;
