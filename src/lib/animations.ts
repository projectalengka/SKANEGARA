/**
 * Animation primitives.
 *
 * One import surface for GSAP, so no page ever configures a plugin or picks its
 * own easing. Everything registered here is registered once.
 *
 * Progressive-enhancement contract, stated once and honoured everywhere:
 *
 *   1. Reduced motion → every function resolves instantly to the final state.
 *      Not "faster". Absent.
 *   2. No GSAP / no ScrollTrigger → same thing. The fallback is not a degraded
 *      version of the animation; it is no animation.
 *   3. The hidden initial state is only ever applied by JavaScript. If a script
 *      fails to load, the content is visible, because nothing hid it.
 *
 * Point 3 is the one that matters most and the one most often got wrong: the
 * common pattern of `opacity: 0` in CSS plus a script that reveals it means a
 * single failed request produces a blank site.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DUR, STAGGER, TRAVEL, motionScale, prefersReducedMotion } from '@/lib/motion';

let registered = false;

/** Registers plugins exactly once and returns the gsap instance. */
export function gsapReady(): typeof gsap {
  if (registered || typeof window === 'undefined') return gsap;
  gsap.registerPlugin(ScrollTrigger);
  registered = true;
  return gsap;
}

/**
 * Splits an element's *rendered lines* into masked lines.
 *
 * Why not split on spaces or use a manual array: neither survives a real
 * layout. A headline that wraps after "Keterampilan" on a 1920px screen and
 * after "Tempat" on a 390px screen cannot be pre-split in markup, and the whole
 * point of a line reveal is that it follows the line, not the word.
 *
 * How it works: measure the offset of every word box. A change in offset means
 * a new line. Rewrap each line in a `.line-mask` with an inner span, and
 * stagger the inner spans.
 *
 * The DOM is rebuilt, so this must run once — `data-lines-split` guards it.
 * `ResizeObserver` is deliberately not attached: re-splitting on resize would
 * re-run an entrance that has already played, which is worse than a headline
 * whose line breaks do not re-animate.
 *
 * ## The element must be a leaf
 *
 * Because the content is rebuilt, anything already inside is discarded. Handing
 * this an `<h1>` that contains an `sr-only` accessible name plus a structured
 * visible composition deletes the structure and flattens everything into one
 * plain span — which is exactly how a headline ends up present in the DOM but
 * invisible on screen, translated out of a mask that clips it. The guard below
 * refuses a non-leaf rather than silently destroying it.
 */
export function splitLines(element: HTMLElement): HTMLElement[] {
  if (element.dataset.linesSplit === 'true') {
    return Array.from(element.querySelectorAll<HTMLElement>('.line-mask'));
  }

  // Refuse to split a container. Callers pass leaf elements whose entire content
  // is the words to animate; anything with element children is not one of those,
  // and flattening it would destroy markup the design depends on.
  if (element.childElementCount > 0) return [];

  const original = element.textContent ?? '';
  if (original.trim().length === 0) return [];

  // Preserve explicit line breaks from the CMS: the administrator types a
  // newline to mean "break here", and it must be honoured rather than
  // re-flowed. Splitting per authored line first, then per rendered line,
  // gives both behaviours.
  const authoredLines = original
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  element.textContent = '';

  const authoredNodes = authoredLines.map((line) => {
    const lineEl = document.createElement('span');
    lineEl.style.display = 'block';
    lineEl.textContent = line;
    element.appendChild(lineEl);
    return lineEl;
  });

  const masks: HTMLElement[] = [];

  for (const authoredNode of authoredNodes) {
    const words = (authoredNode.textContent ?? '').split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;

    // Temporarily lay the words out to measure which of them share a line.
    authoredNode.textContent = '';
    const wordEls = words.map((word, index) => {
      const wordEl = document.createElement('span');
      wordEl.style.display = 'inline-block';
      wordEl.textContent = index === 0 ? word : `\u00A0${word}`;
      authoredNode.appendChild(wordEl);
      return wordEl;
    });

    const rows: HTMLElement[][] = [];
    let currentRow: HTMLElement[] = [];
    let lastTop: number | null = null;

    for (const wordEl of wordEls) {
      const top = wordEl.offsetTop;
      if (lastTop === null || Math.abs(top - lastTop) < 2) {
        currentRow.push(wordEl);
      } else {
        rows.push(currentRow);
        currentRow = [wordEl];
      }
      lastTop = top;
    }
    if (currentRow.length > 0) rows.push(currentRow);

    authoredNode.remove();

    for (const row of rows) {
      const mask = document.createElement('span');
      mask.className = 'line-mask';
      const inner = document.createElement('span');
      // Each rendered line's text is the joined words, with the non-breaking
      // spaces restored to ordinary ones so the text can be copied cleanly.
      inner.textContent = row.map((el) => el.textContent ?? '').join('').replace(/\u00A0/g, ' ').trim();
      mask.appendChild(inner);
      element.appendChild(mask);
      masks.push(mask);
    }
  }

  element.dataset.linesSplit = 'true';
  return masks;
}

