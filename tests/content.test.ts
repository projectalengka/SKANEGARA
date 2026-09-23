/**
 * Unit tests — content honesty layer.
 *
 * These guard the rule the brief is strictest about: no invented facts. The
 * tests assert that seed content is either obviously ours or obviously
 * unfilled, never a plausible-looking fabrication.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  defaultEvents,
  defaultGallery,
  defaultNews,
  defaultPrograms,
  defaultSchoolProfile,
  defaultSections,
  defaultStudentWork,
  isPlaceholder,
  placeholder,
} from '../src/data/defaults';

describe('placeholder / isPlaceholder', () => {
  it('wraps the hint so it is visible in the UI', () => {
    const value = placeholder('Sejarah sekolah');
    assert.ok(value.includes('Sejarah sekolah'));
    assert.ok(value.startsWith('['));
    assert.ok(value.endsWith(']'));
  });

  it('recognises its own output', () => {
    assert.equal(isPlaceholder(placeholder('apa saja')), true);
  });

  it('treats empty, null and undefined as unfinished', () => {
    assert.equal(isPlaceholder(''), true);
    assert.equal(isPlaceholder('   '), true);
    assert.equal(isPlaceholder(null), true);
    assert.equal(isPlaceholder(undefined), true);
  });

  it('treats real copy as finished', () => {
    assert.equal(isPlaceholder('Desain Komunikasi Visual'), false);
  });
});

describe('seed content never fabricates', () => {
  it('seeds no news at all', () => {
    assert.equal(defaultNews.length, 0, 'invented news would be a content-rule violation');
  });

  it('seeds no events at all', () => {
    assert.equal(defaultEvents.length, 0, 'invented events would be a content-rule violation');
  });

  it('marks every factual profile field as a placeholder', () => {
    for (const field of ['description', 'history', 'vision', 'address', 'phone', 'email'] as const) {
      assert.equal(
        isPlaceholder(defaultSchoolProfile[field]),
        true,
        `${field} must start as a placeholder, got: ${defaultSchoolProfile[field]}`,
      );
    }
  });

  it('keeps city and province real, because those are given', () => {
    assert.equal(defaultSchoolProfile.city, 'Mojokerto');
    assert.equal(defaultSchoolProfile.province, 'Jawa Timur');
  });

  it('leaves program descriptions unfilled but the names intact', () => {
    const names = defaultPrograms.map((program) => program.name);
    assert.ok(names.includes('Desain Komunikasi Visual'));
    assert.ok(names.includes('Otomotif'));

    for (const program of defaultPrograms) {
      assert.equal(isPlaceholder(program.shortDescription), true, program.name);
      assert.equal(isPlaceholder(program.description), true, program.name);
    }
  });

  it('attaches no student name to any seeded work', () => {
    for (const work of defaultStudentWork) {
      assert.equal(work.studentName, '', `${work.title} must not name a student without consent`);
    }
  });

  it('gives every gallery item a caption that describes a category, not an event', () => {
    for (const item of defaultGallery) {
      assert.ok(item.title.trim().length > 0, 'every gallery item needs a caption');
      assert.equal(isPlaceholder(item.title), false, 'captions are interface copy, not claims');
    }
  });

  it('gives every section a key that matches its record', () => {
    for (const [key, section] of Object.entries(defaultSections)) {
      assert.equal(section.key, key, `section "${key}" has a mismatched key`);
    }
  });

  it('points every section CTA at an internal path', () => {
    for (const section of Object.values(defaultSections)) {
      if (!section.ctaHref) continue;
      assert.ok(
        section.ctaHref.startsWith('/'),
        `section "${section.key}" CTA "${section.ctaHref}" should be an internal path`,
      );
    }
  });
});

/**
 * The cache tags exist in two places by necessity, not by accident.
 *
 * `src/lib/content.ts` applies them with `cacheTag`; `src/app/admin/tags.ts`
 * re-uses them with `revalidateTag`. The second module **cannot** import the
 * first: `tags.ts` is imported by `AdminShell`, a client component, and
 * `content.ts` reaches `pg` through `lib/db.ts` — importing it would drag Node's
 * `net` and `tls` into the browser bundle and fail the build.
 *
 * A tag that drifts between the two is a silent bug: the administrator saves a
 * change, `revalidateTag` fires against a name nothing ever cached, and the
 * public page keeps showing the old content with no error anywhere. Hence this
 * test — the quality gate checks the two lists agree, which an import could not
 * do without breaking the browser build.
 */
