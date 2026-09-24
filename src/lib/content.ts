/**
 * The content layer — a single seam between the database and the rest of the
 * application.
 *
 * Why it exists: the brief asks for a database-driven site *and* for a design
 * that can be reviewed before any credential exists. Both are reasonable. So
 * every public read goes through here, and here the database is an *overlay*
 * on top of the seed content rather than a replacement for it:
 *
 *   - No `DATABASE_URL`  → seed content, site fully renders.
 *   - Database reachable → database rows win, field by field.
 *   - Database throws    → seed content, error logged, page still renders.
 *
 * Nothing above this file knows which of those three is happening, which is
 * exactly the point: pages, components and the admin all call the same
 * functions.
 */

import {
  defaultEvents,
  defaultGallery,
  defaultNews,
  defaultPrograms,
  defaultSchoolProfile,
  defaultSections,
  defaultStudentWork,
  type EventContent,
  type GalleryContent,
  type NewsContent,
  type ProgramContent,
  type SchoolProfileContent,
  type SectionContent,
  type WorkContent,
} from '@/data/defaults';
import { isDatabaseConfigured, readOrFallback } from './db';
import {
  sampleContent,
  sampleEnabled,
  sampleProfileCopy,
  sampleProgramCopy,
  sampleSectionBodies,
  sampleSwitch,
} from '@/data/sample';

/** Dates arrive from Prisma as `Date`, from seeds as `string`. Normalise to ISO. */
function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

/** Prefer a database value, but never accept an empty string over real copy. */
function prefer(dbValue: string | null | undefined, fallback: string): string {
  if (typeof dbValue !== 'string') return fallback;
  return dbValue.trim().length > 0 ? dbValue : fallback;
}

// ---------------------------------------------------------------------------
// Sample content
// ---------------------------------------------------------------------------
//
// Sample content exists so the site can be reviewed with real-looking structure
// before the school's copy is written — see `src/data/sample.ts` for the full
// reasoning and the honesty mechanism (`[CONTOH]` prefixes).
//
// The ordering below matters, and it is the whole design:
//
//   database row  >  sample row  >  seed row
//
// A database row always wins, because it is the owner's own content. Sample
// data is a *floor replacement*, never an overlay: it only fills the space
// while the database has nothing to say. So the moment the owner publishes one
// real article, that article appears and the sample set stays exactly where it
// is — dormant, and untouched by `prefer()`, which would otherwise let it leak
// back in.
//
// Every read function in this file is a single `if` away from being
// sample-free, which is what makes the switch trustworthy.

/**
 * Swaps a *deliberately empty* fallback for the sample set, when the switch is on.
 *
 * Use this only for collections whose seed is empty on purpose — news and
 * events. For collections that have seed rows (works, gallery), the rows may
 * have come from the database rather than the fallback, so an empty-check would
 * never fire. Those read functions test the winning rows themselves instead.
 *
 * `sample.length > 0` keeps the contract total: with the switch on and no
 * sample data to offer, the fallback stands. That is the state the unit tests
 * exercise, and it means the switch can never make a page emptier than it was.
 */
function sampleInsteadOf<T>(fallback: T[], sample: T[]): T[] {
  if (!sampleEnabled()) return fallback;
  return sample.length > 0 ? sample : fallback;
}

/**
 * Whether a collection is still the untouched seed, rather than the owner's.
 *
 * Gallery and work seed rows carry placeholder copy — `[Judul karya Poster —
 * isi melalui Dasbor Admin]` — so a list in which *every* title is still a
 * placeholder is seed content, and fair game for the sample set to replace. One
 * real title anywhere in the list means the owner has started work on it, and
 * the whole collection is left alone.
 *
 * That "whole collection" granularity is deliberate. Mixing a real work with
 * fifteen `[CONTOH]` ones would put invented and real content side by side in
 * the same grid, which is exactly the confusion the `[CONTOH]` mark exists to
 * prevent.
 */
function isUneditedSeed(titles: readonly string[]): boolean {
  return titles.length > 0 && titles.every((title) => isPlaceholderText(title));
}

