import type { ReactNode } from 'react';

/**
 * The page header shared by every inner page.
 *
 * One component, so the inner pages cannot drift apart. The pattern is
 * deliberate and repeated: a numbered eyebrow in the margin, an oversized
 * headline, and a short standfirst. It is the same shape as the homepage
 * sections, which is what makes the site read as one document rather than a
 * homepage with appendices.
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
    <header className="border-b border-[var(--color-line)] pt-[calc(var(--nav-h)+3rem)] pb-14 sm:pb-20">
      <div className="shell-wide">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-3">
            <p className="label text-[var(--color-accent)]">{index}</p>
            <p className="label mt-3 text-[var(--color-text-muted)]">{eyebrow}</p>
          </div>

          <div className="lg:col-span-9">
            <h1 className="display text-[length:var(--step-8)] leading-[0.88]">
              {lines.map((line, lineIndex) => (
                <span key={line} className="block">
                  {lineIndex === lines.length - 1 && lines.length > 1 ? <em>{line}</em> : line}
                </span>
              ))}
            </h1>

            {standfirst ? (
              <p className="prose-body mt-8">{standfirst}</p>
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
 * data."). Rendered as a bordered block so it reads as a deliberate notice
 * rather than a rendering failure.
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
    <div className="border border-dashed border-[var(--color-line)] px-6 py-14 text-center" data-reveal>
      <p className="display text-[length:var(--step-3)]">{title}</p>
      {body ? <p className="mx-auto mt-3 max-w-md text-[var(--color-text-muted)]">{body}</p> : null}
      {action ? <div className="mt-7 flex justify-center">{action}</div> : null}
    </div>
  );
}
