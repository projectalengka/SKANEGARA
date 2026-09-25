/**
 * Probe — apakah foto sekolah benar-benar bisa diunggah dari dasbor, ujung ke ujung.
 *
 * ## Kenapa ada
 *
 * Halaman Tentang menampilkan placeholder yang berbunyi "FOTO SEKOLAH — UNGGAH
 * MELALUI DASBOR", tetapi tidak ada tempat mengunggahnya: model `SchoolProfile`
 * tidak punya kolom gambar, dan `src="/images/hero.svg"` ditulis langsung di
 * JSX. Pemilik mencarinya dan tidak menemukannya.
 *
 * Probe ini membuktikan rantai penuhnya, bukan salah satu ujungnya saja:
 *
 *   unggah berkas → action menyimpan → basis data menyimpan → halaman publik
 *   merender foto itu → dihapus → halaman kembali ke placeholder
 *
 * ## Membersihkan dirinya sendiri
 *
 * Langkah terakhir menghapus kembali fotonya dan menyimpan, jadi situs ditinggalkan
 * persis seperti sebelum probe berjalan. Kalau probe gagal di tengah, jalankan
 * sekali lagi — atau hapus fotonya lewat Dasbor › Profil Sekolah.
 *
 * ## Pakai
 *
 *   node --env-file=.env outputs/probe-foto-dasbor.mjs
 *   BASE=https://skagara.vercel.app node --env-file=.env outputs/probe-foto-dasbor.mjs
 */

import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const BASE = process.env.BASE ?? 'http://127.0.0.1:3000';
const EMAIL = process.env.ADMIN_EMAIL ?? '';
const PASSWORD = process.env.ADMIN_PASSWORD ?? '';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const require = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const { chromium } = require('playwright-core');

const projectRequire = createRequire(import.meta.url);

if (!EMAIL || !PASSWORD) {
  console.error('ADMIN_EMAIL / ADMIN_PASSWORD belum diset. Jalankan dengan --env-file=.env\n');
  process.exit(1);
}

let failures = 0;

function check(label, condition, detail) {
  if (condition) {
    console.log(`  ok    ${label.padEnd(38)} ${detail}`);
  } else {
    failures += 1;
    console.log(`  GAGAL ${label.padEnd(38)} ${detail}`);
  }
}

/** Membuat berkas PNG sungguhan untuk diunggah — bukan berkas kosong. */
async function makeTestImage() {
  const sharp = projectRequire('sharp');
  const dir = mkdtempSync(join(tmpdir(), 'foto-sekolah-'));
  const path = join(dir, 'uji-foto-sekolah.png');

  await sharp({
    create: { width: 640, height: 360, channels: 3, background: { r: 200, g: 52, b: 31 } },
  })
    .png()
    .toFile(path);

  return path;
}

/**
 * Sumber gambar yang benar-benar dirender di halaman Tentang.
 *
 * ## Jebakan yang ditemukan di sini (2026-09-25)
 *
 * Next 16 menstrim **kerangka** halaman lebih dulu, lalu mengirim isinya di
 * dalam `<div hidden id="S:n">` dan memindahkannya keluar setelah `load`.
 * Interaksi yang dilakukan tepat setelah `waitUntil: 'load'` karena itu menyentuh
 * simpul yang masih tersembunyi: `setInputFiles` berhasil memasang berkas, tapi
 * `onChange` React tidak pernah menyala dan **tidak ada permintaan unggah sama
 * sekali** — probe melaporkan "tidak ada pesan" padahal kodenya benar.
 *
 * Pelajarannya: tunggu **keadaan** (elemen terlihat), bukan **durasi** atau
 * peristiwa `load`. Fungsi ini karena itu menunggu `<main>` terlihat lebih dulu,
 * dan memeriksa bahwa gambarnya punya kotak, bukan sekadar ada di dalam HTML —
 * `page.content()` juga memuat wadah tersembunyi itu.
 */
async function renderedPhoto(page) {
  await page.goto(`${BASE}/tentang`, { waitUntil: 'load' });
  await page.locator('main').first().waitFor({ state: 'visible', timeout: 30000 });

  const images = await page.evaluate(() =>
    [...document.querySelectorAll('main img')].map((el) => {
      const r = el.getBoundingClientRect();
      return {
        src: el.currentSrc || el.getAttribute('src') || '',
        width: Math.round(r.width),
        height: Math.round(r.height),
      };
    }),
  );

  const visible = images.filter((image) => image.width > 0 && image.height > 0);

  if (visible.some((image) => /api\/media|api%2Fmedia/i.test(image.src))) {
    return { kind: 'unggahan', detail: 'foto unggahan terlihat di layar' };
  }
  if (visible.some((image) => /hero\.svg|hero%2Esvg/i.test(image.src))) {
    return { kind: 'placeholder', detail: 'placeholder hero.svg terlihat di layar' };
  }
  return {
    kind: 'tidak ada',
    detail: `tidak ada gambar terlihat (${images.length} elemen img, semuanya berukuran nol)`,
  };
}

/** Form profil adalah form yang memuat kolom unggah foto. */
function profileForm(page) {
  return page.locator('form:has(#unggah-image)');
}