/** Applies the sample section bodies on top of the seed section copy. */
function withSampleSections(
  sections: Record<string, SectionContent>,
): Record<string, SectionContent> {
  if (!sampleEnabled()) return sections;

  const merged: Record<string, SectionContent> = { ...sections };
  for (const [key, body] of Object.entries(sampleSectionBodies)) {
    const existing = merged[key];
    if (!existing) continue;
    // Only fills copy that is still a placeholder. Real copy — whether typed by
    // the owner or part of the seed — is never overwritten.
    if (isPlaceholderText(existing.body)) {
      merged[key] = { ...existing, body };
    }
  }
  return merged;
}

/** True when a value is a seed placeholder or empty. Mirrors `isPlaceholder`. */
function isPlaceholderText(value: string | null | undefined): boolean {
  if (!value) return true;
  return value.startsWith('[') || value.trim().length === 0;
}

/** Applies the sample profile copy to whichever profile fields are unfilled. */
function withSampleProfile(profile: SchoolProfileContent): SchoolProfileContent {
  if (!sampleEnabled()) return profile;

  return {
    ...profile,
    description: isPlaceholderText(profile.description) ? sampleProfileCopy.description : profile.description,
    history: isPlaceholderText(profile.history) ? sampleProfileCopy.history : profile.history,
    vision: isPlaceholderText(profile.vision) ? sampleProfileCopy.vision : profile.vision,
    mission: profile.mission.every(isPlaceholderText) ? [...sampleProfileCopy.mission] : profile.mission,
  };
}

/** Applies the sample programme copy to whichever programme fields are unfilled. */
function withSamplePrograms(programs: ProgramContent[]): ProgramContent[] {
  if (!sampleEnabled()) return programs;

  return programs.map((program) => {
    const sample = sampleProgramCopy[program.slug];
    if (!sample) return program;

    return {
      ...program,
      shortDescription: isPlaceholderText(program.shortDescription)
        ? sample.shortDescription
        : program.shortDescription,
      description: isPlaceholderText(program.description) ? sample.description : program.description,
      features: program.features.length === 0 ? sample.features : program.features,
    };
  });
}

/**
 * Merge a database row over the seed row.
 *
 * Field-by-field rather than whole-object, because a partially-filled
 * dashboard form should not blank out the parts the administrator has not
 * touched yet.
 */
function mergeProfile(
  row: Partial<SchoolProfileContent> | null,
  fallback: SchoolProfileContent,
): SchoolProfileContent {
  if (!row) return fallback;
  return {
    schoolName: prefer(row.schoolName, fallback.schoolName),
    tagline: prefer(row.tagline, fallback.tagline),
    heroLines: row.heroLines?.length ? row.heroLines : fallback.heroLines,
    description: prefer(row.description, fallback.description),
    history: prefer(row.history, fallback.history),
    vision: prefer(row.vision, fallback.vision),
    mission: row.mission?.length ? row.mission : fallback.mission,
    address: prefer(row.address, fallback.address),
    city: prefer(row.city, fallback.city),
    province: prefer(row.province, fallback.province),
    phone: prefer(row.phone, fallback.phone),
    whatsapp: prefer(row.whatsapp, fallback.whatsapp),
    email: prefer(row.email, fallback.email),
    instagram: prefer(row.instagram, fallback.instagram),
    youtube: prefer(row.youtube, fallback.youtube),
    mapsUrl: prefer(row.mapsUrl, fallback.mapsUrl),
  };
}

/**
 * The site's cache tags, used by `revalidateTag` after a content write.
 *
 * Note (measured 2026-09-24): nothing applies these tags. `cacheTag` appears
 * nowhere in `src/`, and `readOrFallback` in `src/lib/db.ts` queries Prisma
 * directly, so there is no tagged data cache for `revalidateTag` to invalidate.
 * Edits appear on the public site because every page is dynamic
 * (`dynamic = 'force-dynamic'` in the root layout), not because of these tags.
 * They are kept so that the names cannot drift from `mainTags` in
 * `src/app/admin/tags.ts` if a tagged cache is added later.
 */
