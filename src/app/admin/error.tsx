'use client';

import Link from 'next/link';
import { useEffect } from 'react';

/**
 * The error boundary for the dashboard.
 *
 * It exists because the public error boundary now lives in the `(situs)` route
 * group and therefore no longer covers `/admin`. Without this file, an error
 * inside the dashboard would fall through to Next.js's built-in error page —
 * a blank, unstyled screen with no way back into the CMS.
 *
 * The design follows the dashboard rather than the website: no hero, no
 * full-viewport drama, and a route back to `/admin/dasbor` rather than to the
 * homepage. Someone who is halfway through writing an article is not helped by
 * being offered the school's front page.
 *
 * The digest is shown, the raw message is not — the same rule as the public
 * boundary, for the same reason: a stack trace tells the person holding the
 * laptop nothing useful.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[admin] Kesalahan halaman dasbor', {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8">
      <p className="label text-[var(--color-accent-deep)]">Kesalahan</p>

      <h1 className="display mt-4 text-[length:var(--step-5)] leading-[0.95]">
        Halaman ini gagal dimuat.
      </h1>

      <p className="mt-4 max-w-2xl text-[var(--color-text-muted)]">
        Data yang sudah tersimpan tidak terpengaruh. Coba muat ulang halaman; bila tetap gagal,
        periksa halaman Pengaturan untuk melihat layanan mana yang belum tersambung.
      </p>

      {error.digest ? (
        <p className="label mt-6 text-[var(--color-text-faint)]">Kode: {error.digest}</p>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="btn btn--solid">
          Coba lagi
          <span className="btn__arrow" aria-hidden="true">
            ↩
          </span>
        </button>
        <Link href="/admin/dasbor" className="btn btn--ghost">
          Ke Dasbor
        </Link>
        <Link href="/admin/pengaturan" className="btn btn--ghost">
          Pengaturan
        </Link>
      </div>
    </div>
  );
}
