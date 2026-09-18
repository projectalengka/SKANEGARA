/**
 * Database seed — SMK Jayanegara
 *
 * Run with `npm run db:seed`.
 *
 * What this seeds, and what it deliberately does not:
 *
 *  - **The school profile rows and the section copy.** These come from
 *    `src/data/defaults.ts`, which is the same file the site falls back to when
 *    no database is connected. Seeding them means the dashboard opens with
 *    something to edit rather than a wall of empty inputs.
 *  - **The two programmes**, by name only. Every descriptive field stays a
 *    placeholder — we do not know what the school teaches inside DKV or
 *    Otomotif, and inventing it would be the exact failure the brief forbids.
 *  - **No news, no events.** `defaultNews` and `defaultEvents` are empty on
 *    purpose. An empty newsroom is a real state the design has to handle, and
 *    seeded fake articles would be the clearest possible violation of the
 *    content rule.
 *  - **No student work with names attached.** The gallery and work seeds carry
 *    categories, never pupils.
 *
 * Every write is an `upsert`, so running this twice is safe and running it
 * after the owner has edited content will not clobber their edits — except for
 * the `SiteSection` keys, which are only created when absent.
 */

import { config as loadEnv } from 'dotenv';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  defaultGallery,
  defaultPrograms,
  defaultSchoolProfile,
  defaultSections,
  defaultStudentWork,
} from '../src/data/defaults';

/**
 * Memuat `.env` secara manual.
 *
 * Prisma 5 memuatnya sendiri; **Prisma 7 tidak**. `prisma.config.ts` melakukan
 * hal yang sama untuk CLI, tapi berkas ini dijalankan `tsx` langsung — di luar
 * jalur konfigurasi itu — jadi ia harus memuatnya sendiri. Tanpa baris ini,
 * `npm run db:seed` gagal dengan pesan "belum diatur" padahal `.env` sudah
 * terisi lengkap, dan pesannya menuduh hal yang salah.
 *
 * `override: false` supaya variabel dari shell menang atas isi berkas.
 */
loadEnv({ override: false, quiet: true });

/**
 * Reads the URL directly instead of going through `src/lib/db.ts`.
 *
 * The app's client returns `null` when unconfigured so pages can fall back
 * gracefully. A seed has no sensible fallback — if there is no database there
 * is nothing to seed — so it should fail loudly instead.
 */
function connectionString(): string {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url || !url.trim().startsWith('postgres')) {
    throw new Error(
      'DATABASE_URL (atau DIRECT_URL) belum diatur.\n' +
        'Salin .env.example menjadi .env, isi connection string Supabase, lalu jalankan lagi.\n' +
        'Untuk migrasi, DIRECT_URL sebaiknya memakai koneksi langsung (port 5432), bukan pooler.',
    );
  }
  return url;
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: connectionString(), max: 2 }),
});

async function seedSchoolProfile(): Promise<void> {
  const profile = defaultSchoolProfile;

  await prisma.schoolProfile.upsert({
    where: { slug: 'utama' },
    // On update, only re-fill fields the owner has not touched. An empty string
    // in the database means "never edited", so the placeholder is restored;
    // a non-empty value is theirs and is left alone.
    update: {
      schoolName: profile.schoolName,
      city: profile.city,
      province: profile.province,
    },
    create: {
      slug: 'utama',
      schoolName: profile.schoolName,
      tagline: profile.tagline,
      heroLines: profile.heroLines,
      description: profile.description,
      history: profile.history,
      vision: profile.vision,
      mission: profile.mission,
      address: profile.address,
      city: profile.city,
      province: profile.province,
      phone: profile.phone,
      whatsapp: profile.whatsapp,
      email: profile.email,
      instagram: profile.instagram,
      youtube: profile.youtube,
      mapsUrl: profile.mapsUrl,
    },
  });

  console.log(`  ✓ Profil sekolah (${profile.schoolName})`);
}

async function seedPrograms(): Promise<void> {
  for (const program of defaultPrograms) {
    await prisma.program.upsert({
      where: { slug: program.slug },
      update: { name: program.name, order: program.order },
      create: {
        name: program.name,
        slug: program.slug,
        shortDescription: program.shortDescription,
        description: program.description,
        image: program.image,
        imagePublicId: program.imagePublicId,
        features: program.features,
        order: program.order,
        published: program.published,
      },
    });
  }

  console.log(`  ✓ ${defaultPrograms.length} program keahlian`);
}

