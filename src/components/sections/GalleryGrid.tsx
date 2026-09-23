'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { isPlaceholder, type GalleryContent } from '@/data/defaults';
import { lockPageScroll } from '@/lib/scroll-lock';
import { cn } from '@/lib/utils';

/**
 * The gallery.
 *
 * An immersive mosaic rather than a uniform grid: plates alternate between
 * portrait and landscape, and every second one is offset downward. On a phone it
 * collapses to a single column — an asymmetric grid on a 390px screen is just a
 * column with unexplained gaps. The generous `gap-y` is what stops the vertical
 * offset from reading as a mistake rather than a rhythm.
 *
 * The lightbox is built rather than pulled from a library, and the reasons are
 * specific:
 *
 *  - It is a real `<dialog>` opened with `showModal()`. The browser then gives
 *    us the modal behaviour for free: the dialog is promoted to the top layer,
 *    everything behind it is inert, focus is trapped, and Escape is a `cancel`
 *    event rather than something we have to police. The hand-rolled
 *    `role="dialog"` + manual `inert` + manual Tab trap this replaced was an
 *    approximation of all of that, and it drifted.
 *  - Focus is moved to the close control on open and returned to the thumbnail
 *    on close. A lightbox that leaves focus on the page behind it is unusable
 *    with a keyboard.
 *  - Arrow keys navigate, Escape closes, and the arrows are real buttons so they
 *    work on touch without a swipe gesture.
 *
 * Every effect below keys off the boolean `isOpen`, never off `openIndex`. That
 * distinction is the whole reason the lightbox does not fight itself: stepping
 * to the next photo changes `openIndex` but not `isOpen`, so the open effect —
 * which locks scroll and moves focus — does not re-run and throw the visitor's
 * focus back to the close button on every arrow press.
 */
