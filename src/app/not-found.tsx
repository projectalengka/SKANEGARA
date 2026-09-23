import Link from 'next/link';
import { ui } from '@/data/defaults';

export const metadata = { title: 'Halaman tidak ditemukan' };

/**
 * 404.
 *
 * A real page, not a bare line of text. The one thing it must do is offer a way
 * out — a 404 that only apologises forces the visitor to reach for the browser's
 * back button, which on a school site often means they leave.
 */
export default function NotFound() {
  return (
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
  );
}
