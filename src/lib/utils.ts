/**
 * Small shared helpers. Nothing here has a dependency on the database, the
 * session, or the DOM, so it is safe to import from any layer.
 */

/**
 * Turns a title into a URL slug.
 *
 * Handles the case a naive `replace(/\s+/g, '-')` gets wrong: Indonesian titles
 * carry punctuation that should not end up in a URL. The double hyphen collapse
 * matters because `"Desain — Karya"` would otherwise produce `desain---karya`,
 * and `"PPDB 2026/2027"` would produce a slug with a slash, which breaks the
 * route entirely.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 96);
}

/** Formats a date the Indonesian way: `18 September 2026`. */
export function formatDateId(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(date);
}

/** Formats a date with its time, for event listings. */
export function formatDateTimeId(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(date);
}

/** ISO string for a `datetime` attribute, or empty. */
export function toDateTimeAttribute(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

/**
 * Estimates reading time in Indonesian.
 *
 * 200 words per minute is the usual figure for adults reading prose.
 */
export function readingMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Truncates on a word boundary, so an excerpt never ends mid-word. */
export function truncate(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;

  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut}…`;
}

/** Two-digit index used by the editorial layouts: `01`, `02`, … */
export function padIndex(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Joins class names, dropping falsy entries.
 *
 * A full `clsx` dependency is not worth 400 bytes here — every call site uses
 * the same two shapes.
 */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

/**
 * Escapes a string for safe inclusion in an XML or RSS document.
 *
 * Used by the sitemap and by any structured data built from user content.
 */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Returns the site's canonical origin, with no trailing slash.
 *
 * Order of preference, and the reason for each step:
 *
 *  1. `NEXT_PUBLIC_SITE_URL` — explicit always wins. This is what a custom domain
 *     should set.
 *  2. Vercel's own URLs — needed because a preview deployment whose canonical
 *     tags all point at localhost is worse than one with none: it actively tells
 *     search engines the real page lives somewhere unreachable. The *production*
 *     URL is preferred over the deployment URL so previews do not self-canonicalise
 *     and compete with production.
 *  3. Localhost, for development.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');

  const vercel =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;

  return 'http://localhost:3000';
}

/**
 * Absolute URL for a path, for canonical tags, Open Graph and the sitemap.
 *
 * Idempotent for values that are already absolute. That case is not
 * hypothetical: every image the administrator uploads is a fully-qualified
 * Cloudinary URL, and a bare concatenation turned it into
 * `https://site.comhttps://res.cloudinary.com/…` — a broken Open Graph image
 * and a broken `NewsArticle.image`, with nothing thrown to say so. Call sites
 * can now hand this whatever the content layer gives them.
 */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${siteUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Formats a phone number for a `tel:` link, keeping a leading `+`. */
export function telHref(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');
  return cleaned ? `tel:${cleaned}` : '';
}

/** Builds a WhatsApp deep link from a local number. */
export function whatsappHref(number: string, message?: string): string {
  const digits = number.replace(/\D/g, '');
  if (!digits) return '';
  const normalised = digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
  const query = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${normalised}${query}`;
}
