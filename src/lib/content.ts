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

/** The site's cache tags. Grouped here so `revalidateTag` and `cacheTag` cannot drift. */
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
  return readOrFallback(
    'schoolProfile',
    async (prisma) => {
      const row = await prisma.schoolProfile.findFirst({ orderBy: { updatedAt: 'desc' } });
      return mergeProfile(row, defaultSchoolProfile);
    },
    defaultSchoolProfile,
  );
}

// ---------------------------------------------------------------------------
// Programmes
// ---------------------------------------------------------------------------

export async function getPrograms(options: { includeUnpublished?: boolean } = {}): Promise<ProgramContent[]> {
  const fallback = options.includeUnpublished
    ? defaultPrograms
    : defaultPrograms.filter((program) => program.published);

  return readOrFallback(
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
  const fallback = options.includeUnpublished
    ? defaultNews
    : defaultNews.filter((item) => item.published);

  const result = await readOrFallback(
    'news',
    async (prisma) => {
      const rows = await prisma.news.findMany({
        where: options.includeUnpublished ? undefined : { published: true },
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      });
      if (rows.length === 0) return [];

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
  const fallback = defaultNews.find((item) => item.slug === slug) ?? null;

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
      if (rows.length === 0) return [];

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
    fallback,
  );

  return options.limit ? result.slice(0, options.limit) : result;
}

// ---------------------------------------------------------------------------
// Student work
// ---------------------------------------------------------------------------

export async function getStudentWork(
  options: { includeUnpublished?: boolean; limit?: number } = {},
): Promise<WorkContent[]> {
  const fallback = options.includeUnpublished
    ? defaultStudentWork
    : defaultStudentWork.filter((item) => item.published);

  const result = await readOrFallback(
    'studentWork',
    async (prisma) => {
      const rows = await prisma.studentWork.findMany({
        where: options.includeUnpublished ? undefined : { published: true },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      });
      if (rows.length === 0) return [];

      return rows.map<WorkContent>((row) => ({
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
    },
    fallback,
  );

  return options.limit ? result.slice(0, options.limit) : result;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export async function getEvents(
  options: { includeUnpublished?: boolean; limit?: number; upcomingOnly?: boolean } = {},
): Promise<EventContent[]> {
  const fallback = options.includeUnpublished
    ? defaultEvents
    : defaultEvents.filter((item) => item.published);

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
      if (rows.length === 0) return [];

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
  return readOrFallback(
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
