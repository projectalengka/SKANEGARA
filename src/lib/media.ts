import sharp from 'sharp';
import { getPrisma, isDatabaseConfigured } from './db';
import { uploadError } from './upload-limits';

/**
 * Image storage, backed by the project's own database.
 *
 * ## Why not object storage
 *
 * The first version of this file sent uploads to Cloudinary. That needed a third
 * account and three credentials before a single photograph could be uploaded,
 * and the price of that friction was measured on 2026-09-24: months in, the
 * credentials were still empty, so the feature had never once worked.
 *
 * Postgres was already here. Images now live beside the content, which means the
 * only thing between a fresh clone and a working upload is `DATABASE_URL` — a
 * variable that must be set anyway for the site to have any content at all.
 *
 * What that trades away is a quota (Supabase's free tier gives 500 MB, shared
 * with the text) and a CDN. Both are answered below rather than ignored:
 * everything is re-encoded before it is stored, and `mediaUsage()` reports how
 * much has been used so the quota is visible instead of silent.
 *
 * ## The shape of the contract
 *
 * `uploadImage` returns a **URL** and a **public id**, and the id is what makes
 * deletion possible later — the database rows that point at an image store both.
 * That contract is unchanged from the Cloudinary version on purpose: it is what
 * the admin forms, the server actions and the Prisma columns were already built
 * around, so swapping the backend touched one file instead of fifteen.
 */

/** The longest edge of a stored image. A 6000px phone photo is useful nowhere here. */
const MAX_EDGE = 2400;

/**
 * WebP quality. 82 is where a photograph stops being distinguishable from the
 * original at the sizes this site displays, and is roughly a third the size of
 * the JPEG a phone produces.
 */
const WEBP_QUALITY = 82;

/**
 * Decompression-bomb guard.
 *
 * A 2 MB PNG can expand to tens of gigabytes of raw pixels. Without a ceiling,
 * one malicious upload takes the process down — and on a serverless host that
 * means every request served by that instance, not just this one. 64 megapixels
 * is comfortably above any camera a school will use.
 */
const MAX_INPUT_PIXELS = 64_000_000;

export type UploadResult = { url: string; publicId: string; width: number; height: number };

/**
 * Whether uploads can work at all.
 *
 * The database is the storage now, so this is the database check — kept as its
 * own name because "storage is configured" and "the database is configured"
 * will not stay the same question forever, and the dashboard asks this one.
 */
export function isMediaStorageConfigured(): boolean {
  return isDatabaseConfigured();
}

/** The URL an asset is served from. Derived, so the path is written once. */
export function mediaUrl(id: string): string {
  return `/api/media/${id}`;
}

/**
 * Re-encodes an upload for storage.
 *
 * Three things happen here, and each earns its place:
 *
 *  - **`.rotate()` with no argument** applies the EXIF orientation and then
 *    strips it. Without this, every photograph taken in portrait on a phone is
 *    stored sideways — and the site has no way to know, because the metadata
 *    that said so has been thrown away by the encoder.
 *  - **`resize` inside 2400px** caps what a single asset can cost. `fit: 'inside'`
 *    preserves the aspect ratio, and `withoutEnlargement` leaves small images
 *    alone instead of upscaling them into blur.
 *  - **WebP** because every browser this site supports reads it, and it is
 *    roughly a third of the equivalent JPEG. The stored `mimeType` records what
 *    the bytes actually are, so the route handler never has to guess.
 *
 * If the encoder fails, the original bytes are stored instead. That is a
 * deliberate downgrade rather than a failure: a native module that will not load
 * should cost image quality, not the ability to publish a photograph. It is
 * logged loudly, and `mediaUsage()` makes the larger footprint visible.
 */
/**
 * The exact shape Prisma 7 accepts for a `Bytes` column.
 *
 * Not ceremony: Prisma types a `Bytes` column as `Uint8Array<ArrayBuffer>`,
 * while Node's `Buffer` is a `Uint8Array<ArrayBufferLike>` — and `ArrayBufferLike`
 * includes `SharedArrayBuffer`, which the column cannot hold. The narrowing has
 * to happen somewhere, and doing it by copying is the version that cannot be
 * wrong.
 *
 * A zero-copy view (`new Uint8Array(buffer.buffer, …)`) would need a cast, and
 * the cast would be a claim rather than a guarantee. `Uint8Array.from` copies
 * and returns exactly this type, with no assertion. The copy costs one memcpy of
 * at most a few hundred kilobytes — the encoder has already capped the long edge
 * at 2400px — which is not worth trading correctness for.
 */
type Bytes = Uint8Array<ArrayBuffer>;

/** Copies a `Buffer` into the exact type a `Bytes` column wants. */
function toBytes(buffer: Buffer): Bytes {
  return Uint8Array.from(buffer);
}

