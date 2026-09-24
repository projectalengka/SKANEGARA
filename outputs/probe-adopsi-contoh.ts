/**
 * Membuktikan jalur "Pakai sebagai data saya" terhadap skema sungguhan.
 *
 * ## Kenapa perlu probe terpisah
 *
 * Uji unit bisa membuktikan bahwa baris adopsi sudah bersih dari penanda
 * `[CONTOH]`, tetapi tidak bisa membuktikan hal yang paling penting: bahwa
 * operasi `update` yang dulu gagal kini berhasil. Itu hanya terbukti di depan
 * skema Postgres yang sebenarnya.
 *
 * ## Kenapa aman dijalankan
 *
 * Seluruh pekerjaan berjalan di dalam satu transaksi yang **sengaja digagalkan**
 * di akhir, jadi tidak ada satu baris pun yang tersimpan. Skrip ini mencatat
 * jumlah baris sebelum dan sesudahnya dan membandingkannya — kalau angkanya
 * berbeda, ada yang salah dan keluarannya mengatakan demikian.
 *
 * Jalankan: `npx tsx outputs/probe-adopsi-contoh.ts`
 */

import dotenv from 'dotenv';

dotenv.config({ override: false, quiet: true });

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { adoptableWorkRows } from '../src/data/sample';

const ROLLBACK = 'ROLLBACK_DISENGAJA';

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL ?? '';
  if (!url.startsWith('postgres')) {
    console.error('DATABASE_URL belum diisi — probe ini butuh basis data sungguhan.');
    process.exit(1);
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

  const before = await prisma.studentWork.count();
  console.log(`sebelum        — baris karya di basis data: ${before}`);

  let proved = false;

  try {
    await prisma.$transaction(async (tx) => {
      const stale = await tx.studentWork.findMany({
        where: { title: { startsWith: '[' } },
        select: { id: true },
      });
      const rows = adoptableWorkRows();

      await tx.studentWork.createMany({ data: rows });
      if (stale.length > 0) {
        await tx.studentWork.deleteMany({ where: { id: { in: stale.map((row) => row.id) } } });
      }

      const inside = await tx.studentWork.findMany({ select: { id: true, title: true } });
      console.log(`di transaksi    — baris karya: ${inside.length} (${stale.length} baris placeholder dibuang)`);
      console.log(`  ${rows.length} baris contoh ditulis, judul pertama: "${inside[0]?.title}"`);
      console.log(`  masih ada penanda [CONTOH]? ${inside.some((row) => row.title.includes('[CONTOH]'))}`);
      console.log(`  masih ada id berawalan sample-? ${inside.some((row) => row.id.startsWith('sample-'))}`);

      // Inilah operasi yang dulu gagal: menyimpan perubahan pada baris contoh.
      // Sebelum perbaikan, id-nya `sample-work-1` dan tidak ada barisnya.
      const target = inside.find((row) => row.title.includes('Poster 1')) ?? inside[0];
      await tx.studentWork.update({
        where: { id: target.id },
        data: { image: '/images/karya-01.svg', title: `${target.title} — gambar baru` },
      });

      const saved = await tx.studentWork.findUnique({ where: { id: target.id } });
      console.log(`  simpan pada ${target.id} berhasil → "${saved?.title}"`);

      proved = true;
      throw new Error(ROLLBACK);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message !== ROLLBACK) {
      console.error('GAGAL:', message);
      await prisma.$disconnect();
      process.exit(1);
    }
  }

  const after = await prisma.studentWork.count();
  console.log(`sesudah        — baris karya di basis data: ${after}`);

  const unchanged = after === before;
  console.log(
    proved && unchanged
      ? 'ringkasan: JALUR ADOPSI TERBUKTI, basis data tidak berubah'
      : 'ringkasan: TIDAK TERBUKTI',
  );

  await prisma.$disconnect();
  process.exit(proved && unchanged ? 0 : 1);
}

main().catch((error: unknown) => {
  console.error('GAGAL:', error);
  process.exit(1);
});