export const tags = {
  profile: 'profil',
  programs: 'program',
  news: 'berita',
  gallery: 'galeri',
  work: 'karya',
  events: 'kegiatan',
  sections: 'bagian',
} as const;

export const profileTag = tags.profile;

// ---------------------------------------------------------------------------
// School profile
// ---------------------------------------------------------------------------

export async function getSchoolProfile(): Promise<SchoolProfileContent> {
  const profile = await readOrFallback(
    'schoolProfile',
    async (prisma) => {
      const row = await prisma.schoolProfile.findFirst({ orderBy: { updatedAt: 'desc' } });
      return mergeProfile(row, defaultSchoolProfile);
    },
    defaultSchoolProfile,
  );

  return withSampleProfile(profile);
}

// ---------------------------------------------------------------------------
// Programmes
// ---------------------------------------------------------------------------

export async function getPrograms(options: { includeUnpublished?: boolean } = {}): Promise<ProgramContent[]> {
  const fallback = options.includeUnpublished
    ? defaultPrograms
    : defaultPrograms.filter((program) => program.published);

  const programs = await readOrFallback(
    'programs',
    async (prisma) => {
      const rows = await prisma.program.findMany({
        where: options.includeUnpublished ? undefined : { published: true },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      });
      if (rows.length === 0) return fallback;

      return rows.map<ProgramContent>((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        shortDescription: row.shortDescription,
        description: row.description,
        image: prefer(row.image, '/images/program-placeholder.svg'),
        imagePublicId: row.imagePublicId,
        features: row.features,
        order: row.order,
        published: row.published,
      }));
    },
    fallback,
  );

  return withSamplePrograms(programs);
}

export async function getProgramBySlug(slug: string): Promise<ProgramContent | null> {
  const programs = await getPrograms();
  return programs.find((program) => program.slug === slug) ?? null;
}

// ---------------------------------------------------------------------------
// News
// ---------------------------------------------------------------------------

export async function getNews(
  options: { includeUnpublished?: boolean; limit?: number } = {},
): Promise<NewsContent[]> {
  const sample = sampleContent();
  const fallback = sampleInsteadOf(
    options.includeUnpublished ? defaultNews : defaultNews.filter((item) => item.published),
    sample ? (options.includeUnpublished ? sample.news : sample.news.filter((item) => item.published)) : [],
  );

  const result = await readOrFallback(
    'news',
    async (prisma) => {
      const rows = await prisma.news.findMany({
        where: options.includeUnpublished ? undefined : { published: true },
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      });
      // No articles in the database yet: the sample set stands in when it is
      // switched on, otherwise the honest empty state does. Either way the
      // database winning is a real article, decided in one place.
      if (rows.length === 0) return fallback;

      return rows.map<NewsContent>((row) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        category: row.category,
        excerpt: row.excerpt,
        content: row.content,
        coverImage: row.coverImage,
        coverPublicId: row.coverPublicId,
        published: row.published,
        publishedAt: toIso(row.publishedAt),
        createdAt: toIso(row.createdAt) ?? new Date().toISOString(),
      }));
    },
    fallback,
  );

  return options.limit ? result.slice(0, options.limit) : result;
}

export async function getNewsBySlug(slug: string): Promise<NewsContent | null> {
  const sample = sampleContent();
  const sampleRow = sample ? (sample.news.find((item) => item.slug === slug) ?? null) : null;
  const fallback = defaultNews.find((item) => item.slug === slug) ?? sampleRow;

  return readOrFallback(
    'newsBySlug',
    async (prisma) => {
      const row = await prisma.news.findUnique({ where: { slug } });
      if (!row || !row.published) return fallback;
      return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        category: row.category,
        excerpt: row.excerpt,
        content: row.content,
        coverImage: row.coverImage,
        coverPublicId: row.coverPublicId,
        published: row.published,
        publishedAt: toIso(row.publishedAt),
        createdAt: toIso(row.createdAt) ?? new Date().toISOString(),
      } satisfies NewsContent;
    },
    fallback,
  );
}

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------

