import { readImage } from '@/lib/media';

/**
 * Serves one stored image.
 *
 * ## Why a route handler and not a data URL
 *
 * The bytes live in Postgres, so something has to hand them to the browser. A
 * `data:` URL would inline the whole photograph into every page that shows it —
 * the homepage carries six — which would bloat the HTML, defeat `next/image`
 * entirely, and make the browser re-download the image on every navigation
 * instead of reusing its cache.
 *
 * A URL is also what the rest of the application already expects: the database
 * columns store a URL, the admin forms store a URL, and `next/image` wants one.
 * Keeping that contract is why swapping the storage backend touched one file.
 *
 * ## The cache headers are the interesting part
 *
 * `immutable` is honest here, and it is the reason this design does not need a
 * CDN. An asset's id is generated when the bytes are written, the bytes are
 * never modified, and a replacement is a *new* row with a new id — so a URL can
 * never point at different content than it did a moment ago. That is exactly the
 * condition `immutable` describes, and it lets the browser, and Vercel's edge,
 * serve a photograph for a year without asking again.
 *
 * `X-Content-Type-Options: nosniff` matters more here than on a static file
 * server: these bytes were uploaded by an administrator and are being replayed
 * back, so the browser must take the declared `Content-Type` and not go looking
 * for something more interesting in the payload.
 */
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  // Next 16 hands route params over as a promise; the await is required.
  const { id } = await params;

  const asset = await readImage(id);
  if (!asset) {
    return new Response('Gambar tidak ditemukan.', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // The bytes are handed over as they came out of the database. `readImage()`
  // has already narrowed them to a plain `Uint8Array`, which is a valid body —
  // wrapping them in another `Uint8Array` here would copy the whole photograph
  // on every request for no reason.
  return new Response(asset.data, {
    headers: {
      'Content-Type': asset.mimeType,
      'Content-Length': String(asset.bytes),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
