/**
 * Unit tests — the database verification script.
 *
 * `scripts/verify-db.ts` is the only place that checks the *live* database, and
 * by design it never runs in CI without credentials. That makes it easy to
 * weaken accidentally: someone tidies the output, drops a check, and the
 * content rule quietly stops being enforced at the database layer — which is
 * the one layer the rest of the test suite cannot see.
 *
 * These tests read the script's source and assert it still asks the questions
 * that matter. They are cheap, and they mean the guard cannot be removed
 * without a red test.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { defaultEvents, defaultNews } from '../src/data/defaults';

const source = readFileSync(new URL('../scripts/verify-db.ts', import.meta.url), 'utf8');

describe('verify-db enforces the content rule', () => {
  it('asserts news and events are empty, not merely readable', () => {
    // The whole point: a non-zero count here means somebody invented school
    // news or an agenda. That must be a failure, not a note.
    assert.match(
      source,
      /check\('berita kosong',\s*n\('berita'\) === 0/,
      'verify-db must assert the news table is empty',
    );
    assert.match(
      source,
      /check\('kegiatan kosong',\s*n\('kegiatan'\) === 0/,
      'verify-db must assert the events table is empty',
    );
  });

  it('still matches the seed, which seeds neither', () => {
    // If the seed ever starts writing news or events, this test and the
    // verification script would disagree — and the disagreement is the signal.
    assert.equal(defaultNews.length, 0, 'the seed must not invent news');
    assert.equal(defaultEvents.length, 0, 'the seed must not invent events');
  });

  it('checks every table is readable, so a missing migration is caught', () => {
    for (const table of ['schoolProfile', 'program', 'news', 'galleryItem', 'event', 'studentWork', 'siteSection']) {
      assert.ok(
        source.includes(`prisma.${table}.count()`),
        `verify-db must probe ${table} — a table that is never read cannot reveal a missing migration`,
      );
    }
  });
});

describe('verify-db proves the overlay actually overlays', () => {
  it('calls readOrFallback with a sentinel that cannot be confused for real data', () => {
    // The sentinel is how the script distinguishes "the database answered" from
    // "the fallback answered". A plausible default would hide a broken query.
    assert.match(source, /readOrFallback\(/, 'verify-db must exercise the overlay path');
    assert.match(source, /-999/, 'the fallback sentinel must be obviously not-real');
    assert.match(
      source,
      /viaFallback !== -999/,
      'verify-db must assert the database answered rather than the fallback',
    );
  });
});

describe('verify-db fails loudly', () => {
  it('exits non-zero on failure so it can gate a deploy', () => {
    assert.match(source, /process\.exitCode = 1/, 'a failed verification must set a non-zero exit code');
  });

  it('explains the Supabase two-port setup when the connection fails', () => {
    // Connection errors are the most likely thing a first-time deployer hits,
    // and the pooler/direct split is the least obvious cause.
    assert.match(source, /pooler 6543/, 'the error must mention the pooler port');
    assert.match(source, /langsung 5432/, 'the error must mention the direct port');
  });

  it('does not print a success summary when there are failures', () => {
    assert.match(
      source,
      /failures === 0[\s\S]{0,200}?jalur basis data sehat/,
      'the health summary must be conditional on zero failures',
    );
  });
});

/**
 * Prisma 7 tidak lagi memuat `.env` sendiri.
 *
 * Ini pernah benar-benar memakan waktu: `npm run db:deploy` gagal dengan
 * `Error: Connection url is empty` padahal `.env` terisi lengkap, karena
 * berkasnya tidak pernah dibaca. Pesan itu menuduh hal yang salah, dan
 * penyebabnya tidak terlihat dari perintahnya.
 *
 * Tiga berkas harus memuatnya sendiri: `prisma.config.ts` (untuk CLI),
 * `prisma/seed.ts`, dan `scripts/verify-db.ts` (keduanya dijalankan `tsx`
 * langsung, di luar jalur konfigurasi itu). Melewatkan salah satunya membuat
 * satu perintah gagal sementara dua lainnya bekerja — gejala yang membingungkan.
 */
describe('setiap skrip memuat .env sendiri', () => {
  const files = [
    ['prisma.config.ts', new URL('../prisma.config.ts', import.meta.url)],
    ['prisma/seed.ts', new URL('../prisma/seed.ts', import.meta.url)],
    ['scripts/verify-db.ts', new URL('../scripts/verify-db.ts', import.meta.url)],
  ] as const;

  for (const [label, url] of files) {
    it(`${label} memanggil dotenv`, () => {
      const body = readFileSync(url, 'utf8');
      assert.match(
        body,
        /from 'dotenv'/,
        `${label} harus mengimpor dotenv — Prisma 7 tidak memuat .env sendiri`,
      );
      assert.match(
        body,
        /loadEnv\(\{|config\(\{/,
        `${label} harus benar-benar memanggil pemuatnya, bukan hanya mengimpornya`,
      );
    });

    it(`${label} tidak menimpa variabel yang sudah ada di shell`, () => {
      const body = readFileSync(url, 'utf8');
      assert.match(
        body,
        /override:\s*false/,
        `${label} harus memakai override:false supaya variabel dari shell menang — ` +
          'kalau tidak, perintah dengan kredensial sementara akan menyentuh basis data yang salah',
      );
    });
  }
});

/**
 * `.gitignore` harus menutup **semua** varian `.env`, bukan daftar nama.
 *
 * Daftar nama satu per satu pernah gagal di proyek ini: `.env.lokal` dan
 * `.env.produksi` tidak masuk daftar, padahal keduanya dipakai untuk menyimpan
 * kredensial Supabase sungguhan. Berkas yang
 * tidak diabaikan tidak memunculkan galat apa pun — ia hanya diam-diam
 * terunggah ke GitHub.
 *
 * Uji ini membaca `.gitignore` sebagai teks (tanpa memanggil git, supaya tetap
 * jalan di lingkungan mana pun) dan memastikan:
 *   1. Ada pola `*` yang menutup varian apa pun, bukan daftar nama tetap.
 *   2. `.env.example` dikecualikan kembali, karena ia memang dibagikan.
 */
describe('.gitignore menutup semua varian .env', () => {
  const ignore = readFileSync(new URL('../.gitignore', import.meta.url), 'utf8');
  const lines = ignore.split('\n').map((l) => l.trim());

  it('memakai pola wildcard, bukan daftar nama satu per satu', () => {
    assert.ok(
      lines.includes('.env.*'),
      '.gitignore harus memuat `.env.*` — daftar nama tetap akan melewatkan ' +
        'varian baru seperti `.env.lokal` atau `.env.produksi`, tanpa galat apa pun',
    );
  });

  it('tetap melacak .env.example, karena isinya memang dibagikan', () => {
    assert.ok(
      lines.includes('!.env.example'),
      '`.env.example` harus dikembalikan dengan `!` — tanpanya, pola `.env.*` ' +
        'ikut mengabaikannya dan templat variabel hilang dari repositori',
    );
  });

  it('tidak memakai daftar nama tetap untuk berkas rahasia', () => {
    // Kalau seseorang mengembalikan daftar nama satu per satu, uji ini gagal.
    const fixedNames = lines.filter((l) => /^\.env\.(local|development|test|production)$/.test(l));
    assert.deepEqual(
      fixedNames,
      [],
      'jangan kembali ke daftar nama tetap; pola `.env.*` sudah menutup semuanya',
    );
  });
});
