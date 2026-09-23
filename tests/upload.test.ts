/**
 * Unit tests — the upload rules, and the two things that silently broke them.
 *
 * ## Why this test exists
 *
 * The owner reported on 2026-09-24 that they could not upload a photograph. Two
 * separate faults were responsible, and neither produced a visible error:
 *
 *  1. **The Server Action body limit was 1 MB** while the form accepted 8 MB.
 *     Next.js rejects an oversized action body *before* the action runs, so the
 *     action's own error handling never saw it. The upload field sat on
 *     "Mengunggah…" indefinitely. Measured with a 1,5 MB PNG: HTTP 500 and an
 *     unhandled `Body exceeded 1 MB limit.`
 *  2. **The public site's header and footer were rendered by the root layout**,
 *     so every `/admin/*` page inherited them. The fixed site header landed on
 *     top of the dashboard sidebar — 2079 px² of overlap between the school's
 *     brand and the sidebar heading — and each dashboard page contained two
 *     `<main>` elements.
 *
 * Both are *relationships between two files*, which is exactly what typecheck,
 * lint and a build cannot see. A number in `next.config.ts` and a number in
 * `upload-limits.ts` can drift apart while every gate stays green; so can the
 * set of components the root layout renders. So both are asserted here.
 *
 * ## What is checked
 *
 *   1. `uploadError()` accepts what it should and rejects what it should, with
 *      the message the browser and the server both show.
 *   2. The action body limit leaves room for the whole multipart envelope, not
 *      just the file.
 *   3. The root layout renders no site chrome, and the public pages live inside
 *      the `(situs)` route group.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { UPLOAD_LIMITS, uploadError, uploadSizeLabel } from '../src/lib/upload-limits';

const rootUrl = new URL('../', import.meta.url);
const read = (relative: string) => readFileSync(new URL(relative, rootUrl), 'utf8');
const exists = (relative: string) => existsSync(new URL(relative, rootUrl));

/**
 * Source with comments removed.
 *
 * Assertions about what a file *renders* must not be satisfiable by what it
 * *says*: the first draft of these tests failed because `src/app/layout.tsx`
 * explains, in a comment, that the dashboard used to contain two `<main>`
 * elements — and a naive `/<main\b/` matched the prose. Comments are where the
 * reasoning lives in this project, so they are long by design, and a test that
 * reads them is a test that will keep lying.
 */
const code = (relative: string) =>
  read(relative)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // `://` is skipped so a URL in a string is not mistaken for a comment.
    .replace(/(^|[^:])\/\/[^\n]*/gm, '$1');

// ---------------------------------------------------------------------------
// 1. The rules themselves

describe('uploadError()', () => {
  const file = (size: number, type: string) => ({ size, type });

  it('accepts a file inside the limit', () => {
    assert.equal(uploadError(file(1024 * 1024, 'image/jpeg')), null);
    assert.equal(uploadError(file(UPLOAD_LIMITS.maxBytes, 'image/png')), null);
  });

  it('rejects an empty file', () => {
    assert.equal(uploadError(file(0, 'image/png')), 'Berkas kosong.');
  });

  it('rejects a file over the limit, naming the limit', () => {
    const message = uploadError(file(UPLOAD_LIMITS.maxBytes + 1, 'image/png'));
    assert.ok(message, 'a file one byte over the limit must be rejected');
    // The number in the message is derived from the limit, so it cannot say
    // "8 MB" while the limit is something else.
    assert.match(message, new RegExp(uploadSizeLabel().replace('.', '\\.')));
  });

  it('rejects a format that is not on the allow-list', () => {
    assert.equal(
      uploadError(file(1024, 'image/gif')),
      'Format gambar harus JPG, PNG, WebP, atau AVIF.',
    );
    assert.equal(uploadError(file(1024, 'application/pdf')), 'Format gambar harus JPG, PNG, WebP, atau AVIF.');
  });

  it('reports size before format, because that is what the user can act on', () => {
    // A 9 MB GIF breaks both rules. Naming the size is the more useful answer:
    // the format may well be a consequence of what produced the file.
    assert.match(String(uploadError(file(9 * 1024 * 1024, 'image/gif'))), /melebihi/);
  });
});

// ---------------------------------------------------------------------------
// 2. The action body limit must exceed what the form accepts

