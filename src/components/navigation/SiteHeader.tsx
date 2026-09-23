'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { primaryNav } from '@/data/defaults';
import { lockPageScroll } from '@/lib/scroll-lock';
import { cn } from '@/lib/utils';

/**
 * The site header.
 *
 * Desktop is a fixed, minimal bar: transparent over the hero, then a hairline and
 * a faint backdrop once the page has scrolled. "Transparent at top" is the whole
 * reason the hero reads as full-bleed; the moment the bar gets a background the
 * hero becomes a panel below a toolbar.
 *
 * ## Theme
 *
 * The bar carries `data-on-dark`, which is true only on the home page, only
 * before it has scrolled, and only while the overlay is closed — the three
 * conditions under which it is genuinely sitting on the dark hero. The colours
 * themselves are descendant tokens owned by `.site-header` in the stylesheet;
 * this component only states *when* the dark theme applies. Every other route
 * keeps the white bar, because the flag is never set there.
 *
 * ## Mobile overlay
 *
 * Three details that make it feel deliberate rather than default:
 *
 *  - The overlay traps keyboard focus between the toggle and the links inside
 *    it, and moves focus to the first link on open. A menu you can tab behind
 *    is a menu that looks broken to a keyboard user.
 *  - `main` and `footer` are marked `inert` while it is open, so a screen reader
 *    cannot wander back into the page underneath. The previous values are
 *    captured and restored rather than assumed to be `false`.
 *  - Escape closes it, links close it (including a link to the current route,
 *    where the pathname never changes), and it closes when the viewport grows
 *    past the breakpoint.
 *
 * `lockPageScroll` owns the scroll lock — on iOS that needs `position: fixed`
 * rather than `overflow: hidden`, and the offset has to be stored and restored.
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

  // The dark theme is true only where the hero is dark: the home page, before
  // the bar has gained its own background, and while the overlay is not
  // covering it. The stylesheet keys off this attribute.
  const onDark = pathname === '/' && !scrolled && !menuOpen;

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

  // Everything the overlay owns while it is open: scroll lock, focus, the trap,
  // Escape, the short-screen close, and the `inert` curtain over the page
  // behind it. One effect, because they all share the same lifetime.
  useEffect(() => {
    if (!menuOpen) return;

    const unlock = lockPageScroll();

    const panel = panelRef.current;
    const toggle = toggleRef.current;

    // The cycle is the toggle plus everything focusable inside the panel. The
    // toggle comes first in DOM order, so tabbing forward off the last link
    // wraps to the toggle and shift-tabbing off the toggle wraps to the last
    // link.
    const focusable = (): HTMLElement[] => {
      const inside = panel
        ? Array.from(panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'))
        : [];
      return [toggle, ...inside].filter((node): node is HTMLElement => node !== null);
    };

    // Focus the first link rather than the toggle: the menu is the thing that
    // just opened, so focus belongs inside it.
    panel?.querySelector<HTMLElement>('a[href], button:not([disabled])')?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        toggle?.focus();
        return;
      }

      if (event.key !== 'Tab') return;

      const nodes = focusable();
      if (nodes.length === 0) return;

      // `noUncheckedIndexedAccess` is not enabled in this project, but the two
      // ends are still read defensively: `focusable()` builds the array from a
      // DOM query, so an empty list is a real runtime possibility and a bare
      // `nodes[0].focus()` would be a crash rather than a no-op.
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (!first || !last) return;

      const active = document.activeElement as HTMLElement | null;
      const outside = !active || !nodes.includes(active);

      if (event.shiftKey && (active === first || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    };

    // The overlay only exists below `lg`. Growing past it while the menu is
    // open would leave a fullscreen panel on a desktop layout, so close.
    const onResize = () => {
      if (window.innerWidth >= 1024) setOpen(false);
    };

    // Capture the previous `inert` values instead of assuming `false`: the
    // element may already have been inert for a reason of its own, and the
    // cleanup must not silently un-inert it.
    const behind: Array<[HTMLElement, boolean]> = [];
    for (const node of [document.getElementById('konten'), document.querySelector('footer')]) {
      if (node instanceof HTMLElement) {
        behind.push([node, node.inert]);
        node.inert = true;
      }
    }

    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      for (const [node, value] of behind) node.inert = value;
      unlock();
    };
  }, [menuOpen]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header
        className={cn(
          'site-header fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500',
          scrolled || menuOpen
            ? 'border-b border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-paper)_88%,transparent)] backdrop-blur-md'
            : 'border-b border-transparent bg-transparent',
        )}
        data-on-dark={onDark}
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
              <span className="display text-[length:var(--step-2)] leading-none tracking-tight">
                {schoolName.replace(/^SMK\s+/i, '')}
              </span>
            </span>
          </Link>

          <nav aria-label="Navigasi utama" className="hidden lg:block" data-hero="nav">
            <ul className="flex items-center gap-1">
              {primaryNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    className={cn(
                      'group relative block px-3 py-2 font-[family-name:var(--font-mono)] text-[length:var(--step--2)] uppercase tracking-[0.12em] transition-colors duration-300',
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

          <div className="flex items-center gap-3" data-hero="nav">
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
              className="relative flex h-11 w-11 items-center justify-center lg:hidden"
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
        transition rather than a mount) but marked `inert` and hidden from the
        accessibility tree when closed, so it is not reachable by keyboard or
        screen reader while invisible. `inert` is passed as a real boolean — the
        empty-string cast it used to carry was a workaround for a React version
        that no longer needs it.
      */}
      <div
        ref={panelRef}
        id="menu-seluler"
        aria-hidden={!menuOpen}
        inert={!menuOpen}
        data-lenis-prevent
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

        {/*
          The panel scrolls rather than clips. On a short screen — a phone in
          landscape, or a small window — the list plus the CTA is taller than
          the viewport, and `justify-center` alone would put the top of the list
          out of reach. `my-auto` on the inner block centres the content when
          there is room and collapses to zero when there is not, which is what
          keeps the first link reachable.
        */}
        <nav
          aria-label="Navigasi seluler"
          className="relative flex h-full flex-col overflow-y-auto overscroll-contain pt-[var(--nav-h)] pb-10"
          data-lenis-prevent
        >
          <div className="my-auto w-full">
            <ul className="shell flex flex-col">
              {primaryNav.map((item, index) => (
                <li key={item.href} className="border-b border-[var(--color-line)] last:border-b-0">
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    onClick={() => setOpen(false)}
                    style={{
                      transitionDelay: menuOpen ? `${120 + index * 55}ms` : '0ms',
                      transitionTimingFunction: 'var(--ease-out)',
                    }}
                    className={cn(
                      'display flex items-baseline gap-4 py-4 text-[length:var(--step-5)] transition-[opacity,transform] duration-700',
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
              <Link href="/kontak" className="btn btn--solid w-full justify-between" onClick={() => setOpen(false)}>
                Hubungi Kami
                <span className="btn__arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </div>
          </div>
        </nav>
      </div>
    </>
  );
}