/**
 * Line-by-line reveal. The workhorse for every headline on the site.
 */
export function revealLines(element: HTMLElement, options: { delay?: number; stagger?: number } = {}): void {
  const g = gsapReady();
  const masks = splitLines(element);

  if (masks.length === 0) return;

  const spans = lineSpans(element);

  if (prefersReducedMotion()) {
    g.set(element, { opacity: 1 });
    g.set(spans, { y: 0 });
    return;
  }

  g.set(element, { opacity: 1 });
  // Function-based so each line measures its own mask: a tall display line and
  // a small caption line need different travel.
  g.set(spans, { y: (_index, target) => lineOffset(target as HTMLElement) });
  g.to(spans, {
    y: 0,
    duration: DUR.settle,
    ease: 'expo.out',
    stagger: options.stagger ?? STAGGER.base,
    delay: options.delay ?? 0,
  });
}

/**
 * The inner spans of every `.line-mask` inside an element.
 *
 * These are the elements that actually move. The mask is only a clipping
 * window; animating the mask would slide the whole line out of view instead of
 * revealing it.
 */
function lineSpans(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('.line-mask > span'));
}

/**
 * The distance a line must travel to be hidden inside its mask, in pixels.
 *
 * ## Why pixels, and not `yPercent`
 *
 * This is the single most expensive bug in the project, so it is worth writing
 * down. The obvious implementation — `gsap.to(spans, { yPercent: 0 })` against
 * a CSS start state of `transform: translate3d(0, 110%, 0)` — **does not work**,
 * and it fails in the worst possible way: silently.
 *
 * Measured with the shipping GSAP 3.15 build against a mask with
 * `overflow: hidden` and a CSS `transition` on `transform`, the tween writes:
 *
 *     translate: none; rotate: none; scale: none;
 *     transform: translate(0%, 110%) translate(0px, 220px);
 *
 * GSAP routes `yPercent` through the **individual `translate` property** and
 * keeps the pixel component in the `transform` shorthand, as two independent
 * channels. Animating `yPercent` to 0 collapses only the first; the `220px`
 * in `transform` never moves. The element stays exactly where it started, the
 * tween reports success, and nothing throws.
 *
 * The CSS transition on `transform` is what pushes GSAP into that split — it
 * detects the transition and avoids fighting it on the shorthand. So the two
 * engines each own half the problem and the line is never revealed.
 *
 * The fix is to give GSAP one channel it fully owns: measure the mask in pixels
 * and animate `y` (a plain transform translate, no percentage, no split). This
 * also makes the travel exactly the line height rather than a font-relative
 * percentage, so a tall display line and a small caption line both hide
 * completely.
 *
 * `getBoundingClientRect` is used rather than `offsetHeight` because the mask
 * carries a deliberate `padding-block` that bleeds the clipping window slightly
 * past the line, so the glyphs' ascenders and descenders are not shaved. The
 * travel must clear the padded box, which is the rect.
 */
function lineOffset(span: HTMLElement): number {
  const mask = span.parentElement;
  if (!mask) return 0;
  return mask.getBoundingClientRect().height;
}

/**
 * Fade-up for a block. Used for paragraphs, lists, cards and grids.
 */
export function revealUp(
  elements: Element | Element[] | NodeListOf<Element>,
  options: { delay?: number; stagger?: number; travel?: number } = {},
): void {
  const g = gsapReady();
  const list = gsap.utils.toArray<HTMLElement>(elements);
  if (list.length === 0) return;

  const scale = motionScale();
  const travel = (options.travel ?? TRAVEL.md) * scale;

  if (prefersReducedMotion()) {
    g.set(list, { opacity: 1, y: 0 });
    return;
  }

  g.fromTo(
    list,
    { opacity: 0, y: travel },
    {
      opacity: 1,
      y: 0,
      duration: DUR.reveal,
      ease: 'expo.out',
      stagger: options.stagger ?? STAGGER.base,
      delay: options.delay ?? 0,
    },
  );
}

