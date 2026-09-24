'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { deleteImage, uploadImage } from '@/lib/media';
import { getPrisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { slugify } from '@/lib/utils';
import { mainTags } from './tags';

/**
 * Every content mutation in the admin.
 *
 * Three rules are applied uniformly, and they are the reason this lives in one
 * file rather than being scattered through page components:
 *
 *  1. **Every action re-checks the session.** A server action is a public HTTP
 *     endpoint once it exists — the fact that a browser *usually* calls it from a
 *     logged-in page is not a control. So `requireAdmin()` runs first in all of
 *     them, without exception.
 *  2. **Every action revalidates.** `revalidateTag` clears the cached data
 *     functions and `revalidatePath` clears the rendered pages. Together they are
 *     what makes an edit appear on the public site without a redeploy — the
 *     brief's requirement, and the thing most likely to be quietly broken.
 *  3. **Every action returns a result object rather than throwing.** A thrown
 *     error inside a server action surfaces as a generic error boundary and the
 *     administrator loses their form. A returned `{ ok: false, message }` shows
 *     them what went wrong with the form still filled in.
 */

export type ActionResult = {
  ok: boolean;
  message: string;
  /** Field-level errors for inline display. */
  fieldErrors?: Record<string, string>;
};

const GENERIC_ERROR: ActionResult = {
  ok: false,
  message: 'Terjadi kesalahan. Silakan coba lagi.',
};

/** The one guard every action calls. Returns the client or a failure result. */
async function guard(): Promise<{ ok: true } | { ok: false; result: ActionResult }> {
  const session = await getSession();
  if (!session) {
    return {
      ok: false,
      result: { ok: false, message: 'Sesi Anda sudah berakhir. Silakan masuk kembali.' },
    };
  }

  if (!getPrisma()) {
    return {
      ok: false,
      result: {
        ok: false,
        message:
          'Basis data belum dikonfigurasi. Isi DATABASE_URL pada berkas .env lalu jalankan migrasi.',
      },
    };
  }

  return { ok: true };
}

/**
 * Clears every cache that depends on content. Called after each successful write.
 *
 * Both mechanisms are needed, and the distinction is easy to miss:
 *
 *   - `revalidateTag` invalidates the **data cache** — what `getNews()` and its
 *     siblings returned.
 *   - `revalidatePath` invalidates the **full route cache** — the rendered HTML
 *     that Next.js stored for that URL.
 *
 * Clearing only the tag leaves a stale page for up to the revalidation window;
 * clearing only the path re-renders the page against stale data. Together they
 * are what makes an edit visible immediately, which is the brief's Phase 08
 * requirement.
 *
 * `'max'` is passed as the profile because this Next.js version takes a cache
 * profile as the second argument. It means "expire this data everywhere",
 * which is exactly the intent after a content write.
 *
 * ## Measured reality, 2026-09-24
 *
 * Only the second mechanism is currently doing work. Nothing in `src/` calls
 * `cacheTag` or `unstable_cache` — `src/lib/db.ts` queries Prisma directly — so
 * there is no tagged data cache for `revalidateTag` to clear, and the calls
 * above are a no-op. What actually makes an edit visible is that every public
 * page is dynamic: `dynamic = 'force-dynamic'` in `src/app/layout.tsx`, confirmed
 * by the `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`
 * header on `/` and `/tentang`.
 *
 * The calls stay, because they are the correct thing to do the moment a tagged
 * cache is introduced, and because `revalidatePath` does still clear the client
 * router cache. But anyone tempted to make the public pages static for speed
 * should read this first: doing so would remove the only thing keeping edits
 * live, and the symptom would be "changes from the admin do not appear".
 */
function revalidateContent(...tags: string[]): void {
  for (const tag of tags) {
    revalidateTag(tag, 'max');
  }

  for (const path of [
    '/',
    '/tentang',
    '/program-keahlian',
    '/berita',
    '/galeri',
    '/karya',
    '/kegiatan',
    '/kontak',
  ]) {
    revalidatePath(path);
  }
}

/** Reads a string field, trimming it. Empty means empty, never `undefined`. */
function read(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

/** Reads a checkbox. An unchecked box is absent from the payload entirely. */
function readBool(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  return value === 'on' || value === 'true' || value === '1';
}

/** Reads a multi-line field into an array, dropping blanks. */
function readLines(formData: FormData, key: string): string[] {
  return read(formData, key)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Reads an optional integer. */
function readInt(formData: FormData, key: string): number | null {
  const raw = read(formData, key);
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

// ---------------------------------------------------------------------------
// Image upload
// ---------------------------------------------------------------------------

/**
 * Uploads one image and returns its URL plus public id.
 *
 * The public id is returned alongside the URL because it is what makes deletion
 * possible: the media store is keyed by id, not by URL, and an asset whose id
 * was never stored can only be found by hand in the database.
 */
export async function uploadContentImage(
  formData: FormData,
  folder: string,
): Promise<{ ok: true; url: string; publicId: string } | { ok: false; message: string }> {
  const check = await guard();
  if (!check.ok) return { ok: false, message: check.result.message };

  const file = formData.get('image');
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: 'Pilih gambar terlebih dahulu.' };
  }

  const result = await uploadImage(file, { folder });
  if (!result.ok) return { ok: false, message: result.error };

  return { ok: true, url: result.data.url, publicId: result.data.publicId };
}

// ---------------------------------------------------------------------------
// School profile
// ---------------------------------------------------------------------------

export async function saveSchoolProfile(formData: FormData): Promise<ActionResult> {
  const check = await guard();
  if (!check.ok) return check.result;

  const prisma = getPrisma();
  if (!prisma) return GENERIC_ERROR;

  const schoolName = read(formData, 'schoolName');
  const tagline = read(formData, 'tagline');

  const fieldErrors: Record<string, string> = {};
  if (schoolName.length < 3) fieldErrors.schoolName = 'Nama sekolah wajib diisi.';
  if (tagline.length < 5) fieldErrors.tagline = 'Tagline wajib diisi, minimal 5 karakter.';
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: 'Periksa kembali data yang Anda isi.', fieldErrors };
  }

  try {
    const data = {
      schoolName,
      tagline,
      heroLines: readLines(formData, 'heroLines'),
      description: read(formData, 'description'),
      history: read(formData, 'history'),
      vision: read(formData, 'vision'),
      mission: readLines(formData, 'mission'),
      address: read(formData, 'address'),
      city: read(formData, 'city'),
      province: read(formData, 'province'),
      phone: read(formData, 'phone'),
      whatsapp: read(formData, 'whatsapp'),
      email: read(formData, 'email'),
      instagram: read(formData, 'instagram'),
      youtube: read(formData, 'youtube'),
      mapsUrl: read(formData, 'mapsUrl'),
    };

    // Upsert on the fixed slug rather than create, so saving twice does not
    // produce two profile rows and a nondeterministic `findFirst`.
    await prisma.schoolProfile.upsert({
      where: { slug: 'utama' },
      create: { slug: 'utama', ...data },
      update: data,
    });

    revalidateContent(mainTags.profile, mainTags.sections);
    return { ok: true, message: 'Data berhasil disimpan.' };
  } catch (error) {
    console.error('[admin] Gagal menyimpan profil sekolah.', error);
    return GENERIC_ERROR;
  }
}

