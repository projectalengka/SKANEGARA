'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { adminNav } from '@/app/admin/tags';
import { logout } from '@/app/admin/auth-actions';
import { cn } from '@/lib/utils';

/**
 * The dashboard shell.
 *
 * A sidebar on desktop, a slide-over on mobile. Deliberately plain: the brief
 * says the admin should be simple, and that is the right call — a CMS is a tool
 * used for five minutes at a time to change a phone number, and visual flourish
 * there is friction rather than polish.
 *
 * The sidebar is a client component because it needs the active path and the
 * mobile open state. Everything it wraps is server-rendered.
 */
export function AdminShell({
  email,
  mode,
  storage,
  schoolName,
  sample,
  sampleRaw,
  sampleRecognised,
  children,
}: {
  email: string;
  mode: 'database' | 'seed';
  /**
   * Whether image storage is usable, so images can actually be uploaded.
   *
   * Storage is the project's own database now, so in practice this tracks
   * `DATABASE_URL` — but it is passed in rather than derived here, because
   * "the database is reachable" and "uploads can work" are separate questions
   * and this component only needs the answer to the second one.
   *
   * Reported here for the same reason the sample switch is: without it, the
   * upload field looks like it works. Choosing a file produces a progress
   * message and then a failure, and the only way to find out why is to open
   * another page (`/admin/pengaturan`) and read a diagnostic list. A capability
   * that is off should say so where it is used.
   */
  storage: boolean;
  /** From the content layer, not a literal — the profile is editable. */
  schoolName: string;
  /**
   * Whether `[CONTOH]` placeholder content is being served publicly.
   *
   * Surfaced here rather than left to the owner to remember. A switch that
   * changes what the public site shows, without saying so anywhere, is a trap:
   * the administrator would see `[CONTOH]` articles in the dashboard and have
   * no way to tell whether visitors see them too.
   */
  sample: boolean;
  /**
   * The raw `SAMPLE_DATA` value this process actually saw, verbatim.
   *
   * Present so the dashboard can tell "deliberately off" apart from "set to
   * something unrecognised". During the audit those two states were
   * indistinguishable from the outside — `.env` said `on`, the site was empty,
   * and nothing explained why. Passing the raw string up means a typo is
   * visible in the UI instead of being silently swallowed.
   */
  sampleRaw?: string;
  /**
   * Whether that raw value is one the application understands.
   *
   * Separate from `sample` because the default is now on: an unrecognised value
   * does not change what visitors see, so `sample` alone would leave the owner
   * believing their edit took effect. This lets the sidebar say "that value is
   * not recognised, the default is being used" instead.
   */
  sampleRecognised?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen bg-[var(--color-paper-warm)] lg:grid lg:grid-cols-[17rem_1fr]">
      <a className="skip-link" href="#dasbor-konten">
        Lompat ke konten utama
      </a>

      {/* Mobile bar. */}
      <div className="flex items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-paper)] px-5 py-4 lg:hidden">
        <Link href="/admin/dasbor" className="flex items-center gap-3">
          <span className="h-2 w-2 bg-[var(--color-accent)]" aria-hidden="true" />
          <span className="display text-[length:var(--step-2)]">Dasbor</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="dasbor-nav"
          className="label border border-[var(--color-line)] px-3 py-2"
        >
          {open ? 'Tutup' : 'Menu'}
        </button>
      </div>

      <aside
        id="dasbor-nav"
        className={cn(
          'border-b border-[var(--color-line)] bg-[var(--color-paper)] lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-r lg:border-b-0',
          open ? 'block' : 'hidden lg:block',
        )}
      >
        <div className="hidden items-center gap-3 border-b border-[var(--color-line)] px-6 py-6 lg:flex">
          <span className="h-2.5 w-2.5 bg-[var(--color-accent)]" aria-hidden="true" />
          <div className="leading-none">
            <p className="label text-[var(--color-text-muted)]">{schoolName}</p>
            <p className="display mt-1.5 text-[length:var(--step-2)]">Dasbor</p>
          </div>
        </div>

        <nav aria-label="Navigasi dasbor" className="px-3 py-5">
          {adminNav.map((group) => (
            <div key={group.label} className="mb-7 last:mb-0">
              <p className="label px-3 pb-3 text-[var(--color-text-faint)]">{group.label}</p>
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive(item.href) ? 'page' : undefined}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'block px-3 py-2.5 text-[length:var(--step-0)] transition-colors duration-300',
                        isActive(item.href)
                          ? 'bg-[var(--color-ink)] text-[var(--color-paper)]'
                          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-paper-warm)] hover:text-[var(--color-text)]',
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-[var(--color-line)] px-6 py-5">
          <p className="label text-[var(--color-text-faint)]">Masuk sebagai</p>
          <p className="mt-2 truncate text-[length:var(--step-0)]">{email}</p>

          <p className="mt-4">
            <span
              className={cn(
                'label inline-flex items-center gap-2 px-2 py-1',
                mode === 'database'
                  ? 'bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)] text-[var(--color-accent-deep)]'
                  : 'bg-[var(--color-paper-warm)] text-[var(--color-text-muted)]',
              )}
            >
              <span aria-hidden="true" className="h-1.5 w-1.5 bg-current" />
              {mode === 'database' ? 'Basis data aktif' : 'Mode cadangan'}
            </span>
          </p>

          {!storage ? (
            <div className="mt-3 border border-[var(--color-accent-deep)] px-3 py-3">
              <p className="label text-[var(--color-accent-deep)]">Unggah gambar belum aktif</p>
              <p className="mt-2 text-[length:var(--step--1)] text-[var(--color-text-muted)]">
                Gambar disimpan di basis data, jadi unggahan butuh koneksi basis data. Isi{' '}
                <code>DATABASE_URL</code> di berkas <code>.env</code>, jalankan migrasi, lalu mulai
                ulang server. Langkahnya ada di <strong>README.md</strong> bagian 5.
              </p>
            </div>
          ) : null}

          {sample ? (
            <div className="mt-3 border border-[var(--color-accent)] px-3 py-3">
              <p className="label text-[var(--color-accent-deep)]">Mode contoh aktif</p>
              <p className="mt-2 text-[length:var(--step--1)] text-[var(--color-text-muted)]">
                Pengunjung melihat isian bertanda <strong>[CONTOH]</strong> pada bagian yang belum
                Anda tulis. Isian itu hilang sendiri begitu Anda menyimpan tulisan asli, jadi tidak
                ada yang perlu dibereskan setelahnya. Untuk mematikan seluruhnya, isi{' '}
                <code>SAMPLE_DATA=off</code> lalu mulai ulang server.
              </p>
            </div>
          ) : (
            <div className="mt-3 border border-[var(--color-line)] px-3 py-3">
              <p className="label text-[var(--color-text-muted)]">Data contoh dimatikan</p>
              <p className="mt-2 text-[length:var(--step--1)] text-[var(--color-text-muted)]">
                Bagian yang belum Anda tulis tampil kosong. Hapus baris <code>SAMPLE_DATA</code>,
                atau isi dengan <code>on</code>, lalu mulai ulang server, untuk menampilkan isian
                contoh kembali.
              </p>
            </div>
          )}

          {/*
            A value this process does not understand. Now that the default is on,
            this no longer changes what visitors see — but the owner still needs
            to know that the value they typed is not the one in use, otherwise
            their edit appears to have done nothing at all.
          */}
          {sampleRecognised === false ? (
            <div className="mt-3 border border-[var(--color-line)] px-3 py-3">
              <p className="label text-[var(--color-text-muted)]">SAMPLE_DATA tidak dikenali</p>
              <p className="mt-2 text-[length:var(--step--1)] text-[var(--color-text-muted)]">
                Nilainya terbaca <code>{JSON.stringify(sampleRaw)}</code>, jadi yang dipakai adalah
                bawaan. Yang dikenali hanya <code>on</code>, <code>true</code>, <code>1</code>{' '}
                (menyala) dan <code>off</code>, <code>false</code>, <code>0</code> (mati).
              </p>
            </div>
          ) : null}

          <div className="mt-5 flex flex-col gap-2">
            <Link href="/" className="link-line text-[length:var(--step-0)]">
              Lihat situs →
            </Link>
            <form action={logout}>
              <button type="submit" className="link-line text-[length:var(--step-0)]">
                Keluar
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main id="dasbor-konten" className="min-w-0 px-5 py-8 sm:px-8 sm:py-10 lg:px-12">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
    </div>
  );
}

