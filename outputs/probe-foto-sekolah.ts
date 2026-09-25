/**
 * Probe — jalur tulis foto sekolah terhadap skema Postgres yang sesungguhnya.
 *
 * ## Kenapa perlu probe terpisah
 *
 * Uji unit membaca sumber dan membuktikan bentuk kode. Yang tidak bisa mereka
 * buktikan adalah hal yang paling mudah salah: bahwa kolomnya benar-benar ada
 * di basis data yang dipakai situs, dan bahwa `upsert` yang dijalankan
 * `saveSchoolProfile` diterima oleh skema — bukan `P2025`, bukan pelanggaran
 * tipe, bukan kolom yang hilang karena migrasinya belum diterapkan.
 *
 * ## Kenapa aman dijalankan terhadap produksi
 *
 * Seluruh pekerjaan berjalan di dalam satu transaksi yang **sengaja digagalkan**
 * di akhir (`ROLLBACK_DISENGAJA`), jadi tidak ada satu baris pun yang tersimpan.
 * Jumlah baris dan isi kolom gambar dibandingkan sebelum dan sesudah; kalau
 * berbeda, keluarannya mengatakan demikian dan keluar dengan kode ≠ 0.
 *
 * Jalankan: `npx tsx outputs/probe-foto-sekolah.ts`
 */

import { config as loadEnv } from 'dotenv';

loadEnv({ override: false, quiet: true });

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const ROLLBACK = 'ROLLBACK_DISENGAJA';

let failures = 0;

function ok(label: string, detail: string): void {
  console.log(`  ok    ${label.padEnd(34)} ${detail}`);
}

function fail(label: string, detail: string): void {
  failures += 1;
  console.log(`  GAGAL ${label.padEnd(34)} ${detail}`);
}

function check(label: string, condition: boolean, detail: string): void {
  if (condition) ok(label, detail);
  else fail(label, detail);
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL ?? '';
  if (!url.startsWith('postgres')) {
    console.error('DATABASE_URL belum diisi — probe ini butuh basis data sungguhan.');
    process.exit(1);
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

  const before = {
    profile: await prisma.schoolProfile.count(),
    media: await prisma.mediaAsset.count(),
    image: (await prisma.schoolProfile.findUnique({ where: { slug: 'utama' } }))?.image ?? '',
  };

  console.log('\nMembuktikan jalur tulis foto sekolah (transaksi digagalkan di akhir)\n');

  // 1. Bytes gambar kecil, apa adanya. Nilainya tidak penting; yang diuji adalah
  //    apakah kolomnya menerima dan mengembalikannya utuh.
  const bytes = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
    'base64',
  );

  let observed = { url: '', publicId: '', readBack: '', assetBytes: -1 };

  try {
    await prisma.$transaction(async (tx) => {
      const asset = await tx.mediaAsset.create({
        data: {
          filename: 'uji-foto-sekolah.png',
          folder: 'profil',
          mimeType: 'image/png',
          width: 1,
          height: 1,
          bytes: bytes.length,
          data: bytes,
        },
      });

      const imageUrl = `/api/media/${asset.id}`;

      // 2. Persis panggilan yang dijalankan `saveSchoolProfile`: upsert pada slug
      //    tetap. Kalau kolomnya tidak ada, baris inilah yang melempar.
      await tx.schoolProfile.upsert({
        where: { slug: 'utama' },
        create: { slug: 'utama', image: imageUrl, imagePublicId: asset.id },
        update: { image: imageUrl, imagePublicId: asset.id },
      });

      const row = await tx.schoolProfile.findUnique({
        where: { slug: 'utama' },
        select: { image: true, imagePublicId: true },
      });

      const back = await tx.mediaAsset.findUnique({ where: { id: asset.id }, select: { data: true } });

      observed = {
        url: imageUrl,
        publicId: asset.id,
        readBack: row?.image ?? '',
        assetBytes: back?.data ? Buffer.from(back.data).length : -1,
      };

      throw new Error(ROLLBACK);
    });
  } catch (error) {
    if (!(error instanceof Error) || error.message !== ROLLBACK) {
      fail('transaksi', `gagal bukan karena rollback sengaja: ${(error as Error).message.slice(0, 90)}`);
      await prisma.$disconnect();
      process.exit(1);
    }
  }

  check('upsert profil diterima skema', observed.url !== '', `kolom image + imagePublicId terisi (${observed.publicId.slice(0, 12)}…)`);
  check('nilai terbaca kembali utuh', observed.readBack === observed.url, `image = ${observed.readBack}`);
  check('bytes gambar pulang-pergi', observed.assetBytes === bytes.length, `${observed.assetBytes} byte, dikirim ${bytes.length}`);

  const after = {
    profile: await prisma.schoolProfile.count(),
    media: await prisma.mediaAsset.count(),
    image: (await prisma.schoolProfile.findUnique({ where: { slug: 'utama' } }))?.image ?? '',
  };

  check('profil tidak bertambah', after.profile === before.profile, `${before.profile} → ${after.profile}`);
  check('aset gambar tidak bertambah', after.media === before.media, `${before.media} → ${after.media}`);
  check('foto produksi tidak tersentuh', after.image === before.image, `image tetap "${before.image}"`);

  console.log(
    failures === 0
      ? '\nHASIL: jalur tulis foto sekolah sehat, dan tidak ada yang tersimpan.\n'
      : `\nHASIL: ${failures} masalah ditemukan.\n`,
  );

  await prisma.$disconnect();
  if (failures > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