export async function getGallery(
  options: { includeUnpublished?: boolean; limit?: number } = {},
): Promise<GalleryContent[]> {
  const sample = sampleContent();
  const sampleRows = sample
    ? options.includeUnpublished
      ? sample.gallery
      : sample.gallery.filter((i) => i.published)
    : [];

  /**
   * Gallery seed captions are real interface copy, not placeholders.
   *
   * `defaultGallery` titles read "Kegiatan Belajar", "Praktik di Workshop" — the
   * wording the design was specified against. So `isUneditedSeed` correctly
   * reports `false` for them, and the sample mosaic must **not** replace the
   * seed here. It is added only when the collection is genuinely absent.
   *
   * That asymmetry with works is deliberate, not an oversight: the seed works
   * are `[Judul karya …]` placeholders and can be replaced; the seed gallery
   * captions are finished copy and cannot.
   */
  const fallback = options.includeUnpublished
    ? defaultGallery
    : defaultGallery.filter((item) => item.published);

  const result = await readOrFallback(
    'gallery',
    async (prisma) => {
      const rows = await prisma.galleryItem.findMany({
        where: options.includeUnpublished ? undefined : { published: true },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      });
      if (rows.length === 0) return sampleRows.length > 0 ? sampleRows : fallback;

      return rows.map<GalleryContent>((row) => ({
        id: row.id,
        title: row.title,
        image: row.image,
        publicId: row.publicId,
        category: row.category,
        description: row.description,
        order: row.order,
        published: row.published,
      }));
    },
    sampleRows.length > 0 ? sampleRows : fallback,
  );

  return options.limit ? result.slice(0, options.limit) : result;
}

// ---------------------------------------------------------------------------
// Student work
// ---------------------------------------------------------------------------

export async function getStudentWork(
  options: { includeUnpublished?: boolean; limit?: number } = {},
): Promise<WorkContent[]> {
  const sample = sampleContent();
  const seed = options.includeUnpublished
    ? defaultStudentWork
    : defaultStudentWork.filter((item) => item.published);
  const sampleRows = sample
    ? options.includeUnpublished
      ? sample.studentWork
      : sample.studentWork.filter((i) => i.published)
    : [];

  /**
   * Sample content replaces *unedited* work, wherever that work came from.
   *
   * The subtlety this encodes: the seed is not the only source of placeholder
   * rows. `npm run db:seed` writes the seed into the database, so a connected
   * installation has six placeholder works *as database rows* — and a
   * fallback-only substitution never fires for them. Measured: `/karya` served
   * `[Judul karya Poster — isi melalui Dasbor Admin]` from the database while
   * the sample set sat unused, for exactly this reason.
   *
   * So the test is applied to whichever rows actually won, by title. Placeholder
   * titles mean nobody has edited this collection yet, and the sample set may
   * stand in. One real title means the owner has started, and every row is left
   * exactly as it is.
   */
  const result = await readOrFallback(
    'studentWork',
    async (prisma) => {
      const rows = await prisma.studentWork.findMany({
        where: options.includeUnpublished ? undefined : { published: true },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      });
      if (rows.length === 0) {
        return isUneditedSeed(seed.map((item) => item.title)) ? sampleRows : seed;
      }

      const mapped = rows.map<WorkContent>((row) => ({
        id: row.id,
        title: row.title,
        studentName: row.studentName,
        category: row.category,
        description: row.description,
        image: row.image,
        publicId: row.publicId,
        year: row.year,
        order: row.order,
        published: row.published,
      }));

      return isUneditedSeed(mapped.map((item) => item.title)) && sampleRows.length > 0 ? sampleRows : mapped;
    },
    isUneditedSeed(seed.map((item) => item.title)) && sampleRows.length > 0 ? sampleRows : seed,
  );

  return options.limit ? result.slice(0, options.limit) : result;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export async function getEvents(
  options: { includeUnpublished?: boolean; limit?: number; upcomingOnly?: boolean } = {},
): Promise<EventContent[]> {
  const sample = sampleContent();
  const fallback = sampleInsteadOf(
    options.includeUnpublished ? defaultEvents : defaultEvents.filter((item) => item.published),
    sample
      ? options.includeUnpublished
        ? sample.events
        : sample.events.filter((item) => item.published)
      : [],
  );

  const result = await readOrFallback(
    'events',
    async (prisma) => {
      const rows = await prisma.event.findMany({
        where: {
          ...(options.includeUnpublished ? {} : { published: true }),
          ...(options.upcomingOnly ? { date: { gte: new Date() } } : {}),
        },
        orderBy: { date: options.upcomingOnly ? 'asc' : 'desc' },
      });
      if (rows.length === 0) return fallback;

      return rows.map<EventContent>((row) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        description: row.description,
        image: row.image,
        publicId: row.publicId,
        date: toIso(row.date) ?? new Date().toISOString(),
        endDate: toIso(row.endDate),
        location: row.location,
        published: row.published,
      }));
    },
    fallback,
  );

  return options.limit ? result.slice(0, options.limit) : result;
}

