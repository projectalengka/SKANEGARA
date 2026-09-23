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
 * Cached and revalidated by tag rather than rebuilt on every request. When the
 * administrator saves a news article, the server action calls `revalidateTag`
 * for `berita` and this page is regenerated in the background — which is what
 * lets the CMS work without a redeploy.
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
      {introduction ? <Introduction section={introduction} /> : null}
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
