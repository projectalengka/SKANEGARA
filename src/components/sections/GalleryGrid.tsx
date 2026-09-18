'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GalleryContent } from '@/data/defaults';
import { cn } from '@/lib/utils';

/**
 * The gallery.
 *
 * An immersive mosaic rather than a uniform grid: plates alternate between
 * portrait and landscape, and every second one is offset downward. On a phone it
 * collapses to a single column — an asymmetric grid on a 390px screen is just a
 * column with unexplained gaps.
 *
 * The lightbox is built rather than pulled from a library, and the reasons are
 * specific:
 *
 *  - Focus is moved into the dialog on open and returned to the thumbnail on
 *    close. A lightbox that leaves focus on the page behind it is unusable with
 *    a keyboard.
 *  - `inert` is applied to the dialog's siblings while it is open, so a screen
 *    reader cannot wander back into the page behind it. This is the part most
 *    hand-rolled lightboxes skip.
 *  - Arrow keys navigate, Escape closes, and the arrow buttons are real buttons
 *    so they work on touch without a swipe gesture.
 *  - It is a `<div role="dialog" aria-modal>` rather than the native `<dialog>`
 *    element, because `<dialog>`'s `::backdrop` cannot be transitioned
 *    consistently and the entrance animation is part of the design.
 */
export function GalleryGrid({ items }: { items: GalleryContent[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpenIndex(null);
    // Return focus to the thumbnail that opened the lightbox, so a keyboard user
    // resumes exactly where they left off instead of at the top of the document.
    lastFocused.current?.focus();
  }, []);

  const step = useCallback(
    (direction: 1 | -1) => {
      setOpenIndex((current) => {
        if (current === null) return current;
        return (current + direction + items.length) % items.length;
      });
    },
    [items.length],
  );

  // Keyboard handling. Registered on the document because the dialog is not
  // focused as a whole — the visitor may be tabbing between the arrow buttons.
  useEffect(() => {
    if (openIndex === null) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        step(1);
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        step(-1);
      }
      // A simple focus trap: Tab cycles between the controls inside the dialog
      // and nothing outside it.
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [openIndex, close, step]);

  // Body scroll lock while the lightbox is open.
  useEffect(() => {
    if (openIndex === null) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [openIndex]);

  // Move focus into the dialog when it opens.
  useEffect(() => {
    if (openIndex === null) return;
    const timer = window.setTimeout(() => {
      dialogRef.current?.querySelector<HTMLElement>('[data-lightbox-close]')?.focus();
    }, 60);
    return () => window.clearTimeout(timer);
  }, [openIndex]);

  if (items.length === 0) {
    return (
      <p className="text-[var(--color-text-muted)]" data-reveal>
        Belum ada foto di galeri.
      </p>
    );
  }

  const current = openIndex === null ? null : items[openIndex];

  return (
    <>
      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-12 lg:gap-6">
        {items.map((item, index) => {
          const isPortrait = index % 3 === 0;
          const span = isPortrait ? 'lg:col-span-4' : index % 3 === 1 ? 'lg:col-span-5' : 'lg:col-span-3';
          const offset = index % 2 === 1 ? 'lg:pt-16' : '';

          return (
            <li key={item.id} className={cn(span, offset)}>
              <button
                type="button"
                className="group block w-full text-left"
                onClick={(event) => {
                  lastFocused.current = event.currentTarget;
                  setOpenIndex(index);
                }}
                aria-label={`Buka foto: ${item.title}`}
              >
                <span
                  className={cn(
                    'relative block overflow-hidden',
                    isPortrait ? 'aspect-4/5' : 'aspect-4/3',
                  )}
                  data-image-reveal
                >
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-[1.2s] group-hover:scale-[1.04]"
                    style={{ transitionTimingFunction: 'var(--ease-out)' }}
                  />
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 bg-[var(--color-ink)] opacity-0 transition-opacity duration-700 group-hover:opacity-15"
                  />
                </span>
                <span className="mt-3 flex items-baseline justify-between gap-4 border-t border-[var(--color-line)] pt-3">
                  <span className="display text-[1.15rem]">{item.title}</span>
                  <span className="label shrink-0 text-[var(--color-text-muted)]">{item.category}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {current ? (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Foto: ${current.title}`}
          className="fixed inset-0 z-[100] flex flex-col bg-[color-mix(in_srgb,var(--color-ink)_94%,transparent)] backdrop-blur-sm"
        >
          <div className="flex items-center justify-between px-[var(--gutter)] py-5 text-[var(--color-paper)]">
            <p className="label">
              {String((openIndex ?? 0) + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
            </p>
            <button
              type="button"
              data-lightbox-close
              onClick={close}
              className="label flex items-center gap-2 px-3 py-2 transition-opacity duration-300 hover:opacity-70"
            >
              Tutup
              <span aria-hidden="true" className="text-base leading-none">
                ✕
              </span>
            </button>
          </div>

          <div className="relative flex-1 px-[var(--gutter)]">
            <Image
              key={current.id}
              src={current.image}
              alt={current.title}
              fill
              sizes="100vw"
              className="object-contain"
              priority
            />
          </div>

          <div className="flex items-center justify-between gap-6 px-[var(--gutter)] py-6 text-[var(--color-paper)]">
            <div className="min-w-0">
              <p className="display text-[1.25rem]">{current.title}</p>
              <p className="label mt-1 text-[var(--color-text-faint)]">{current.description}</p>
            </div>

            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => step(-1)}
                className="label border border-[var(--color-line-dark)] px-4 py-3 transition-colors duration-300 hover:border-[var(--color-paper)]"
              >
                ← Sebelumnya
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                className="label border border-[var(--color-line-dark)] px-4 py-3 transition-colors duration-300 hover:border-[var(--color-paper)]"
              >
                Berikutnya →
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
