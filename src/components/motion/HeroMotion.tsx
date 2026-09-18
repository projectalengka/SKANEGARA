'use client';

import { useEffect, useRef } from 'react';
import { heroEntrance, splitLines } from '@/lib/animations';
import { prefersReducedMotion } from '@/lib/motion';

/**
 * Drives the hero entrance.
 *
 * Why this is a separate client component rather than markup inside the hero:
 * the hero itself is a server component, so its copy is rendered on the server
 * and shipped as HTML. Only the *motion* is client-side. On a slow connection
 * the visitor sees the finished hero immediately if the animation never runs,
 * rather than waiting on a bundle to learn what the page says.
 *
 * ## Two details that decide whether the headline is visible at all
 *
 * **The split targets are the `[data-hero-line]` elements, not the `<h1>`.**
 * `splitLines` rebuilds whatever it is given, so it must receive a leaf — an
 * element whose entire content is the words to animate. Passing the `<h1>` would
 * discard the `sr-only` accessible name, the accent-coloured `SMK` label, and the
 * `<em>` on the second line, then measure a box that no longer matches the
 * layout. A headline can survive all of that and still be present in the DOM
 * while being invisible on screen, which is the worst kind of failure: nothing
 * errors, and the checks that only look at the `<h1>`'s own opacity pass.
 *
 * **Measurement waits for the font.** Line detection compares word `offsetTop`
 * values. Weights and metrics differ between the used font and the fallback,
 * so measuring before the font loads can report one line where there are two —
 * a 27px-tall mask wrapping a 10rem headline, which clips it to nothing.
 * `document.fonts.ready` resolves once the fonts in use have loaded; the
 * `.catch` keeps a font failure from suppressing the entrance.
 */
export function HeroMotion() {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    const root = document.querySelector<HTMLElement>('[data-hero-root]');
    if (!root) return;

    done.current = true;

    const split = () => {
      const targets = root.querySelectorAll<HTMLElement>('[data-hero-line]');

      if (targets.length > 0) {
        targets.forEach((line) => splitLines(line));
        return;
      }

      // Fallback for a hero authored without explicit line wrappers: split the
      // heading itself, but only if it is a leaf. `splitLines` refuses anything
      // else, so this cannot silently flatten a structured heading.
      const title = root.querySelector<HTMLElement>('[data-hero="title"]');
      if (title) splitLines(title);
    };

    // Reduced motion gets the same final state without the measuring dance —
    // the masks still need to exist so the layout matches, but nothing animates.
    if (prefersReducedMotion()) {
      split();
      heroEntrance(root);
      return;
    }

    let cancelled = false;

    const fontsReady =
      typeof document !== 'undefined' && 'fonts' in document
        ? document.fonts.ready.catch(() => undefined)
        : Promise.resolve();

    void fontsReady.then(() => {
      if (cancelled) return;
      // A double effect in development must not double-wrap the headline;
      // `splitLines` is idempotent via `data-lines-split`, and the guard below
      // keeps the timeline from being built twice.
      split();
      heroEntrance(root);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
