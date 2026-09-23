'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import type { ProgramContent } from '@/data/defaults';
import { cn } from '@/lib/utils';

/**
 * The programmes list.
 *
 * The brief asks explicitly for an editorial list rather than cards, and for a
 * hover that reveals an image. Both requests point at the same idea: the list is
 * the primary artefact and the photograph is a *response* to pointing at it, not
 * a container the text lives inside.
 *
 * How the reveal works, and why:
 *
 *  - Every programme's image is rendered once, stacked in a fixed layer that
 *    follows the pointer. Swapping `src` on hover would mean a network request
 *    at the exact moment the visitor is looking — the image would appear late or
 *    not at all. Rendering them all and cross-fading opacity means the reveal is
 *    instant, and the cost is one extra decoded image per row.
 *  - Only the hovered row's image is `opacity-100`, and the layer is
 *    `pointer-events-none` so it never intercepts a click meant for the link.
 *  - The layer follows the pointer with a `transform`, which stays on the
 *    compositor. Nothing here animates `top` or `left`.
 *
 * On touch there is no hover, so the layer is hidden entirely and each row shows
 * its own inline thumbnail instead. A hover effect that only works with a mouse
 * is a broken layout on the device most visitors are using.
 */
export function ProgramList({ programs }: { programs: ProgramContent[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  if (programs.length === 0) {
    return (
      <p className="text-[var(--color-text-muted)]" data-reveal>
        Belum ada data.
      </p>
    );
  }

  return (
    <div
      className="relative"
      onPointerMove={(event) => {
        // Only track for fine pointers. A touch device fires `pointermove` during
        // a scroll, which would drag the preview around under the visitor's
        // thumb and look broken.
        if (event.pointerType !== 'mouse') return;
        setPointer({ x: event.clientX, y: event.clientY });
      }}
    >
      {/*
        The floating preview layer. Fixed rather than absolute so it is not
        clipped by any ancestor's overflow, and positioned by transform so the
        browser can composite it without a layout pass.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-30 hidden lg:block"
        style={{
          transform: `translate3d(${pointer.x + 28}px, ${pointer.y - 130}px, 0)`,
        }}
      >
        <div className="relative h-[17rem] w-[13rem] overflow-hidden">
          {programs.map((program, index) => (
            <Image
              key={program.id}
              src={program.image || '/images/program-placeholder.svg'}
              alt=""
              fill
              sizes="13rem"
              className={cn(
                'object-cover transition-opacity duration-500',
                activeIndex === index ? 'opacity-100' : 'opacity-0',
              )}
              style={{ transitionTimingFunction: 'var(--ease-out)' }}
            />
          ))}
        </div>
      </div>

      <ul className="border-t border-[var(--color-line)]">
        {programs.map((program, index) => (
          <li
            key={program.id}
            className="group relative border-b border-[var(--color-line)]"
            onPointerEnter={() => setActiveIndex(index)}
            onPointerLeave={() => setActiveIndex(null)}
          >
            {/*
              The row fill. A pseudo-element rather than a background colour on
              the `li`, so the fill can slide in from the left on transform
              while the row's own background stays untouched.
            */}
            <span
              aria-hidden="true"
              className="absolute inset-0 origin-left scale-x-0 bg-[var(--color-paper-warm)] transition-transform duration-700 group-hover:scale-x-100 group-focus-within:scale-x-100"
              style={{ transitionTimingFunction: 'var(--ease-out)' }}
            />

            <Link
              href={`/program-keahlian/${program.slug}`}
              className="relative grid grid-cols-[auto_1fr_auto] items-center gap-5 py-7 sm:gap-8 sm:py-9"
            >
              {/* The touch-device thumbnail.

                  The floating preview layer is `hidden lg:block`, and a touch
                  device has no hover to trigger it — so without this the rows
                  carried no imagery at all on a phone, which is the device most
                  of this site's visitors are using. The docstring above claimed
                  this existed; it did not. It is `lg:hidden` so the two can
                  never both be on screen. */}
              <span className="relative block h-16 w-14 shrink-0 overflow-hidden bg-[var(--color-paper-warm)] lg:hidden">
                <Image
                  src={program.image || '/images/program-placeholder.svg'}
                  alt=""
                  fill
                  sizes="3.5rem"
                  className="object-cover"
                />
              </span>

              <span className="label text-[var(--color-text-muted)] transition-colors duration-500 group-hover:text-[var(--color-accent)]">
                {String(index + 1).padStart(2, '0')}
              </span>

              <span className="min-w-0">
                {/* The name moves right on hover — a 12px translation that reads
                    as the row acknowledging the pointer. */}
                <span className="display block text-[length:var(--step-5)] leading-[1.02] transition-transform duration-700 group-hover:translate-x-3">
                  {program.name}
                </span>
                {/* The description reveals height on hover on desktop, and is
                    always visible on touch where there is no hover to trigger it. */}
                <span className="mt-2 block max-w-xl text-[length:var(--step-0)] text-[var(--color-text-muted)] transition-[opacity,transform] duration-700 lg:translate-y-2 lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100 lg:group-focus-within:translate-y-0 lg:group-focus-within:opacity-100">
                  {program.shortDescription}
                </span>
              </span>

              <span
                aria-hidden="true"
                className="label flex items-center gap-2 text-[var(--color-text-muted)] transition-[color,transform] duration-700 group-hover:translate-x-1 group-hover:text-[var(--color-text)]"
              >
                <span className="hidden sm:inline">Lihat</span>
                <span>→</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
