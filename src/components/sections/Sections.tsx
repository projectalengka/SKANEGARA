import Image from 'next/image';
import Link from 'next/link';
import type { GalleryContent, NewsContent, SectionContent, WorkContent } from '@/data/defaults';
import { formatDateId, truncate } from '@/lib/utils';
import { ProgramList } from './ProgramList';
import type { ProgramContent } from '@/data/defaults';

/**
 * A numbered section heading.
 *
 * ## Why there are three of them and not one
 *
 * This used to have a single shape, and the measurement said what that cost:
 * eight sections on the homepage, all opening with an index in the margin, a
 * two-line headline at exactly 80px, and a paragraph underneath. Read once it
 * is a system. Read eight times in a row it is wallpaper — the eye stops
 * distinguishing one section from the next, which is the opposite of what a
 * heading is for.
 *
 * So the *vocabulary* stays fixed (index, eyebrow, display headline, standfirst,
 * optional call to action) and only the *composition* varies. Three shapes,
 * chosen by what the section is actually doing:
 *
 *   standard  index in the margin, headline wide, body beneath.
 *             The default. Reads as a page.
 *   inline    index in the margin, headline left, body and action in a right
 *             column. Reads as a spread — use when the body is short and the
 *             headline is the whole point.
 *   stacked   index and eyebrow on one line above a full-width headline, body
 *             beneath. Reads as a chapter opening — use at a change of surface,
 *             where the section needs to announce itself.
 *
 * THE RULE THAT KEEPS THIS FROM BECOMING NOISE: two adjacent sections never
 * take the same variant. Variety you cannot perceive is the same as none.
 *
 * Sizes are deliberately one rung below where they were. Section headlines were
 * `--step-7` (80px) and inner-page titles `--step-8` (104px) — the same rung as
 * the homepage hero — so a page title and the hero it followed were
 * typographically identical, and neither read as the most important thing on
 * its page. Now: hero 104, page title 80, section headline 60. Three levels,
 * each visibly louder than the one below.
 */
type HeadingVariant = 'standard' | 'stacked' | 'inline';

