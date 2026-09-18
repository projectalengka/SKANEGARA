import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isAuthConfigured } from '@/lib/auth';
import { getSession } from '@/lib/session';
import { LoginForm } from '@/components/admin/LoginForm';

export const metadata: Metadata = {
  title: 'Masuk Dasbor',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * The admin login page.
 *
 * Rendered standalone — it sits outside the dashboard's route group so the
 * sidebar shell is not wrapped around a form the visitor is not yet authorised
 * to see.
 *
 * Two states are handled explicitly rather than by failing:
 *
 *  - **Already signed in.** Redirected straight through, so a stale bookmark does
 *    not show a login form to someone who is already logged in.
 *  - **Auth not configured.** A clear explanation of what to set, instead of a
 *    form that rejects every password. That distinction is the difference between
 *    a five-minute fix and an hour of debugging.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ lanjut?: string }>;
}) {
  const session = await getSession();
  if (session) redirect('/admin/dasbor');

  const { lanjut } = await searchParams;
  const returnTo = lanjut && lanjut.startsWith('/') && !lanjut.startsWith('//') ? lanjut : '/admin/dasbor';
  const configured = isAuthConfigured();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-ink)] px-[var(--gutter)] py-16">
      <div className="w-full max-w-md">
        <Link href="/" className="label inline-flex items-center gap-3 text-[var(--color-text-faint)]">
          <span className="h-2 w-2 bg-[var(--color-accent)]" aria-hidden="true" />
          Kembali ke situs
        </Link>

        <div className="mt-10 bg-[var(--color-paper)] px-7 py-9 sm:px-9 sm:py-11">
          <p className="label text-[var(--color-text-muted)]">Dasbor</p>
          <h1 className="display mt-4 text-[clamp(2rem,7vw,3rem)] leading-[0.95]">
            Masuk ke
            <br />
            <em>Dasbor.</em>
          </h1>

          <p className="mt-5 text-[var(--color-text-muted)]">
            Halaman ini khusus untuk administrator sekolah.
          </p>

          <div className="mt-9">
            {configured ? (
              <LoginForm returnTo={returnTo} />
            ) : (
              <div className="border-l-2 border-[var(--color-accent-deep)] bg-[var(--color-paper-warm)] px-5 py-5">
                <p className="label text-[var(--color-accent-deep)]">Belum dikonfigurasi</p>
                <p className="mt-3 text-[0.9375rem] text-[var(--color-text-muted)]">
                  Autentikasi belum diatur, sehingga login tidak dapat dilakukan. Isi variabel berikut
                  pada berkas <code className="font-[family-name:var(--font-mono)]">.env</code>, lalu
                  jalankan ulang aplikasi:
                </p>
                <ul className="mt-4 flex flex-col gap-2 font-[family-name:var(--font-mono)] text-[0.8125rem] text-[var(--color-text)]">
                  <li>AUTH_SECRET</li>
                  <li>ADMIN_EMAIL</li>
                  <li>ADMIN_PASSWORD</li>
                </ul>
                <p className="mt-4 text-[0.9375rem] text-[var(--color-text-muted)]">
                  Cara membuatnya dijelaskan pada <strong>README.md</strong>.
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="label mt-8 text-center text-[var(--color-text-faint)]">
          SMK Jayanegara — Dasbor Konten
        </p>
      </div>
    </main>
  );
}