/**
 * Clip-path wipe for images.
 *
 * A wipe rather than a fade because a fade says "here is a picture" while a
 * wipe says "here is a picture being uncovered" — the editorial cue. The inner
 * element is counter-scaled so the image appears to settle rather than slide,
 * which is what stops the effect from looking like a cheap mask transition.
 */
export function revealImage(
  container: HTMLElement,
  options: { delay?: number; direction?: 'up' | 'down' | 'left' | 'right' } = {},
): void {
  const g = gsapReady();
  const inner = container.firstElementChild;
  const direction = options.direction ?? 'up';

  const from =
    direction === 'up'
      ? 'inset(0% 0% 100% 0%)'
      : direction === 'down'
        ? 'inset(100% 0% 0% 0%)'
        : direction === 'left'
          ? 'inset(0% 100% 0% 0%)'
          : 'inset(0% 0% 0% 100%)';

  if (prefersReducedMotion()) {
    g.set(container, { clipPath: 'inset(0% 0% 0% 0%)' });
    if (inner) g.set(inner, { scale: 1 });
    return;
  }

  const timeline = g.timeline({ delay: options.delay ?? 0 });
  timeline.fromTo(
    container,
    { clipPath: from },
    { clipPath: 'inset(0% 0% 0% 0%)', duration: DUR.settle, ease: 'expo.out' },
  );
  if (inner) {
    timeline.fromTo(inner, { scale: 1.08 }, { scale: 1, duration: DUR.settle * 1.15, ease: 'expo.out' }, 0);
  }
}

/**
 * Subtle parallax on scroll.
 *
 * Deliberately restrained: at the default strength the image travels 6% of its
 * height across the whole scroll. Anything more and the eye reads it as the
 * layout moving rather than the image drifting inside its frame. Skipped
 * entirely on coarse pointers, where it costs more than it gives.
 */
