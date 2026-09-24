/**
 * Unit tests — image storage lives in the project's own database.
 *
 * ## Why this test exists
 *
 * Uploads used to go to Cloudinary. That needed a third account and three
 * credentials before a single photograph could be uploaded, and on 2026-09-24
 * the cost of that friction was measured: months in, the credentials were still
 * empty, so the feature had **never once worked**. The owner's report — "I cannot
 * upload an image and have it appear on the homepage" — was, in the end, a
 * description of that.
 *
 * The replacement stores the bytes in Postgres, in a `MediaAsset` table beside
 * the content. The decision is easy to state and easy to undo by accident: a
 * later contributor adding one `remotePattern` entry, or restoring one import,
 * would silently give the project two possible destinations for an image.
 *
 * ## What is checked
 *
 *   1. `mediaUrl()` produces the path the route handler actually serves.
 *   2. `formatBytes()` reports sizes the way a person reads them.
 *   3. `isMediaStorageConfigured()` tracks `DATABASE_URL` and rejects a value
 *      that is set but is not a Postgres URL.
 *   4. The Cloudinary path is gone — module, package, import, and the
 *      `next.config.ts` host allowance.
 *   5. The route handler caches immutably and answers 404 for an unknown id.
 *   6. The `MediaAsset` model stores the bytes, and the rules are re-checked on
 *      the server rather than trusted from the browser.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { code, exists, read, sourceFiles } from './source';
import { formatBytes, isMediaStorageConfigured, mediaUrl } from '../src/lib/media';

// ---------------------------------------------------------------------------
// 1. The URL contract

describe('mediaUrl()', () => {
  it('builds the path the route handler serves', () => {
    assert.equal(mediaUrl('clx1a2b3c'), '/api/media/clx1a2b3c');
  });

  it('is relative, not absolute', () => {
    // The hostname differs between development, preview and production, and a
    // URL with one baked in would be wrong on the other two — and would also
    // defeat `next/image`, which optimises same-origin paths locally.
    assert.ok(!/^https?:/i.test(mediaUrl('abc')), 'the media URL must be same-origin');
    assert.ok(mediaUrl('abc').startsWith('/'));
  });

  it('does not double up slashes for an id that is already a path fragment', () => {
    // Not a supported input, but the failure mode of a naive join is a URL that
    // looks almost right and 404s, which is the worst kind of bug to chase.
    assert.equal(mediaUrl('a/b'), '/api/media/a/b');
  });
});

// ---------------------------------------------------------------------------
// 2. The size label

describe('formatBytes()', () => {
  it('uses bytes, kilobytes and megabytes, in that order', () => {
    assert.equal(formatBytes(0), '0 B');
    assert.equal(formatBytes(999), '999 B');
    assert.equal(formatBytes(1024), '1 KB');
    assert.equal(formatBytes(1024 * 1024), '1.0 MB');
    assert.equal(formatBytes(1024 * 1024 * 3.5), '3.5 MB');
  });

  it('rounds kilobytes to whole numbers, because decimals there are noise', () => {
    // 1536 bytes is 1.5 KB, and "2 KB" is a more useful answer than "1.5 KB" in
    // a storage report where the megabytes are what matter.
    assert.equal(formatBytes(1536), '2 KB');
  });

  it('does not round a megabyte down to zero', () => {
    // 1 048 576 bytes is exactly 1 MB; a truncating implementation would print
    // "1.0 MB" here and "0 B" one byte below the boundary.
    assert.equal(formatBytes(1024 * 1024 - 1), '1024 KB');
  });
});

// ---------------------------------------------------------------------------
// 3. The configuration switch

describe('isMediaStorageConfigured()', () => {
  it('follows DATABASE_URL, and refuses a value that is not Postgres', () => {
    const original = process.env.DATABASE_URL;

    try {
      delete process.env.DATABASE_URL;
      assert.equal(isMediaStorageConfigured(), false, 'no database means no uploads');

      process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/db';
      assert.equal(isMediaStorageConfigured(), true);

      // A placeholder is the realistic failure: the variable exists, so a naive
      // truthiness check says "configured", and every upload then fails at the
      // first query with a message about the connection rather than the config.
      process.env.DATABASE_URL = 'https://example.com/not-a-database';
      assert.equal(isMediaStorageConfigured(), false, 'a non-Postgres value is not a database');

      process.env.DATABASE_URL = '   ';
      assert.equal(isMediaStorageConfigured(), false, 'whitespace is not a database');
    } finally {
      if (original === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = original;
    }
  });
});

// ---------------------------------------------------------------------------
// 4. The Cloudinary path is gone

describe('the Cloudinary backend', () => {
  it('has no module left', () => {
    assert.ok(
      !exists('src/lib/cloudinary.ts'),
      'src/lib/cloudinary.ts still exists — an image would have two possible destinations',
    );
  });

  it('is not a dependency', () => {
    assert.ok(
      !/"cloudinary"\s*:/.test(read('package.json')),
      'the cloudinary package is still declared — nothing imports it, so it is only weight',
    );
  });

  it('is not importable from any source file', () => {
    // The generated Prisma client embeds the schema — including the comment that
    // explains this migration — so it is excluded. Every hand-written file is
    // checked, because one restored import is all it takes.
    for (const file of sourceFiles('src', { exclude: ['src/generated'] })) {
      const source = code(file);
      assert.ok(!/from\s+['"]cloudinary['"]/.test(source), `${file} imports the cloudinary SDK`);
      assert.ok(
        !/['"]@\/lib\/cloudinary['"]/.test(source),
        `${file} imports the deleted @/lib/cloudinary`,
      );
    }
  });

  it('is not an allowed image host in next.config.ts', () => {
    // `code()` and not `read()`: the entry was replaced by a comment explaining
    // *why* it is gone, and an assertion against the raw file would fail on that
    // prose. The first run of this test did exactly that.
    assert.ok(
      !code('next.config.ts').includes('res.cloudinary.com'),
      'next.config.ts still allows images from res.cloudinary.com, a host this project no longer uses',
    );
  });
});

// ---------------------------------------------------------------------------
// 5. The route handler

describe('the media route handler', () => {
  const route = 'src/app/api/media/[id]/route.ts';

  it('exists at the path mediaUrl() returns', () => {
    assert.ok(exists(route), `${route} is missing — every stored image would 404`);
    // The folder names are the URL segments. If `mediaUrl()` were changed to a
    // different prefix without moving this file, the mismatch would produce a
    // 404 on every image, and nothing else in the suite would notice.
    assert.match(code('src/lib/media.ts'), /['"`]\/api\/media\//);
  });

  it('caches immutably, because an asset never changes once it is written', () => {
    // The id is generated when the bytes are written and the bytes are never
    // modified; a replacement is a new row with a new id. That is exactly what
    // `immutable` describes, and it is why this design needs no CDN.
    assert.match(code(route), /immutable/, 'the route must cache immutably');
  });

  it('declares the stored content type instead of letting the browser sniff', () => {
    assert.match(code(route), /Content-Type/, 'the route must set Content-Type');
    assert.match(
      code(route),
      /X-Content-Type-Options/,
      'these bytes were uploaded by an administrator and are replayed back — sniffing must be off',
    );
  });

  it('answers 404 for an unknown id rather than throwing', () => {
    // A deleted image is a normal event (the row that referenced it was removed
    // first), so it must not be a 500.
    assert.match(code(route), /404/, 'an unknown id must produce a 404');
  });

  it('awaits its route params', () => {
    // Next 16 hands route params over as a promise. Reading `params.id` without
    // awaiting it yields a promise, and the query then runs with a promise as
    // the id — which fails at runtime, not at typecheck.
    assert.match(code(route), /await\s+params/);
  });
});

// ---------------------------------------------------------------------------
// 6. The model and the server-side rules

describe('the MediaAsset model', () => {
  const model = () => {
    const body = read('prisma/schema.prisma').match(/model\s+MediaAsset\s*\{([\s\S]*?)^\}/m);
    assert.ok(body, 'schema.prisma must declare a MediaAsset model');
    return body[1] as string;
  };

  it('stores the bytes in the database', () => {
    assert.match(model(), /^\s*data\s+Bytes/m, 'the image bytes must be a Bytes column');
  });

  it('keeps its own byte count', () => {
    // `bytes` duplicates `octet_length(data)` on purpose: it makes the storage
    // report one indexed aggregate instead of a scan that pulls every
    // photograph into memory in order to measure it.
    assert.match(model(), /^\s*bytes\s+Int/m);
  });

  it('is not indexed, because nothing queries it by anything but id', () => {
    assert.ok(
      !model().includes('@@index'),
      'an index nothing uses is a write cost on every upload — and the migration would need one too',
    );
  });

  it('re-checks the upload rules on the server', () => {
    // The browser's check is a courtesy: the same request can be made with
    // `curl`. `uploadError()` must also run where the bytes are actually stored.
    assert.match(read('src/lib/media.ts'), /uploadError\(/, 'media.ts must re-validate on the server');
  });

  it('is created by a migration', () => {
    // schema.prisma is the source of truth and the migration is a separate
    // artefact derived from it; `db:deploy` against a missing migration exits
    // successfully having done nothing.
    assert.ok(
      exists('prisma/migrations/20260924000000_add_media_asset/migration.sql'),
      'the MediaAsset migration is missing — a deployed database would have no media table',
    );
  });
});

// ---------------------------------------------------------------------------
// 7. The upload field and the server actions must agree on field names

/**
 * Every `ImageUploadField` usage, with the `name` it was given.
 *
 * The prop is read from source rather than from a rendered page because the
 * question is about a *pair* of files, and a rendered page only shows one of
 * them.
 */
