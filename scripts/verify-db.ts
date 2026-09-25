/**
 * Memverifikasi jalur basis data dari ujung ke ujung.
 *
 * Jalankan setelah `npm run db:push` (atau `db:deploy`) dan `npm run db:seed`:
 *
 *   npm run db:verify
 *
 * Kenapa skrip ini ada: seluruh pengujian di repositori ini berjalan **tanpa**
 * basis data, memakai lapisan cadangan `src/data/defaults.ts`. Itu memang
 * disengaja — situs harus tetap tampil tanpa `DATABASE_URL` — tapi artinya
 * skema Prisma dan `prisma/seed.ts` tidak pernah benar-benar dijalankan oleh
 * gerbang mutu. Berkas ini menutup celah itu, dan ia keluar dengan kode ≠ 0
 * bila ada yang salah, sehingga bisa dipakai sebagai gerbang.
 *
 * Yang diperiksa, berurutan:
 *
 *   1. Koneksi benar-benar terbuka.
 *   2. Setiap tabel ada dan bisa dibaca (menangkap migrasi yang belum jalan).
 *   3. Bentuk data hasil seed sesuai harapan. Berita dan kegiatan hanya
 *      **dilaporkan**, bukan digagalkan: 0 pada basis data baru, dan lebih
 *      dari 0 berarti pemilik sudah mengisi sendiri. Gerbang "jangan mengarang
 *      agenda" hidup di `tests/verify-db.test.ts`, pada sumber seed.
 *   4. Penyimpanan gambar melaporkan angkanya dengan jujur. Kolom `bytes` harus
 *      sama dengan panjang `data`-nya, karena laporan kuota di dasbor adalah
 *      satu agregat di atas kolom itu — dan kuota yang salah lapor berakhir
 *      sebagai kegagalan penulisan yang sulit ditelusuri.
 *   5. `readOrFallback()` benar-benar menimpa dengan data basis data, bukan
 *      hanya tidak meledak.
 */

import { config as loadEnv } from 'dotenv';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Memuat `.env` secara manual.
 *
 * Prisma 5 memuatnya sendiri; **Prisma 7 tidak**. Skrip ini dijalankan `tsx`
 * langsung, di luar jalur `prisma.config.ts`, jadi ia harus memuatnya sendiri —
 * kalau tidak, `npm run db:verify` melaporkan "belum diset" padahal `.env`
 * sudah terisi. `override: false` supaya variabel dari shell menang.
 */
loadEnv({ override: false, quiet: true });

let failures = 0;

function ok(label: string, detail: string): void {
  console.log(`  ok    ${label.padEnd(30)} ${detail}`);
}

function fail(label: string, detail: string): void {
  failures += 1;
  console.log(`  GAGAL ${label.padEnd(30)} ${detail}`);
}

function check(label: string, condition: boolean, detail: string): void {
  if (condition) ok(label, detail);
  else fail(label, detail);
}

/**
 * Melaporkan sebuah angka tanpa menggagalkan verifikasi.
 *
 * Dipakai untuk hal yang jawabannya bergantung pada **apakah pemilik sudah
 * mengisi konten**, bukan pada benar atau salahnya kode. Membedakan keduanya
 * penting: gerbang yang menyala merah pada perilaku yang benar akan diabaikan
 * orang, dan sesudah itu ia tidak menjaga apa pun.
 */
function note(label: string, detail: string): void {
  console.log(`  --    ${label.padEnd(30)} ${detail}`);
}

