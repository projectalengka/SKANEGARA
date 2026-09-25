import Image from 'next/image';
import Link from 'next/link';
import type { GalleryContent, SectionContent } from '@/data/defaults';

/**
 * The orientation strip under the hero.
 *
 * Its job is rhythm, not information: after a full-viewport hero the eye needs a
 * breath before the next claim. So this is a short band — a hairline, a date-like
 * row of labels on the left, one line of copy on the right — and nothing else.
 * The restraint is the point; a second hero here would make the first one cheap.
 */
export function OrientationStrip({ profile }: { profile: { city: string; province: string } }) {
  const items = ['Sekolah Menengah Kejuruan', profile.city, profile.province];

  return (
    <section aria-label="Ringkasan sekolah" className="border-y border-[var(--color-line)]">
      <div className="shell flex flex-wrap items-center gap-x-8 gap-y-3 py-5">
        <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 font-[family-name:var(--font-mono)] text-[length:var(--step--2)] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
          {items.map((item, index) => (
            <li key={item} className="flex items-center gap-6">
              {index > 0 ? (
                <span aria-hidden="true" className="hidden h-1 w-1 bg-[var(--color-accent)] sm:block" />
              ) : null}
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * The editorial introduction.
 *
 * Three words stacked at display scale, then a paragraph set narrow and low in
 * the measure. This is the section that establishes the site's type contrast:
 * the statement is enormous and the paragraph is small, and the gap between them
 * is the design.
 *
 * The asymmetric composition — statement left, paragraph right and pushed down —
 * exists so this does not read as another centred marketing block.
 *
 * ## Why there are photographs here, and why it matters most on this section
 *
 * Measured on the live site before this change: the first photograph a visitor
 * could actually see was at **y≈4,477px** — five full screens down, inside the
 * dark experience band. The hero carried two 56×70px thumbnails, the section
 * below it carried none, and the one image in the about section was a grid
 * placeholder. So the first thing a prospective student learned about a school
 * that teaches visual design was that it had no pictures.
 *
 * That is not a styling problem, it is a *sequencing* problem, and no amount of
 * type or colour work fixes it. The fix is to spend the third screen on three
 * photographs, in a triptych directly under the statement — using the gallery
 * images the page has already fetched, so this adds no query, no section and no
 * new content.
 *
 * `aspect-1/1` squares, three across: the gallery photographs are landscape, and
 * a square is the widest crop that still gives three of them equal weight in one
 * row. The heading keeps `--step-7` here while every later section drops to
 * `--step-6`, because this is the page's opening statement rather than one
 * section among eight.
 *
 * ## Why these three are not the first three
 *
 * The homepage reads six gallery photographs once and hands the same array to
 * three places: this triptych, the dark experience band (`photos[0]`,
 * `photos[1]`) and the mosaic at the bottom (all six). Taking the first three
 * here would put photographs 1 and 2 on screen three times within four thousand
 * pixels — the opening screen, the band right below it, and the gallery. A
 * visitor does not read that as a rich gallery; they read it as a school with
 * three pictures.
 *
 * So the triptych starts at the third photograph and skips the two the band
 * uses. The mosaic still shows everything, which is what a gallery is for, and
 * it sits far enough below that the return reads as a catalogue rather than as a
 * repeat. No extra query and no new content — the same six rows, sliced
 * differently.
 */
export function Introduction({
  section,
  photos = [],
}: {
  section: SectionContent;
  photos?: GalleryContent[];
}) {
  const words = section.title.split('\n').filter((line) => line.trim().length > 0);
  // Lewati dua foto pertama: keduanya sudah dipakai pita Kegiatan tepat di
  // bawah bagian ini. Kalau galerinya belum cukup isi untuk melewatinya, ambil
  // dari awal saja — menampilkan tiga foto yang sama lebih baik daripada
  // menampilkan satu petak di dalam kisi tiga kolom.
  const strip = photos.length >= 5 ? photos.slice(2, 5) : photos.slice(0, 3);

  return (
    <section className="section-y-tight" aria-labelledby="judul-perkenalan">
      <div className="shell">
        <p className="label text-[var(--color-text-muted)]" data-reveal>
          {section.eyebrow}
        </p>

        <h2
          id="judul-perkenalan"
          className="display mt-8 text-[length:var(--step-7)] leading-[0.9] text-[var(--color-text)]"
          data-reveal
        >
          {words.map((word, index) => (
            <span key={word} className="block">
              {index === words.length - 1 ? <em>{word}</em> : word}
            </span>
          ))}
        </h2>

        <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-start-6 lg:col-end-12">
            <p className="prose-body" data-reveal>
              {section.body}
            </p>
            <Link href={section.ctaHref || '/tentang'} className="link-line mt-8 inline-flex" data-reveal>
              {section.ctaLabel || 'Tentang Kami'}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>

      {strip.length > 0 ? (
        <div className="shell mt-12">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:gap-6">
            {strip.map((photo, index) => (
              <li key={photo.id} className={index === 2 ? 'hidden sm:block' : ''}>
                <figure>
                  <div
                    className="relative aspect-1/1 overflow-hidden bg-[var(--color-paper-warm)]"
                    data-image-reveal
                  >
                    <Image
                      src={photo.image}
                      alt={photo.title}
                      fill
                      sizes="(max-width: 640px) 50vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                  <figcaption className="label mt-3 text-[var(--color-text-muted)]">
                    {photo.category}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
