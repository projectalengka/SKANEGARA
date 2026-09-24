/**
 * Unit tests — sample adoption.
 *
 * ## The bug these guard
 *
 * Sample content lives in `src/data/sample.ts` and never in Postgres, but the
 * dashboard listed those rows as ordinary records with an edit form. Saving one
 * ran `update({ where: { id: 'sample-work-1' } })` — a primary key that does not
 * exist — and the owner saw *"Terjadi kesalahan. Silakan coba lagi."* Measured on
 * 2026-09-24: six student-work rows in the database, every one a cuid, and
 * `sample-work-1` absent.
 *
 * So there are two things worth pinning: that a sample id is recognisable from
 * the id alone, and that the interface never offers an action which cannot work.
 * The second is a property of the source, so it is asserted against the source —
 * with comments stripped, because this project's reasoning lives in comments and
 * a naive match would be satisfied by the prose explaining the fix.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  SAMPLE_MARK,
  SAMPLE_SLUG_PREFIX,
  adoptableEventRows,
  adoptableGalleryRows,
  adoptableNewsRows,
  adoptableWorkRows,
  sampleEvents,
  sampleGallery,
  sampleNews,
  sampleStudentWork,
  unmark,
  unmarkSlug,
} from '../src/data/sample';
import { SAMPLE_ID_PREFIX, isSampleId } from '../src/lib/sample-id';
import { code } from './source';

describe('a sample row is recognisable from its id alone', () => {
  it('recognises every id the sample set hands out', () => {
    const ids = [
      ...sampleNews.map((row) => row.id),
      ...sampleEvents.map((row) => row.id),
      ...sampleGallery.map((row) => row.id),
      ...sampleStudentWork.map((row) => row.id),
    ];

    assert.ok(ids.length > 0, 'the sample set must not be empty');

    for (const id of ids) {
      assert.equal(isSampleId(id), true, `${id} must be recognised as sample content`);
    }
  });

  it('does not mistake a database id for sample content', () => {
    // The cuid values actually read out of the database on 2026-09-24.
    const databaseIds = ['cmued8s7u0009skf21rbq2ggb', 'cmued8s9x000askf2sgs2eorf', 'cmued8sby000bskf2unpwdsnt'];

    for (const id of databaseIds) {
      assert.equal(isSampleId(id), false, `${id} is a database row, not sample content`);
    }

    assert.equal(isSampleId(''), false, 'an empty id must not read as sample content');
  });

  it('builds every id from the one shared prefix', () => {
    // If the data used a literal and the predicate used the constant, changing
    // one would silently stop matching the other — and the original bug would
    // come straight back, because the dashboard would offer an edit form again.
    for (const id of [...sampleNews.map((row) => row.id), ...sampleEvents.map((row) => row.id)]) {
      assert.ok(id.startsWith(SAMPLE_ID_PREFIX), `${id} must start with ${SAMPLE_ID_PREFIX}`);
    }
  });
});

describe('unmark removes the mark from every place it appears', () => {
  it('strips a single mark', () => {
    assert.equal(unmark(`${SAMPLE_MARK} Visi sekolah`), 'Visi sekolah');
  });

  it('strips a mark from every paragraph, not only the first', () => {
    // News bodies and the school history carry one mark per paragraph, because a
    // reader can land mid-article. Slicing the prefix would leave the rest.
    const body = `${SAMPLE_MARK} Paragraf pertama.\n\n${SAMPLE_MARK} Paragraf kedua.`;
    const cleaned = unmark(body);

    assert.equal(cleaned.includes(SAMPLE_MARK), false, 'a reader would still see the mark mid-article');
    assert.ok(cleaned.includes('Paragraf pertama.'), 'the first paragraph must survive');
    assert.ok(cleaned.includes('Paragraf kedua.'), 'the second paragraph must survive');
  });

  it('leaves an unmarked value alone', () => {
    assert.equal(unmark('Kegiatan Belajar'), 'Kegiatan Belajar');
  });

  it('drops the self-announcing slug prefix', () => {
    assert.equal(unmarkSlug(`${SAMPLE_SLUG_PREFIX}pameran-bazar`), 'pameran-bazar');
    assert.equal(unmarkSlug('pameran-bazar'), 'pameran-bazar', 'an already-clean slug must not be touched');
  });
});

describe('adopted rows are the owner\'s content, not marked examples', () => {
  it('removes the mark from every field a reader sees', () => {
    const values = [
      ...adoptableWorkRows().flatMap((row) => [row.title, row.description]),
      ...adoptableGalleryRows().flatMap((row) => [row.title, row.description]),
      ...adoptableNewsRows().flatMap((row) => [row.title, row.excerpt, row.content, row.slug]),
      ...adoptableEventRows().flatMap((row) => [row.title, row.description, row.location, row.slug]),
    ];

    assert.ok(values.length > 0);

    for (const value of values) {
      assert.equal(value.includes(SAMPLE_MARK), false, `mark left behind: ${value.slice(0, 70)}`);
      assert.equal(
        value.includes(SAMPLE_SLUG_PREFIX),
        false,
        `slug prefix left behind: ${value.slice(0, 70)}`,
      );
    }
  });

  it('still attaches no student name', () => {
    for (const row of adoptableWorkRows()) {
      assert.equal(row.studentName, '', 'invented names are the rule most worth protecting');
    }
  });

  it('keeps every row of every collection', () => {
    assert.equal(adoptableWorkRows().length, sampleStudentWork.length);
    assert.equal(adoptableGalleryRows().length, sampleGallery.length);
    assert.equal(adoptableNewsRows().length, sampleNews.length);
    assert.equal(adoptableEventRows().length, sampleEvents.length);
  });

  it('hands out slugs that do not collide with each other', () => {
    // Both are `@unique` in the schema. A collision inside one batch would make
    // `createMany` fail and surface as the generic error — the failure mode this
    // whole change exists to remove.
    for (const rows of [adoptableNewsRows(), adoptableEventRows()]) {
      const slugs = rows.map((row) => row.slug);
      assert.equal(new Set(slugs).size, slugs.length, 'two adopted rows share a slug');
    }
  });

  it('points at the drawn plates, with no stored media behind them', () => {
    // Empty `publicId` is what makes deleting an adopted row safe: there is no
    // asset in the media table to remove, and nothing is left orphaned.
    const rows = [...adoptableWorkRows(), ...adoptableGalleryRows(), ...adoptableEventRows()];

    for (const row of rows) {
      assert.equal(row.publicId, '', `${row.title} must not claim a stored asset`);
      assert.ok(row.image.startsWith('/images/'), `${row.title} must point at a shipped plate`);
    }
  });

  it('carries real dates for news, so the archive still groups by month', () => {
    const articles = adoptableNewsRows();
    assert.ok(articles.every((row) => row.createdAt instanceof Date));
    assert.ok(articles.some((row) => row.publishedAt instanceof Date));

    const months = new Set(articles.map((row) => row.publishedAt?.toISOString().slice(0, 7) ?? ''));
    assert.ok(months.size >= 2, 'the archive page groups by month; one group never exercises it');
  });
});

/**
 * The interface half of the fix.
 *
 * These read the source rather than rendering it, which is weaker — so they are
 * written to fail loudly if the guard is removed, and `code()` strips comments
 * first. Without that, the comment explaining the bug would satisfy the search
 * for the fix.
 */