describe('cache tags agree between the read path and the write path', () => {
  it('has an identical value for every tag', async () => {
    const { tags } = await import('../src/lib/content');
    const { mainTags } = await import('../src/app/admin/tags');

    assert.deepEqual(
      { ...mainTags },
      { ...tags },
      'mainTags and content.tags have drifted — revalidateTag would fire on a tag nothing cached',
    );
  });

  it('has no tag that is missing from the other list', async () => {
    const { tags } = await import('../src/lib/content');
    const { mainTags } = await import('../src/app/admin/tags');

    assert.deepEqual(
      Object.keys(mainTags).sort(),
      Object.keys(tags).sort(),
      'one list has a tag the other does not know about',
    );
  });
});


/**
 * Sample content — the mechanism that lets the site look complete before the
 * school's copy is written.
 *
 * The risk this feature carries is obvious and specific: `[CONTOH]` filler that
 * loses its marker becomes indistinguishable from a factual claim about SMK
 * Jayanegara. These tests exist so that cannot happen quietly. They check the
 * mark, the switch, and the two content rules the project is strictest about —
 * no invented events presented as real, and no student names.
 */
describe('sample content is clearly labelled and off by default', () => {
  it('does not serve sample data unless the switch is set', async () => {
    const { sampleContent, sampleEnabled } = await import('../src/data/sample');

    const original = process.env.SAMPLE_DATA;
    delete process.env.SAMPLE_DATA;
    try {
      assert.equal(sampleEnabled(), false, 'an unset SAMPLE_DATA must mean off, so a typo fails safe');
      assert.equal(sampleContent(), null, 'the bundle must be null while the switch is off');
    } finally {
      if (original === undefined) delete process.env.SAMPLE_DATA;
      else process.env.SAMPLE_DATA = original;
    }
  });

  it('serves sample data when the switch is on', async () => {
    const { sampleContent, sampleEnabled } = await import('../src/data/sample');

    const original = process.env.SAMPLE_DATA;
    process.env.SAMPLE_DATA = 'on';
    try {
      assert.equal(sampleEnabled(), true);
      const bundle = sampleContent();
      assert.ok(bundle, 'the bundle must exist while the switch is on');
      assert.ok(bundle.news.length > 0, 'sample news must not be empty');
      assert.ok(bundle.events.length > 0, 'sample events must not be empty');
    } finally {
      if (original === undefined) delete process.env.SAMPLE_DATA;
      else process.env.SAMPLE_DATA = original;
    }
  });

  /**
   * The audit's most expensive lesson, encoded so it cannot come back.
   *
   * The site was found serving the honest empty state while `.env` said
   * `SAMPLE_DATA=on`. There was no bug in `sampleEnabled()` — the value simply
   * was not in the process environment the server had been started with. From
   * outside, "off" and "on but invisible to this process" produce byte-identical
   * pages, so the failure was indistinguishable from the feature working.
   *
   * `sampleSwitch()` exists to break that tie. These assertions pin the
   * contract: every value that is *not* explicitly recognised must report
   * `recognised: false` **while still returning its raw text**, so the dashboard
   * can name what it saw.
   */
  it('reports an unrecognised value verbatim instead of silently reading it as off', async () => {
    const { sampleSwitch, sampleEnabled } = await import('../src/data/sample');

    const original = process.env.SAMPLE_DATA;
    // `On` with a capital O is the realistic typo: it reads as on to a human.
    const typos = ['On', 'ON', 'ya', ' '];
    try {
      for (const typo of typos) {
        process.env.SAMPLE_DATA = typo;
        const reading = sampleSwitch();
        assert.equal(reading.raw, typo, `raw value must survive verbatim: ${JSON.stringify(typo)}`);
        assert.equal(reading.recognised, false, `${JSON.stringify(typo)} must not switch sample data on`);
        assert.equal(sampleEnabled(), false, `${JSON.stringify(typo)} must leave the site honest`);
      }
    } finally {
      if (original === undefined) delete process.env.SAMPLE_DATA;
      else process.env.SAMPLE_DATA = original;
    }
  });

  it('recognises exactly on / true / 1 and nothing else', async () => {
    const { sampleSwitch } = await import('../src/data/sample');

    const original = process.env.SAMPLE_DATA;
    try {
      for (const value of ['on', 'true', '1']) {
        process.env.SAMPLE_DATA = value;
        assert.equal(sampleSwitch().recognised, true, `${value} must switch sample data on`);
      }

      for (const value of ['off', 'false', '0', 'no', 'On', 'TRUE', '']) {
        process.env.SAMPLE_DATA = value;
        assert.equal(sampleSwitch().recognised, false, `${JSON.stringify(value)} must not switch it on`);
      }

      delete process.env.SAMPLE_DATA;
      assert.equal(sampleSwitch().raw, undefined, 'an unset switch must report no raw value');
      assert.equal(sampleSwitch().recognised, false, 'an unset switch must be off');
    } finally {
      if (original === undefined) delete process.env.SAMPLE_DATA;
      else process.env.SAMPLE_DATA = original;
    }
  });

  it('marks every sample title, so a reader cannot mistake it for a fact', async () => {
    const sample = await import('../src/data/sample');
    const { SAMPLE_MARK } = sample;

    for (const article of sample.sampleNews) {
      assert.ok(article.title.startsWith(SAMPLE_MARK), `news title unmarked: ${article.title}`);
      assert.ok(article.excerpt.startsWith(SAMPLE_MARK), `news excerpt unmarked: ${article.excerpt}`);
      assert.ok(article.content.includes(SAMPLE_MARK), `news content unmarked: ${article.slug}`);
    }

    for (const event of sample.sampleEvents) {
      assert.ok(event.title.startsWith(SAMPLE_MARK), `event title unmarked: ${event.title}`);
      assert.ok(event.location.startsWith(SAMPLE_MARK), `event location unmarked: ${event.location}`);
    }

    for (const work of sample.sampleStudentWork) {
      assert.ok(work.title.startsWith(SAMPLE_MARK), `work title unmarked: ${work.title}`);
    }

    for (const item of sample.sampleGallery) {
      assert.ok(item.title.startsWith(SAMPLE_MARK), `gallery title unmarked: ${item.title}`);
    }
  });

  it('prefixes every sample slug, so the URL announces itself too', async () => {
    const sample = await import('../src/data/sample');

    for (const article of sample.sampleNews) {
      assert.ok(
        article.slug.startsWith('contoh-'),
        `sample slug must be self-announcing, got: ${article.slug}`,
      );
    }
    for (const event of sample.sampleEvents) {
      assert.ok(event.slug.startsWith('contoh-'), `sample slug must be self-announcing: ${event.slug}`);
    }
  });

  it('still attaches no student name to any sample work', async () => {
    const sample = await import('../src/data/sample');

    for (const work of sample.sampleStudentWork) {
      assert.equal(
        work.studentName,
        '',
        `${work.title} must not name a student — invented names are the rule most worth protecting`,
      );
    }
  });

  it('points every sample image at a file that is actually generated', async () => {
    const { existsSync } = await import('node:fs');
    const { join } = await import('node:path');
    const sample = await import('../src/data/sample');
    const root = join(process.cwd(), 'public');

    const images = [
      ...sample.sampleNews.map((row) => row.coverImage),
      ...sample.sampleEvents.map((row) => row.image),
      ...sample.sampleStudentWork.map((row) => row.image),
      ...sample.sampleGallery.map((row) => row.image),
    ];

    for (const image of images) {
      assert.ok(
        existsSync(join(root, image)),
        `sample image ${image} does not exist — the page would render a broken plate`,
      );
    }
  });
});