// ---------------------------------------------------------------------------
// Programmes
// ---------------------------------------------------------------------------

export async function saveProgram(formData: FormData): Promise<ActionResult> {
  const check = await guard();
  if (!check.ok) return check.result;

  const prisma = getPrisma();
  if (!prisma) return GENERIC_ERROR;

  const id = read(formData, 'id');
  const name = read(formData, 'name');
  const slug = slugify(read(formData, 'slug') || name);

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = 'Nama program wajib diisi.';
  if (!slug) fieldErrors.slug = 'Slug tidak valid. Gunakan huruf dan angka.';
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: 'Periksa kembali data yang Anda isi.', fieldErrors };
  }

  try {
    const data = {
      name,
      slug,
      shortDescription: read(formData, 'shortDescription'),
      description: read(formData, 'description'),
      image: read(formData, 'image'),
      imagePublicId: read(formData, 'imagePublicId'),
      features: readLines(formData, 'features'),
      order: readInt(formData, 'order') ?? 0,
      published: readBool(formData, 'published'),
    };

    if (id) {
      await prisma.program.update({ where: { id }, data });
    } else {
      await prisma.program.create({ data });
    }

    revalidateContent(mainTags.programs);
    revalidatePath(`/program-keahlian/${slug}`);
    return { ok: true, message: 'Data berhasil disimpan.' };
  } catch (error) {
    // A unique-constraint violation on `slug` is the common case and deserves a
    // specific message: "sudah dipakai" tells the administrator what to change,
    // a generic failure does not.
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        message: 'Terjadi kesalahan. Silakan coba lagi.',
        fieldErrors: { slug: 'Slug ini sudah dipakai program lain.' },
      };
    }
    console.error('[admin] Gagal menyimpan program.', error);
    return GENERIC_ERROR;
  }
}