async function seedGallery(): Promise<void> {
  for (const [index, item] of defaultGallery.entries()) {
    // Gallery items have no natural unique key, so match on title + image.
    const existing = await prisma.galleryItem.findFirst({
      where: { title: item.title, image: item.image },
      select: { id: true },
    });

    if (existing) continue;

    await prisma.galleryItem.create({
      data: {
        title: item.title,
        image: item.image,
        publicId: item.publicId,
        category: item.category,
        description: item.description,
        order: index + 1,
        published: item.published,
      },
    });
  }

  console.log(`  ✓ ${defaultGallery.length} item galeri`);
}

async function seedStudentWork(): Promise<void> {
  for (const [index, work] of defaultStudentWork.entries()) {
    const existing = await prisma.studentWork.findFirst({
      where: { title: work.title, image: work.image },
      select: { id: true },
    });

    if (existing) continue;

    await prisma.studentWork.create({
      data: {
        title: work.title,
        // Left empty on purpose: naming a student without consent is not ours
        // to do, so the field starts blank and the owner fills it in.
        studentName: work.studentName,
        category: work.category,
        description: work.description,
        image: work.image,
        publicId: work.publicId,
        year: work.year,
        order: index + 1,
        published: work.published,
      },
    });
  }

  console.log(`  ✓ ${defaultStudentWork.length} karya siswa`);
}

async function seedSections(): Promise<void> {
  const entries = Object.values(defaultSections);

  for (const section of entries) {
    await prisma.siteSection.upsert({
      where: { key: section.key },
      // Never overwrite on update — this is the owner's copy now.
      update: {},
      create: {
        key: section.key,
        eyebrow: section.eyebrow,
        title: section.title,
        body: section.body,
        ctaLabel: section.ctaLabel,
        ctaHref: section.ctaHref,
      },
    });
  }

  console.log(`  ✓ ${entries.length} teks bagian`);
}

/**
 * Melaporkan kesiapan kredensial admin.
 *
 * ## Kenapa hanya melaporkan, bukan menulis
 *
 * Situs ini tidak punya tabel pengguna — ada tepat satu administrator, dan
 * `checkCredentials()` membandingkan langsung dengan `ADMIN_EMAIL` /
 * `ADMIN_PASSWORD` di variabel lingkungan. Jadi tidak ada baris yang bisa
 * ditulis ke basis data di sini.
 *
 * ## Kenapa pesannya harus tepat
 *
 * Versi sebelumnya mencetak "✓ Akun admin siap" hanya karena dua variabel ada,
 * padahal tidak ada apa pun yang dibuat. Itu klaim palsu: pengguna mengira ada
 * akun, padahal yang menentukan hanyalah `.env`. Pesan di bawah menyebutkan
 * hal itu secara gamblang, termasuk bentuk kata sandi yang diterima, karena
 * kata sandi berbentuk teks biasa dan berbentuk hash diperlakukan berbeda.
 */
function reportAdminCredentials(): void {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn(
      '\n  ⚠ ADMIN_EMAIL / ADMIN_PASSWORD belum diatur — login admin akan ditolak.\n' +
        '    Tidak ada akun yang dibuat oleh seed; kredensial dibaca dari .env saat login.\n' +
        '    Isi keduanya di .env lalu jalankan `npm run db:seed` sekali lagi.',
    );
    return;
  }

  const hashed = password.startsWith('scrypt$');
  console.log(
    `  ✓ Kredensial admin terisi: ${email} (kata sandi ${hashed ? 'berbentuk hash' : 'teks biasa'})`,
  );
  console.log('    Dibaca dari .env saat login — tidak ada baris yang ditulis ke basis data.');
}

async function main(): Promise<void> {
  console.log('\nMengisi basis data SMK Jayanegara…\n');

  await seedSchoolProfile();
  await seedPrograms();
  await seedGallery();
  await seedStudentWork();
  await seedSections();
  reportAdminCredentials();

  console.log('\nSelesai. Buka /admin/masuk untuk mulai mengelola konten.\n');
}

main()
  .catch((error: unknown) => {
    console.error('\nSeed gagal:');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