async function main(): Promise<void> {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('');
    console.error('  DATABASE_URL / DIRECT_URL belum diset.');
    console.error('  Salin .env.example menjadi .env dan isi connection string-nya,');
    console.error('  atau jalankan dengan variabelnya langsung:');
    console.error('');
    console.error('    DATABASE_URL="postgresql://..." npx tsx scripts/verify-db.ts');
    console.error('');
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    console.log('\nMemverifikasi basis data SMK Jayanegara…\n');

    try {
      await prisma.$queryRaw`select 1`;
      ok('koneksi', 'terbuka');
    } catch (error) {
      console.error('  Tidak bisa terhubung ke basis data.');
      console.error(`  ${error instanceof Error ? error.message : String(error)}`);
      console.error('');
      console.error('  Periksa: connection string benar, basis data berjalan, dan untuk');
      console.error('  Supabase gunakan port pooler 6543 untuk DATABASE_URL serta port');
      console.error('  langsung 5432 untuk DIRECT_URL.');
      console.error('');
      process.exitCode = 1;
      return;
    }

    // -----------------------------------------------------------------------
    // 1. Setiap tabel ada dan bisa dibaca.
    // -----------------------------------------------------------------------

    const probes = [
      ['profil', () => prisma.schoolProfile.count()],
      ['program', () => prisma.program.count()],
      ['berita', () => prisma.news.count()],
      ['galeri', () => prisma.galleryItem.count()],
      ['kegiatan', () => prisma.event.count()],
      ['karya', () => prisma.studentWork.count()],
      ['bagian', () => prisma.siteSection.count()],
      ['gambar', () => prisma.mediaAsset.count()],
    ] as const;

    const counts: Record<string, number> = {};

    for (const [label, probe] of probes) {
      try {
        const value = await probe();
        counts[label] = value;
        ok(`tabel ${label}`, `${value} baris`);
      } catch (error) {
        counts[label] = -1;
        fail(`tabel ${label}`, `tidak bisa dibaca — ${(error as Error).message.slice(0, 70)}`);
      }
    }

    const n = (key: string): number => counts[key] ?? -1;

    // -----------------------------------------------------------------------
    // 2. Bentuk data hasil seed.
    // -----------------------------------------------------------------------

    console.log('\n  Bentuk data:');

    check('profil sekolah', n('profil') === 1, `harus tepat 1 baris, dapat ${n('profil')}`);
    check('program keahlian', n('program') >= 1, `harus ada isinya, dapat ${n('program')}`);

    // Aturan konten proyek ini: jangan pernah mengarang berita atau agenda.
    // Gerbang yang sesungguhnya ada di `tests/verify-db.test.ts`, yang menuntut
    // `defaultNews` dan `defaultEvents` kosong — yaitu bahwa **seed** tidak
    // mengarang apa pun. Itu properti sumber, dan ia tidak bisa berubah tanpa
    // uji itu memerah.
    //
    // Di sini angkanya hanya dilaporkan. Bentuk lamanya adalah
    // `check(..., n('kegiatan') === 0)` terhadap basis data hidup, dan itu
    // keliru bunyi sejak tombol "Pakai sebagai data saya" ada: terukur
    // 2026-09-25, basis data berisi 4 kegiatan hasil adopsi — isian pemilik
    // yang sah, bukan karangan seed, tapi cukup untuk memerahkan verifikasi dan
    // menyembunyikan temuan yang sungguhan di baris-baris lain.
    note('berita', `${n('berita')} baris — 0 pada basis data baru, lebih dari 0 berarti pemilik sudah mengisi`);
    note('kegiatan', `${n('kegiatan')} baris — 0 pada basis data baru, lebih dari 0 berarti pemilik sudah mengisi`);

    // -----------------------------------------------------------------------
    // 3. Apakah isinya benar, bukan sekadar ada.
    // -----------------------------------------------------------------------

    console.log('\n  Isi:');

    const profile = await prisma.schoolProfile.findUnique({ where: { slug: 'utama' } });

    if (!profile) {
      fail('profil slug "utama"', 'tidak ditemukan — seed mungkin belum dijalankan');
    } else {
      check('nama sekolah terisi', profile.schoolName.trim().length > 0, profile.schoolName);
      check('kota benar', profile.city === 'Mojokerto', profile.city);
      check('provinsi benar', profile.province === 'Jawa Timur', profile.province);

      // Field faktual yang tidak boleh dikarang: harus tetap penanda, atau
      // kosong. Kalau sudah terisi, itu boleh — pemilik memang berhak
      // mengisinya — tapi harus terlihat, karena inilah momen sebuah fakta
      // masuk ke basis data.
      const factual: Array<[string, string]> = [
        ['sejarah', profile.history],
        ['visi', profile.vision],
        ['alamat', profile.address],
        ['telepon', profile.phone],
        ['email', profile.email],
        ['instagram', profile.instagram],
        ['youtube', profile.youtube],
      ];

      for (const [field, value] of factual) {
        if (value.includes('isi melalui')) {
          ok(`${field} masih placeholder`, 'belum dikarang — sesuai aturan konten');
        } else if (value.trim().length === 0) {
          ok(`${field} kosong`, 'lebih baik kosong daripada dikarang');
        } else {
          ok(`${field} sudah diisi`, `"${value.slice(0, 40)}${value.length > 40 ? '…' : ''}"`);
        }
      }
    }

    const programs = await prisma.program.findMany({ orderBy: { order: 'asc' } });
    for (const program of programs) {
      check(`program "${program.name}"`, program.name.trim().length > 0, program.slug);
    }

    const works = await prisma.studentWork.findMany();
    const named = works.filter((work) => work.studentName.trim().length > 0);
    if (named.length === 0) {
      ok('karya tanpa nama murid', `${works.length} karya, 0 bernama — benar`);
    } else {
      ok('karya dengan nama murid', `${named.length} dari ${works.length} — pastikan diisi pemilik, bukan seed`);
    }

    // -----------------------------------------------------------------------
    // 4. Penyimpanan gambar: laporan pemakaiannya harus jujur.
    // -----------------------------------------------------------------------

    console.log('\n  Penyimpanan gambar:');

    const { formatBytes, mediaUsage } = await import('../src/lib/media');

    const usage = await mediaUsage();
    check(
      'pemakaian terbaca',
      usage !== null,
      usage
        ? `${usage.count} gambar, ${formatBytes(usage.bytes)} — kuota 500 MB`
        : 'tidak terbaca (basis data belum dikonfigurasi)',
    );

    /*
     * `bytes` adalah salinan `octet_length(data)` yang disimpan sebagai kolom.
     * Halaman Pengaturan melaporkan pemakaian lewat satu agregat di atas kolom
     * itu, jadi kalau keduanya berbeda, laporannya berbohong — dan laporan itu
     * satu-satunya hal yang berdiri antara pemilik dan kuota yang penuh
     * diam-diam. Yang diambil gambar terkecil, supaya pemeriksaan ini tidak
     * menarik foto besar ke memori hanya untuk mengukurnya.
     */
    const sample = await prisma.mediaAsset.findFirst({
      orderBy: { bytes: 'asc' },
      select: { id: true, bytes: true, data: true, mimeType: true },
    });

    if (!sample) {
      ok('akuntansi byte', 'belum ada gambar — tidak ada yang bisa diperiksa');
    } else {
      check(
        'akuntansi byte',
        sample.data.length === sample.bytes,
        `kolom bytes (${sample.bytes}) == panjang data (${sample.data.length})`,
      );
      check(
        'tipe berkas tercatat',
        sample.mimeType.startsWith('image/'),
        `${sample.mimeType} pada ${sample.id}`,
      );
    }

    // -----------------------------------------------------------------------
    // 5. Lapisan overlay benar-benar menimpa.
    // -----------------------------------------------------------------------

    console.log('\n  Lapisan konten:');

    const { readOrFallback, isDatabaseConfigured } = await import('../src/lib/db');

    check('basis data terdeteksi', isDatabaseConfigured(), 'isDatabaseConfigured() = true');

    const viaFallback = await readOrFallback(
      'verifikasi',
      async (client) => client.program.count(),
      -999,
    );

    check(
      'readOrFallback membaca DB',
      viaFallback !== -999,
      `dapat ${viaFallback} program dari basis data (bukan cadangan -999)`,
    );

    console.log('');
    if (failures === 0) {
      console.log('  HASIL: jalur basis data sehat.\n');
    } else {
      console.log(`  HASIL: ${failures} masalah ditemukan.\n`);
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('\nVerifikasi gagal:');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
