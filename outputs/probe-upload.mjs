/**
 * Probe — jalur unggah gambar di dasbor.
 *
 * ## Kenapa ada
 *
 * Pemilik proyek melaporkan "belum bisa upload gambar". Ada dua sebab yang
 * berbeda, dan keduanya menghasilkan gejala yang sama dari luar — tidak ada
 * gambar yang tersimpan — jadi keduanya harus diukur terpisah:
 *
 *   1. **Kredensial Cloudinary kosong.** `uploadImage()` menolak lebih dulu
 *      dengan pesan yang jelas. Ini bukan bug kode; ini keadaan konfigurasi.
 *   2. **Batas badan Server Action 1 MB.** Nilai bawaan Next.js adalah 1 MB
 *      (`action-handler.js`: `1024 * 1024 // 1 MB`), sementara
 *      `UPLOAD_LIMITS.maxBytes` menerima sampai 8 MB. Berkas antara 1 MB dan
 *      8 MB ditolak **sebelum action dijalankan**, sebagai galat 413 yang
 *      dilempar dari dalam runtime.
 *
 * Akibat sebab kedua lebih buruk daripada penolakan biasa: `handleChange` di
 * `ImageUploadField` tidak membungkus `await upload(...)` dengan `try/catch`,
 * jadi janji yang ditolak itu tidak tertangkap. Status komponen tetap
 * `'uploading'` selamanya dan pengguna melihat "Mengunggah…" yang tidak pernah
 * selesai — tanpa pesan galat apa pun.
 *
 * Probe ini membedakan keduanya lewat ukuran berkas: 1,5 MB membuktikan batas
 * badan, dan pesan yang muncul membuktikan apakah permintaan sampai ke action.
 *
 * ## Pakai
 *
 *   node --env-file=.env outputs/probe-upload.mjs
 */

const BASE = process.env.BASE ?? 'http://127.0.0.1:3000';
const EMAIL = process.env.ADMIN_EMAIL ?? '';
const PASSWORD = process.env.ADMIN_PASSWORD ?? '';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const TAG = process.env.TAG ?? 'before';

const { createRequire } = await import('node:module');
const require = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = require('playwright-core');

const shots = new URL('./', import.meta.url).pathname.replace(/^\//, '');

/** PNG 1×1 yang sah, lalu ditambahi byte supaya ukurannya sesuai permintaan. */
function pngOfSize(bytes) {
  const head = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  );
  const filler = Buffer.alloc(Math.max(0, bytes - head.length), 0x20);
  return Buffer.concat([head, filler]);
}

const results = [];

const browser = await chromium.launch({ executablePath: CHROME });

try {
  if (!EMAIL || !PASSWORD) {
    console.error('ADMIN_EMAIL / ADMIN_PASSWORD belum diset (pakai --env-file=.env).');
    process.exit(1);
  }

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const actionResponses = [];
  page.on('response', (response) => {
    const request = response.request();
    if (request.method() === 'POST') {
      actionResponses.push({ url: new URL(response.url()).pathname, status: response.status() });
    }
  });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto(`${BASE}/admin/masuk`, { waitUntil: 'load' });
  await page.fill('input[name=email]', EMAIL);
  await page.fill('input[name=password]', PASSWORD);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load', timeout: 20000 }).catch(() => {}),
    page.click('button[type=submit], button:has-text("Masuk")'),
  ]);

  await page.goto(`${BASE}/admin/galeri`, { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  // Buka formulir "Tambah Foto" bila belum terbuka.
  const addButton = page.getByRole('button', { name: /Tambah Foto/i });
  if (await addButton.count()) {
    const expanded = await page.locator('input[type=file]').count();
    if (expanded === 0) await addButton.first().click();
  }
  await page.waitForSelector('input[type=file]', { timeout: 10000 });

  for (const [label, bytes] of [
    ['200 KB (di bawah batas 1 MB)', 200 * 1024],
    ['1,5 MB (di atas batas 1 MB, di bawah batas 8 MB)', 1.5 * 1024 * 1024],
    ['9 MB (di atas batas 8 MB)', 9 * 1024 * 1024],
  ]) {
    const before = actionResponses.length;
    pageErrors.length = 0;

    await page.setInputFiles('input[type=file]', {
      name: 'uji.png',
      mimeType: 'image/png',
      buffer: pngOfSize(Math.round(bytes)),
    });

    // Tunggu sampai keadaan akhir stabil: 8 detik cukup untuk unggahan yang
    // benar-benar dikirim, dan cukup lama untuk memastikan "Mengunggah…" yang
    // macet memang macet, bukan sedang lambat.
    let statusText = '';
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      await page.waitForTimeout(250);
      statusText = (await page.locator('form [role=status]').allTextContents()).join(' | ');
      if (statusText && !/Mengunggah/.test(statusText)) break;
    }

    results.push({
      label,
      statusText: statusText || '(tidak ada pesan)',
      stuckUploading: /Mengunggah/.test(statusText),
      posts: actionResponses.slice(before),
      pageErrors: [...pageErrors],
    });
  }

  await page.screenshot({ path: `${shots}screenshots/admin-upload-${TAG}.png`, fullPage: false });
  await context.close();
} finally {
  await browser.close();
}

console.log(`\nJalur unggah gambar (${TAG}) — ${BASE}\n`);
for (const r of results) {
  console.log(`${r.label}`);
  console.log(`  pesan status   : ${r.statusText}`);
  console.log(`  macet "Mengunggah…" : ${r.stuckUploading ? 'YA' : 'tidak'}`);
  console.log(`  permintaan POST: ${r.posts.length ? JSON.stringify(r.posts) : 'tidak ada'}`);
  if (r.pageErrors.length) console.log(`  galat halaman  : ${JSON.stringify(r.pageErrors)}`);
  console.log('');
}
console.log('Catatan: status POST 413 = ditolak batas badan Server Action, bukan oleh action-nya.\n');
