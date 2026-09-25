/**
 * Membaca asal-usul baris yang ada di basis data — seed atau isian pemilik.
 *
 * Hanya membaca. Dipakai untuk memutuskan apakah gerbang "kegiatan kosong" di
 * `scripts/verify-db.ts` sedang benar atau salah bunyi.
 */
import { config as loadEnv } from 'dotenv';

loadEnv({ override: false, quiet: true });

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
});

function asal(title: string): string {
  if (title.startsWith('[')) return 'SEED (placeholder)';
  return 'ISIAN PEMILIK';
}

async function main() {
  const events = await prisma.event.findMany({ select: { title: true, slug: true } });
  const works = await prisma.studentWork.findMany({ select: { title: true } });
  const gallery = await prisma.galleryItem.findMany({ select: { title: true } });
  const news = await prisma.news.findMany({ select: { title: true } });

  console.log(`\nkegiatan: ${events.length}`);
  for (const row of events) console.log(`  [${asal(row.title)}] ${row.title}`);

  console.log(`\nkarya: ${works.length}`);
  for (const row of works) console.log(`  [${asal(row.title)}] ${row.title}`);

  console.log(`\ngaleri: ${gallery.length}`);
  for (const row of gallery) console.log(`  [${asal(row.title)}] ${row.title}`);

  console.log(`\nberita: ${news.length}`);
  for (const row of news) console.log(`  [${asal(row.title)}] ${row.title}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