export async function deleteProgram(id: string): Promise<ActionResult> {
  const check = await guard();
  if (!check.ok) return check.result;

  const prisma = getPrisma();
  if (!prisma) return GENERIC_ERROR;

  try {
    const existing = await prisma.program.findUnique({ where: { id } });
    if (!existing) return { ok: false, message: 'Data tidak ditemukan.' };

    await prisma.program.delete({ where: { id } });

    // The image is deleted after the row, and a failure is only logged. Leaving
    // an orphan in the media table costs kilobytes of quota; leaving a row that
    // points at a deleted asset shows a broken image on the public site.
    if (existing.imagePublicId) {
      await deleteImage(existing.imagePublicId);
    }

    revalidateContent(mainTags.programs);
    return { ok: true, message: 'Data berhasil dihapus.' };
  } catch (error) {
    console.error('[admin] Gagal menghapus program.', error);
    return GENERIC_ERROR;
  }
}

// ---------------------------------------------------------------------------
// News
// ---------------------------------------------------------------------------

export async function saveNews(formData: FormData): Promise<ActionResult> {
  const check = await guard();
  if (!check.ok) return check.result;

  const prisma = getPrisma();
  if (!prisma) return GENERIC_ERROR;

  const id = read(formData, 'id');
  const title = read(formData, 'title');
  const slug = slugify(read(formData, 'slug') || title);
  const published = readBool(formData, 'published');

  const fieldErrors: Record<string, string> = {};
  if (title.length < 3) fieldErrors.title = 'Judul wajib diisi.';
  if (!slug) fieldErrors.slug = 'Slug tidak valid.';
  if (read(formData, 'content').length < 20) fieldErrors.content = 'Isi berita minimal 20 karakter.';
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: 'Periksa kembali data yang Anda isi.', fieldErrors };
  }

  try {
    const existing = id ? await prisma.news.findUnique({ where: { id } }) : null;

    // The publish date is set the first time an article is published and never
    // recomputed afterwards. Otherwise editing a month-old article would move it
    // to the top of the feed, which is the classic CMS bug that makes an archive
    // untrustworthy.
    const publishedAt = published ? (existing?.publishedAt ?? new Date()) : null;

    const data = {
      title,
      slug,
      category: read(formData, 'category') || 'Umum',
      excerpt: read(formData, 'excerpt'),
      content: read(formData, 'content'),
      coverImage: read(formData, 'coverImage'),
      coverPublicId: read(formData, 'coverPublicId'),
      published,
      publishedAt,
    };

    if (id) {
      await prisma.news.update({ where: { id }, data });
    } else {
      await prisma.news.create({ data });
    }

    revalidateContent(mainTags.news);
    revalidatePath(`/berita/${slug}`);
    return { ok: true, message: 'Data berhasil disimpan.' };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        message: 'Terjadi kesalahan. Silakan coba lagi.',
        fieldErrors: { slug: 'Slug ini sudah dipakai berita lain.' },
      };
    }
    console.error('[admin] Gagal menyimpan berita.', error);
    return GENERIC_ERROR;
  }
}

export async function deleteNews(id: string): Promise<ActionResult> {
  const check = await guard();
  if (!check.ok) return check.result;

  const prisma = getPrisma();
  if (!prisma) return GENERIC_ERROR;

  try {
    const existing = await prisma.news.findUnique({ where: { id } });
    if (!existing) return { ok: false, message: 'Data tidak ditemukan.' };

    await prisma.news.delete({ where: { id } });
    if (existing.coverPublicId) await deleteImage(existing.coverPublicId);

    revalidateContent(mainTags.news);
    return { ok: true, message: 'Data berhasil dihapus.' };
  } catch (error) {
    console.error('[admin] Gagal menghapus berita.', error);
    return GENERIC_ERROR;
  }
}

/** Publishes or hides an article without opening the full form. */
export async function toggleNewsPublished(id: string, published: boolean): Promise<ActionResult> {
  const check = await guard();
  if (!check.ok) return check.result;

  const prisma = getPrisma();
  if (!prisma) return GENERIC_ERROR;

  try {
    const existing = await prisma.news.findUnique({ where: { id } });
    if (!existing) return { ok: false, message: 'Data tidak ditemukan.' };

    await prisma.news.update({
      where: { id },
      data: {
        published,
        publishedAt: published ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
      },
    });

    revalidateContent(mainTags.news);
    return { ok: true, message: published ? 'Berita diterbitkan.' : 'Berita disembunyikan.' };
  } catch (error) {
    console.error('[admin] Gagal mengubah status berita.', error);
    return GENERIC_ERROR;
  }
}

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------

