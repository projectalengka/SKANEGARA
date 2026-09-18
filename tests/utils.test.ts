/**
 * Unit tests — text utilities.
 *
 * Run with `npm test` (which is `tsx --test tests/*.test.ts`).
 *
 * These cover the small pure functions the whole site leans on. They are the
 * cheapest possible place to catch a regression: a broken `slugify` silently
 * produces dead URLs, and a broken date formatter prints "Invalid Date" on
 * every news card without ever throwing.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatDateId,
  formatDateTimeId,
  padIndex,
  readingMinutes,
  slugify,
  truncate,
} from '../src/lib/utils';

describe('slugify', () => {
  it('lowercases and hyphenates spaces', () => {
    assert.equal(slugify('Desain Komunikasi Visual'), 'desain-komunikasi-visual');
  });

  it('strips punctuation but keeps the words', () => {
    assert.equal(slugify('Kunjungan Industri 2025!'), 'kunjungan-industri-2025');
    assert.equal(slugify('PPDB (Penerimaan Peserta Didik Baru)'), 'ppdb-penerimaan-peserta-didik-baru');
  });

  it('collapses runs of non-alphanumerics into a single hyphen', () => {
    assert.equal(slugify('a---b___c   d'), 'a-b-c-d');
  });

  it('never leaves a leading or trailing hyphen', () => {
    assert.equal(slugify('  --Halo--  '), 'halo');
    assert.equal(slugify('!!!'), '');
  });

  it('turns a slash into a hyphen but keeps both sides', () => {
    // "UI/UX" is the ordinary Indonesian-industry spelling, and `ui-ux-design`
    // is the slug the site actually wants — the separator reads better than the
    // gluing `uiux-design` would.
    assert.equal(slugify('UI/UX Design'), 'ui-ux-design');
  });

  it('keeps digits', () => {
    assert.equal(slugify('Kelas X RPL 3'), 'kelas-x-rpl-3');
  });

  it('handles diacritics and non-latin scripts without throwing', () => {
    assert.doesNotThrow(() => slugify('Café — naïve'));
    assert.doesNotThrow(() => slugify('日本語のテキスト'));
  });

  it('caps length so a long title cannot overflow a URL column', () => {
    const long = 'kata '.repeat(60);
    assert.ok(slugify(long).length <= 97, 'slug should be truncated to ~96 chars');
  });

  it('is idempotent', () => {
    const once = slugify('Praktik Kerja Lapangan di Industri Kreatif');
    assert.equal(slugify(once), once);
  });
});

describe('formatDateId', () => {
  it('formats in Indonesian', () => {
    const result = formatDateId('2025-08-17T00:00:00.000Z');
    assert.match(result, /Agustus/i);
    assert.match(result, /2025/);
  });

  it('returns empty string for null and undefined', () => {
    assert.equal(formatDateId(null), '');
    assert.equal(formatDateId(undefined), '');
  });

  it('returns empty string for an unparseable value rather than "Invalid Date"', () => {
    assert.equal(formatDateId('bukan-tanggal'), '');
  });

  it('accepts a Date instance', () => {
    const result = formatDateId(new Date('2025-01-01T00:00:00.000Z'));
    assert.match(result, /2025/);
  });
});

describe('formatDateTimeId', () => {
  it('includes both a date and a time', () => {
    const result = formatDateTimeId('2025-08-17T03:00:00.000Z');
    assert.match(result, /2025/);
    assert.match(result, /\d{2}[.:]\d{2}/, 'should contain an hour and minute');
  });

  it('returns empty string for invalid input', () => {
    assert.equal(formatDateTimeId('nope'), '');
  });
});

describe('readingMinutes', () => {
  it('never returns less than one minute for real text', () => {
    assert.equal(readingMinutes('Satu kalimat pendek.'), 1);
  });

  it('returns at least one minute for empty text so the label never reads "0 menit"', () => {
    assert.ok(readingMinutes('') >= 1);
  });

  it('grows with length', () => {
    const short = readingMinutes('kata '.repeat(50));
    const long = readingMinutes('kata '.repeat(2000));
    assert.ok(long > short);
  });
});

describe('truncate', () => {
  it('leaves short text untouched', () => {
    assert.equal(truncate('Halo dunia', 40), 'Halo dunia');
  });

  it('cuts long text and appends an ellipsis', () => {
    const result = truncate('a'.repeat(100), 20);
    assert.ok(result.endsWith('…'));
    // The ellipsis is *additional* to the budget, not counted inside it — the
    // result is `max` visible characters plus the marker. Asserting `<= 20`
    // here would have encoded the opposite of what the function does.
    assert.equal(result.length, 21);
  });

  it('cuts on a word boundary rather than mid-word', () => {
    const result = truncate('kata '.repeat(30), 21);
    assert.ok(result.endsWith('…'));
    assert.ok(!result.includes('kat…'), 'should not leave a partial word');
  });

  it('does not leave a dangling space before the ellipsis', () => {
    assert.ok(!truncate('kata '.repeat(30), 21).includes(' …'));
  });
});

describe('padIndex', () => {
  it('pads single digits', () => {
    assert.equal(padIndex(1), '01');
    assert.equal(padIndex(9), '09');
  });

  it('leaves double digits alone', () => {
    assert.equal(padIndex(10), '10');
  });
});
