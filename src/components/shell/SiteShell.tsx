import { SmoothScroll } from '@/components/motion/SmoothScroll';
import { RevealObserver } from '@/components/motion/RevealObserver';
import { CustomCursor } from '@/components/motion/CustomCursor';
import { SiteHeader } from '@/components/navigation/SiteHeader';
import { SiteFooter } from '@/components/footer/SiteFooter';
import type { SchoolProfileContent } from '@/data/defaults';

/**
 * The public site's shell — everything that belongs to the *site* rather than to
 * a page.
 *
 * ## Why this is separate from the root layout
 *
 * The root layout is the only layout Next.js requires, and it is the only one
 * that may render `<html>` and `<body>`. It used to render this shell too, which
 * meant every route inherited it — including `/admin/*`.
 *
 * The dashboard is a tool, not a page of the school's website, and the two
 * shells cannot coexist: the site header is `position: fixed`, so on a dashboard
 * screen it floated over the sidebar and collided with it. Measured 2026-09-24
 * before the split: the site brand and the sidebar heading overlapped by
 * **2079 px²**, the public nav sat across the dashboard's own page title, the
 * custom pointer drew a black dot in the middle of a CMS form, Lenis took over
 * the scroll, and the document contained **two** `<main>` elements (invalid
 * HTML, and ambiguous for a screen reader).
 *
 * So the shell lives in a route group — `src/app/(situs)/layout.tsx` — and the
 * root layout keeps only what every route genuinely shares. `not-found.tsx`
 * stays at the root, because an unmatched URL is not inside any group, and it
 * renders this same component so a 404 still looks like the site.
 *
 * ## Why the parts are in this order
 *
 * The skip link comes first so it is the first thing a keyboard user reaches.
 * The three behaviour components render nothing; they only attach observers and
 * listeners. The header and footer are the visible frame, and `main` is what the
 * skip link targets — `tabIndex={-1}` so focus can actually land on it.
 */
export function SiteShell({
  profile,
  children,
}: {
  profile: SchoolProfileContent;
  children: React.ReactNode;
}) {
  return (
    <>
      <a className="skip-link" href="#konten">
        Lompat ke konten utama
      </a>
      <SmoothScroll />
      <RevealObserver />
      <CustomCursor />
      <SiteHeader schoolName={profile.schoolName} />
      <main id="konten" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter profile={profile} />
    </>
  );
}
