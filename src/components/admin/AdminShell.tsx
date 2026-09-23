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
  schoolName,
  sample,
  sampleRaw,
  children,
}: {
  email: string;
  mode: 'database' | 'seed';
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
   * visible in the UI instead of being silently treated as off.
   */
  sampleRaw?: string;
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

          {sample ? (
            <div className="mt-3 border border-[var(--color-accent)] px-3 py-3">
              <p className="label text-[var(--color-accent-deep)]">Mode contoh aktif</p>
              <p className="mt-2 text-[length:var(--step--1)] text-[var(--color-text-muted)]">
                Pengunjung melihat data bertanda <strong>[CONTOH]</strong>. Matikan dengan menghapus{' '}
                <code>SAMPLE_DATA</code> dari berkas <code>.env</code>, lalu mulai ulang server.
              </p>
            </div>
          ) : null}

          {/*
            The other half of the switch: set, but not recognised by this
            process. Without this branch the two states are indistinguishable
            from a page — the site is simply empty either way — and the owner is
            left guessing whether they typed it wrong or the server is stale.
          */}
          {!sample && sampleRaw !== undefined ? (
            <div className="mt-3 border border-[var(--color-line)] px-3 py-3">
              <p className="label text-[var(--color-text-muted)]">SAMPLE_DATA tidak dikenali</p>
              <p className="mt-2 text-[length:var(--step--1)] text-[var(--color-text-muted)]">
                Nilainya terbaca <code>{JSON.stringify(sampleRaw)}</code>, jadi situs memakai
                keadaan kosong. Yang dikenali hanya <code>on</code>, <code>true</code>, atau{' '}
                <code>1</code>. Perbaiki nilainya, lalu mulai ulang server.
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