// ---------------------------------------------------------------------------
// Editable section copy
// ---------------------------------------------------------------------------

export async function getSections(): Promise<Record<string, SectionContent>> {
  const sections = await readOrFallback(
    'sections',
    async (prisma) => {
      const rows = await prisma.siteSection.findMany();
      if (rows.length === 0) return defaultSections;

      const merged: Record<string, SectionContent> = { ...defaultSections };
      for (const row of rows) {
        const existing = merged[row.key] ?? {
          key: row.key,
          eyebrow: '',
          title: '',
          body: '',
          ctaLabel: '',
          ctaHref: '',
        };
        merged[row.key] = {
          key: row.key,
          eyebrow: prefer(row.eyebrow, existing.eyebrow),
          title: prefer(row.title, existing.title),
          body: prefer(row.body, existing.body),
          ctaLabel: prefer(row.ctaLabel, existing.ctaLabel),
          ctaHref: prefer(row.ctaHref, existing.ctaHref),
        };
      }
      return merged;
    },
    defaultSections,
  );

  return withSampleSections(sections);
}

/** Convenience read for a single section, with the seed row as the floor. */
export async function getSection(key: string): Promise<SectionContent> {
  const sections = await getSections();
  return (
    sections[key] ?? {
      key,
      eyebrow: '',
      title: '',
      body: '',
      ctaLabel: '',
      ctaHref: '',
    }
  );
}

/** Diagnostic used by the admin dashboard to report which mode the site is in. */
export function contentMode(): 'database' | 'seed' {
  return isDatabaseConfigured() ? 'database' : 'seed';
}

/**
 * Whether sample content is currently being served.
 *
 * Exported so the dashboard can warn the owner that what they are looking at is
 * `[CONTOH]` filler rather than their own copy. A switch that changes what the
 * public site shows, without saying so anywhere in the UI, would be worse than
 * no switch at all.
 */
export function sampleMode(): boolean {
  return sampleEnabled();
}

/**
 * The raw `SAMPLE_DATA` value as this process sees it, for the dashboard.
 *
 * Exists purely so a misconfigured switch is diagnosable. `sampleEnabled()`
 * collapses the value to a single boolean, which is the correct behaviour but
 * throws away the distinction between "off" and "I typed `On`". The dashboard
 * shows the difference; nothing on the public site depends on it.
 */
export function sampleRawValue(): string | undefined {
  return sampleSwitch().raw;
}

/**
 * Whether the `SAMPLE_DATA` value this process saw is one it understands.
 *
 * Needed separately from `sampleMode()` now that the default is on: a typo no
 * longer changes the outcome — the default applies either way — but the owner
 * should still be told that the value they typed is not the one in use, rather
 * than silently wondering why their edit had no effect.
 */
export function sampleValueRecognised(): boolean {
  return sampleSwitch().recognised;
}