function uploadFieldNames(): Array<{ file: string; name: string }> {
  const found: Array<{ file: string; name: string }> = [];

  for (const file of sourceFiles('src/components/admin/managers')) {
    for (const match of code(file).matchAll(/<ImageUploadField\b[\s\S]{0,300}?\bname="(\w+)"/g)) {
      found.push({ file, name: match[1] as string });
    }
  }

  return found;
}

describe('the upload field and the server actions agree on field names', () => {
  it('emits exactly the two hidden inputs the actions read', () => {
    const field = code('src/components/admin/FormFields.tsx');

    // These two lines are the whole contract. `ImageUploadField name="image"`
    // produces an `image` input holding the URL and an `imagePublicId` input
    // holding the asset id; every action must read both under those names.
    assert.ok(
      field.includes('name={`${name}`}'),
      'the upload field must emit a hidden input named after its `name` prop',
    );
    assert.ok(
      field.includes('name={`${name}PublicId`}'),
      'the upload field must emit a hidden input named `${name}PublicId`',
    );
  });

  it('reads the public id under the name the upload field actually emits', () => {
    const fields = uploadFieldNames();
    assert.ok(
      fields.length > 0,
      'no ImageUploadField was found in src/components/admin/managers — the scan is broken, not the code',
    );

    const actions = code('src/app/admin/content-actions.ts');

    /*
     * Dihitung per nama, bukan sekadar "string-nya ada di suatu tempat".
     *
     * Tiga manajer memakai `name="image"`, jadi satu kemunculan saja sudah
     * memuaskan `includes()` walaupun salah satu dari tiga action berhenti
     * membacanya. Itu persis bentuk bug yang sedang dijaga di sini: dua dari
     * tiga action memang rusak sementara yang ketiga benar, sehingga versi
     * pertama uji ini lulus pada kode yang salah.
     */
    const usages = new Map<string, number>();
    for (const { name } of fields) usages.set(name, (usages.get(name) ?? 0) + 1);

    for (const [name, expected] of usages) {
      const needle = `read(formData, '${name}PublicId')`;
      const actual = actions.split(needle).length - 1;

      assert.equal(
        actual,
        expected,
        `${expected} manager memakai ImageUploadField name="${name}", jadi content-actions.ts ` +
          `harus membaca "${name}PublicId" sebanyak ${expected} kali — yang terbaca ${actual}.\n\n` +
          'Terukur 2026-09-24: action galeri dan karya siswa membaca `publicId`, sehingga id aset ' +
          'tersimpan sebagai string kosong untuk setiap unggahan. `deleteImage()` dijaga oleh ' +
          '`if (existing.publicId)`, jadi ia tidak pernah berjalan — setiap foto yang diganti ' +
          'atau dihapus tinggal di basis data selamanya. `npm run media:bersihkan` melaporkan ' +
          'empat aset uji dengan "dirujuk konten: 0", dan begitulah ini ditemukan.',
      );
    }
  });
});

