/**
 * Audit placeholder — apa saja yang masih kosong di situs publik?
 *
 * ## Kenapa skrip ini ada
 *
 * Mode data contoh (`SAMPLE_DATA=on`) mengisi sebagian bidang, tetapi **tidak
 * semuanya**: `sampleProfileCopy` sengaja tidak memuat alamat, telepon, dan
 * email, karena nomor telepon karangan bisa menyesatkan orang yang benar-benar
 * menelepon. Jadi "sudah terisi semua" adalah klaim yang perlu dibuktikan, bukan
 * diasumsikan.
 *
 * Skrip ini menelusuri setiap halaman publik dan mencari dua hal:
 *
 *   1. teks placeholder yang tersisa (`[… — isi melalui Dasbor Admin]`), dan
 *   2. penanda `[CONTOH]`, supaya terlihat bagian mana yang diisi data contoh.
 *
 * Hasilnya adalah daftar jujur: mana yang sudah terasa berjalan, mana yang
 * masih menunggu pemilik proyek.
 *
 * ## Pakai
 *
 *   node outputs/probe-placeholder-audit.mjs
 *   BASE=https://skagara.vercel.app node outputs/probe-placeholder-audit.mjs
 */

const BASE = process.env.BASE ?? 'http://127.0.0.1:3000';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const ROUTES = [
  '/',
  '/tentang',
  '/program-keahlian',
  '/program-keahlian/desain-komunikasi-visual',
  '/kegiatan',
  '/karya',
  '/galeri',
  '/berita',
  '/kontak',
  '/privasi',
];

const { createRequire } = await import('node:module');
const require = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = require('playwright-core');

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

/** Placeholder bawaan `placeholder()` di src/data/defaults.ts. */
const PLACEHOLDER = /\[[^\]]*isi melalui Dasbor Admin\]/g;
const SAMPLE_MARK = /\[CONTOH\]/g;

let totalPlaceholder = 0;
let totalSample = 0;

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  console.log(`BASE=${BASE}\n`);

  for (const route of ROUTES) {
    const response = await page.goto(`${BASE}${route}`, { waitUntil: 'load' });
    await page.waitForTimeout(900);

    const status = response?.status() ?? 0;

    // Hanya teks yang benar-benar terlihat; isi <script>/<style> diabaikan.
    const text = await page.evaluate(() => {
      const clone = document.body.cloneNode(true);
      for (const el of clone.querySelectorAll('script, style, template, noscript')) el.remove();
      return clone.innerText ?? '';
    });

    const placeholders = [...new Set(text.match(PLACEHOLDER) ?? [])];
    const samples = (text.match(SAMPLE_MARK) ?? []).length;

    totalPlaceholder += placeholders.length;
    totalSample += samples;

    const mark = placeholders.length === 0 ? 'terisi penuh' : `${placeholders.length} kosong`;
    console.log(`${route}`);
    console.log(`  status=${status}  penanda [CONTOH]=${samples}  placeholder=${mark}`);
    for (const p of placeholders) console.log(`      sisa: ${p}`);
  }

  console.log(`\nringkasan: ${totalPlaceholder} placeholder tersisa, ${totalSample} penanda [CONTOH]\n`);

  await context.close();
} finally {
  await browser.close();
}
