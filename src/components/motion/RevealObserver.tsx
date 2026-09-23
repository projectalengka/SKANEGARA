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
 * The revealed state is a CSS transition, not a GSAP tween. The browser
 * interpolates it on the compositor without JavaScript in the loop, which is
 * cheaper, survives React re-renders, and keeps working if GSAP is blocked.
 *
 * Re-runs on navigation because Next.js swaps the page content without a full
 * load, so elements that arrived with the new route need observing too.
 *
 * ## Why the query re-runs on a MutationObserver, not only on mount
 *
 * The first version queried the targets once inside the effect and observed
 * that snapshot. That is a silent, total failure for any element not in the DOM
 * at that exact moment, and it was measured causing one: `/karya`, `/galeri`
 * and `/berita` each reported **0 of their images revealed**, every one pinned
 * at `clip-path: inset(0 0 100%)` — loaded, opaque, and clipped to nothing. The
 * homepage lost 18 of 55 reveal targets.
 *
 * A screenshot does not catch this. `getComputedStyle().opacity` reads `1` and
 * `img.complete` reads `true`; the element is simply masked out of the
 * document. It was found by counting the revealed elements against the total,
 * which is why that count is worth taking.
 *
 * The fix is to keep watching for elements that arrive later — React streams
 * server components in, and lazy images mount after their container.
 */

/**
 * Marks an element as revealed.
 *
 * ## Why an attribute, and what the class cost
 *
 * The first version added `is-revealed` to `classList`. React owns the
 * `className` of every element it renders, so the moment this ran before
 * hydration had committed, React compared its own markup
 * (`class="label …"`) with a DOM that had become (`class="label … is-revealed"`)
 * and reported a hydration mismatch. An attribute React never rendered is a
 * smaller diff than a className, but — measured, not assumed — **it is still a
 * diff**, and React reports it just the same.
 */
const reveal = (element: HTMLElement) => {
  const delay = Number(element.dataset.revealDelay ?? 0);
  if (delay > 0) {
    element.style.setProperty('--reveal-delay', `${delay}ms`);
  }
  element.dataset.revealed = '';
};

/**
 * Waits until React has taken ownership of `element`, then calls `done`.
 *
 * ## Why this gate exists, and why every timer failed
 *
 * Writing `data-revealed` before React hydrates the element is a hydration
 * mismatch. The hard part is knowing when that is, and the honest answer after
 * measuring is: **not on a schedule**.
 *
 * React's hydration is spread across many commits — Next.js calls `hydrateRoot`
 * inside `startTransition` (`next/dist/client/app-index.js`), so the work is
 * split and interleaved with the router's own commits. Measured on `/kegiatan`
 * with a `MutationObserver` on `documentElement` plus React's
 * `onCommitFiberRoot` hook, all on one `performance.now()` clock:
 *
 *     18.5ms   DOMContentLoaded               0/4 target elements claimed
 *    639.9ms   React commit #1                0/4
 *    706.4ms   React commit #6                0/4
 *   1051.9ms   previous version writes        the mismatch is created here
 *   1082.7ms   React reports the mismatch      2/4
 *
 * So the write landed 31ms *before* React looked at those two elements. Then
 * the candidates were compared directly against the moment React actually
 * claims the nodes, four runs of `/kegiatan`:
 *
 *     candidate        run1    run2    run3    run4
 *     load+raf         -64ms   -49ms   -53ms   -64ms   before, every time
 *     load+raf x2      -48ms   -46ms   -39ms   -26ms   before, every time
 *     load+raf x3      -28ms   -33ms   -27ms   -14ms   before, every time
 *     requestIdleCb     +2ms   +25ms    +5ms    +4ms   after, by 2ms once
 *     load+100ms       +41ms    +9ms   +17ms   +26ms   after
 *     load+200ms      +145ms  +100ms  +114ms  +129ms   after
 *
 * `requestAnimationFrame` is *always* too early, no matter how many frames are
 * chained — which is the measurement that killed the previous version of this
 * file. A timer large enough to be safe is a visible delay before the reveal,
 * and a timer small enough to feel instant loses the race. Timing is the wrong
 * axis; it only ever worked by luck, and luck is not a fix.
 *
 * The signal that cannot lose is the one React itself uses: a node React has
 * taken over carries a `__reactFiber$<random>` own-property. Once that key is
 * present, the attribute comparison for that node has already happened, so a
 * write afterwards is invisible to it. Checking is a property lookup — cheap
 * enough to poll on `requestAnimationFrame` until it appears, which keeps the
 * reveal as early as it can possibly be.
 *
 * `__reactFiber$` is React-internal, hence the fallback below: if React ever
 * renames it, the gate would never open and content would stay hidden — the one
 * failure mode this file refuses to accept. `FALLBACK_MS` bounds that.
 */
