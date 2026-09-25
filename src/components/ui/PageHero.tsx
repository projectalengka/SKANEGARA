import type { ReactNode } from 'react';

/**
 * The page header shared by every inner page.
 *
 * One component, so the inner pages cannot drift apart. The pattern is
 * deliberate and repeated: a numbered eyebrow in the margin, an oversized
 * headline, and a short standfirst. It is the same shape as the homepage
 * sections, which is what makes the site read as one document rather than a
 * homepage with appendices.
 *
 * ## What was wrong with it
 *
 * The headline was `--step-8` — 104px, the same rung as the homepage hero. So
 * `/karya` opened with a 104px repeat of "Yang mereka kerjakan.", which is the
 * exact heading the visitor had just scrolled past in the section that links
 * here, at the same size, in the same weight split. Clicking a section's "Lihat
 * Karya" led to a page whose first screen was the heading you had already read.
 *
 * Measured across all seven inner pages, every one of them did this: a 104px
 * headline, no imagery above the fold, and a header 400–520px tall. Six pages
 * with the same first screen is the single strongest "this is a template"
 * signal on the site, and it wasted the most valuable space on each page.
 *
 * Two changes. The headline drops to `--step-7` (80px), which puts a real step
 * between the homepage hero and an inner page while leaving the inner page
 * louder than the section headings beneath it (60px). And the header's own
 * padding is tighter, so the content below it arrives sooner.
 *
 * The site-wide fix for "no imagery above the fold" belongs to each page — the
 * header can only stop consuming the space, it cannot fill it.
 */
export function PageHero({
  index,
  eyebrow,
  title,
  standfirst,
  children,
}: {
  index: string;
  eyebrow: string;
  title: string;
  standfirst?: string;
  children?: ReactNode;
}) {
  const lines = title.split('\n').filter((line) => line.trim().length > 0);

  return (
    <header className="border-b border-[var(--color-line)] pt-[calc(var(--nav-h)+2.5rem)] pb-10 sm:pb-14">
      <div className="shell-wide">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-3">
            <p className="label text-[var(--color-accent)]">{index}</p>
            <p className="label mt-3 text-[var(--color-text-muted)]">{eyebrow}</p>
          </div>

          <div className="lg:col-span-9">
            <h1 className="display text-[length:var(--step-7)] leading-[0.92]">
              {lines.map((line, lineIndex) => (
                <span key={line} className="block">
                  {lineIndex === lines.length - 1 && lines.length > 1 ? <em>{line}</em> : line}
                </span>
              ))}
            </h1>

            {standfirst ? (
              <p className="prose-body mt-6">{standfirst}</p>
            ) : null}

            {children}
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * The empty state.
 *
 * A real component rather than an inline paragraph, because every list on the
 * site needs one and the wording is a language-directive requirement ("Belum ada
 * data."). Rendered as a ruled block so it reads as a deliberate notice rather
 * than a rendering failure.
 *
 * The dashed border it used to carry said the opposite of that: a dashed outline
 * is the universal sign for "not finished", which is precisely the impression an
 * empty section must not give. A solid hairline and an accent rule above the
 * title read as a note the school has left on purpose.
 */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="border border-[var(--color-line)] px-6 py-12 sm:px-10" data-reveal>
      <span aria-hidden="true" className="block h-px w-12 bg-[var(--color-accent)]" />
      <p className="display display-close mt-6 text-[length:var(--step-3)]">{title}</p>
      {body ? <p className="mt-3 max-w-md text-[var(--color-text-muted)]">{body}</p> : null}
      {action ? <div className="mt-7 flex">{action}</div> : null}
    </div>
  );
}