export function GalleryGrid({ items }: { items: GalleryContent[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  const isOpen = openIndex !== null;

  const close = useCallback(() => {
    // Close the dialog synchronously so it leaves the top layer in the same
    // frame the content is cleared. Waiting for the effect would paint one
    // frame of an empty modal over the page.
    dialogRef.current?.close();
    setOpenIndex(null);
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

  // Open and close the native dialog. `showModal()` is what puts it in the top
  // layer and makes the rest of the document inert; there is no CSS-only
  // equivalent. Keyed on `isOpen` so arrow navigation does not reopen it.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Move focus to the close control once the dialog is up. Deferred a tick
  // because `showModal()` assigns its own initial focus after the effect runs.
  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const timer = window.setTimeout(() => {
      dialog.querySelector<HTMLElement>('[data-lightbox-close]')?.focus();
    }, 60);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  // Scroll lock, once per open session. Keyed on `isOpen` so stepping through
  // the photos does not unlock and relock the page.
  useEffect(() => {
    if (!isOpen) return;
    return lockPageScroll();
  }, [isOpen]);

  // The native `close` event is the single place state is reconciled, whether
  // the dialog was closed by our button, by Escape, or by the browser. Returning
  // focus here means every one of those paths is reversible for a keyboard user.
  const handleNativeClose = useCallback(() => {
    setOpenIndex(null);
    lastFocused.current?.focus();
  }, []);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      step(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      step(-1);
    }
  };

  if (items.length === 0) {
    return (
      <p className="text-[var(--color-text-muted)]" data-reveal>
        Belum ada foto di galeri.
      </p>
    );
  }

  const current = openIndex === null ? null : items[openIndex];

  // The captions are interface copy, not claims. A local `/images/` asset is a
  // seed placeholder standing in for a photograph that has not been uploaded,
  // so its caption says so rather than dressing up an empty field — and no
  // caption is ever invented to fill the space.
  const captionFor = (item: GalleryContent) =>
    item.image.startsWith('/images/') || isPlaceholder(item.description)
      ? 'Keterangan foto menyusul'
      : item.description;

  return (
    <>
      <ul className="grid grid-cols-1 gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-12 lg:gap-x-6">
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
                {/*
                  The reveal wrapper and the zoom target are deliberately two
                  different elements. The stylesheet scales the *direct child*
                  of `[data-image-reveal]` for the wipe; if that child were also
                  the element carrying `group-hover:scale`, the two transforms
                  would fight and the hover would be the one that lost.
                */}
                <span
                  className={cn(
                    'relative block overflow-hidden',
                    isPortrait ? 'aspect-4/5' : 'aspect-4/3',
                  )}
                  data-image-reveal
                >
                  <span className="absolute inset-0 block">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-[1.2s] group-hover:scale-[1.04]"
                      style={{ transitionTimingFunction: 'var(--ease-out)' }}
                    />
                  </span>
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 bg-[var(--color-ink)] opacity-0 transition-opacity duration-700 group-hover:opacity-15"
                  />
                </span>

                <span className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-[var(--color-line)] pt-3">
                  <span className="display text-[length:var(--step-2)]">{item.title}</span>
                  <span className="label text-[var(--color-text-muted)]">{item.category}</span>
                </span>

                <span className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="label text-[var(--color-text-muted)]">{captionFor(item)}</span>
                  <span className="label shrink-0 whitespace-nowrap text-[var(--color-text)]">
                    Lihat foto <span aria-hidden="true">↗</span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/*
        Rendered unconditionally, closed by default. `showModal()` owns
        visibility, so there is nothing to conditionally mount — and because the
        element never unmounts, the dialog's own state (scroll position, which
        control was focused) survives a step to the next photo.
      */}
      <dialog
        ref={dialogRef}
        className="gallery-dialog"
        aria-label={current ? `Foto: ${current.title}` : 'Galeri foto'}
        data-lenis-prevent
        onCancel={(event) => {
          // Escape. The browser's default is to close; we close through our own
          // path so state and focus restoration stay in one place.
          event.preventDefault();
          close();
        }}
        onClose={handleNativeClose}
        onKeyDown={handleKeyDown}
      >
        <div className="flex h-full flex-col text-[var(--color-paper)]">
          <div className="flex items-center justify-between px-[var(--gutter)] py-5">
            <p className="label">
              {String((openIndex ?? 0) + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
            </p>
            <button
              type="button"
              data-lightbox-close
              onClick={close}
              className="label flex min-h-11 items-center gap-2 px-3 transition-opacity duration-300 hover:opacity-70"
            >
              Tutup
              <span aria-hidden="true" className="text-base leading-none">
                ✕
              </span>
            </button>
          </div>

          <div className="relative min-h-0 flex-1 px-[var(--gutter)]">
            {current ? (
              <Image
                key={current.id}
                src={current.image}
                alt={current.title}
                fill
                sizes="100vw"
                className="object-contain"
                priority
              />
            ) : null}
          </div>

          {/*
            The footer stacks on a phone: caption above controls. Two buttons
            side by side plus a caption does not fit 320px, and the controls
            still need to clear the 44px touch target.
          */}
          <div className="flex flex-col gap-5 px-[var(--gutter)] py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <p className="display text-[length:var(--step-2)]">{current?.title ?? ''}</p>
              <p className="label mt-1 text-[var(--color-text-faint)]">
                {current ? captionFor(current) : ''}
              </p>
            </div>

            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => step(-1)}
                className="label flex min-h-11 flex-1 items-center justify-center whitespace-nowrap border border-[var(--color-line-dark)] px-3 py-3 transition-colors duration-300 hover:border-[var(--color-paper)] sm:flex-none"
              >
                ← Sebelumnya
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                className="label flex min-h-11 flex-1 items-center justify-center whitespace-nowrap border border-[var(--color-line-dark)] px-3 py-3 transition-colors duration-300 hover:border-[var(--color-paper)] sm:flex-none"
              >
                Berikutnya →
              </button>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