function SectionHeading({
  index,
  eyebrow,
  title,
  body,
  ctaLabel,
  ctaHref,
  id,
  invert = false,
  variant = 'standard',
}: {
  index: string;
  eyebrow: string;
  title: string;
  body?: string;
  ctaLabel?: string;
  ctaHref?: string;
  id: string;
  invert?: boolean;
  variant?: HeadingVariant;
}) {
  const lines = title.split('\n').filter((line) => line.trim().length > 0);

  // `--color-accent` (#c8341f) reaches only 3.74:1 on #0a0a0a — it fails AA for
  // the small caps labels it is used on. The dark-surface variant of the accent
  // already exists in the token file and was never wired up; this is that wire.
  const accent = invert ? 'text-[var(--color-accent-on-dark)]' : 'text-[var(--color-accent)]';
  const muted = invert ? 'text-[var(--color-text-faint)]' : 'text-[var(--color-text-muted)]';

  const headline = lines.map((line, lineIndex) => (
    <span key={line} className="block">
      {lineIndex === lines.length - 1 && lines.length > 1 ? <em>{line}</em> : line}
    </span>
  ));

  const action =
    ctaLabel && ctaHref ? (
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
    ) : null;

  const titleClass = 'display text-[length:var(--step-6)] leading-[0.95]';

  // The eyebrow pair is small, decorative, and always adjacent to the headline.
  // Revealing it separately cost two observers per section for movement nobody
  // reads — it is now painted with the headline's own reveal instead.
  const marker = (
    <>
      <p className={`label ${accent}`}>{index}</p>
      <p className={`label mt-3 ${muted}`}>{eyebrow}</p>
    </>
  );

  if (variant === 'stacked') {
    return (
      <div data-reveal>
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <p className={`label ${accent}`}>{index}</p>
          <p className={`label ${muted}`}>{eyebrow}</p>
        </div>
        <h2 id={id} className={`${titleClass} mt-8 max-w-[18ch]`}>
          {headline}
        </h2>
        {body ? <p className={`mt-8 max-w-2xl ${muted}`}>{body}</p> : null}
        {action}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-2">{marker}</div>

        <div className="lg:col-span-6">
          <h2 id={id} className={titleClass} data-reveal>
            {headline}
          </h2>
        </div>

        <div className="lg:col-span-4 lg:pt-2">
          {body ? (
            <p className={muted} data-reveal>
              {body}
            </p>
          ) : null}
          {action}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-16">
      <div className="lg:col-span-3">{marker}</div>

      <div className="lg:col-span-9">
        <h2 id={id} className={titleClass} data-reveal>
          {headline}
        </h2>

        {body ? (
          <p className={`mt-8 max-w-xl ${muted}`} data-reveal>
            {body}
          </p>
        ) : null}

        {action}
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
    <section className="section-y-tight" aria-labelledby="judul-program" id="program-keahlian">
      <div className="shell">
        <SectionHeading
          id="judul-program"
          index="02"
          eyebrow={section.eyebrow}
          title={section.title}
          body={section.body}
          variant="inline"
        />
        <div className="mt-12">
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
 * notice that something new has started. It is also the one place on the page
 * where the photographs are allowed to leave the text column.
 *
 * ## Why the photographs sit outside `.shell`
 *
 * Every other image on the site is bounded by the 120rem shell, which is
 * correct — an image that lines up with the text above it reads as part of the
 * document. This band is the exception, and it is deliberate: the grid below is
 * a direct child of the `<section>`, not of `.shell-wide`, so the left plate
 * begins at x=0 and the right plate ends at the viewport edge. That edge-to-edge
 * spread is what makes the section read as a *spread* rather than as another
 * row of content, and it is the only full-bleed on the homepage.
 *
 * It is capped at 120rem and centred, so on a 2560px monitor the plates stop
 * growing and instead bleed 48px past the text column on each side. Unbounded,
 * a 3:2 plate at 2560px would be 1707px tall — a whole screen for one photo.
 *
 * The captions keep the gutter so they stay aligned with the text above, while
 * the plates do not. Image bleeds, type aligns.
 *
 * `section-y-wide` because this is a change of chapter *and* of surface.
 */
export function ExperienceSection({
  section,
  photos,
}: {
  section: SectionContent;
  photos: GalleryContent[];
}) {
  const [lead, second] = photos;

  const caption = (item: GalleryContent) => (
    <figcaption className="label mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1 px-[var(--gutter)] text-[var(--color-text-faint)]">
      <span className="text-[var(--color-accent-on-dark)]">{item.category}</span>
      <span>{item.title}</span>
    </figcaption>
  );

  return (
    <section
      className="section-y-wide bg-[var(--color-ink)] text-[var(--color-paper)]"
      aria-labelledby="judul-kegiatan"
    >
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
          variant="stacked"
        />
      </div>

      <div className="mx-auto mt-14 grid w-full max-w-[120rem] grid-cols-1 gap-3 md:mt-20 md:grid-cols-12 md:gap-4">
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
            {caption(lead)}
          </figure>
        ) : null}

        {second ? (
          <figure className="md:col-span-5 md:pt-24">
            <div className="relative aspect-4/5 overflow-hidden" data-image-reveal>
              <Image
                src={second.image}
                alt={second.title}
                fill
                sizes="(max-width: 768px) 100vw, 42vw"
                className="object-cover"
              />
            </div>
            {caption(second)}
          </figure>
        ) : null}
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
 * ## Why these images are `object-contain`, and the only place on the site that is
 *
 * Every other photograph on the site is cropped to fill its frame, and for a
 * photograph of a room or a person that is right — the frame is the composition.
 * A student's design work is the opposite: the composition *is* the content, and
 * cropping 40% off the width of a poster to make it fit a portrait box destroys
 * the thing the section exists to show. Measured on the live site, the portrait
 * plate was cutting 47% of the artwork's width.
 *
 * So the plate is a ground and the work sits whole on it, at whatever ratio it
 * was made. The frames are all 4:3 — a single ratio, so the letterboxing of a
 * tall piece reads as a mount rather than as a broken frame — and the rhythm
 * comes from the column spans and the vertical offsets instead of from the
 * frame shape. That is also how a real exhibition hangs work.
 *
 * ## Why one work gets a different layout from many
 *
 * The section was built for six plates and had one. Measured: 1743px of page for
 * a single item, with roughly 800px of it empty, because a 7-of-12 column plate
 * at 4:5 is 980px tall and nothing sat beside it. A layout that only works at
 * full occupancy is not finished — it is a layout that has never been tested
 * against the state the site is actually in.
 *
 * With one work the section becomes a spread: the plate takes two thirds, and
 * the third column carries the attribution and the way onward. It is 400px
 * shorter and nothing is left over.
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

  const heading = (
    <SectionHeading
      id="judul-karya"
      index="04"
      eyebrow={section.eyebrow}
      title={section.title}
      body={section.body}
      ctaLabel={section.ctaLabel}
      ctaHref={section.ctaHref}
    />
  );

  // One work: a spread. The plate is shown whole and the third column does the
  // attributing, so the section fills its width instead of trailing off.
  //
  // The work is bound in the condition rather than indexed inside the block:
  // `noUncheckedIndexedAccess` is on, so `works[0]` is `T | undefined` and a
  // bare `works.length === 1` check does not narrow it.
  const single = works.length === 1 ? works[0] : undefined;

  if (single) {
    const work = single;

    return (
      <section className="section-y" aria-labelledby="judul-karya">
        <div className="shell">
          {heading}

          <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:gap-16">
            <figure className="lg:col-span-8">
              <div
                className="relative aspect-4/3 overflow-hidden bg-[var(--color-paper-warm)]"
                data-image-reveal
              >
                <Image
                  src={work.image}
                  alt={work.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  className="object-contain"
                />
              </div>
            </figure>

            <div className="lg:col-span-4 lg:pt-12">
              <p className="label text-[var(--color-accent)]">{work.category}</p>
              <p className="display display-close mt-5 text-[length:var(--step-5)]">{work.title}</p>
              {section.ctaHref ? (
                <Link href={section.ctaHref} className="link-line mt-8 inline-flex">
                  {section.ctaLabel || 'Lihat Karya'}
                  <span aria-hidden="true">→</span>
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section-y" aria-labelledby="judul-karya">
      <div className="shell">
        {heading}

        <ul className="mt-14 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-x-8">
          {works.map((work, index) => {
            // A repeating asymmetric rhythm: wide, narrow, medium, with a
            // vertical offset on every other plate. Deterministic rather than
            // random, so the layout is stable between renders and between the
            // server and the client.
            const span = index % 3 === 0 ? 'lg:col-span-7' : index % 3 === 1 ? 'lg:col-span-5' : 'lg:col-span-6';
            const offset = index % 2 === 1 ? 'lg:pt-20' : '';

            return (
              <li key={work.id} className={`${span} ${offset} group`}>
                <figure>
                  <div
                    className="relative aspect-4/3 overflow-hidden bg-[var(--color-paper-warm)]"
                    data-image-reveal
                  >
                    <Image
                      src={work.image}
                      alt={work.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 40vw"
                      className="object-contain transition-transform duration-[1.05s] group-hover:scale-[1.02]"
                      style={{ transitionTimingFunction: 'var(--ease-out)' }}
                    />
                  </div>
                  <figcaption className="mt-5 flex items-baseline justify-between gap-6 border-t border-[var(--color-line)] pt-4">
                    <span className="display display-close text-[length:var(--step-3)]">
                      {work.title}
                    </span>
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
 *
 * ## Why the surface is white and not warm
 *
 * It was warm. But the gallery directly above it was also white, so the two
 * sections ran together as 3,781px of uninterrupted paper — measured. Warm now
 * belongs to the gallery, and the news sits back on white, which puts a surface
 * change between them without adding a colour.
 *
 * The dates in the list were `--color-text-faint` (#bdbdbd), which measured
 * 1.68:1 on the warm surface the section sat on — well under the 4.5:1 that
 * small text needs, and the single worst contrast failure on the site. They are
 * `--color-text-muted` now, which is 5.74:1 on paper and 5.13:1 on warm — so the
 * fix holds whichever surface the section ends up on. The faint tone still earns
 * its place on the dark footer, where it reads at 10.5:1; it was only ever wrong
 * as ink on paper.
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
    <section className="section-y" aria-labelledby="judul-berita">
      <div className="shell">
        <SectionHeading
          id="judul-berita"
          index="05"
          eyebrow={section.eyebrow}
          title={section.title}
          body={section.body}
          ctaLabel={section.ctaLabel}
          ctaHref={section.ctaHref}
          variant="stacked"
        />

        {news.length === 0 ? (
          <div className="mt-14 border-t border-[var(--color-line)] pt-10" data-reveal>
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
          <div className="mt-14 grid gap-12 lg:grid-cols-12 lg:gap-16">
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
                        className="object-cover transition-transform duration-[1.05s] group-hover:scale-[1.02]"
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
                          className="label text-[var(--color-text-muted)]"
                        >
                          {formatDateId(item.publishedAt ?? item.createdAt)}
                        </time>
                      </div>
                      <h3 className="display display-close mt-3 text-[length:var(--step-3)] transition-colors duration-500 group-hover:text-[var(--color-accent)]">
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
 *
 * ## What changed, and why
 *
 * Three things were measured wrong here. The headline was `--step-7` (80px),
 * the same rung as every other section headline on the page — so the closing
 * statement was no louder than the fifth section. It keeps `--step-7` now while
 * the others drop to `--step-6`, which makes this the loudest thing after the
 * hero, and that is the correct relationship for a closing call.
 *
 * The three buttons were all `btn--on-dark` — outlined, equal weight, so the
 * visitor had to choose between three doors with nothing to tell them which one
 * the school actually wanted them to take. "Informasi PPDB" is the filled
 * primary now, and the other two are the outlined secondaries they always were.
 * That is a hierarchy, not a decoration.
 *
 * And the right half of the section was empty. The standfirst and the actions
 * now share one twelve-column row — copy on the left, doors on the right — so
 * the section fills its width with structure rather than with air.
 *
 * `section-y-wide`: the end of the document is a change of chapter.
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
    <section
      className="section-y-wide bg-[var(--color-ink)] text-[var(--color-paper)]"
      aria-labelledby="judul-ajakan"
    >
      <div className="shell">
        <p className="label text-[var(--color-accent-on-dark)]" data-reveal>
          {section.eyebrow}
        </p>

        <h2
          id="judul-ajakan"
          className="display mt-8 max-w-[16ch] text-[length:var(--step-7)] leading-[0.9]"
          data-reveal
        >
          {lines.map((line, index) => (
            <span key={line} className="block">
              {index === lines.length - 1 && lines.length > 1 ? <em>{line}</em> : line}
            </span>
          ))}
        </h2>

        <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:gap-16">
          <p className="text-[var(--color-text-faint)] lg:col-span-5" data-reveal>
            {section.body}
          </p>

          <div className="grid gap-3 sm:grid-cols-3 lg:col-span-7" data-reveal>
            <Link href="/kontak" className="btn btn--on-dark w-full justify-between">
              Kunjungi Sekolah
              <span className="btn__arrow" aria-hidden="true">
                →
              </span>
            </Link>
            <Link href="/kontak" className="btn btn--on-dark w-full justify-between">
              Hubungi Kami
              <span className="btn__arrow" aria-hidden="true">
                →
              </span>
            </Link>
            <Link
              href={section.ctaHref || '/kontak'}
              className="btn btn--fill-light w-full justify-between"
            >
              {section.ctaLabel || 'Informasi PPDB'}
              <span className="btn__arrow" aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </div>

        <p className="label mt-16 text-[var(--color-text-faint)]">{profile.schoolName}</p>
      </div>
    </section>
  );
}
