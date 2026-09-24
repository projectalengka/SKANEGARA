/**
 * Probe — gambar benar-benar tersimpan, tersaji, dan tampil di beranda.
 *
 * ## Kenapa ada
 *
 * Keluhan pemilik proyek, 24 September 2026, bunyinya: "saya belum bisa upload
 * gambar kemudian tampil di beranda". Itu satu kalimat, tetapi di dalamnya ada
 * empat hal berbeda yang bisa gagal, dan masing-masing punya gejala yang mirip
 * dari luar — tidak ada gambar di beranda:
 *
 *   1. Unggahannya tidak pernah sampai (batas badan Server Action, atau
 *      penyimpanan belum dikonfigurasi).
 *   2. Sampai, tetapi gagal disimpan.
 *   3. Tersimpan, tetapi URL-nya tidak bisa disajikan (rute 404 atau 500).
 *   4. Tersimpan dan tersaji, tetapi tidak tampil karena status terbit atau
 *      angka urutnya.
 *
 * `probe-upload.mjs` hanya mengukur nomor 1. Probe ini mengukur seluruh
 * rantainya, dan berhenti di titik pertama yang gagal — supaya laporan akhirnya
 * menunjuk satu sebab, bukan daftar kemungkinan.
 *
 * ## Yang dilakukan, berurutan
 *
 *   masuk → /admin/galeri → unggah PNG 1600×1000 yang SAH → baca pesan status →
 *   baca nilai tersembunyi → ambil URL-nya lewat HTTP → periksa tipe, panjang,
 *   dan magic bytes WebP → simpan sebagai foto galeri → buka beranda → cari
 *   URL-nya di HTML → hapus lagi foto uji itu
 *
 * ## Kenapa PNG-nya dibuat dengan `sharp`, bukan byte palsu
 *
 * `probe-upload.mjs` menyusun berkas "PNG" dengan menempelkan byte sampah di
 * belakang PNG 1×1. Sharp menolak berkas seperti itu, dan `media.ts` dengan
 * sengaja menyimpan byte aslinya sebagai jalan penurunan. Artinya probe itu
 * mengukur **jalur cadangan**, bukan jalur normal. Gambar di sini benar-benar
 * dikodekan, sehingga jalur normal yang terukur.
 *
 * ## Pakai
 *
 *   node --env-file=.env outputs/probe-media.mjs
 *
 * Probe ini MENULIS ke basis data, lalu membersihkan dirinya sendiri. Kalau
 * gagal di tengah, periksa `/admin/galeri` dan hapus foto berjudul
 * "PROBE sementara" secara manual.
 */

const BASE = process.env.BASE ?? 'http://127.0.0.1:3000';
const EMAIL = process.env.ADMIN_EMAIL ?? '';
const PASSWORD = process.env.ADMIN_PASSWORD ?? '';
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const TITLE = 'PROBE sementara';

const { createRequire } = await import('node:module');
// playwright-core ada di ruang kerja terisolasi; sharp ada di proyek ini.
const workspaceRequire = createRequire('C:/Users/User/.workbuddy-ai/binaries/node/workspace/');
const projectRequire = createRequire(new URL('../package.json', import.meta.url));
const { chromium } = workspaceRequire('playwright-core');
const sharp = projectRequire('sharp');