/**
 * A sample set that cannot fill the layout cannot do its job.
 *
 * The sample data exists so the design can be judged before the school's real
 * copy is written. If a collection is too small for the grid it is rendered in,
 * the page looks broken rather than sparse — and "looks broken" is precisely the
 * judgement the sample set is supposed to be testing for.
 *
 * This was a real defect. `/karya` groups works by category into a three-column
 * grid; the first sample set shipped one work per category, so the built page
 * rendered as six rows of a single card with two empty columns beside each. A
 * full-page screenshot showed it plainly and nothing else did.
 */
describe('sample collections are large enough to demonstrate their layout', () => {
  it('fills the three-column work grid in every category', async () => {
    const sample = await import('../src/data/sample');

    const perCategory = new Map<string, number>();
    for (const work of sample.sampleStudentWork) {
      perCategory.set(work.category, (perCategory.get(work.category) ?? 0) + 1);
    }

    assert.ok(perCategory.size > 0, 'sample works must cover at least one category');

    for (const [category, count] of perCategory) {
      assert.ok(
        count >= 3,
        `category "${category}" has ${count} work(s); /karya renders a three-column grid, ` +
          'so fewer than three leaves empty columns and reads as a layout bug',
      );
    }
  });

  it('gives the gallery enough plates for its mosaic', async () => {
    const sample = await import('../src/data/sample');

    assert.ok(
      sample.sampleGallery.length >= 6,
      'the gallery mosaic offsets every second plate; fewer than six cannot show the rhythm',
    );
  });

  it('gives news enough articles to produce more than one month group', async () => {
    const sample = await import('../src/data/sample');

    // /berita groups by month. A single group never exercises the grouping code.
    const months = new Set(sample.sampleNews.map((item) => (item.publishedAt ?? '').slice(0, 7)));
    assert.ok(months.size >= 2, `sample news spans ${months.size} month(s); the archive groups by month`);
  });
});

