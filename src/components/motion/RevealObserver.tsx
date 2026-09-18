'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * One IntersectionObserver for the whole site.
 *
 * Why a single global observer rather than one per component: every section on
 * the homepage wants the same behaviour ("reveal when this enters the viewport"),
 * and a per-component observer means dozens of watchers, dozens of lifecycle
 * hooks, and — because each one is a client component — dozens of components
 * pulled out of the server render for no reason. One observer at the root lets
 * every section stay a server component that merely *marks* its elements with
 * `data-reveal`.
 *
 * The revealed class is a CSS transition, not a GSAP tween. The browser
 * interpolates it on the compositor without JavaScript in the loop, which is
 * cheaper, survives React re-renders, and keeps working if GSAP is blocked.
 *
 * Re-runs on navigation because Next.js swaps the page content without a full
 * load, so elements that arrived with the new route need observing too.
 */
export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const targets = document.querySelectorAll<HTMLElement>('[data-reveal], [data-image-reveal]');
    if (targets.length === 0) return;

    // Reduced motion, or no IntersectionObserver: show everything immediately.
    // The failure mode of a reveal that never fires is invisible content, and
    // that is never an acceptable trade.
    if (reduce || typeof IntersectionObserver === 'undefined') {
      targets.forEach((element) => element.classList.add('is-revealed'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const element = entry.target as HTMLElement;
          const delay = Number(element.dataset.revealDelay ?? 0);
          if (delay > 0) {
            element.style.setProperty('--reveal-delay', `${delay}ms`);
          }
          element.classList.add('is-revealed');
          // One-shot: an element that has been revealed must never re-hide, or
          // scrolling up and down would make the page flicker.
          observer.unobserve(element);
        }
      },
      {
        // Start slightly before the element's top edge reaches the fold, so the
        // reveal has begun by the time it is properly in view rather than
        // starting exactly as the visitor looks at it.
        rootMargin: '0px 0px -10% 0px',
        threshold: 0.05,
      },
    );

    targets.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