export function parallax(
  element: HTMLElement,
  options: { strength?: number; trigger?: HTMLElement } = {},
): void {
  const g = gsapReady();
  if (prefersReducedMotion() || window.matchMedia('(pointer: coarse)').matches) return;

  const strength = (options.strength ?? 6) * motionScale();
  const trigger = options.trigger ?? element;

  g.fromTo(
    element,
    { yPercent: -strength / 2 },
    {
      yPercent: strength / 2,
      ease: 'none',
      scrollTrigger: {
        trigger,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    },
  );
}

/**
 * The hero entrance.
 *
 * Timed as a sequence of five beats, because the brief asks for the order:
 * navigation, school name, headline, image, scroll indicator. Total is around
 * 1.4s to the last beat — long enough to feel deliberate, short enough that a
 * visitor who wants to scroll is not held hostage.
 */
export function heroEntrance(root: HTMLElement): void {
  const g = gsapReady();

  // The fixed header is a sibling of the hero, not its descendant.
  const nav = document.querySelectorAll<HTMLElement>('.site-header [data-hero="nav"]');
  const kicker = root.querySelector<HTMLElement>('[data-hero="kicker"]');
  const title = root.querySelector<HTMLElement>('[data-hero="title"]');
  const actions = root.querySelectorAll<HTMLElement>('[data-hero="action"]');
  const media = root.querySelector<HTMLElement>('[data-hero="media"]');
  const indicator = root.querySelector<HTMLElement>('[data-hero="indicator"]');

  if (prefersReducedMotion()) {
    g.set([nav, kicker, title, actions, media, indicator], { opacity: 1, y: 0, clipPath: 'none' });
    if (title) g.set(lineSpans(title), { y: 0 });
    if (media) g.set(media, { clipPath: 'inset(0% 0% 0% 0%)' });
    return;
  }

  const timeline = g.timeline({ defaults: { ease: 'expo.out' } });

  // 1. Navigation.
  if (nav.length > 0) {
    timeline.fromTo(nav, { opacity: 0, y: -14 }, { opacity: 1, y: 0, duration: DUR.settle, stagger: STAGGER.tight });
  }

  // 2. Kicker.
  if (kicker) {
    timeline.fromTo(kicker, { opacity: 0, y: TRAVEL.sm * motionScale() }, { opacity: 1, y: 0, duration: DUR.reveal }, 0.1);
  }

  // 3. The school name, line by line.
  //
  //    The start offset is set explicitly before the tween rather than being
  //    inherited from the CSS `translate3d(0, 110%, 0)`. Two reasons, both
  //    learned from the silent failure documented on `lineOffset`:
  //
  //      - GSAP must own the value it is about to animate. Reading a start state
  //        it did not write lets it split the percentage across the individual
  //        `translate` property and the `transform` shorthand, and only one half
  //        moves.
  //      - The offset is in pixels here, so it clears the mask exactly instead of
  //        relying on the mask's height matching the element's own height, which
  //        it does not once `padding-block` is involved.
  if (title) {
    const spans = lineSpans(title);
    g.set(title, { opacity: 1 });
    g.set(spans, { y: (_index, target) => lineOffset(target as HTMLElement) });
    timeline.to(spans, { y: 0, duration: DUR.hero, stagger: STAGGER.loose }, '-=0.55');
  }

  // 4. Actions.
  if (actions.length > 0) {
    timeline.fromTo(
      actions,
      { opacity: 0, y: TRAVEL.sm },
      { opacity: 1, y: 0, duration: DUR.reveal, stagger: STAGGER.tight },
      '-=0.9',
    );
  }

  // 5. The image, wiping down as the headline settles.
  if (media) {
    timeline.fromTo(
      media,
      { clipPath: 'inset(0% 0% 100% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: DUR.hero },
      0.55,
    );
  }

  // 6. Scroll indicator, last and quietest.
  if (indicator) {
    timeline.fromTo(indicator, { opacity: 0 }, { opacity: 1, duration: DUR.tap }, 0.95);
    // A navigable cue needs no perpetual bobbing or idle animation loop.
  }
}

/**
 * Scroll-triggered reveal for anything marked `data-reveal` / `data-image-reveal`
 * inside a root element.
 *
 * ## Not a hydrate-safe entry point — do not call it from a component
 *
 * `RevealObserver` owns reveals for the whole site, and it owns them because
 * safety here is not a local property: writing `data-revealed` before React has
 * taken ownership of an element is a hydration mismatch, and the only reliable
 * signal for that is the `__reactFiber$` key on the node itself. This function
 * has no such gate, so calling it during or before hydration reintroduces the
 * bug it was once written to avoid.
 *
 * It is kept only because removing an export is a breaking change for anything
 * importing it; nothing in the project does. If a scoped variant is ever needed,
 * build it inside `RevealObserver` where the gate lives — not here.
 *
 * @deprecated Use `RevealObserver`. Ungated writes cause a hydration mismatch.
 */
export function observeReveals(root: ParentNode = document): void {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      'observeReveals() is deprecated and ungated: RevealObserver owns reveals. ' +
        'Writing `data-revealed` before React claims the node is a hydration mismatch.',
    );
  }

  const targets = root.querySelectorAll<HTMLElement>('[data-reveal], [data-image-reveal]');
  if (targets.length === 0) return;

  /**
   * Same gate as `RevealObserver`: a node React has taken over carries a
   * `__reactFiber$<random>` own-property, so waiting for it means the attribute
   * comparison has already happened. Duplicated rather than imported to keep
   * `animations.ts` free of a component dependency — but if the gate changes,
   * change it in both places.
   */
  const claimed = (element: Element): boolean =>
    Object.keys(element).some((key) => key.startsWith('__reactFiber$'));

  const mark = (element: HTMLElement) => {
    const delay = Number(element.dataset.revealDelay ?? 0);
    if (delay > 0) {
      element.style.setProperty('--reveal-delay', `${delay}ms`);
    }
    element.dataset.revealed = '';
  };

  const run = () => {
    if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      targets.forEach(mark);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const element = entry.target as HTMLElement;
          mark(element);
          observer.unobserve(element);
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
    );

    targets.forEach((element) => observer.observe(element));
  };

  // Wait for the gate, with the same fail-open deadline as the observer: never
  // let a missing fiber key leave content hidden.
  //
  // `Array.from` rather than `NodeList.forEach`: `NodeListOf` has no `every`,
  // and a snapshot is what we want anyway — elements added later are handled by
  // the observer's own mutation pass, not by this one-shot wait.
  const list = Array.from(targets);
  const deadline = 800;
  const started = performance.now();
  const wait = () => {
    if (list.every(claimed) || performance.now() - started > deadline) {
      run();
      return;
    }
    requestAnimationFrame(wait);
  };
  requestAnimationFrame(wait);
}

/** Destroys every ScrollTrigger. Called on hot reload and route teardown. */
export function killTriggers(): void {
  if (typeof window === 'undefined') return;
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
}