async function saveProfile(page) {
  await profileForm(page).locator('button[type=submit]').click();
  await page.waitForFunction(
    () => /berhasil disimpan|Periksa kembali/.test(document.body.innerText),
    undefined,
    { timeout: 30000 },
  );
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();

  console.log(`\nMembuktikan unggah foto sekolah ujung ke ujung di ${BASE}\n`);

  await page.goto(`${BASE}/admin/masuk`, { waitUntil: 'load' });
  await page.fill('input[name=email]', EMAIL);
  await page.fill('input[name=password]', PASSWORD);
  await Promise.all([
    page.waitForURL(/\/admin\//, { timeout: 20000 }).catch(() => {}),
    page.click('button[type=submit]'),
  ]);
  await page.waitForTimeout(1500);
  check('masuk sebagai admin', /\/admin\//.test(page.url()), page.url().replace(BASE, ''));

  // --- Keadaan awal -------------------------------------------------------
  const awal = await renderedPhoto(page);
  check('sebelum diunggah, placeholder yang tampil', awal.kind === 'placeholder', awal.detail);

  // --- Dasbor: kolomnya ada ----------------------------------------------
  await page.goto(`${BASE}/admin/profil`, { waitUntil: 'load' });
  const field = page.locator('#unggah-image');

  // Tunggu **keadaan**, bukan durasi: sampai simpulnya benar-benar terlihat,
  // yang berarti Next sudah memindahkan isinya keluar dari wadah tersembunyi.
  // Tanpa ini, `setInputFiles` berhasil memasang berkas tetapi `onChange` React
  // tidak pernah menyala — lihat catatan di `renderedPhoto`.
  await field.waitFor({ state: 'visible', timeout: 30000 });
  check('kolom unggah foto ada di dasbor', (await field.count()) === 1, 'input#unggah-image terlihat');

  const sectionText = await page.locator('form:has(#unggah-image)').innerText();
  check('disebut "Foto Sekolah" dan menjelaskan tempatnya', /Foto Sekolah/.test(sectionText), 'judul bagian terbaca');
  check(
    'menjelaskan tampil di Tentang dan pratinjau tautan',
    /Tentang Kami/.test(sectionText) && /pratinjau/.test(sectionText),
    'keterangan bagian terbaca',
  );

  // --- Unggah -------------------------------------------------------------
  const imagePath = await makeTestImage();
  await field.setInputFiles(imagePath);
  await page.waitForFunction(
    () => /berhasil diunggah|gagal diunggah|melebihi|Format gambar/.test(document.body.innerText),
    undefined,
    { timeout: 30000 },
  );
  const uploadMessage = await profileForm(page).innerText();
  check('berkas terunggah', /Gambar berhasil diunggah/.test(uploadMessage), 'pesan unggah terbaca');

  const hiddenUrl = await page.locator('input[name=image]').inputValue();
  const hiddenId = await page.locator('input[name=imagePublicId]').inputValue();
  check('URL gambar terisi', hiddenUrl.startsWith('/api/media/'), hiddenUrl.slice(0, 34));
  check('id aset terisi', hiddenId.length > 10, `${hiddenId.slice(0, 12)}…`);

  // --- Simpan -------------------------------------------------------------
  await saveProfile(page);
  const savedMessage = await page.locator('form:has(#unggah-image)').innerText();
  check('profil tersimpan', /Data berhasil disimpan/.test(savedMessage), 'pesan simpan terbaca');

  // --- Situs publik memakai fotonya ---------------------------------------
  const sesudah = await renderedPhoto(page);
  check('halaman Tentang merender foto unggahan', sesudah.kind === 'unggahan', sesudah.detail);

  const og = await page.locator('meta[property="og:image"]').getAttribute('content');
  check('pratinjau tautan memakai foto yang sama', Boolean(og && og.includes('/api/media/')), og ?? 'tidak ada');

  // --- Bersihkan ----------------------------------------------------------
  await page.goto(`${BASE}/admin/profil`, { waitUntil: 'load' });
  const hapus = page.locator('button:has-text("Hapus gambar")').first();
  await hapus.waitFor({ state: 'visible', timeout: 30000 });
  await hapus.click();
  await saveProfile(page);

  const kosong = await renderedPhoto(page);
  check('setelah dihapus, kembali ke placeholder', kosong.kind === 'placeholder', kosong.detail);

  const ogSetelah = await page.locator('meta[property="og:image"]').getAttribute('content');
  check(
    'pratinjau tautan kembali ke placeholder',
    Boolean(ogSetelah && ogSetelah.includes('hero.svg')),
    ogSetelah ?? 'tidak ada',
  );

  console.log(
    failures === 0
      ? '\nHASIL: unggah foto sekolah bekerja ujung ke ujung, dan situs dikembalikan ke keadaan semula.\n'
      : `\nHASIL: ${failures} masalah ditemukan.\n`,
  );
} catch (error) {
  failures += 1;
  console.error('\nProbe berhenti karena galat:', error);
} finally {
  await browser.close();
}

if (failures > 0) process.exitCode = 1;
