import Link from 'next/link';
import type { GalleryContent, SectionContent } from '@/data/defaults';
import { GalleryGrid } from './GalleryGrid';

/**
 * The gallery section wrapper.
 *
 * Kept separate from `GalleryGrid` so the grid — the only interactive part — is
 * the only client component. The heading, the intro copy and the CTA are all
 * server-rendered and ship as plain HTML.
 */
export function GallerySection({
  section,
  items,
}: {
  section: SectionContent;
  items: GalleryContent[];
}) {
  const lines = section.title.split('\n').filter((line) => line.trim().length > 0);

  return (
    <section className="section-y" aria-labelledby="judul-galeri">
      <div className="shell-wide">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-3">
            <p className="label text-[var(--color-accent)]" data-reveal>
              06
            </p>
            <p className="label mt-3 text-[var(--color-text-muted)]" data-reveal>
              {section.eyebrow}
            </p>
          </div>

          <div className="lg:col-span-9">
            <h2
              id="judul-galeri"
              className="display text-[length:var(--step-7)] leading-[0.9]"
              data-reveal
            >
              {lines.map((line, index) => (
                <span key={line} className="block">
                  {index === lines.length - 1 && lines.length > 1 ? <em>{line}</em> : line}
                </span>
              ))}
            </h2>
            <p className="mt-8 max-w-xl text-[var(--color-text-muted)]" data-reveal>
              {section.body}
            </p>
          </div>
        </div>

        <div className="mt-16">
          <GalleryGrid items={items} />
        </div>

        <div className="mt-14 flex justify-center" data-reveal>
          <Link href={section.ctaHref || '/galeri'} className="btn btn--ghost">
            {section.ctaLabel || 'Lihat Galeri'}
            <span className="btn__arrow" aria-hidden="true">
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