const shots = new URL('./', import.meta.url).pathname.replace(/^\//, '');

/**
 * PNG 1600×1000 yang sah: gradien dua arah plus pola kotak-kotak.
 *
 * Sengaja bukan gambar rata satu warna — gambar rata bisa "berhasil" dikodekan
 * bahkan oleh encoder yang salah, dan hasilnya kebetulan kecil. Gradien memberi
 * encoder sesuatu untuk dikerjakan, sehingga angka ukurannya berarti.
 */
async function realPng(width, height) {
  const pixels = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 3;
      pixels[i] = Math.round((x * 255) / width);
      pixels[i + 1] = Math.round((y * 255) / height);
      pixels[i + 2] = ((x >> 4) + (y >> 4)) % 2 === 0 ? 24 : 216;
    }
  }
  return sharp(pixels, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

const steps = [];
const record = (label, ok, detail) => steps.push({ label, ok, detail });

if (!EMAIL || !PASSWORD) {
  console.error('ADMIN_EMAIL / ADMIN_PASSWORD belum diset (pakai --env-file=.env).');
  process.exit(1);
}

const source = await realPng(1600, 1000);
record('PNG sumber dibuat', source.length > 1000, `${(source.length / 1024).toFixed(0)} KB, 1600×1000`);

const browser = await chromium.launch({ executablePath: CHROME });
let uploadedUrl = '';
let uploadedId = '';
let galleryItemCreated = false;

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  // ---------------------------------------------------------------------
  // Masuk
  // ---------------------------------------------------------------------

  await page.goto(`${BASE}/admin/masuk`, { waitUntil: 'load' });
  await page.fill('input[name=email]', EMAIL);
  await page.fill('input[name=password]', PASSWORD);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load', timeout: 20000 }).catch(() => {}),
    page.click('button[type=submit], button:has-text("Masuk")'),
  ]);

  await page.goto(`${BASE}/admin/galeri`, { waitUntil: 'load' });
  await page.waitForTimeout(800);

  // ---------------------------------------------------------------------
  // 1. Unggah lewat kolom berkas yang sesungguhnya
  // ---------------------------------------------------------------------

  const addButton = page.getByRole('button', { name: /Tambah Foto/i });
  if ((await page.locator('input[type=file]').count()) === 0 && (await addButton.count())) {
    await addButton.first().click();
  }
  await page.waitForSelector('input[type=file]', { timeout: 10000 });

  await page.setInputFiles('input[type=file]', {
    name: 'probe-media.png',
    mimeType: 'image/png',
    buffer: source,
  });

  // Tunggu sampai pesannya berhenti berkata "Mengunggah…".
  let statusText = '';
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    await page.waitForTimeout(250);
    statusText = (await page.locator('form [role=status]').allTextContents()).join(' | ');
    if (statusText && !/Mengunggah/.test(statusText)) break;
  }

  record(
    'pesan status setelah unggah',
    /berhasil/i.test(statusText),
    statusText || '(tidak ada pesan)',
  );

  uploadedUrl = await page.locator('input[type=hidden][name=image]').first().inputValue();
  uploadedId = await page.locator('input[type=hidden][name=imagePublicId]').first().inputValue();

  record(
    'URL tersimpan di formulir',
    /^\/api\/media\/[A-Za-z0-9_-]+$/.test(uploadedUrl),
    uploadedUrl || '(kosong)',
  );
  record('public id tersimpan', uploadedId.length > 0, uploadedId || '(kosong)');

  // ---------------------------------------------------------------------
  // 2. URL-nya benar-benar disajikan
  // ---------------------------------------------------------------------

  if (uploadedUrl) {
    const response = await page.request.get(`${BASE}${uploadedUrl}`);
    const body = await response.body();
    const headers = response.headers();

    record('HTTP gambar', response.status() === 200, `status ${response.status()}`);

    record(
      'tipe isi',
      (headers['content-type'] ?? '').startsWith('image/'),
      headers['content-type'] ?? '(tidak ada)',
    );

    record(
      'panjang isi cocok dengan byte yang dikirim',
      Number(headers['content-length']) === body.length,
      `content-length ${headers['content-length']}, diterima ${body.length}`,
    );

    // RIFF....WEBP — bukti byte-nya benar-benar WebP hasil encode, bukan PNG
    // asli yang disimpan apa adanya karena encoder gagal.
    const isWebp =
      body.subarray(0, 4).toString('ascii') === 'RIFF' &&
      body.subarray(8, 12).toString('ascii') === 'WEBP';
    record('isinya WebP hasil encode', isWebp, `${(body.length / 1024).toFixed(0)} KB`);

    record(
      'jauh lebih kecil dari sumber',
      body.length < source.length,
      `${(source.length / 1024).toFixed(0)} KB → ${(body.length / 1024).toFixed(0)} KB`,
    );

    record(
      'cache jangka panjang',
      /immutable/.test(headers['cache-control'] ?? ''),
      headers['cache-control'] ?? '(tidak ada)',
    );

    // Pratinjau di dasbor harus benar-benar ter-decode oleh peramban.
    const preview = page.locator('form img').first();
    const decoded = await preview
      .evaluate((img) => (img.complete ? img.naturalWidth : -1))
      .catch(() => -1);
    record('pratinjau ter-decode', decoded > 0, `naturalWidth ${decoded}`);
  }

  // ---------------------------------------------------------------------
  // 3. Simpan sebagai foto galeri, lalu cari di beranda
  // ---------------------------------------------------------------------

  /*
   * Formulirnya dicari lewat kolom judulnya, bukan lewat `form` begitu saja.
   * Versi pertama probe ini memakai `page.click('form button[type=submit]')`,
   * dan itu menekan tombol **Keluar** di sidebar — formulir logout muncul lebih
   * dulu di DOM daripada formulir di area konten. Akibatnya probe melaporkan
   * "foto uji tidak tersimpan" padahal yang terjadi adalah sesinya berakhir.
   * Selector yang menunjuk "tombol submit mana pun" adalah selector yang akan
   * menunjuk tombol yang salah begitu ada formulir kedua di halaman.
   */
  const createForm = page.locator('form', { has: page.locator('input[name=title]') }).first();

  await createForm.locator('input[name=title]').fill(TITLE);
  // Angka negatif supaya foto uji pasti masuk enam teratas beranda — beranda
  // hanya memuat enam foto, dan item yang tidak tampil di sana akan terbaca
  // sebagai "gagal" padahal hanya kalah urutan.
  await createForm.locator('input[name=order]').fill('-1');

  const published = createForm.locator('input[name=published]').first();
  if (!(await published.isChecked())) await published.check();

  /*
   * `ActionForm` memakai `onSubmit` + `preventDefault` dan menjalankan server
   * action di dalam `startTransition`. Jadi **tidak ada navigasi** yang bisa
   * ditunggu — menunggu `waitForNavigation` hanya akan kehabisan waktu, dan
   * memeriksa hasilnya terlalu cepat akan membaca daftar yang belum disegarkan.
   * Yang ditunggu adalah buktinya: judulnya muncul di daftar.
   */
  await createForm.locator('button[type=submit]').click();

  let saved = false;
  try {
    await page.getByText(TITLE).first().waitFor({ state: 'visible', timeout: 20000 });
    saved = true;
  } catch {
    saved = false;
  }

  if (!saved) {
    const notice = (await page.locator('[role=alert]').allTextContents()).join(' | ');
    record('foto uji tersimpan di galeri', false, notice || 'judul tidak muncul di daftar');
  } else {
    galleryItemCreated = true;
    record('foto uji tersimpan di galeri', true, TITLE);
  }

  const home = await context.newPage();
  await home.goto(`${BASE}/`, { waitUntil: 'load' });
  await home.waitForTimeout(1200);

  const html = await home.content();
  // next/image membungkus URL-nya jadi `/_next/image?url=%2Fapi%2Fmedia%2F<id>`.
  const encoded = encodeURIComponent(uploadedUrl);
  const onHomepage = html.includes(encoded) || html.includes(uploadedUrl);
  record('tampil di beranda', onHomepage, onHomepage ? 'URL ditemukan di HTML beranda' : 'URL TIDAK ditemukan');

  /*
   * Ada di HTML belum berarti terlihat. Beranda memuat sepuluh bagian, dan
   * galerinya ada di bawah — tangkapan layar bagian atas halaman tidak
   * membuktikan apa pun soal gambar yang sedang diuji. Jadi elemennya dicari
   * langsung, digulirkan ke tampilan, lalu **dipotret sendiri**.
   *
   * `scrollIntoViewIfNeeded()` dan bukan `window.scrollTo()`: halaman ini
   * memakai Lenis, dan menggulir lewat `window` tidak menggerakkan viewport-nya.
   */
  const photo = home.locator(`img[src*="${uploadedId}"]`).first();

  if ((await photo.count()) === 0) {
    record('foto ditemukan di beranda', false, 'tidak ada <img> yang menunjuk aset ini');
  } else {
    await photo.scrollIntoViewIfNeeded().catch(() => {});
    await home.waitForTimeout(1200);

    const box = await photo.boundingBox();
    const visible = Boolean(box && box.width > 0 && box.height > 0);

    record(
      'foto ditemukan di beranda',
      visible,
      box ? `tergambar ${Math.round(box.width)}×${Math.round(box.height)} px` : 'kotaknya kosong',
    );

    /*
     * Menunggu `<img>` benar-benar selesai dimuat, bukan menebak dengan jeda.
     *
     * Pelajaran yang sudah mahal di proyek ini: `loading="lazy"` yang belum
     * terpicu **terlihat persis seperti gambar rusak** — elemennya ada, kotaknya
     * terisi, dan `naturalWidth` nol. Menyimpulkan "gambar rusak" dari situ
     * adalah kesimpulan yang salah. Jadi: tunggu peristiwa `load`-nya, dan kalau
     * tetap nol, paksa `loading="eager"` untuk memisahkan "pemicu lazy-nya yang
     * tidak jalan" dari "byte-nya yang bermasalah". Yang kedua baru bug.
     */
    const loadState = (locator) =>
      locator.evaluate(async (img) => {
        if (!img.complete) {
          await new Promise((resolve) => {
            img.addEventListener('load', resolve, { once: true });
            img.addEventListener('error', resolve, { once: true });
            setTimeout(resolve, 8000);
          });
        }
        return { w: img.naturalWidth, h: img.naturalHeight, loading: img.loading };
      });

    let natural = await loadState(photo).catch(() => ({ w: 0, h: 0, loading: '' }));

    if (natural.w === 0) {
      natural = await photo
        .evaluate(async (img) => {
          img.loading = 'eager';
          const src = img.src;
          img.src = '';
          img.src = src;
          await new Promise((resolve) => {
            img.addEventListener('load', resolve, { once: true });
            img.addEventListener('error', resolve, { once: true });
            setTimeout(resolve, 8000);
          });
          return { w: img.naturalWidth, h: img.naturalHeight, loading: 'eager (dipaksa)' };
        })
        .catch(() => ({ w: 0, h: 0, loading: '' }));
    }

    record(
      'foto ter-decode di beranda',
      natural.w > 0,
      natural.w > 0
        ? `natural ${natural.w}×${natural.h}, loading="${natural.loading}"`
        : 'natural 0×0 bahkan dengan eager — byte-nya yang bermasalah',
    );

    await photo.screenshot({ path: `${shots}screenshots/probe-media-foto.png` }).catch(() => {});
    await home.screenshot({ path: `${shots}screenshots/probe-media-beranda.png`, fullPage: false });
  }

  await home.close();

  record('galat halaman', pageErrors.length === 0, pageErrors.length ? pageErrors.join(' | ') : 'tidak ada');

  await page.screenshot({ path: `${shots}screenshots/probe-media-dasbor.png`, fullPage: false });

  // ---------------------------------------------------------------------
  // 4. Bersihkan: hapus foto uji
  // ---------------------------------------------------------------------

  if (galleryItemCreated) {
    await page.goto(`${BASE}/admin/galeri`, { waitUntil: 'load' });
    await page.waitForTimeout(800);

    const row = page.locator('li', { hasText: TITLE }).first();
    if (await row.count()) {
      const remove = row.getByRole('button', { name: /Hapus/i }).first();
      // DeleteButton butuh dua klik: yang pertama "memersenjatai" (teksnya
      // berubah jadi "Yakin hapus?"), yang kedua benar-benar menghapus.
      await remove.click();
      await page.waitForTimeout(400);
      await remove.click();

      // Jangan pakai jeda tetap di sini. 24 September 2026 probe ini menuduh
      // "MASIH ADA — hapus manual" saat dijalankan terhadap produksi, padahal
      // barisnya sudah lenyap dari basis data dan `media:bersihkan` melaporkan
      // 0 aset: server action-nya selesai, DOM-nya yang belum sempat menyusul.
      // Vercel + Supabase lintas wilayah butuh lebih dari 2500 ms, sementara di
      // localhost 2500 ms selalu cukup — itulah kenapa laporan palsunya hanya
      // muncul di produksi. Tunggu sampai barisnya benar-benar lepas.
      await page
        .locator('li', { hasText: TITLE })
        .first()
        .waitFor({ state: 'detached', timeout: 20000 })
        .catch(() => {});
      await page.waitForTimeout(500);

      // Dihitung pada <li>, bukan `getByText`: teks judul juga hidup di dalam
      // input formulir, dan itu membuat hitungannya tidak pernah nol.
      const stillThere = (await page.locator('li', { hasText: TITLE }).count()) > 0;
      record('foto uji terhapus', !stillThere, stillThere ? 'MASIH ADA — hapus manual' : 'bersih');
    } else {
      record('foto uji terhapus', false, 'barisnya tidak ditemukan');
    }
  }

  await context.close();
} finally {
  await browser.close();
}

