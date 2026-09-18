import Image from 'next/image';
import Link from 'next/link';
import type { SectionContent, SchoolProfileContent } from '@/data/defaults';

/**
 * The about section — an editorial spread, not a card.
 *
 * The layout is a numbered index column on the left and a wide body on the
 * right, with the school's name set at display scale and broken across two
 * lines. The number `01` is doing real work: it establishes that the homepage is
 * a numbered series rather than a stack of unrelated blocks, which is what makes
 * the later sections feel like chapters instead of filler.
 *
 * Vision and mission are rendered as a definition list rather than bullet
 * points, because they are a claim and its supporting statements — a relationship,
 * not a list.
 */
export function About({
  profile,
  section,
}: {
  profile: SchoolProfileContent;
  section: SectionContent;
}) {
  const nameParts = profile.schoolName.split(' ');
  const [prefix, ...rest] = nameParts;
  const name = rest.join(' ');

  const hasVision = profile.vision.trim().length > 0;
  const hasMission = profile.mission.some((item) => item.trim().length > 0);

  return (
    <section className="section-y bg-[var(--color-paper-warm)]" aria-labelledby="judul-tentang">
      <div className="shell">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <p className="label text-[var(--color-accent)]" data-reveal>
              01
            </p>
            <h2
              id="judul-tentang"
              className="display mt-6 text-[clamp(2.5rem,7vw,5rem)] leading-[0.9]"
              data-reveal
            >
              {prefix}
              <br />
              <em>{name}</em>
            </h2>

            <div className="relative mt-10 aspect-4/5 overflow-hidden" data-image-reveal>
              <Image
                src="/images/gallery-01.svg"
                alt={`Lingkungan ${profile.schoolName}`}
                fill
                sizes="(max-width: 1024px) 100vw, 33vw"
                className="object-cover"
              />
            </div>
          </div>

          <div className="lg:col-span-8 lg:pt-16">
            <p className="prose-body !text-[var(--color-text)]" data-reveal>
              {section.body}
            </p>

            <div className="mt-12 border-t border-[var(--color-line)] pt-10">
              <h3 className="label text-[var(--color-text-muted)]" data-reveal>
                Sejarah
              </h3>
              <p className="mt-4 max-w-2xl text-[var(--color-text-muted)]" data-reveal>
                {profile.history}
              </p>
            </div>

            {hasVision || hasMission ? (
              <dl className="mt-10 grid gap-10 border-t border-[var(--color-line)] pt-10 sm:grid-cols-2">
                {hasVision ? (
                  <div data-reveal>
                    <dt className="label text-[var(--color-text-muted)]">Visi</dt>
                    <dd className="mt-4 text-[var(--color-text)]">{profile.vision}</dd>
                  </div>
                ) : null}

                {hasMission ? (
                  <div data-reveal>
                    <dt className="label text-[var(--color-text-muted)]">Misi</dt>
                    <dd>
                      <ol className="mt-4 flex flex-col gap-3">
                        {profile.mission.map((item, index) => (
                          <li key={item} className="flex gap-4">
                            <span className="label pt-1 text-[var(--color-accent)]">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ol>
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : null}

            <Link
              href={section.ctaHref || '/tentang'}
              className="btn btn--ghost mt-12"
              data-reveal
            >
              {section.ctaLabel || 'Selengkapnya'}
              <span className="btn__arrow" aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