export async function saveGalleryItem(formData: FormData): Promise<ActionResult> {
  const check = await guard();
  if (!check.ok) return check.result;

  const prisma = getPrisma();
  if (!prisma) return GENERIC_ERROR;

  const id = read(formData, 'id');
  const title = read(formData, 'title');
  const image = read(formData, 'image');

  const fieldErrors: Record<string, string> = {};
  if (title.length < 2) fieldErrors.title = 'Judul wajib diisi.';
  if (!image) fieldErrors.image = 'Unggah gambar terlebih dahulu.';
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: 'Periksa kembali data yang Anda isi.', fieldErrors };
  }

  try {
    const data = {
      title,
      image,
      /*
       * `imagePublicId`, bukan `publicId`.
       *
       * `ImageUploadField name="image"` memancarkan dua input tersembunyi:
       * `image` (URL-nya) dan `imagePublicId` (id asetnya) — lihat
       * FormFields.tsx. Membaca `'publicId'` di sini berarti kolom itu selalu
       * kosong, dan akibatnya `deleteImage()` pada `deleteGalleryItem` tidak
       * pernah berjalan: setiap foto galeri yang dihapus atau diganti
       * meninggalkan asetnya di basis data **selamanya**.
       *
       * Terukur 24 September 2026 lewat `npm run media:bersihkan`: empat aset
       * uji, `dirujuk konten: 0`. Diuji oleh tests/media.test.ts.
       */
      publicId: read(formData, 'imagePublicId'),
      category: read(formData, 'category') || 'Umum',
      description: read(formData, 'description'),
      order: readInt(formData, 'order') ?? 0,
      published: readBool(formData, 'published'),
    };

    if (id) {
      await prisma.galleryItem.update({ where: { id }, data });
    } else {
      await prisma.galleryItem.create({ data });
    }

    revalidateContent(mainTags.gallery);
    return { ok: true, message: 'Data berhasil disimpan.' };
  } catch (error) {
    console.error('[admin] Gagal menyimpan foto galeri.', error);
    return GENERIC_ERROR;
  }
}

export async function deleteGalleryItem(id: string): Promise<ActionResult> {
  const check = await guard();
  if (!check.ok) return check.result;

  const prisma = getPrisma();
  if (!prisma) return GENERIC_ERROR;

  try {
    const existing = await prisma.galleryItem.findUnique({ where: { id } });
    if (!existing) return { ok: false, message: 'Data tidak ditemukan.' };

    await prisma.galleryItem.delete({ where: { id } });
    if (existing.publicId) await deleteImage(existing.publicId);

    revalidateContent(mainTags.gallery);
    return { ok: true, message: 'Data berhasil dihapus.' };
  } catch (error) {
    console.error('[admin] Gagal menghapus foto galeri.', error);
    return GENERIC_ERROR;
  }
}

// ---------------------------------------------------------------------------
// Student work
// ---------------------------------------------------------------------------

export async function saveStudentWork(formData: FormData): Promise<ActionResult> {
  const check = await guard();
  if (!check.ok) return check.result;

  const prisma = getPrisma();
  if (!prisma) return GENERIC_ERROR;

  const id = read(formData, 'id');
  const title = read(formData, 'title');
  const image = read(formData, 'image');

  const fieldErrors: Record<string, string> = {};
  if (title.length < 2) fieldErrors.title = 'Judul karya wajib diisi.';
  if (!image) fieldErrors.image = 'Unggah gambar terlebih dahulu.';
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: 'Periksa kembali data yang Anda isi.', fieldErrors };
  }

  try {
    const data = {
      title,
      studentName: read(formData, 'studentName'),
      category: read(formData, 'category') || 'Desain Komunikasi Visual',
      description: read(formData, 'description'),
      image,
      // `imagePublicId` — sama alasannya dengan `saveGalleryItem` di atas.
      publicId: read(formData, 'imagePublicId'),
      year: readInt(formData, 'year'),
      order: readInt(formData, 'order') ?? 0,
      published: readBool(formData, 'published'),
    };

    if (id) {
      await prisma.studentWork.update({ where: { id }, data });
    } else {
      await prisma.studentWork.create({ data });
    }

    revalidateContent(mainTags.work);
    return { ok: true, message: 'Data berhasil disimpan.' };
  } catch (error) {
    console.error('[admin] Gagal menyimpan karya siswa.', error);
    return GENERIC_ERROR;
  }
}

