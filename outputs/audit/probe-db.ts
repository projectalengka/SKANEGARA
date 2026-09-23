/**
 * Isolates which Prisma query stalls, if any.
 * Run: node --import tsx outputs/audit/probe-db.ts
 */
// Prisma 7 does not load `.env` on its own, and this script runs outside
// prisma.config.ts — so it loads it here, matching prisma/seed.ts.
import { config } from 'dotenv';
config({ override: false, quiet: true });

import { getPrisma } from '../../src/lib/db';

function timer(label: string) {
  const start = Date.now();
  return () => {
    console.log(`${label}: ${Date.now() - start}ms`);
  };
}

async function main() {
  const prisma = getPrisma();
  if (!prisma) {
    console.log('no client (DATABASE_URL missing?)');
    return;
  }

  const doneProfile = timer('schoolProfile.findFirst');
  const profile = await prisma.schoolProfile.findFirst({ orderBy: { updatedAt: 'desc' } });
  doneProfile();
  console.log('  ->', profile?.schoolName ?? '(null)');

  const queries: Array<[string, () => Promise<unknown[]>]> = [
    ['program.findMany', () => prisma.program.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] })],
    ['news.findMany', () => prisma.news.findMany({ orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }] })],
    ['galleryItem.findMany', () => prisma.galleryItem.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] })],
    ['studentWork.findMany', () => prisma.studentWork.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] })],
    ['event.findMany', () => prisma.event.findMany({ orderBy: { date: 'desc' } })],
    ['siteSection.findMany', () => prisma.siteSection.findMany()],
  ];

  for (const [label, run] of queries) {
    const done = timer(label);
    try {
      const rows = await run();
      done();
      console.log(`  -> ${rows.length} rows`);
    } catch (error) {
      console.log(`${label}: FAILED after ${Date.now()}ms —`, (error as Error).message.slice(0, 300));
    }
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('FATAL', error);
  process.exit(1);
});