console.log(`\nJalur gambar ujung ke ujung — ${BASE}\n`);
for (const step of steps) {
  console.log(`  ${step.ok ? 'ok   ' : 'GAGAL'}  ${step.label.padEnd(38)} ${step.detail}`);
}

if (uploadedId) {
  console.log(
    `\nAset uji: ${uploadedId}\n` +
      'Probe ini membersihkan dirinya sendiri: menghapus foto ujinya juga menghapus\n' +
      'asetnya, karena `deleteGalleryItem` memanggil `deleteImage(publicId)`. Kalau\n' +
      '`npm run media:bersihkan` masih menemukan aset ini sesudah probe selesai,\n' +
      'berarti jalur hapus aset itu yang rusak — bukan jalur unggahnya. Itu persis\n' +
      'gejala bug yang ditemukan 24 September 2026 (action membaca nama kolom yang\n' +
      'tidak pernah ada di formulir, sehingga public id tersimpan kosong dan\n' +
      '`deleteImage` tidak pernah berjalan).\n\n' +
      'Periksa dengan:  npm run media:bersihkan\n',
  );
}

const failed = steps.filter((step) => !step.ok).length;
console.log(failed === 0 ? '  HASIL: seluruh rantai bekerja.\n' : `  HASIL: ${failed} langkah gagal.\n`);
process.exitCode = failed === 0 ? 0 : 1;