export async function deleteStudentWork(id: string): Promise<ActionResult> {
  const check = await guard();
  if (!check.ok) return check.result;

  const prisma = getPrisma();
  if (!prisma) return GENERIC_ERROR;

  try {
    const existing = await prisma.studentWork.findUnique({ where: { id } });
    if (!existing) return { ok: false, message: 'Data tidak ditemukan.' };

    await prisma.studentWork.delete({ where: { id } });
    if (existing.publicId) await deleteImage(existing.publicId);

    revalidateContent(mainTags.work);
    return { ok: true, message: 'Data berhasil dihapus.' };
  } catch (error) {
    console.error('[admin] Gagal menghapus karya siswa.', error);
    return GENERIC_ERROR;
  }
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export async function saveEvent(formData: FormData): Promise<ActionResult> {
  const check = await guard();
  if (!check.ok) return check.result;

  const prisma = getPrisma();
  if (!prisma) return GENERIC_ERROR;

  const id = read(formData, 'id');
  const title = read(formData, 'title');
  const slug = slugify(read(formData, 'slug') || title);
  const dateRaw = read(formData, 'date');

  const fieldErrors: Record<string, string> = {};
  if (title.length < 3) fieldErrors.title = 'Judul kegiatan wajib diisi.';
  if (!slug) fieldErrors.slug = 'Slug tidak valid.';
  if (!dateRaw) fieldErrors.date = 'Tanggal wajib diisi.';

  const date = dateRaw ? new Date(dateRaw) : null;
  if (date && Number.isNaN(date.getTime())) fieldErrors.date = 'Tanggal tidak valid.';

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: 'Periksa kembali data yang Anda isi.', fieldErrors };
  }

  try {
    const endRaw = read(formData, 'endDate');
    const endDate = endRaw ? new Date(endRaw) : null;

    const data = {
      title,
      slug,
      description: read(formData, 'description'),
      image: read(formData, 'image'),
      // `publicId`, bukan `imagePublicId`: kegiatan memakai kolom URL biasa,
      // bukan `ImageUploadField`, jadi nama inputnya memang `publicId` — lihat
      // EventManager.tsx. tests/media.test.ts mengunci pasangan nama ini.
      publicId: read(formData, 'publicId'),
      date: date as Date,
      endDate: endDate && !Number.isNaN(endDate.getTime()) ? endDate : null,
      location: read(formData, 'location'),
      published: readBool(formData, 'published'),
    };

    if (id) {
      await prisma.event.update({ where: { id }, data });
    } else {
      await prisma.event.create({ data });
    }

    revalidateContent(mainTags.events);
    return { ok: true, message: 'Data berhasil disimpan.' };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        message: 'Terjadi kesalahan. Silakan coba lagi.',
        fieldErrors: { slug: 'Slug ini sudah dipakai kegiatan lain.' },
      };
    }
    console.error('[admin] Gagal menyimpan kegiatan.', error);
    return GENERIC_ERROR;
  }
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  const check = await guard();
  if (!check.ok) return check.result;

  const prisma = getPrisma();
  if (!prisma) return GENERIC_ERROR;

  try {
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) return { ok: false, message: 'Data tidak ditemukan.' };

    await prisma.event.delete({ where: { id } });
    if (existing.publicId) await deleteImage(existing.publicId);

    revalidateContent(mainTags.events);
    return { ok: true, message: 'Data berhasil dihapus.' };
  } catch (error) {
    console.error('[admin] Gagal menghapus kegiatan.', error);
    return GENERIC_ERROR;
  }
}

// ---------------------------------------------------------------------------
// Section copy
// ---------------------------------------------------------------------------

export async function saveSection(formData: FormData): Promise<ActionResult> {
  const check = await guard();
  if (!check.ok) return check.result;

  const prisma = getPrisma();
  if (!prisma) return GENERIC_ERROR;

  const key = read(formData, 'key');
  if (!key) return { ok: false, message: 'Bagian tidak dikenali.' };

  try {
    const data = {
      eyebrow: read(formData, 'eyebrow'),
      title: read(formData, 'title'),
      body: read(formData, 'body'),
      ctaLabel: read(formData, 'ctaLabel'),
      ctaHref: read(formData, 'ctaHref'),
    };

    await prisma.siteSection.upsert({
      where: { key },
      create: { key, ...data },
      update: data,
    });

    revalidateContent(mainTags.sections);
    return { ok: true, message: 'Data berhasil disimpan.' };
  } catch (error) {
    console.error('[admin] Gagal menyimpan bagian situs.', error);
    return GENERIC_ERROR;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Recognises a Postgres unique-constraint violation.
 *
 * Prisma 7 does not export a stable error class for this across drivers, so the
 * driver's error code is checked directly. The optional chaining matters: the
 * error shape differs between the pg adapter and a thrown validation error, and
 * a `TypeError` here would mask the original failure.
 */
function isUniqueViolation(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return code === 'P2002' || code === '23505';
}
