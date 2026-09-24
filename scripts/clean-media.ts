/**
 * Menghapus gambar yang tidak dipakai siapa pun.
 *
 *   npm run media:bersihkan           # lihat saja, tidak menghapus
 *   npm run media:bersihkan -- --hapus
 *
 * ## Kenapa yatim bisa ada
 *
 * Kolom unggah mengirim berkasnya **begitu dipilih**, bukan saat formulir
 * disimpan — supaya pemilik bisa melihat gambarnya sebelum menekan Simpan. Itu
 * keputusan yang benar, tetapi konsekuensinya: memilih berkas lalu menutup
 * formulir tanpa menyimpan meninggalkan satu baris `MediaAsset` yang tidak
 * dirujuk apa pun.
 *
 * Saat item yang sudah tersimpan diganti gambarnya, `content-actions.ts` memang
 * menghapus aset lamanya. Yang tidak tertutup hanyalah jalur "berubah pikiran"
 * di atas — dan itu jalur yang paling sering dipakai orang.
 *
 * ## Kenapa ada masa tunggu
 *
 * Tanpa masa tunggu, menjalankan skrip ini pada detik yang salah akan menghapus
 * gambar yang baru saja diunggah tetapi formulirnya belum sempat disimpan.
 * Bawaannya 60 menit, dan itu jauh lebih lama daripada waktu yang dibutuhkan
 * seseorang untuk mengisi judul lalu menekan Simpan.
 *
 * ## Kenapa bawaannya tidak menghapus
 *
 * Menghapus baris adalah satu-satunya operasi di proyek ini yang tidak bisa
 * dibatalkan dari dasbor. Jadi bawaannya mencetak daftarnya saja; `--hapus`
 * harus diketik sendiri.
 */

import { config as loadEnv } from 'dotenv';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { formatBytes } from '../src/lib/media';

loadEnv({ override: false, quiet: true });

/** Lewati aset yang lebih muda dari ini — mungkin sedang menunggu disimpan. */
const MIN_AGE_MINUTES = Number(process.env.MIN_AGE_MINUTES ?? 60);

const apply = process.argv.includes('--hapus');

async function main(): Promise<void> {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('DATABASE_URL / DIRECT_URL belum diset. Salin .env.example ke .env lalu isi.');
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    /*
     * Setiap kolom public id di skema, dikumpulkan di satu tempat.
     *
     * Kalau sebuah model baru ditambahkan dengan kolom gambar sendiri dan baris
     * ini tidak ikut diperbarui, skrip ini akan menganggap gambar model itu
     * yatim dan menghapusnya. Itu kegagalan yang mahal, jadi daftarnya dibuat
     * sebagai konstanta bernama dengan komentar ini, bukan disebar di dalam
     * badan kueri.
     */
    const references = await Promise.all([
      prisma.program.findMany({ select: { imagePublicId: true } }),
      prisma.news.findMany({ select: { coverPublicId: true } }),
      prisma.galleryItem.findMany({ select: { publicId: true } }),
      prisma.event.findMany({ select: { publicId: true } }),
      prisma.studentWork.findMany({ select: { publicId: true } }),
    ]);

    const used = new Set(
      references
        .flat()
        .flatMap((row) => Object.values(row as Record<string, unknown>))
        .filter((value): value is string => typeof value === 'string' && value.length > 0),
    );

    const cutoff = new Date(Date.now() - MIN_AGE_MINUTES * 60_000);

    const candidates = await prisma.mediaAsset.findMany({
      where: { createdAt: { lt: cutoff } },
      select: { id: true, filename: true, bytes: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const orphans = candidates.filter((asset) => !used.has(asset.id));
    const freed = orphans.reduce((total, asset) => total + asset.bytes, 0);

    const all = await prisma.mediaAsset.aggregate({ _count: { _all: true }, _sum: { bytes: true } });

    console.log('\nPenyimpanan gambar\n');
    console.log(`  total aset          : ${all._count._all}`);
    console.log(`  total terpakai      : ${formatBytes(all._sum.bytes ?? 0)}`);
    console.log(`  dirujuk konten      : ${used.size}`);
    console.log(`  lebih tua dari ${String(MIN_AGE_MINUTES).padStart(3)} mnt : ${candidates.length}`);
    console.log(`  yatim               : ${orphans.length} (${formatBytes(freed)})`);

    if (orphans.length === 0) {
      console.log('\n  Tidak ada yang perlu dibersihkan.\n');
      return;
    }

    console.log('');
    for (const asset of orphans) {
      const when = asset.createdAt.toISOString().slice(0, 16).replace('T', ' ');
      console.log(`  - ${asset.id}  ${formatBytes(asset.bytes).padStart(8)}  ${when}  ${asset.filename}`);
    }

    if (!apply) {
      console.log(`\n  Ini baru perkiraan. Jalankan lagi dengan --hapus untuk benar-benar menghapus.\n`);
      return;
    }

    const result = await prisma.mediaAsset.deleteMany({
      where: { id: { in: orphans.map((asset) => asset.id) } },
    });

    console.log(`\n  ${result.count} aset dihapus, ${formatBytes(freed)} dibebaskan.\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('\nGagal membersihkan penyimpanan:');
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
