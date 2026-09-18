import Image from 'next/image';
import Link from 'next/link';
import type { SchoolProfileContent, SectionContent } from '@/data/defaults';
import { HeroMotion } from '@/components/motion/HeroMotion';

/**
 * The hero.
 *
 * Full viewport, and the composition is deliberately built around *type over
 * image* rather than an image with type on top:
 *
 *  - `SMK` sits small and in the margin, like a running head in a magazine.
 *  - `JAYANEGARA` is oversized, set in the heavy weight of the one sans family,
 *    and allowed to run the full width of the measure. It is the only thing on
 *    the page at that scale.
 *  - The tagline sits opposite, in the body face, small.
 *
 * The image is a dark plate behind the type, scrimmed so the headline keeps its
 * contrast. On a phone it collapses to a stacked composition with the image as a
 * band rather than a background, because a 320px-wide backdrop with type over it
 * fails contrast in the places the scrim cannot reach.
 *
 * All copy arrives as props from the section table, so the whole hero is editable
 * from the dashboard without a redeploy.
 */
export function Hero({
  profile,
  section,
}: {
  profile: SchoolProfileContent;
  section: SectionContent;
}) {
  // The headline comes from the CMS as two authored lines. Falling back to the
  // profile's `heroLines` means the hero is never empty even on a fresh install.
  const authored = section.title.split('\n').filter((line) => line.trim().length > 0);
  const lines = authored.length > 0 ? authored : profile.heroLines;
  const [firstLine, ...restLines] = lines;
  const remaining = restLines.join(' ');

  return (
    <section
      className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden bg-[var(--color-ink)] pb-10 text-[var(--color-paper)] sm:pb-14"
      aria-labelledby="judul-hero"
      data-hero-root
    >
      {/* Background plate. `priority` because it is the largest contentful paint
          on the most-visited page; `sizes="100vw"` because it is full-bleed, which
          is what lets the optimiser pick a small file on a phone. */}
      <div className="absolute inset-0 -z-10" data-hero="media" aria-hidden="true">
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src="/images/hero.svg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-70"
          />
        </div>
        {/* A two-stop scrim: heavier at the bottom where the type is, so the
            contrast ratio holds regardless of what photograph is eventually
            uploaded behind it. */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-ink)] via-[color-mix(in_srgb,var(--color-ink)_72%,transparent)] to-[color-mix(in_srgb,var(--color-ink)_38%,transparent)]" />
      </div>

      <div className="shell-wide">
        <p
          className="label text-[var(--color-text-faint)]"
          data-hero="kicker"
          style={{ opacity: 0 }}
        >
          {section.eyebrow}
        </p>

        <h1 id="judul-hero" className="mt-6 sm:mt-8" data-hero="title" style={{ opacity: 0 }}>
          {/*
            The accessible name of the heading, read by screen readers and
            search engines. It is `sr-only` rather than `aria-label` because a
            real text node survives translation, text selection, and copy-paste;
            an aria-label does not.
          */}
          <span className="sr-only">
            {profile.schoolName} — {lines.join(' ')}
          </span>

          {/*
            The split targets.

            `splitLines` rebuilds the text of whatever element it is given, so it
            must be handed a leaf — an element whose only content is the words to
            be animated. Each display line therefore gets its own
            `data-hero-line` wrapper and is animated independently. The `sr-only`
            accessible name above and the `SMK` label below are never touched.
          */}
          <span aria-hidden="true" className="block">
            <span className="label mb-3 block text-[var(--color-accent)] sm:mb-4">SMK</span>

            <span
              className="display block text-[clamp(2.75rem,13vw,10rem)] leading-[0.86]"
              data-hero-line
            >
              {firstLine}
            </span>

            {remaining ? (
              <span
                // Baris kedua dulu *miring* — pada serif, miring adalah aksennya.
                // Dengan satu rumpun sans, miring hanya terbaca sebagai huruf
                // yang dimiringkan, bukan sebagai penekanan. Aksennya dipindah
                // ke **berat**: baris ini turun ke 400 terhadap 600 di baris
                // pertama. `font-normal` menimpa berat 600 dari `.display`.
                className="display block text-[clamp(2.75rem,13vw,10rem)] font-normal leading-[0.86]"
                data-hero-line
              >
                {remaining}
              </span>
            ) : null}
          </span>
        </h1>

        <div className="mt-10 grid gap-8 border-t border-[var(--color-line-dark)] pt-7 sm:mt-14 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-16">
          <p
            className="max-w-xl text-[var(--color-text-faint)]"
            style={{ opacity: 0 }}
            data-hero="action"
          >
            {profile.tagline}
          </p>

          <div className="flex flex-wrap gap-3" style={{ opacity: 0 }} data-hero="action">
            <Link href={section.ctaHref || '/program-keahlian'} className="btn btn--on-dark">
              {section.ctaLabel || 'Lihat Program Keahlian'}
              <span className="btn__arrow" aria-hidden="true">
                →
              </span>
            </Link>
            <Link href="/tentang" className="btn btn--on-dark !border-transparent !px-3">
              Tentang Kami
            </Link>
          </div>
        </div>
      </div>

      <div
        className="shell-wide mt-10 flex items-center gap-3 text-[var(--color-text-faint)]"
        data-hero="indicator"
        style={{ opacity: 0 }}
        aria-hidden="true"
      >
        <span className="label">Gulir</span>
        <span className="block h-px w-14 bg-[var(--color-line-dark)]" />
      </div>

      <HeroMotion />
    </section>
  );
}
