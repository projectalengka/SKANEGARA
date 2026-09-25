'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import type { Prisma } from '@/generated/prisma/client';
import { deleteImage, uploadImage } from '@/lib/media';
import { getPrisma } from '@/lib/db';
import { getSession } from '@/lib/session';
import { isSampleId } from '@/lib/sample-id';
import { slugify } from '@/lib/utils';
import {
  adoptableEventRows,
  adoptableGalleryRows,
  adoptableNewsRows,
  adoptableWorkRows,
  sampleEnabled,
  type SampleCollection,
} from '@/data/sample';
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
      // `ImageUploadField name="image"` memancarkan dua input: `image` berisi
      // URL dan `imagePublicId` berisi id aset. Keduanya wajib dibaca — tanpa
      // yang kedua, id tersimpan sebagai string kosong, `deleteImage()` tidak
      // pernah berjalan, dan setiap foto yang diganti tinggal di basis data
      // selamanya. `tests/media.test.ts` menghitung pasangan ini.
      image: read(formData, 'image'),
      imagePublicId: read(formData, 'imagePublicId'),
    };

    // Dibaca sebelum menulis, untuk membandingkan foto lama dan baru. Tanpa ini
    // setiap penggantian foto meninggalkan aset yatim yang tetap memakan kuota
    // dan tetap muncul di `npm run media:bersihkan` sebagai "dirujuk konten: 0".
    const previous = await prisma.schoolProfile.findUnique({
      where: { slug: 'utama' },
      select: { imagePublicId: true },
    });

    // Upsert on the fixed slug rather than create, so saving twice does not
    // produce two profile rows and a nondeterministic `findFirst`.
    await prisma.schoolProfile.upsert({
      where: { slug: 'utama' },
      create: { slug: 'utama', ...data },
      update: data,
    });

    // Setelah barisnya tersimpan, bukan sebelumnya: kalau penghapusan gagal,
    // yang tersisa hanyalah aset yatim — sedangkan urutan sebaliknya akan
    // meninggalkan baris yang menunjuk gambar yang sudah tidak ada, dan itu
    // tampil sebagai gambar rusak di situs publik.
    if (previous?.imagePublicId && previous.imagePublicId !== data.imagePublicId) {
      await deleteImage(previous.imagePublicId);
    }

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

    const refusal = sampleRowRefusal(id);
    if (refusal) return refusal;

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

    const refusal = sampleRowRefusal(id);
    if (refusal) return refusal;

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

    const refusal = sampleRowRefusal(id);
    if (refusal) return refusal;

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

    const refusal = sampleRowRefusal(id);
    if (refusal) return refusal;

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
// Adopting sample content
// ---------------------------------------------------------------------------

/**
 * Turns the sample set into the owner's own rows, in one deliberate step.
 *
 * ## The defect this closes
 *
 * Sample content lives in `src/data/sample.ts` and never in Postgres, but the
 * dashboard listed those rows as ordinary records — each with an id such as
 * `sample-work-1` and an edit form. Saving one ran
 * `update({ where: { id: 'sample-work-1' } })`, which Prisma rejects with
 * `P2025` because no such primary key exists; the `catch` below turned that into
 * *"Terjadi kesalahan. Silakan coba lagi."* Measured on 2026-09-24: the database
 * held six student-work rows, every one a cuid, and `sample-work-1` was absent.
 *
 * The report was confusing because the image upload had already succeeded — the
 * form said *"Gambar berhasil diunggah"* and only the save failed. The failure
 * was never in the upload path.
 *
 * ## Why adoption rather than "just make save work"
 *
 * Creating a row on save would have been three lines, and it would have made the
 * page worse: one real title anywhere makes the collection stop counting as
 * untouched, so the sample set stands down — seventeen of the eighteen works
 * would vanish and six placeholder-titled seed rows would surface in their place.
 * Adopting the whole collection at once keeps every row, gives each one a real
 * id, and removes the placeholder rows nobody had filled in.
 *
 * ## What it deletes, and why that is safe
 *
 * Only rows whose title still begins with `[` — the same test `isPlaceholder`
 * uses. Those are seed rows that were never filled in, so they carry no writing
 * of the owner's. Any uploaded media they point at is removed too, which matters
 * because an orphaned asset still counts against the database quota that
 * `/admin/pengaturan` reports.
 */
