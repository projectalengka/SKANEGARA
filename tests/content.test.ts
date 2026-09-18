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