async function encode(
  input: Buffer,
  declaredType: string,
): Promise<{ data: Bytes; mimeType: string; width: number; height: number }> {
  try {
    const result = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true });

    return {
      data: toBytes(result.data),
      mimeType: 'image/webp',
      width: result.info.width,
      height: result.info.height,
    };
  } catch (error) {
    console.error(
      '[media] Gambar tidak dapat dikodekan ulang; berkas asli disimpan apa adanya. ' +
        'Periksa apakah "sharp" terpasang dengan benar.',
      error,
    );
    return { data: toBytes(input), mimeType: declaredType, width: 0, height: 0 };
  }
}

/**
 * Stores one uploaded image and returns its URL and id.
 *
 * The bytes go in as a buffer, never as a file: Vercel's filesystem is ephemeral
 * and read-only outside `/tmp`, so anything written to disk is gone by the next
 * invocation. Here there is also nothing to clean up.
 */
export async function uploadImage(
  file: File,
  options: { folder?: string } = {},
): Promise<{ ok: true; data: UploadResult } | { ok: false; error: string }> {
  const prisma = getPrisma();
  if (!prisma) {
    return {
      ok: false,
      error:
        'Penyimpanan gambar belum aktif. Basis data belum dikonfigurasi — isi DATABASE_URL di berkas .env.',
    };
  }

  // The same rules the browser applied before sending, applied again here. The
  // browser's check is a courtesy; this one is the control, because the same
  // request can be made with `curl`.
  const problem = uploadError(file);
  if (problem) return { ok: false, error: problem };

  try {
    const input = Buffer.from(await file.arrayBuffer());
    const encoded = await encode(input, file.type);

    const asset = await prisma.mediaAsset.create({
      data: {
        // Truncated because the column is descriptive, not authoritative, and a
        // pathological filename should not be able to fail the insert.
        filename: file.name.slice(0, 200),
        folder: (options.folder ?? 'umum').slice(0, 60),
        mimeType: encoded.mimeType,
        width: encoded.width,
        height: encoded.height,
        bytes: encoded.data.length,
        data: encoded.data,
      },
      select: { id: true },
    });

    return {
      ok: true,
      data: {
        url: mediaUrl(asset.id),
        publicId: asset.id,
        width: encoded.width,
        height: encoded.height,
      },
    };
  } catch (error) {
    console.error('[media] Gagal menyimpan gambar.', error);
    return { ok: false, error: 'Gambar gagal disimpan. Silakan coba lagi.' };
  }
}

/**
 * Deletes an image by public id.
 *
 * Deliberately non-fatal, exactly as the Cloudinary version was: if the delete
 * fails, the row that referenced the image is still removed and the orphan is
 * logged. Leaving an unreferenced asset costs kilobytes of quota; leaving a row
 * that points at a deleted asset shows a broken image on the public site.
 *
 * `deleteMany` rather than `delete` so an id that is already gone is a success
 * instead of a thrown `P2025` — deleting an item twice should not be an error.
 */
export async function deleteImage(publicId: string): Promise<boolean> {
  if (!publicId) return false;

  const prisma = getPrisma();
  if (!prisma) return false;

  try {
    await prisma.mediaAsset.deleteMany({ where: { id: publicId } });
    return true;
  } catch (error) {
    console.error(`[media] Gagal menghapus aset "${publicId}".`, error);
    return false;
  }
}

/** One asset's bytes, for the route handler that serves them. */
export async function readImage(
  id: string,
): Promise<{ data: Bytes; mimeType: string; bytes: number } | null> {
  const prisma = getPrisma();
  if (!prisma) return null;

  try {
    const asset = await prisma.mediaAsset.findUnique({
      where: { id },
      select: { data: true, mimeType: true, bytes: true },
    });
    if (!asset || !asset.data) return null;

    return { data: asset.data, mimeType: asset.mimeType, bytes: asset.bytes };
  } catch (error) {
    console.error(`[media] Gagal membaca aset "${id}".`, error);
    return null;
  }
}

/**
 * How much of the database the images are using.
 *
 * Exists because the quota is the one real cost of storing bytes in Postgres,
 * and a quota nobody can see is a quota that fills up silently. When it does,
 * the symptom is not "uploads stopped" — it is that *writes to the whole site*
 * start failing, which is a far worse failure and much harder to diagnose.
 */
export async function mediaUsage(): Promise<{ count: number; bytes: number } | null> {
  const prisma = getPrisma();
  if (!prisma) return null;

  try {
    const result = await prisma.mediaAsset.aggregate({
      _count: { _all: true },
      _sum: { bytes: true },
    });
    return { count: result._count._all, bytes: result._sum.bytes ?? 0 };
  } catch (error) {
    console.error('[media] Gagal menghitung pemakaian penyimpanan.', error);
    return null;
  }
}

/** Human-readable size, in the units the person reading it thinks in. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
