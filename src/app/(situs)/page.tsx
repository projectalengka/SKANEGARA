import type { Metadata } from 'next';
import {
  getGallery,
  getNews,
  getPrograms,
  getSchoolProfile,
  getSections,
  getStudentWork,
} from '@/lib/content';
import { Hero } from '@/components/sections/Hero';
import { Introduction, OrientationStrip } from '@/components/sections/Introduction';
import { About } from '@/components/sections/About';
import { GallerySection } from '@/components/sections/GallerySection';
import {
  CtaSection,
  ExperienceSection,
  NewsSection,
  ProgramsSection,
  StudentWorkSection,
} from '@/components/sections/Sections';

/**
 * The homepage.
 *
 * A server component. It reads every section's content in parallel, then hands
 * each block its own data — no section fetches anything itself. That keeps the
 * data flow legible (one place to see what the page needs) and means the whole
 * page's content is resolved before a single byte is streamed.
 *
 * The section order follows the visitor journey in the brief: open, wonder,
 * explore, understand, trust, contact.
 */
export const metadata: Metadata = {
  description:
    'Profil SMK Jayanegara di Mojokerto, Jawa Timur. Program keahlian Desain Komunikasi Visual dan Otomotif, kegiatan sekolah, karya siswa, galeri, berita, dan informasi PPDB.',
};

/**
 * Rendered on demand, not from a stored copy.
 *
 * This used to say the page was "cached and revalidated by tag", with
 * `revalidate = 300` below it. That is not what happens, and the header proves
 * it: the response carries
 * `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`,
 * because `dynamic = 'force-dynamic'` in `src/app/layout.tsx` applies to every
 * segment beneath it. The `revalidate` value is therefore inert — the page is
 * built per request.
 *
 * That is why an edit in the dashboard appears immediately: there is no stored
 * page to go stale, and no tagged data cache either (`src/lib/db.ts` reads
 * through Prisma directly; nothing in `src/` calls `cacheTag`). It also means
 * `revalidateTag` in `src/app/admin/content-actions.ts` currently has nothing to
 * invalidate. Both facts are worth knowing before anyone makes this page static
 * for speed: doing so would silently stop edits from appearing.
 */
export const revalidate = 300;

export default async function HomePage() {
  const [profile, sections, programs, news, gallery, works] = await Promise.all([
    getSchoolProfile(),
    getSections(),
    getPrograms(),
    getNews({ limit: 4 }),
    getGallery({ limit: 6 }),
    getStudentWork({ limit: 6 }),
  ]);

  // Every section key is guaranteed present: `getSections` merges the database
  // rows over the seed defaults, so a missing key is a programming error rather
  // than a runtime possibility.
  const [hero, introduction, about, programsSection, experience, work, gallerySection, newsSection, cta] = [
    sections.hero,
    sections.introduction,
    sections.about,
    sections.programs,
    sections.experience,
    sections.work,
    sections.gallery,
    sections.news,
    sections.cta,
  ];

  return (
    <>
      {hero ? <Hero profile={profile} section={hero} programs={programs} /> : null}
      <OrientationStrip profile={profile} />
      {/* The gallery photographs are handed to the introduction as well, so the
          third screen carries three real photographs instead of none. They are
          the same rows the gallery section below already reads — one query, two
          places, no extra request. */}
      {introduction ? <Introduction section={introduction} photos={gallery} /> : null}
      {about ? <About profile={profile} section={about} /> : null}
      {programsSection ? <ProgramsSection section={programsSection} programs={programs} /> : null}
      {experience ? <ExperienceSection section={experience} photos={gallery} /> : null}
      {work ? <StudentWorkSection section={work} works={works} /> : null}
      {gallerySection ? <GallerySection section={gallerySection} items={gallery} /> : null}
      {newsSection ? <NewsSection section={newsSection} news={news} /> : null}
      {cta ? <CtaSection section={cta} profile={profile} /> : null}
    </>
  );
}
