'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { ui } from '@/data/defaults';

/**
 * The error boundary for the public site.
 *
 * Next.js requires this to be a client component. Two things matter about it:
 *
 *  - It only catches errors in the `page` tree, not in the root layout. Anything
 *    that throws in the layout itself surfaces as a blank page — which is exactly
 *    why `src/lib/db.ts` is written so that it cannot throw at import time.
 *  - The digest is shown but the raw message is not. A stack trace on a school
 *    website tells a parent nothing and tells an attacker something.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[error] Kesalahan halaman', { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <section className="flex min-h-[80svh] items-center pt-[var(--nav-h)]">
      <div className="shell-wide">
        <p className="label text-[var(--color-accent)]">Kesalahan 500</p>

        <h1 className="display mt-8 text-[length:var(--step-8)] leading-[0.88]">
          {/* The heading used to repeat `ui.serverErrorTitle` verbatim on both
              lines, which rendered "Terjadi kesalahan. Terjadi kesalahan." The
              title is the plain statement; the second line is the promise that
              it is recoverable, and they must not be the same sentence. */}
          {ui.serverErrorTitle}
          <br />
          <em>Coba sekali lagi.</em>
        </h1>

        <p className="prose-body mt-8">{ui.serverErrorBody}</p>

        {error.digest ? (
          <p className="label mt-6 text-[var(--color-text-muted)]">Kode: {error.digest}</p>
        ) : null}

        <div className="mt-10 flex flex-wrap gap-3">
          <button type="button" onClick={reset} className="btn btn--solid">
            {ui.serverErrorCta}
            <span className="btn__arrow" aria-hidden="true">
              ↩
            </span>
          </button>
          <Link href="/" className="btn btn--ghost">
            {ui.backHome}
          </Link>
          <Link href="/kontak" className="btn btn--ghost">
            Hubungi Kami
          </Link>
        </div>
      </div>
    </section>
  );
}