/**
 * A dashboard page heading.
 *
 * The action slot sits opposite the title so a "Tambah" button is always in the
 * same place on every screen — a CMS where the primary action moves is a CMS
 * people misclick.
 *
 * `level` exists because `/admin/profil` renders two of these on one page: the
 * page title and the programmes block beneath it. Both used to emit an `<h1>`,
 * which gives the document two top-level headings and leaves a screen reader
 * user with no idea which one the page is about. The first heading on a page is
 * `1`; anything nested under it passes `level={2}`.
 */
export function AdminHeading({
  eyebrow,
  title,
  description,
  action,
  level = 1,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  level?: 1 | 2;
}) {
  const Heading = level === 1 ? 'h1' : 'h2';

  return (
    <header className="mb-9 flex flex-col gap-5 border-b border-[var(--color-line)] pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="label text-[var(--color-accent)]">{eyebrow}</p> : null}
        <Heading
          className={
            level === 1
              ? 'display mt-3 text-[length:var(--step-5)] leading-[0.95]'
              : 'display mt-3 text-[length:var(--step-4)] leading-[0.95]'
          }
        >
          {title}
        </Heading>
        {description ? (
          <p className="mt-3 max-w-2xl text-[var(--color-text-muted)]">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

/** A card that groups a form or a list. */
export function AdminPanel({
  title,
  description,
  children,
  footer,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="border border-[var(--color-line)] bg-[var(--color-paper)]">
      {title ? (
        <header className="border-b border-[var(--color-line)] px-6 py-5">
          <h2 className="display text-[length:var(--step-3)]">{title}</h2>
          {description ? <p className="mt-2 text-[length:var(--step-0)] text-[var(--color-text-muted)]">{description}</p> : null}
        </header>
      ) : null}

      <div className="px-6 py-6">{children}</div>

      {footer ? <div className="border-t border-[var(--color-line)] px-6 py-5">{footer}</div> : null}
    </section>
  );
}
