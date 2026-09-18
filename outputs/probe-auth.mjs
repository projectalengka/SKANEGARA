/**
 * Probe — jalur login admin, ujung ke ujung.
 *
 * ## Kenapa ada
 *
 * `src/lib/auth.ts` menyimpan kredensial di variabel lingkungan, bukan di
 * tabel basis data. Itu keputusan desain, bukan kelalaian — tapi artinya
 * tidak ada cara memeriksa dari SQL bahwa login benar-benar bekerja.
 * Satu-satunya bukti yang sah adalah mengisi formulirnya di browser dan
 * melihat apakah sesi terbentuk.
 *
 * Yang diuji:
 *   1. Kredensial benar  -> diarahkan ke dasbor, cookie sesi terpasang.
 *   2. Kredensial salah  -> tetap di /admin/masuk, tidak ada cookie sesi.
 *   3. Tanpa login       -> /admin/dasbor ditolak (dialihkan).
 *
 * Keluar dengan kode != 0 bila ada yang tidak sesuai.
 */

const BASE = process.env.BASE ?? 'http://127.0.0.1:3100';
const EMAIL = process.env.ADMIN_EMAIL ?? '';
const PASSWORD = process.env.ADMIN_PASSWORD ?? '';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const { createRequire } = await import('node:module');
// Sama seperti `qa.mjs`: `playwright-core` tinggal di workspace Node terkelola,
// bukan di node_modules proyek. Proyek ini sengaja tidak bergantung padanya.
const require = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = require('playwright-core');

let failures = 0;
const ok = (label, detail) => console.log(`  ok    ${label.padEnd(30)} ${detail}`);
const fail = (label, detail) => {
  failures += 1;
  console.log(`  FAIL  ${label.padEnd(30)} ${detail}`);
};

/** Isi formulir login; kembalikan halaman setelah navigasi selesai. */
async function attemptLogin(page, email, password) {
  await page.goto(`${BASE}/admin/masuk`, { waitUntil: 'load' });
  await page.fill('input[name=email]', email);
  await page.fill('input[name=password]', password);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load', timeout: 20000 }).catch(() => {}),
    page.click('button[type=submit], button:has-text("Masuk")'),
  ]);
  await page.waitForTimeout(1200);
}

async function sessionCookie(context) {
  const cookies = await context.cookies();
  return cookies.find((c) => /sesi|session|admin/i.test(c.name)) ?? null;
}

const browser = await chromium.launch({ executablePath: CHROME });

try {
  console.log(`\nMemeriksa jalur login admin di ${BASE}\n`);

  if (!EMAIL || !PASSWORD) {
    console.error('  ADMIN_EMAIL / ADMIN_PASSWORD belum diset untuk probe ini.\n');
    process.exitCode = 1;
  } else {
    // --- 1. Kredensial benar ------------------------------------------------
    const context = await browser.newContext();
    const page = await context.newPage();
    await attemptLogin(page, EMAIL, PASSWORD);

    const url = page.url();
    const body = await page.content();
    const cookie = await sessionCookie(context);

    if (/\/admin\/masuk/.test(url)) {
      fail('login benar', `masih di /admin/masuk — login ditolak: ${url}`);
    } else {
      ok('login benar', `diarahkan ke ${new URL(url).pathname}`);
    }

    if (/Dasbor/i.test(body)) ok('dasbor tampil', 'halaman memuat judul "Dasbor"');
    else fail('dasbor tampil', 'tidak menemukan teks "Dasbor" setelah login');

    if (cookie) ok('cookie sesi', `${cookie.name} (httpOnly=${cookie.httpOnly})`);
    else fail('cookie sesi', 'tidak ada cookie sesi setelah login');

    if (cookie && !cookie.httpOnly) fail('cookie httpOnly', 'cookie sesi harus httpOnly');

    // --- 2. Dasbor bisa diakses setelah login -------------------------------
    const dash = await page.goto(`${BASE}/admin/dasbor`, { waitUntil: 'load' });
    if (dash && dash.status() === 200 && !/\/admin\/masuk/.test(page.url())) {
      ok('dasbor terlindungi terbuka', `status ${dash.status()}`);
    } else {
      fail('dasbor terlindungi terbuka', `status ${dash ? dash.status() : '?'} url ${page.url()}`);
    }
    await context.close();

    // --- 3. Kredensial salah ------------------------------------------------
    const badContext = await browser.newContext();
    const badPage = await badContext.newPage();
    await attemptLogin(badPage, EMAIL, 'kata-sandi-yang-salah-sekali');

    if (/\/admin\/masuk/.test(badPage.url())) ok('login salah ditolak', 'tetap di /admin/masuk');
    else fail('login salah ditolak', `diterima ke ${badPage.url()}`);

    const badCookie = await sessionCookie(badContext);
    if (!badCookie) ok('tidak ada sesi saat salah', 'benar');
    else fail('tidak ada sesi saat salah', `cookie ${badCookie.name} terpasang`);
    await badContext.close();

    // --- 4. Tanpa login -----------------------------------------------------
    const anonContext = await browser.newContext();
    const anonPage = await anonContext.newPage();
    const anon = await anonPage.goto(`${BASE}/admin/dasbor`, { waitUntil: 'load' });
    const anonBody = await anonPage.content();

    if (anon && anon.status() === 200 && !/\/admin\/masuk/.test(anonPage.url())) {
      fail('tanpa login ditolak', `dasbor terbuka bagi anonim: ${anonPage.url()}`);
      if (/Dasbor/i.test(anonBody)) fail('tanpa kebocoran markup', 'isi dasbor terkirim ke anonim');
    } else {
      ok('tanpa login ditolak', `dialihkan ke ${new URL(anonPage.url()).pathname} (status ${anon ? anon.status() : '?'})`);
    }
    await anonContext.close();
  }
} finally {
  await browser.close();
}

console.log('');
if (failures === 0) {
  console.log('HASIL: jalur login admin sehat.\n');
} else {
  console.log(`HASIL: ${failures} masalah pada jalur login.\n`);
  process.exitCode = 1;
}
