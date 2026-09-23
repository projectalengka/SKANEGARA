import Link from 'next/link';
import type { SectionContent } from '@/data/defaults';

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
 */
export function Introduction({ section }: { section: SectionContent }) {
  const words = section.title.split('\n').filter((line) => line.trim().length > 0);

  return (
    <section className="section-y" aria-labelledby="judul-perkenalan">
      <div className="shell">
        <p className="label text-[var(--color-text-muted)]" data-reveal>
          {section.eyebrow}
        </p>

        <h2
          id="judul-perkenalan"
          className="display mt-10 text-[length:var(--step-7)] leading-[0.88] text-[var(--color-text)]"
          data-reveal
        >
          {words.map((word, index) => (
            <span key={word} className="block">
              {index === words.length - 1 ? <em>{word}</em> : word}
            </span>
          ))}
        </h2>

        <div className="mt-14 grid gap-10 lg:grid-cols-12 lg:gap-16">
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
    </section>
  );
}