export async function adoptSampleContent(collection: SampleCollection): Promise<ActionResult> {
  const check = await guard();
  if (!check.ok) return check.result;

  const prisma = getPrisma();
  if (!prisma) return GENERIC_ERROR;

  if (!sampleEnabled()) {
    return {
      ok: false,
      message: 'Data contoh sedang tidak aktif, jadi tidak ada yang bisa dipakai.',
    };
  }

  try {
    switch (collection) {
      case 'karya': {
        const stale = await prisma.studentWork.findMany({
          where: { title: { startsWith: '[' } },
          select: { id: true, publicId: true },
        });
        const rows = adoptableWorkRows();

        await inOneStep([
          rows.length > 0 ? prisma.studentWork.createMany({ data: rows }) : null,
          stale.length > 0
            ? prisma.studentWork.deleteMany({ where: { id: { in: stale.map((row) => row.id) } } })
            : null,
        ]);
        await dropOrphanedMedia(stale);

        revalidateContent(mainTags.work);
        return { ok: true, message: `${rows.length} karya contoh kini menjadi karya Anda dan bisa diedit.` };
      }

      case 'galeri': {
        const stale = await prisma.galleryItem.findMany({
          where: { title: { startsWith: '[' } },
          select: { id: true, publicId: true },
        });
        const rows = adoptableGalleryRows();

        await inOneStep([
          rows.length > 0 ? prisma.galleryItem.createMany({ data: rows }) : null,
          stale.length > 0
            ? prisma.galleryItem.deleteMany({ where: { id: { in: stale.map((row) => row.id) } } })
            : null,
        ]);
        await dropOrphanedMedia(stale);

        revalidateContent(mainTags.gallery);
        return { ok: true, message: `${rows.length} foto contoh kini menjadi foto Anda dan bisa diedit.` };
      }

      case 'berita': {
        const stale = await prisma.news.findMany({
          where: { title: { startsWith: '[' } },
          select: { id: true, coverPublicId: true },
        });

        // Only slugs that survive are taken. Counting the placeholder rows would
        // make adoption avoid a slug it is about to delete, producing needless
        // `-2` suffixes on a fresh site.
        const taken = new Set(
          (
            await prisma.news.findMany({
              where: { NOT: { title: { startsWith: '[' } } },
              select: { slug: true },
            })
          ).map((row) => row.slug),
        );
        const rows = adoptableNewsRows().map((row) => ({
          ...row,
          slug: uniqueSlug(row.slug, taken),
        }));

        await inOneStep([
          rows.length > 0 ? prisma.news.createMany({ data: rows }) : null,
          stale.length > 0
            ? prisma.news.deleteMany({ where: { id: { in: stale.map((row) => row.id) } } })
            : null,
        ]);
        await dropOrphanedMedia(stale, 'coverPublicId');

        revalidateContent(mainTags.news);
        return { ok: true, message: `${rows.length} berita contoh kini menjadi berita Anda dan bisa diedit.` };
      }

      case 'kegiatan': {
        const stale = await prisma.event.findMany({
          where: { title: { startsWith: '[' } },
          select: { id: true, publicId: true },
        });

        const taken = new Set(
          (
            await prisma.event.findMany({
              where: { NOT: { title: { startsWith: '[' } } },
              select: { slug: true },
            })
          ).map((row) => row.slug),
        );
        const rows = adoptableEventRows().map((row) => ({
          ...row,
          slug: uniqueSlug(row.slug, taken),
        }));

        await inOneStep([
          rows.length > 0 ? prisma.event.createMany({ data: rows }) : null,
          stale.length > 0
            ? prisma.event.deleteMany({ where: { id: { in: stale.map((row) => row.id) } } })
            : null,
        ]);
        await dropOrphanedMedia(stale);

        revalidateContent(mainTags.events);
        return { ok: true, message: `${rows.length} kegiatan contoh kini menjadi kegiatan Anda dan bisa diedit.` };
      }

      default:
        return { ok: false, message: 'Jenis konten tidak dikenal.' };
    }
  } catch (error) {
    console.error('[admin] Gagal memakai data contoh.', error);
    return GENERIC_ERROR;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Runs the given Prisma operations as one transaction, skipping when there is
 * nothing to do.
 *
 * One transaction rather than two sequential writes, because adoption both adds
 * the sample rows and removes the placeholder ones: a half-applied run would
 * leave the owner with duplicates or, worse, with neither. `$transaction([])` is
 * not a no-op — it is an error — hence the guard, which also covers the honest
 * case of a collection that has nothing left to change.
 */
async function inOneStep(
  operations: (Prisma.PrismaPromise<unknown> | null)[],
): Promise<void> {
  const pending = operations.filter(
    (operation): operation is Prisma.PrismaPromise<unknown> => operation !== null,
  );

  const client = getPrisma();
  if (!client || pending.length === 0) return;

  await client.$transaction(pending);
}

/** Removes the stored bytes behind rows that are about to be deleted. */
async function dropOrphanedMedia(
  rows: { publicId?: string; coverPublicId?: string }[],
  field: 'publicId' | 'coverPublicId' = 'publicId',
): Promise<void> {
  for (const row of rows) {
    const id = row[field];
    if (id) await deleteImage(id);
  }
}

/**
 * Makes `base` unique against the slugs already in use, appending `-2`, `-3` …
 *
 * The sample slugs are ordinary words — `jadwal-penerimaan`, `pameran-bazar` —
 * so an owner who has already written an article with the same slug would
 * otherwise hit the unique constraint and see the generic error, which is the
 * exact failure mode adoption exists to remove. `taken` is mutated as slugs are
 * handed out, so a single batch cannot collide with itself.
 */
function uniqueSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) {
    taken.add(base);
    return base;
  }

  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;

  const slug = `${base}-${suffix}`;
  taken.add(slug);
  return slug;
}

/**
 * Refuses to write over a sample row, with a message the owner can act on.
 *
 * The list pages no longer offer an edit form for sample rows, so this is the
 * second line of defence rather than the first. It exists because the first
 * version of this bug was reachable from more than one place — including a URL
 * typed by hand — and because a `catch` that maps every failure to *"Terjadi
 * kesalahan. Silakan coba lagi."* is exactly what made the original report so
 * hard to diagnose. A refusal that names the cause costs one branch.
 */
function sampleRowRefusal(id: string): ActionResult | null {
  if (!isSampleId(id)) return null;

  return {
    ok: false,
    message:
      'Ini data contoh, bukan data yang tersimpan di basis data, jadi belum bisa diubah. ' +
      'Buka halaman daftarnya dan pakai tombol "Pakai sebagai data saya" lebih dahulu.',
  };
}

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