/** Reads `experimental.serverActions.bodySizeLimit` out of `next.config.ts`. */
function bodySizeLimitBytes(): number {
  const source = read('next.config.ts');
  const match = source.match(/bodySizeLimit:\s*'([^']+)'/);
  assert.ok(match, 'next.config.ts must set experimental.serverActions.bodySizeLimit');

  const value = (match[1] as string).trim().toLowerCase();
  const units: Record<string, number> = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 };
  const parsed = value.match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/);

  assert.ok(parsed, `could not read "${value}" as a byte size`);
  return Number(parsed[1]) * (units[parsed[2] as string] as number);
}

describe('the Server Action body limit', () => {
  it('is larger than the largest file the form accepts', () => {
    const limit = bodySizeLimitBytes();
    assert.ok(
      limit > UPLOAD_LIMITS.maxBytes,
      `bodySizeLimit (${limit} bytes) must exceed UPLOAD_LIMITS.maxBytes (${UPLOAD_LIMITS.maxBytes}) — ` +
        'the limit counts the multipart envelope, not just the file',
    );
  });

  it('is not so large that it stops being a control', () => {
    // Headroom for the envelope is a few hundred bytes of boundary and headers.
    // A limit many times the file cap would mean the file cap is not enforced by
    // the framework at all.
    assert.ok(
      bodySizeLimitBytes() <= UPLOAD_LIMITS.maxBytes * 2,
      'bodySizeLimit should be close to the file cap, not orders of magnitude above it',
    );
  });

  it('is documented, so the number is not a mystery', () => {
    const source = read('next.config.ts');
    // The *last* mention, which is the assignment itself — the comment above it
    // quotes `bodySizeLimit` from the Next.js source, so the first match would
    // slice the explanation off entirely.
    const assignment = source.lastIndexOf('bodySizeLimit:');
    assert.ok(assignment > 0, 'next.config.ts must set bodySizeLimit');

    const above = source.slice(Math.max(0, assignment - 1800), assignment);
    assert.match(above, /envelope|multipart/i, 'the headroom above the file cap must be explained');
  });
});

// ---------------------------------------------------------------------------
// 3. The public shell must not reach the dashboard

describe('the root layout', () => {
  const root = () => code('src/app/layout.tsx');

  it('renders no part of the public site shell', () => {
    for (const component of ['SiteHeader', 'SiteFooter', 'CustomCursor', 'SmoothScroll', 'RevealObserver']) {
      assert.ok(
        !root().includes(component),
        `src/app/layout.tsx renders ${component}; the root layout wraps /admin too, ` +
          'so the public shell must live in the (situs) group instead',
      );
    }
  });

  it('still renders <html> and <body>, which only the root layout may do', () => {
    assert.match(root(), /<html\b/);
    assert.match(root(), /<body\b/);
  });

  it('does not render a <main>, because each shell owns its own', () => {
    assert.ok(
      !/<main\b/.test(root()),
      "a <main> in the root layout would nest inside the dashboard's <main>",
    );
  });
});

describe('the public route group', () => {
  it('has a layout that renders the shared shell', () => {
    assert.ok(exists('src/app/(situs)/layout.tsx'), 'src/app/(situs)/layout.tsx is missing');
    assert.match(code('src/app/(situs)/layout.tsx'), /SiteShell/);
  });

  it('holds every public page', () => {
    const pages = [
      'page.tsx',
      'tentang/page.tsx',
      'program-keahlian/page.tsx',
      'program-keahlian/[slug]/page.tsx',
      'berita/page.tsx',
      'berita/[slug]/page.tsx',
      'galeri/page.tsx',
      'karya/page.tsx',
      'kegiatan/page.tsx',
      'kontak/page.tsx',
      'privasi/page.tsx',
    ];

    for (const page of pages) {
      assert.ok(exists(`src/app/(situs)/${page}`), `src/app/(situs)/${page} is missing`);
      assert.ok(
        !exists(`src/app/${page}`),
        `src/app/${page} still exists — a page outside the group would render without the site shell`,
      );
    }
  });

  it('keeps the dashboard outside the group', () => {
    assert.ok(!exists('src/app/(situs)/admin'), 'the dashboard must not be inside the public group');
    assert.ok(exists('src/app/admin/(dasbor)/layout.tsx'), 'the dashboard layout is missing');
  });
});
