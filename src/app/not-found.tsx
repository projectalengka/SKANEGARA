import Link from 'next/link';
import { ui } from '@/data/defaults';
import { getSchoolProfile } from '@/lib/content';
import { SiteShell } from '@/components/shell/SiteShell';

export const metadata = { title: 'Halaman tidak ditemukan' };

/**
 * 404.
 *
 * A real page, not a bare line of text. The one thing it must do is offer a way
 * out — a 404 that only apologises forces the visitor to reach for the browser's
 * back button, which on a school site often means they leave.
 *
 * It stays at the root of `src/app/` rather than moving into the `(situs)`
 * group, because an unmatched URL does not belong to any group: Next.js resolves
 * it against the root layout, and a `not-found.tsx` inside a route group only
 * catches `notFound()` calls made by pages *in that group*. So this file renders
 * the site shell itself — the same `SiteShell` the `(situs)` layout uses — and a
 * mistyped address still arrives with the school's header and footer around it.
 */
export default async function NotFound() {
  const profile = await getSchoolProfile();

  return (
    <SiteShell profile={profile}>
      <section className="flex min-h-[80svh] items-center pt-[var(--nav-h)]">
        <div className="shell-wide">
          <p className="label text-[var(--color-accent)]">404</p>

          <h1 className="display mt-8 text-[length:var(--step-8)] leading-[0.88]">
            Halaman
            <br />
            <em>tidak ditemukan.</em>
          </h1>

          <p className="prose-body mt-8">{ui.notFoundBody}</p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/" className="btn btn--solid">
              {ui.notFoundCta}
              <span className="btn__arrow" aria-hidden="true">
                →
              </span>
            </Link>
            <Link href="/kontak" className="btn btn--ghost">
              Hubungi Kami
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