describe('the dashboard cannot offer an edit that has no row behind it', () => {
  const managers = [
    ['karya', 'src/components/admin/managers/StudentWorkManager.tsx'],
    ['galeri', 'src/components/admin/managers/GalleryManager.tsx'],
    ['berita', 'src/components/admin/managers/NewsManager.tsx'],
    ['kegiatan', 'src/components/admin/managers/EventManager.tsx'],
  ] as const;

  for (const [collection, path] of managers) {
    it(`${collection}: badges a sample row instead of offering to edit it`, () => {
      const source = code(path);

      assert.ok(source.includes('isSampleId('), `${path} must test whether a row is sample content`);
      assert.ok(source.includes('SampleRowBadge'), `${path} must badge a sample row`);
      assert.ok(
        source.includes(`collection="${collection}"`),
        `${path} must render the adoption panel for its own collection`,
      );
    });
  }

  it('refuses a sample id in every save action, not only in the interface', () => {
    // A guard that lives only in the UI is one hand-typed URL away from failing,
    // and the news edit screen is reachable by URL.
    const refusals = code('src/app/admin/content-actions.ts').match(/sampleRowRefusal\(id\)/g) ?? [];

    assert.equal(
      refusals.length,
      4,
      'news, gallery, student work and events must each refuse a sample id before updating',
    );
  });

  it('adopts through the shared row builders rather than copying the sample set', () => {
    const source = code('src/app/admin/content-actions.ts');

    for (const helper of [
      'adoptableWorkRows',
      'adoptableGalleryRows',
      'adoptableNewsRows',
      'adoptableEventRows',
    ]) {
      assert.ok(source.includes(`${helper}(`), `the action must adopt through ${helper}`);
    }
  });

  it('says nothing when there is nothing to adopt', () => {
    // Measured on the built site: the first version returned the panel
    // unconditionally, and `/admin/galeri` rendered *"0 foto contoh ini menjadi
    // milik Anda"*. Gallery legitimately has no sample rows — its seed captions
    // are finished copy, so the sample set never stands in for it — which makes
    // it the collection that proves the guard has to live in the component
    // rather than in four call sites that each have to remember it.
    assert.ok(
      code('src/components/admin/SampleContentPanel.tsx').includes('if (count === 0) return null;'),
      'the adoption panel must guard against an empty count inside itself',
    );
  });

  it('hides unfinished rows from every public read, and from none of the dashboard reads', () => {
    const uses = code('src/lib/content.ts').match(/withoutUnfinished\(mapped\)/g) ?? [];

    assert.equal(
      uses.length,
      4,
      'news, gallery, works and events must each filter placeholder-titled rows on the public branch — ' +
        'otherwise the first real work published drags six placeholder cards onto the public page',
    );
  });
});