const FIBER_KEY_PREFIXES = ['__reactFiber$', '__reactContainer$'];

const claimed = (element: Element): boolean => {
  for (const key in element) {
    for (const prefix of FIBER_KEY_PREFIXES) {
      if (key.startsWith(prefix)) return true;
    }
  }
  return false;
};

export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const selector = '[data-reveal], [data-image-reveal]';
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let running = true;
    let observer: IntersectionObserver | null = null;
    let mutations: MutationObserver | null = null;
    let frame = 0;
    let fallback: ReturnType<typeof setTimeout> | undefined;

    const teardown = () => {
      running = false;
      cancelAnimationFrame(frame);
      if (fallback) clearTimeout(fallback);
      observer?.disconnect();
      mutations?.disconnect();
    };

    // Reduced motion, or no IntersectionObserver: show everything. The failure
    // mode of a reveal that never fires is invisible content, which is never an
    // acceptable trade — but it still waits for the gate, because writing early
    // trades that bug for a hydration mismatch instead of fixing anything.
    const staticMode = reduce || typeof IntersectionObserver === 'undefined';

    const start = () => {
      if (!running) return;

      if (staticMode) {
        const showAll = () =>
          document.querySelectorAll<HTMLElement>(selector).forEach((el) => reveal(el));
        showAll();
        mutations = new MutationObserver(showAll);
        mutations.observe(document.body, { childList: true, subtree: true });
        return;
      }

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const element = entry.target as HTMLElement;
            reveal(element);
            // One-shot: an element that has been revealed must never re-hide, or
            // scrolling up and down would make the page flicker.
            observer?.unobserve(element);
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

      // Observes every matching element that is not already being watched. The
      // `data-revealed` check keeps this idempotent: `MutationObserver` fires
      // for every text-node change in the subtree, and re-observing an element
      // is wasted work.
      const observed = new WeakSet<Element>();
      const attach = () => {
        document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
          if (observed.has(element) || 'revealed' in element.dataset) return;
          observed.add(element);
          observer?.observe(element);
        });
      };

      attach();
      mutations = new MutationObserver(attach);
      mutations.observe(document.body, { childList: true, subtree: true });
    };

    /**
     * Opens the gate once every target React knows about is claimed.
     *
     * Polling rather than a one-shot wait: the elements arrive in several
     * commits, so the first claimed element does not mean the last one is
     * ready. Waiting for *all* of them is what makes the single `start()`
     * afterwards safe for the whole page.
     *
     * The `FALLBACK_MS` deadline is the seam. If the fiber key never appears —
     * React renamed it, or a future version stops attaching it — the gate opens
     * anyway and the site behaves exactly as it did before this gate existed:
     * reveals work, and only the dev-mode warning could return. Hiding content
     * forever is the failure this guards against, so it fails open.
     */
    const FALLBACK_MS = 800;

    const gate = () => {
      if (!running) return;
      const targets = Array.from(document.querySelectorAll<HTMLElement>(selector));
      const ready = targets.length === 0 || targets.every(claimed);
      if (ready) {
        start();
        return;
      }
      frame = requestAnimationFrame(gate);
    };

    fallback = setTimeout(() => {
      if (running && !observer && !staticMode) {
        cancelAnimationFrame(frame);
        start();
      }
    }, FALLBACK_MS);

    frame = requestAnimationFrame(gate);

    return teardown;
  }, [pathname]);

  return null;
}
