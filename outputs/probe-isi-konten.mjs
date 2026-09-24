/**
 * Potret dua bagian yang dilaporkan pemilik proyek masih kosong.
 *
 *   - `/tentang`  → blok Visi & Misi
 *   - `/`         → bagian "Hari-hari di sekolah."
 *
 * Dipakai untuk membandingkan keadaan sebelum/sesudah mode data contoh
 * dinyalakan, pada dua basis sekaligus (lokal dan produksi).
 *
 * ## Pakai
 *
 *   TAG=produksi-sakelar-mati  BASE=https://skagara.vercel.app node outputs/probe-isi-konten.mjs
 *   TAG=lokal-sakelar-hidup    node outputs/probe-isi-konten.mjs
 */

const BASE = process.env.BASE ?? 'http://127.0.0.1:3000';
const TAG = process.env.TAG ?? 'potret';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const { createRequire } = await import('node:module');
const require = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = require('playwright-core');

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

try {
  const context = await browser.newContext({
    viewport: { width: 1200, height: 620 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  console.log(`BASE=${BASE}  TAG=${TAG}\n`);

  /** @type {Array<{route: string, name: string, find: (p: import('playwright-core').Page) => import('playwright-core').Locator}>} */
  const targets = [
    {
      route: '/tentang',
      name: 'visi-misi',
      // Blok Visi & Misi adalah kisi yang membungkus judul "Visi & Misi."
      find: (p) =>
        p
          .getByRole('heading', { name: /Visi/i })
          .first()
          .locator('xpath=ancestor::div[contains(@class,"grid")][1]'),
    },
    {
      route: '/',
      name: 'hari-hari',
      find: (p) => p.locator('h2', { hasText: /Hari-hari/i }).first(),
    },
  ];

  for (const target of targets) {
    await page.goto(`${BASE}${target.route}`, { waitUntil: 'load' });
    await page.waitForTimeout(2000);

    const node = target.find(page);
    await node.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);

    const file = `outputs/screenshots/isi-${TAG}-${target.name}.png`;
    await page.screenshot({ path: file });

    // Laporkan teks yang benar-benar terlihat, supaya potret tidak perlu ditebak.
    const text = await node.innerText().catch(() => '(tidak terbaca)');
    const firstLine = text.split('\n').map((l) => l.trim()).filter(Boolean)[0] ?? '';

    console.log(`${target.route} → ${target.name}`);
    console.log(`  potret: ${file}`);
    console.log(`  baris pertama: ${firstLine.slice(0, 90)}`);
    console.log('');
  }

  await context.close();
} finally {
  await browser.close();
}
