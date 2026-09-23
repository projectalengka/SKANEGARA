/**
 * What an image upload is allowed to be — stated once, for both sides.
 *
 * ## Why this is its own module
 *
 * The rules used to live in `src/lib/cloudinary.ts`, next to the code that
 * enforces them on the server. That was fine while the server was the only
 * caller. It stopped being fine the moment the browser needed to apply the same
 * rules *before* sending anything: importing `cloudinary.ts` from a client
 * component would pull the Cloudinary SDK — and the credentials it reads — into
 * the browser bundle.
 *
 * So the numbers live here, with no imports at all, and both sides read them
 * from here. There is exactly one definition of "8 MB", and a change to it
 * cannot reach one side and miss the other.
 *
 * ## Why the client checks at all
 *
 * Not for security — the server re-checks everything, because a browser's
 * `accept` attribute and a size check in JavaScript are conveniences, not
 * controls. The client checks so that an oversized or wrong-format file produces
 * a sentence in Indonesian immediately, instead of a round trip that ends in a
 * rejected request.
 */

/** The largest file the form will accept, and the largest the server will store. */
export const UPLOAD_LIMITS = {
  maxBytes: 8 * 1024 * 1024,
  mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
} as const;

/** The `accept` attribute for the file input. Derived, never typed twice. */
export const UPLOAD_ACCEPT = UPLOAD_LIMITS.mimeTypes.join(',');

/** The size cap written the way it is spoken: "8 MB". */
export function uploadSizeLabel(): string {
  return `${Math.round(UPLOAD_LIMITS.maxBytes / (1024 * 1024))} MB`;
}

/** The hint under the file input. */
export const UPLOAD_HINT = `JPG, PNG, WebP, atau AVIF. Maksimal ${uploadSizeLabel()}.`;

/**
 * Checks a file against the rules and returns the reason it is unacceptable, or
 * `null` when it is fine.
 *
 * Returning the message rather than a boolean keeps the wording in one place:
 * the same sentence is shown by the browser and returned by the server action,
 * so the administrator never sees two different explanations for one problem.
 *
 * Takes a structural type rather than `File` because the server side receives a
 * `File` from `FormData` and the tests pass plain objects.
 */
export function uploadError(file: { size: number; type: string }): string | null {
  if (file.size === 0) return 'Berkas kosong.';
  if (file.size > UPLOAD_LIMITS.maxBytes) {
    return `Ukuran gambar melebihi ${uploadSizeLabel()}.`;
  }
  if (!UPLOAD_LIMITS.mimeTypes.includes(file.type as (typeof UPLOAD_LIMITS.mimeTypes)[number])) {
    return 'Format gambar harus JPG, PNG, WebP, atau AVIF.';
  }
  return null;
}
