import type { Metadata } from 'next';
import { getGallery, getSections } from '@/lib/content';
import { PageHero } from '@/components/ui/PageHero';
import { GalleryGrid } from '@/components/sections/GalleryGrid';

export const metadata: Metadata = {
  title: 'Galeri',
  description:
    'Galeri foto kegiatan belajar, praktik, dan keseharian siswa SMK Jayanegara Mojokerto.',
  alternates: { canonical: '/galeri' },
};

export const revalidate = 300;

export default async function GalleryPage() {
  const [items, sections] = await Promise.all([getGallery(), getSections()]);
  const section = sections.gallery;

  return (
    <>
      <PageHero
        index="07"
        eyebrow={section?.eyebrow ?? 'Galeri'}
        title={'Sekilas\nJayanegara.'}
        standfirst={section?.body}
      />

      <section className="section-y">
        <div className="shell-wide">
          <GalleryGrid items={items} />
        </div>
      </section>
    </>
  );
}
