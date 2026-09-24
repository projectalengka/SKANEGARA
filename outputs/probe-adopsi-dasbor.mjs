/**
 * Probe — apakah dasbor masih menawarkan edit yang tidak punya barisnya.
 *
 * ## Kenapa ada
 *
 * Baris contoh tinggal di `src/data/sample.ts`, bukan di Postgres. Dulu dasbor
 * menampilkannya sebagai baris biasa dengan tombol Edit, sehingga menyimpan salah
 * satunya meminta Prisma memperbarui primary key yang tidak ada dan pemilik
 * melihat "Terjadi kesalahan. Silakan coba lagi." — padahal unggahan gambarnya
 * sudah berhasil.
 *
 * Skrip ini masuk ke dasbor, membuka keempat halaman koleksi, dan menghitung apa
 * yang benar-benar dirender: berapa lencana "Contoh", berapa tombol Edit, dan
 * apakah panel "Pakai sebagai data saya" muncul dengan jumlah yang benar.
 *
 * ## Yang diharapkan, dan kenapa berbeda per halaman
 *
 * Galeri sengaja **tidak** diharapkan menampilkan panel. Keterangan galeri di
 * seed sudah tulisan jadi ("Kegiatan Belajar"), bukan placeholder, jadi koleksi
 * itu tidak pernah dianggap belum disentuh dan data contoh tidak menggantikannya
 * — lihat catatan di `getGallery`. Barisnya nyata, jadi tombol Edit-nya memang
 * harus ada. Tiga koleksi lain di situs ini masih placeholder/kosong.
 *
 * ## Pakai
 *
 *   node --env-file=.env outputs/probe-adopsi-dasbor.mjs
 *   BASE=https://skagara.vercel.app node --env-file=.env outputs/probe-adopsi-dasbor.mjs
 *
 * Probe ini **hanya membaca**. Tidak ada tombol yang diklik.
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

/** Jumlah baris contoh yang diharapkan, dan apakah panelnya harus muncul. */
const CASES = [
  { path: '/admin/karya', label: 'Karya Siswa', sample: 18, expectPanel: true, shot: 'adopsi-karya' },
  { path: '/admin/berita', label: 'Berita', sample: 4, expectPanel: true, shot: 'adopsi-berita' },
  { path: '/admin/kegiatan', label: 'Kegiatan', sample: 4, expectPanel: true, shot: 'adopsi-kegiatan' },
  { path: '/admin/galeri', label: 'Galeri', sample: 0, expectPanel: false, shot: 'adopsi-galeri' },
];

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
let failures = 0;

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();

  console.log(`\nMemeriksa halaman koleksi dasbor di ${BASE}\n`);

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

  for (const testCase of CASES) {
    await page.goto(`${BASE}${testCase.path}`, { waitUntil: 'load' });
    await page.waitForTimeout(1500);

    const seen = await page.evaluate(() => {
      const text = (el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim();
      const exact = (tag, wanted) =>
        [...document.querySelectorAll(tag)].filter((el) => text(el) === wanted);

      const body = document.body.innerText;
      return {
        panel: body.includes('Pakai sebagai data saya'),
        panelCount: (body.match(/(\d+)\s+(karya|foto|berita|kegiatan)\s+contoh ini menjadi milik Anda/g) ?? [])[0] ?? null,
        badges: exact('span', 'Contoh').length,
        editButtons: exact('button', 'Edit').length,
        editLinks: exact('a', 'Edit').length,
        saveButtons: exact('button', 'Simpan Perubahan').length,
        deleteButtons: [...document.querySelectorAll('button')].filter((el) =>
          text(el).startsWith('Hapus'),
        ).length,
      };
    });

    console.log(`${testCase.label}  (${testCase.path})`);
    console.log(`  panel adopsi : ${seen.panel ? 'ada' : 'tidak ada'}${seen.panelCount ? ` — "${seen.panelCount}"` : ''}`);
    console.log(`  lencana Contoh: ${seen.badges}`);
    console.log(`  tombol Edit   : ${seen.editButtons}   tautan Edit: ${seen.editLinks}`);
    console.log(`  tombol Simpan : ${seen.saveButtons}   tombol Hapus: ${seen.deleteButtons}`);

    const checks = [
      [`panel adopsi ${testCase.expectPanel ? 'muncul' : 'tidak muncul'}`, seen.panel === testCase.expectPanel],
      [`lencana "Contoh" berjumlah ${testCase.sample}`, seen.badges === testCase.sample],
    ];

    if (testCase.expectPanel) {
      // Inti perbaikannya: baris contoh tidak boleh menawarkan aksi yang gagal.
      checks.push(['tidak ada tombol Edit pada baris contoh', seen.editButtons === 0]);
      checks.push(['tidak ada tautan Edit pada baris contoh', seen.editLinks === 0]);
      checks.push(['tidak ada tombol Hapus pada baris contoh', seen.deleteButtons === 0]);
    } else {
      // Galeri: barisnya nyata, jadi Edit dan Hapus harus tetap ada.
      checks.push(['baris nyata tetap bisa diedit', seen.editButtons + seen.editLinks > 0]);
    }

    for (const [label, pass] of checks) {
      if (!pass) failures += 1;
      console.log(`  ${pass ? 'ok  ' : 'FAIL'}  ${label}`);
    }

    await page.screenshot({
      path: `outputs/screenshots/${testCase.shot}.png`,
      fullPage: false,
    });
    console.log(`  potret: outputs/screenshots/${testCase.shot}.png\n`);
  }

  console.log(
    failures === 0
      ? 'LOLOS: baris contoh tidak lagi menawarkan edit yang tidak punya barisnya.\n'
      : `${failures} pemeriksaan gagal.\n`,
  );

  await context.close();
} finally {
  await browser.close();
}

process.exitCode = failures === 0 ? 0 : 1;
