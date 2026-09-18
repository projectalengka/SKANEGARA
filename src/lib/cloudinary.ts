import { v2 as cloudinary } from 'cloudinary';

/**
 * Cloudinary image storage.
 *
 * The brief is explicit that uploaded images must never be persisted to local
 * disk, and it is right to be: Vercel's filesystem is ephemeral and read-only
 * outside `/tmp`, so a file written during an upload is gone by the next
 * invocation. Cloudinary holds the bytes, the database holds the URL and the
 * public id, and the public id is what makes deletion possible later.
 *
 * All three credentials are server-only. Nothing here is prefixed
 * `NEXT_PUBLIC_`, and `getCloudinaryConfig()` returns `null` rather than
 * throwing when they are absent — so the dashboard can render an honest
 * "storage not configured" state instead of crashing.
 */

const FOLDER = 'smk-jayanegara';

export type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

export function getCloudinaryConfig(): CloudinaryConfig | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

export function isCloudinaryConfigured(): boolean {
  return getCloudinaryConfig() !== null;
}

let configured = false;

function configure(): CloudinaryConfig | null {
  const config = getCloudinaryConfig();
  if (!config) return null;

  if (!configured) {
    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
      secure: true,
    });
    configured = true;
  }

  return config;
}

export type UploadResult = { url: string; publicId: string; width: number; height: number };

/** What the upload endpoint is allowed to accept. */
export const UPLOAD_LIMITS = {
  maxBytes: 8 * 1024 * 1024,
  mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const,
} as const;

/**
 * Uploads a buffer to Cloudinary.
 *
 * Two things this does beyond calling the SDK:
 *
 *  - **It validates the MIME type and size against an allow-list.** A browser's
 *    `accept` attribute is a convenience for the user, not a control; the same
 *    request can be made with `curl`. And a size cap matters because Cloudinary
 *    bills for it and Vercel caps request bodies.
 *  - **It uploads from a buffer, not a path.** There is no temporary file
 *    anywhere, so there is nothing to clean up and nothing that can leak between
 *    requests on a shared lambda.
 */
export async function uploadImage(
  file: File,
  options: { folder?: string } = {},
): Promise<{ ok: true; data: UploadResult } | { ok: false; error: string }> {
  const config = configure();
  if (!config) {
    return {
      ok: false,
      error: 'Penyimpanan gambar belum dikonfigurasi. Isi kredensial Cloudinary di berkas .env.',
    };
  }

  if (file.size === 0) {
    return { ok: false, error: 'Berkas kosong.' };
  }

  if (file.size > UPLOAD_LIMITS.maxBytes) {
    return { ok: false, error: 'Ukuran gambar melebihi 8 MB.' };
  }

  if (!UPLOAD_LIMITS.mimeTypes.includes(file.type as (typeof UPLOAD_LIMITS.mimeTypes)[number])) {
    return { ok: false, error: 'Format gambar harus JPG, PNG, WebP, atau AVIF.' };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await new Promise<{ secure_url: string; public_id: string; width: number; height: number }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `${FOLDER}/${options.folder ?? 'umum'}`,
            resource_type: 'image',
            // Deliver in the format the requesting browser supports, and cap the
            // long edge. A 6000px phone photo is not useful on any page here and
            // costs the school bandwidth on every visitor.
            transformation: [{ width: 2400, height: 2400, crop: 'limit', quality: 'auto', fetch_format: 'auto' }],
          },
          (error, uploaded) => {
            if (error || !uploaded) {
              reject(error ?? new Error('Unggahan gagal tanpa keterangan.'));
              return;
            }
            resolve({
              secure_url: uploaded.secure_url,
              public_id: uploaded.public_id,
              width: uploaded.width ?? 0,
              height: uploaded.height ?? 0,
            });
          },
        );
        stream.end(buffer);
      },
    );

    return {
      ok: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
      },
    };
  } catch (error) {
    console.error('[cloudinary] Unggahan gagal.', error);
    return { ok: false, error: 'Gambar gagal diunggah. Silakan coba lagi.' };
  }
}

/**
 * Deletes an image by public id.
 *
 * Deliberately non-fatal: if the delete fails the database row is still removed
 * and the orphaned asset is logged. Leaving a stale asset in Cloudinary costs a
 * few kilobytes; leaving a database row that points at a deleted asset shows a
 * broken image on the public site.
 */
export async function deleteImage(publicId: string): Promise<boolean> {
  if (!publicId) return false;

  const config = configure();
  if (!config) return false;

  try {
    await cloudinary.uploader.destroy(publicId, { invalidate: true });
    return true;
  } catch (error) {
    console.error(`[cloudinary] Gagal menghapus aset "${publicId}".`, error);
    return false;
  }
}

/**
 * Builds an optimised delivery URL for a stored asset.
 *
 * Used when the database holds a public id but the stored URL needs to be
 * re-derived at a different size (a thumbnail in the dashboard, for instance).
 */
export function buildImageUrl(
  publicId: string,
  options: { width?: number; height?: number } = {},
): string {
  const config = getCloudinaryConfig();
  if (!config || !publicId) return '';

  const transforms: string[] = ['f_auto', 'q_auto'];
  if (options.width) transforms.push(`w_${options.width}`);
  if (options.height) transforms.push(`h_${options.height}`);
  if (options.width && options.height) transforms.push('c_fill');

  return `https://res.cloudinary.com/${config.cloudName}/image/upload/${transforms.join(',')}/${publicId}`;
}
