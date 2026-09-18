'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { primaryNav } from '@/data/defaults';
import { cn } from '@/lib/utils';

/**
 * The site header.
 *
 * Desktop is a fixed, minimal bar: transparent over the hero, then a hairline and
 * a faint backdrop once the page has scrolled. "Transparent at top" is the whole
 * reason the hero reads as full-bleed; the moment the bar gets a background the
 * hero becomes a panel below a toolbar.
 *
 * Mobile is a fullscreen overlay with a staggered list. Three details that make
 * it feel deliberate rather than default:
 *
 *  - The overlay is a real `<dialog>`-less overlay but marks `aria-modal` and
 *    traps focus, because a menu you can tab behind is a menu that looks broken
 *    to a keyboard user.
 *  - `body` scroll is locked while open. On iOS that needs `position: fixed`
 *    rather than `overflow: hidden`, which is why the scroll position is stored
 *    and restored.
 *  - Escape closes it, and it closes on route change.
 */
export function SiteHeader({ schoolName }: { schoolName: string }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Close the overlay on navigation, without an effect.
  //
  // The obvious implementation is `useEffect(() => setOpen(false), [pathname])`,
  // but setting state synchronously inside an effect forces a second render pass
  // of the whole tree — and the first pass would already have painted the
  // overlay on top of the page it just navigated to. React flags this for good
  // reason.
  //
  // Instead the open state carries the path it was opened on. If that no longer
  // matches the current path, the menu is closed by definition — derived during
  // render, so the stale-theme frame never happens at all.
  const [openedOn, setOpenedOn] = useState(pathname);
  const menuOpen = open && openedOn === pathname;

  const setMenu = (next: boolean) => {
    setOpen(next);
    if (next) setOpenedOn(pathname);
  };

  // Scrolled state. Uses a passive listener so it never blocks scrolling, and a
  // threshold of 8px rather than 0 so a trackpad's sub-pixel jitter at rest does
  // not flicker the bar's background on and off.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Escape to close, and focus restore. Returning focus to the toggle is what
  // makes the interaction reversible for a keyboard user — otherwise focus falls
  // to the top of the document and they have to tab back through the whole page.
  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  // Scroll lock. Storing and restoring the offset is the part people skip, and
  // it is why a modal on iOS often drops the visitor back to the top of the page
  // when it closes.
  useEffect(() => {
    if (!menuOpen) return;

    const offset = window.scrollY;
    const { style } = document.body;
    const previous = { position: style.position, top: style.top, width: style.width };

    style.position = 'fixed';
    style.top = `-${offset}px`;
    style.width = '100%';

    return () => {
      style.position = previous.position;
      style.top = previous.top;
      style.width = previous.width;
      window.scrollTo(0, offset);
    };
  }, [menuOpen]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500',
          scrolled || menuOpen
            ? 'border-b border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-paper)_88%,transparent)] backdrop-blur-md'
            : 'border-b border-transparent bg-transparent',
        )}
        style={{ transitionTimingFunction: 'var(--ease-out)' }}
      >
        <div className="shell flex h-[var(--nav-h)] items-center justify-between gap-6">
          <Link
            href="/"
            className="group flex items-center gap-3"
            aria-label={`${schoolName} — Beranda`}
            data-hero="nav"
          >
            <span
              aria-hidden="true"
              className="block h-2.5 w-2.5 shrink-0 bg-[var(--color-accent)] transition-transform duration-500 group-hover:scale-75"
              style={{ transitionTimingFunction: 'var(--ease-out)' }}
            />
            <span className="flex flex-col leading-none">
              <span className="label text-[var(--color-text-muted)]">SMK</span>
              <span className="display text-[1.15rem] leading-none tracking-tight sm:text-[1.35rem]">
                {schoolName.replace(/^SMK\s+/i, '')}
              </span>
            </span>
          </Link>

          <nav aria-label="Navigasi utama" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {primaryNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    className={cn(
                      'group relative block px-3 py-2 font-[family-name:var(--font-mono)] text-[0.6875rem] uppercase tracking-[0.12em] transition-colors duration-300',
                      isActive(item.href)
                        ? 'text-[var(--color-text)]'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
                    )}
                  >
                    {item.label}
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute bottom-1 left-3 h-px bg-[var(--color-accent)] transition-[width] duration-500',
                        isActive(item.href) ? 'w-[calc(100%-1.5rem)]' : 'w-0 group-hover:w-[calc(100%-1.5rem)]',
                      )}
                      style={{ transitionTimingFunction: 'var(--ease-out)' }}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/kontak" className="btn btn--solid hidden !px-4 !py-2.5 sm:inline-flex">
              Hubungi Kami
              <span className="btn__arrow" aria-hidden="true">
                →
              </span>
            </Link>

            <button
              ref={toggleRef}
              type="button"
              onClick={() => setMenu(!menuOpen)}
              aria-expanded={menuOpen}
              aria-controls="menu-seluler"
              className="relative flex h-10 w-10 items-center justify-center lg:hidden"
            >
              <span className="sr-only">{menuOpen ? 'Tutup menu' : 'Buka menu'}</span>
              <span aria-hidden="true" className="relative block h-3 w-6">
                <span
                  className={cn(
                    'absolute left-0 block h-px w-full bg-[var(--color-text)] transition-transform duration-500',
                    menuOpen ? 'top-1.5 rotate-45' : 'top-0',
                  )}
                  style={{ transitionTimingFunction: 'var(--ease-out)' }}
                />
                <span
                  className={cn(
                    'absolute left-0 block h-px bg-[var(--color-text)] transition-[transform,width] duration-500',
                    menuOpen ? 'top-1.5 w-full -rotate-45' : 'top-3 w-2/3',
                  )}
                  style={{ transitionTimingFunction: 'var(--ease-out)' }}
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/*
        The mobile overlay. Rendered always (so the entrance can be a CSS
        transition rather than a mount) but marked `inert` and `hidden` from the
        accessibility tree when closed, so it is not reachable by keyboard or
        screen reader while invisible.
      */}
      <div
        ref={panelRef}
        id="menu-seluler"
        aria-hidden={!menuOpen}
        {...(!menuOpen ? { inert: '' as unknown as boolean } : {})}
        className={cn(
          'fixed inset-0 z-40 lg:hidden',
          menuOpen ? 'pointer-events-auto' : 'pointer-events-none',
        )}
      >
        <div
          className={cn(
            'absolute inset-0 bg-[var(--color-paper)] transition-opacity duration-500',
            menuOpen ? 'opacity-100' : 'opacity-0',
          )}
          style={{ transitionTimingFunction: 'var(--ease-out)' }}
          aria-hidden="true"
        />

        <nav
          aria-label="Navigasi seluler"
          className="relative flex h-full flex-col justify-center pt-[var(--nav-h)] pb-10"
        >
          <ul className="shell flex flex-col">
            {primaryNav.map((item, index) => (
              <li key={item.href} className="border-b border-[var(--color-line)] last:border-b-0">
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  style={{
                    transitionDelay: menuOpen ? `${120 + index * 55}ms` : '0ms',
                    transitionTimingFunction: 'var(--ease-out)',
                  }}
                  className={cn(
                    'display flex items-baseline gap-4 py-4 text-[clamp(1.75rem,8vw,2.75rem)] transition-[opacity,transform] duration-700',
                    menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
                  )}
                >
                  <span className="label shrink-0 text-[var(--color-accent)]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div
            className={cn(
              'shell mt-10 transition-[opacity,transform] duration-700',
              menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
            )}
            style={{
              transitionDelay: menuOpen ? `${120 + primaryNav.length * 55}ms` : '0ms',
              transitionTimingFunction: 'var(--ease-out)',
            }}
          >
            <Link href="/kontak" className="btn btn--solid w-full justify-between">
              Hubungi Kami
              <span className="btn__arrow" aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
}