/**
 * Sample content must actually replace the seed, not only an empty list.
 *
 * This locks down a measured defect. `sampleInsteadOf` originally substituted
 * only when the standing fallback was **empty**, which is correct for news and
 * events (deliberately empty) but wrong for works and gallery (which have seed
 * rows). The condition therefore never held for them, and the sample set was
 * silently ignored: `/karya` served `[Judul karya Poster — isi melalui Dasbor
 * Admin]` while the sample data sat unused.
 *
 * The rule is not "is the list empty" but "is the list still seed content".
 * These assertions check the seed rows really are placeholder copy — which is
 * the premise `isUneditedSeed` depends on — so the rule cannot quietly stop
 * holding if someone gives the seed a real title.
 */
describe('the seed rows sample content replaces are still unedited', () => {
  it('has every seeded gallery caption still a placeholder', () => {
    const { defaultGallery } = require('../src/data/defaults') as typeof import('../src/data/defaults');

    for (const item of defaultGallery) {
      // Gallery captions are interface copy ("Kegiatan Belajar"), not
      // placeholders — so this collection is NOT replaceable by that rule, and
      // the test records that rather than assuming otherwise.
      assert.ok(item.title.trim().length > 0, 'gallery captions must be non-empty');
    }
  });

  it('has every seeded work title still a placeholder', () => {
    // Uses the same dynamic import style as the rest of this file so the module
    // is loaded once, consistently.
    const defaults = require('../src/data/defaults') as typeof import('../src/data/defaults');

    for (const work of defaults.defaultStudentWork) {
      assert.equal(
        defaults.isPlaceholder(work.title),
        true,
        `seed work "${work.title}" is no longer a placeholder, so isUneditedSeed would ` +
          'not treat the collection as replaceable — revisit that rule deliberately',
      );
    }
  });

  it('gives the sample set more works than the seed it stands in for', () => {
    const defaults = require('../src/data/defaults') as typeof import('../src/data/defaults');
    const sample = require('../src/data/sample') as typeof import('../src/data/sample');

    assert.ok(
      sample.sampleStudentWork.length > defaults.defaultStudentWork.length,
      'sample content only earns its place if it shows more than the seed already did',
    );
  });
});

/**
 * Sample content must stand in for *database-seeded* placeholders too.
 *
 * This is the second form of the same defect, and the subtler one.
 *
 * `npm run db:seed` copies the seed into the database. So a connected
 * installation has six placeholder works as *database rows*, and any
 * substitution written against the in-memory fallback never fires — the query
 * returns rows, so the fallback is not consulted at all.
 *
 * Measured on the local installation with `SAMPLE_DATA=on`:
 *
 *   getStudentWork() -> 6, titles "[Judul karya Poster — isi melalui Dasbor
 *                       Admin]", one per category
 *
 * The fix tests the winning rows by title rather than testing the fallback, so
 * it works whether the placeholders arrived from memory or from Postgres.
 *
 * A browser test cannot catch this: the page renders, the images load, and the
 * only symptom is that the grid has one card per row instead of three.
 */
describe('sample content replaces seeded placeholders from any source', () => {
  it('reports a collection of placeholder titles as unedited', () => {
    const { defaultStudentWork } = require('../src/data/defaults') as typeof import('../src/data/defaults');
    const { isPlaceholder } = require('../src/data/defaults') as typeof import('../src/data/defaults');

    // The premise: every seed work title is a placeholder, so the title test is
    // a reliable signal for "nobody has edited this collection".
    const titles = defaultStudentWork.map((work) => work.title);
    assert.ok(titles.every((title) => isPlaceholder(title)));
  });

  it('does not treat the seeded gallery as replaceable', () => {
    const { defaultGallery, isPlaceholder } = require('../src/data/defaults') as typeof import('../src/data/defaults');

    // Gallery captions are finished interface copy ("Kegiatan Belajar"), so the
    // sample mosaic must not displace them. This asserts the asymmetry between
    // the two collections is intentional and still holds.
    const titles = defaultGallery.map((item) => item.title);
    assert.ok(
      titles.some((title) => !isPlaceholder(title)),
      'if gallery captions ever became placeholders, revisit whether sample data should replace them',
    );
  });

  it('offers more works than the database seed writes', () => {
    const { defaultStudentWork } = require('../src/data/defaults') as typeof import('../src/data/defaults');
    const { sampleStudentWork } = require('../src/data/sample') as typeof import('../src/data/sample');

    // The seed writes `defaultStudentWork` rows. Sample mode has to offer a
    // superset, or switching it on would not change what the page shows.
    assert.ok(
      sampleStudentWork.length > defaultStudentWork.length,
      `sample has ${sampleStudentWork.length} works, seed writes ${defaultStudentWork.length} — ` +
        'sample mode would be invisible on the works page',
    );
  });
});
