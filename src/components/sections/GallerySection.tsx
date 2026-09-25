import Link from 'next/link';
import type { GalleryContent, SectionContent } from '@/data/defaults';
import { GalleryGrid } from './GalleryGrid';

/**
 * The gallery section wrapper.
 *
 * Kept separate from `GalleryGrid` so the grid — the only interactive part — is
 * the only client component. The heading, the intro copy and the CTA are all
 * server-rendered and ship as plain HTML.
 *
 * ## Why the surface is warm and the spacing is tight
 *
 * The gallery sits directly under the student-work section, and both were white
 * — measured, 3,781px of unbroken paper. Warm belongs to the gallery now: it is
 * the denser, more visual of the two, and a surface change is what tells the
 * eye a new section has started without adding a colour to the palette.
 *
 * `section-y-tight` because a mosaic of photographs is its own air. Padding a
 * grid of images as generously as a text section just pushes them apart.
 *
 * The heading uses the same three-column composition as the programme section
 * (`inline`: marker, headline, standfirst) rather than the default stacked one,
 * so that two image-led sections in a row do not open the same way.
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
    <section
      className="section-y-tight bg-[var(--color-paper-warm)]"
      aria-labelledby="judul-galeri"
    >
      <div className="shell-wide">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-2">
            <p className="label text-[var(--color-accent)]" data-reveal>
              06
            </p>
            <p className="label mt-3 text-[var(--color-text-muted)]" data-reveal>
              {section.eyebrow}
            </p>
          </div>

          <div className="lg:col-span-6">
            <h2
              id="judul-galeri"
              className="display text-[length:var(--step-6)] leading-[0.95]"
              data-reveal
            >
              {lines.map((line, index) => (
                <span key={line} className="block">
                  {index === lines.length - 1 && lines.length > 1 ? <em>{line}</em> : line}
                </span>
              ))}
            </h2>
          </div>

          <div className="lg:col-span-4 lg:pt-2">
            <p className="text-[var(--color-text-muted)]" data-reveal>
              {section.body}
            </p>
          </div>
        </div>

        <div className="mt-12">
          <GalleryGrid items={items} />
        </div>

        <div className="mt-12 flex justify-center" data-reveal>
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
