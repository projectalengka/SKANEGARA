import Image from 'next/image';
import Link from 'next/link';
import type { GalleryContent, NewsContent, SectionContent, WorkContent } from '@/data/defaults';
import { formatDateId, truncate } from '@/lib/utils';
import { ProgramList } from './ProgramList';
import type { ProgramContent } from '@/data/defaults';

/**
 * A numbered section heading.
 *
 * Every section after the hero opens the same way: an index, an eyebrow, and a
 * headline broken across authored lines. Repeating the pattern is what turns a
 * homepage from a stack of blocks into a sequence — the visitor learns the shape
 * once and then only has to read.
 */
function SectionHeading({
  index,
  eyebrow,
  title,
  body,
  ctaLabel,
  ctaHref,
  id,
  invert = false,
}: {
  index: string;
  eyebrow: string;
  title: string;
  body?: string;
  ctaLabel?: string;
  ctaHref?: string;
  id: string;
  invert?: boolean;
}) {
  const lines = title.split('\n').filter((line) => line.trim().length > 0);

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-3">
        <p
          className={invert ? 'label text-[var(--color-accent)]' : 'label text-[var(--color-accent)]'}
          data-reveal
        >
          {index}
        </p>
        <p
          className={`label mt-3 ${invert ? 'text-[var(--color-text-faint)]' : 'text-[var(--color-text-muted)]'}`}
          data-reveal
        >
          {eyebrow}
        </p>
      </div>

      <div className="lg:col-span-9">
        <h2
          id={id}
          className="display text-[length:var(--step-7)] leading-[0.9]"
          data-reveal
        >
          {lines.map((line, lineIndex) => (
            <span key={line} className="block">
              {lineIndex === lines.length - 1 && lines.length > 1 ? <em>{line}</em> : line}
            </span>
          ))}
        </h2>

        {body ? (
          <p
            className={`mt-8 max-w-xl ${invert ? 'text-[var(--color-text-faint)]' : 'text-[var(--color-text-muted)]'}`}
            data-reveal
          >
            {body}
          </p>
        ) : null}

        {ctaLabel && ctaHref ? (
          <Link
            href={ctaHref}
            className={invert ? 'btn btn--on-dark mt-8' : 'btn btn--ghost mt-8'}
            data-reveal
          >
            {ctaLabel}
            <span className="btn__arrow" aria-hidden="true">
              →
            </span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/** Programmes, wrapped so the numbering stays consistent. */
export function ProgramsSection({
  section,
  programs,
}: {
  section: SectionContent;
  programs: ProgramContent[];
}) {
  return (
    <section className="section-y" aria-labelledby="judul-program" id="program-keahlian">
      <div className="shell">
        <SectionHeading
          id="judul-program"
          index="02"
          eyebrow={section.eyebrow}
          title={section.title}
          body={section.body}
        />
        <div className="mt-16">
          <ProgramList programs={programs} />
        </div>
      </div>
    </section>
  );
}

/**
 * The experience band.
 *
 * A dark, full-bleed section. Its purpose is contrast: the page has been white
 * for three sections, and flipping to black here is what makes the visitor
 * notice that something new has started. The photographs are laid out in an
 * asymmetric pair rather than a grid, so it reads as a spread.
 */
export function ExperienceSection({
  section,
  photos,
}: {
  section: SectionContent;
  photos: GalleryContent[];
}) {
  const [lead, second] = photos;

  return (
    <section className="section-y bg-[var(--color-ink)] text-[var(--color-paper)]" aria-labelledby="judul-kegiatan">
      <div className="shell-wide">
        <SectionHeading
          id="judul-kegiatan"
          index="03"
          eyebrow={section.eyebrow}
          title={section.title}
          body={section.body}
          ctaLabel={section.ctaLabel}
          ctaHref={section.ctaHref}
          invert
        />

        <div className="mt-16 grid gap-6 md:grid-cols-12 md:gap-8">
          {lead ? (
            <figure className="md:col-span-7">
              <div className="relative aspect-3/2 overflow-hidden" data-image-reveal>
                <Image
                  src={lead.image}
                  alt={lead.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 58vw"
                  className="object-cover"
                />
              </div>
              <figcaption className="label mt-4 text-[var(--color-text-faint)]">
                {lead.category} — {lead.title}
              </figcaption>
            </figure>
          ) : null}

          {second ? (
            <figure className="md:col-span-5 md:pt-20">
              <div className="relative aspect-4/5 overflow-hidden" data-image-reveal>
                <Image
                  src={second.image}
                  alt={second.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 42vw"
                  className="object-cover"
                />
              </div>
              <figcaption className="label mt-4 text-[var(--color-text-faint)]">
                {second.category} — {second.title}
              </figcaption>
            </figure>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/**
 * Student work — an exhibition wall.
 *
 * Not a card grid. The plates are deliberately uneven in width and offset
 * vertically, so the eye moves diagonally down the page the way it does along a
 * gallery wall. Hovering lifts a plate and warms its caption; there is no
 * button, because a work in an exhibition is looked at, not clicked through.
 *
 * The category is used as the caption instead of a title when the title is still
 * a placeholder — attributing invented work would be a factual claim.
 */
export function StudentWorkSection({
  section,
  works,
}: {
  section: SectionContent;
  works: WorkContent[];
}) {
  if (works.length === 0) {
    return (
      <section className="section-y" aria-labelledby="judul-karya">
        <div className="shell">
          <SectionHeading
            id="judul-karya"
            index="04"
            eyebrow={section.eyebrow}
            title={section.title}
            body={section.body}
          />
          <p className="mt-12 text-[var(--color-text-muted)]" data-reveal>
            Belum ada karya siswa.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="section-y" aria-labelledby="judul-karya">
      <div className="shell">
        <SectionHeading
          id="judul-karya"
          index="04"
          eyebrow={section.eyebrow}
          title={section.title}
          body={section.body}
          ctaLabel={section.ctaLabel}
          ctaHref={section.ctaHref}
        />

        <ul className="mt-16 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-12 lg:gap-x-8">
          {works.map((work, index) => {
            // A repeating asymmetric rhythm: wide, narrow, medium, with a
            // vertical offset on every other plate. Deterministic rather than
            // random, so the layout is stable between renders and between the
            // server and the client.
            const span = index % 3 === 0 ? 'lg:col-span-7' : index % 3 === 1 ? 'lg:col-span-5' : 'lg:col-span-6';
            const offset = index % 2 === 1 ? 'lg:pt-24' : '';

            return (
              <li key={work.id} className={`${span} ${offset} group`}>
                <figure>
                  <div className="relative aspect-4/5 overflow-hidden" data-image-reveal>
                    <Image
                      src={work.image}
                      alt={work.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 40vw"
                      className="object-cover transition-transform duration-[1.2s] group-hover:scale-[1.03]"
                      style={{ transitionTimingFunction: 'var(--ease-out)' }}
                    />
                  </div>
                  <figcaption className="mt-5 flex items-baseline justify-between gap-6 border-t border-[var(--color-line)] pt-4">
                    <span className="display text-[length:var(--step-3)]">{work.title}</span>
                    <span className="label shrink-0 text-[var(--color-text-muted)] transition-colors duration-500 group-hover:text-[var(--color-accent)]">
                      {work.category}
                    </span>
                  </figcaption>
                </figure>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/**
 * News.
 *
 * A lead story with an image, then a quiet list beneath it. The first article
 * gets the full editorial treatment; the rest are set as a table of contents,
 * because a homepage that gives five articles equal weight gives none of them
 * any.
 *
 * The empty state is a real design, not an afterthought: a school that has not
 * published anything yet should see a deliberate notice, not a blank gap.
 */
export function NewsSection({
  section,
  news,
}: {
  section: SectionContent;
  news: NewsContent[];
}) {
  const [lead, ...rest] = news;

  return (
    <section className="section-y bg-[var(--color-paper-warm)]" aria-labelledby="judul-berita">
      <div className="shell">
        <SectionHeading
          id="judul-berita"
          index="05"
          eyebrow={section.eyebrow}
          title={section.title}
          body={section.body}
          ctaLabel={section.ctaLabel}
          ctaHref={section.ctaHref}
        />

        {news.length === 0 ? (
          <div className="mt-16 border-t border-[var(--color-line)] pt-10" data-reveal>
            <p className="text-[var(--color-text-muted)]">Belum ada berita.</p>
            <p className="mt-3 max-w-lg text-[var(--color-text-muted)]">
              Berita terbaru dari sekolah akan tampil di bagian ini begitu diterbitkan.
            </p>
            {/* The visitor is not the administrator. Sending them to the login
                form was both the wrong audience and a free hint about where the
                CMS lives. */}
            <Link href="/kontak" className="link-line mt-6 inline-flex">
              Hubungi Kami
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        ) : (
          <div className="mt-16 grid gap-12 lg:grid-cols-12 lg:gap-16">
            {lead ? (
              <article className="lg:col-span-7">
                <Link href={`/berita/${lead.slug}`} className="group block">
                  {lead.coverImage ? (
                    <div className="relative aspect-3/2 overflow-hidden" data-image-reveal>
                      <Image
                        src={lead.coverImage}
                        alt={lead.title}
                        fill
                        sizes="(max-width: 1024px) 100vw, 58vw"
                        className="object-cover transition-transform duration-[1.2s] group-hover:scale-[1.03]"
                        style={{ transitionTimingFunction: 'var(--ease-out)' }}
                      />
                    </div>
                  ) : null}

                  <div className="mt-5 flex items-center gap-4">
                    <span className="label text-[var(--color-accent)]">{lead.category}</span>
                    <time
                      dateTime={lead.publishedAt ?? lead.createdAt}
                      className="label text-[var(--color-text-muted)]"
                    >
                      {formatDateId(lead.publishedAt ?? lead.createdAt)}
                    </time>
                  </div>

                  <h3 className="display mt-4 text-[length:var(--step-5)] leading-[1.02]">
                    {lead.title}
                  </h3>
                  <p className="mt-4 max-w-xl text-[var(--color-text-muted)]">
                    {truncate(lead.excerpt, 180)}
                  </p>
                  <span className="link-line mt-6 inline-flex">
                    Baca Berita
                    <span aria-hidden="true">→</span>
                  </span>
                </Link>
              </article>
            ) : null}

            {rest.length > 0 ? (
              <ul className="lg:col-span-5 lg:pt-16">
                {rest.map((item) => (
                  <li key={item.id} className="border-b border-[var(--color-line)] first:border-t">
                    <Link href={`/berita/${item.slug}`} className="group block py-6">
                      <div className="flex items-center gap-4">
                        <span className="label text-[var(--color-text-muted)]">{item.category}</span>
                        <time
                          dateTime={item.publishedAt ?? item.createdAt}
                          className="label text-[var(--color-text-faint)]"
                        >
                          {formatDateId(item.publishedAt ?? item.createdAt)}
                        </time>
                      </div>
                      <h3 className="display mt-3 text-[length:var(--step-3)] leading-[1.1] transition-colors duration-500 group-hover:text-[var(--color-accent)]">
                        {item.title}
                      </h3>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * The closing statement.
 *
 * Full-bleed black, one enormous question, three doors. This is the last thing
 * on the page and the only place where three calls to action are appropriate —
 * by this point the visitor has read everything and does not need to be
 * persuaded, only pointed.
 */
export function CtaSection({
  section,
  profile,
}: {
  section: SectionContent;
  profile: { schoolName: string };
}) {
  const lines = section.title.split('\n').filter((line) => line.trim().length > 0);

  return (
    <section className="section-y bg-[var(--color-ink)] text-[var(--color-paper)]" aria-labelledby="judul-ajakan">
      <div className="shell">
        <p className="label text-[var(--color-accent)]" data-reveal>
          {section.eyebrow}
        </p>

        <h2
          id="judul-ajakan"
          className="display mt-10 text-[length:var(--step-7)] leading-[0.84]"
          data-reveal
        >
          {lines.map((line, index) => (
            <span key={line} className="block">
              {index === lines.length - 1 && lines.length > 1 ? <em>{line}</em> : line}
            </span>
          ))}
        </h2>

        <p className="mt-10 max-w-xl text-[var(--color-text-faint)]" data-reveal>
          {section.body}
        </p>

        <div className="mt-12 flex flex-wrap gap-3" data-reveal>
          <Link href="/kontak" className="btn btn--on-dark">
            Kunjungi Sekolah
            <span className="btn__arrow" aria-hidden="true">
              →
            </span>
          </Link>
          <Link href="/kontak" className="btn btn--on-dark">
            Hubungi Kami
          </Link>
          <Link href={section.ctaHref || '/kontak'} className="btn btn--on-dark">
            {section.ctaLabel || 'Informasi PPDB'}
          </Link>
        </div>

        <p className="label mt-16 text-[var(--color-text-faint)]">{profile.schoolName}</p>
      </div>
    </section>
  );
}
