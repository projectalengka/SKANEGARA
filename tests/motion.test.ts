/**
 * Unit tests — the motion contract.
 *
 * These do not drive a browser; they read the source and assert the invariants
 * that a browser test can only catch by accident. That sounds weak, and for
 * most code it would be. Here it is the opposite: the bug these lock down was
 * *invisible to a browser test*. The harness reported a healthy hero while the
 * headline was drawn nowhere, because every signal it could read — opacity,
 * element presence, bounding-box height — was correct. The tween completed. The
 * element was opaque. It was simply never moved.
 *
 * The cause was a property owned by two engines at once: GSAP tweened `yPercent`
 * while a CSS `transition` held `transform`, and GSAP resolved the conflict by
 * splitting the movement across the individual `translate` property and the
 * `transform` shorthand, animating only half of it.
 *
 * So the invariant worth testing is architectural, and it is checkable from the
 * text of the stylesheet:
 *
 *   1. `.line-mask > span` declares no `transition` on `transform`.
 *   2. No animation function tweens `yPercent` on a line span.
 *
 * Neither is a style preference. Both are the difference between a headline
 * that appears and a headline that does not.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { code } from './source';

const globalCss = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
const animationsTs = readFileSync(new URL('../src/lib/animations.ts', import.meta.url), 'utf8');

/** The body of a CSS rule, given its exact selector line. */
function cssRule(source: string, selector: string): string {
  const start = source.indexOf(`${selector} {`);
  assert.notEqual(start, -1, `expected to find the rule \`${selector}\` in global.css`);
  const end = source.indexOf('}', start);
  return source.slice(start, end);
}

describe('line-mask CSS owns no transition', () => {
  it('the hidden start state is a transform with no transition', () => {
    const rule = cssRule(globalCss, '.js .line-mask > span');
    assert.match(rule, /transform:\s*translate3d\(0,\s*110%,\s*0\)/, 'the masked start state must still be declared');
    assert.doesNotMatch(
      rule,
      /transition/,
      'a CSS transition on a property GSAP tweens makes GSAP split the movement across `translate` and `transform`, animating only one of them',
    );
  });

  it('the attribute-handoff path still gets a transition', () => {
    const rule = globalCss.slice(globalCss.indexOf('.js [data-revealed] .line-mask > span'));
    assert.match(
      rule.slice(0, rule.indexOf('}')),
      /transition:\s*transform/,
      'the `[data-revealed]` path reveals by setting an attribute, so it needs the transition GSAP does not provide',
    );
  });

  it('the transition is scoped to the revealed state, not to every mask', () => {
    const start = globalCss.indexOf('.js .line-mask > span {');
    const end = globalCss.indexOf('.js [data-revealed] .line-mask > span');
    assert.ok(end > start, 'the revealed rule must come after the base rule');
    assert.doesNotMatch(
      globalCss.slice(start, end),
      /transition/,
      'the base mask rule must not carry a transition',
    );
  });

  it('reveals by attribute, not by class', () => {
    // Regression guard for the hydration mismatch, part one.
    //
    // A class React did not render is the *worst* case: React owns
    // `className` on every element it renders, so the diff is unavoidable.
    // An attribute is a smaller diff — but it is still a diff, and that was
    // measured the hard way. Part two below is the half that actually makes
    // the write safe; this assertion only stops the class from coming back.
    //
    // The browser-level proof lives in `outputs/audit/probe-reveal-correct.cjs`.
    assert.match(
      globalCss,
      /\[data-reveal\]\[data-revealed\]/,
      'the revealed state must be selected by attribute in global.css',
    );
    assert.doesNotMatch(
      globalCss,
      /\.is-revealed/,
      'a `.is-revealed` class selector must not survive: adding a class React did not render is the hydration mismatch this replaced',
    );
  });
});

/** Strips block and line comments, so prose about a bug is not mistaken for the bug. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('line animation uses a single channel', () => {
  it('revealLines and heroEntrance tween pixel `y`, not `yPercent`', () => {
    // Isolate the two functions that animate line spans, then drop the comments:
    // `lineOffset`'s docblock explains the `yPercent` bug at length, and a naive
    // search would match the explanation as if it were the mistake.
    const revealStart = animationsTs.indexOf('export function revealLines');
    const revealEnd = animationsTs.indexOf('export function revealUp');
    const revealBody = stripComments(animationsTs.slice(revealStart, revealEnd));
    assert.match(revealBody, /y:\s*0/, 'revealLines must animate to y: 0');
    assert.doesNotMatch(
      revealBody,
      /yPercent/,
      'yPercent on a line span is the bug this test exists to prevent',
    );

    const heroStart = animationsTs.indexOf('export function heroEntrance');
    const heroEnd = animationsTs.indexOf('export function observeReveals');
    const heroBody = stripComments(animationsTs.slice(heroStart, heroEnd));
    assert.match(heroBody, /y:\s*0/, 'heroEntrance must animate the lines to y: 0');
    assert.doesNotMatch(
      heroBody,
      /yPercent/,
      'heroEntrance must not tween yPercent on the line spans',
    );
  });

  it('the start offset is set explicitly before the tween', () => {
    // Both paths must call `set` with the measured offset, so GSAP owns the
    // value it is about to animate. Reading a start state it did not write is
    // what let the two-channel split happen.
    assert.match(
      stripComments(animationsTs),
      /g\.set\(spans,\s*\{\s*y:\s*\(_index,\s*target\)\s*=>\s*lineOffset/,
      'the offset must be written with a function-based `set`, so each line is measured against its own mask',
    );
  });

  it('the offset is measured from the mask, in pixels', () => {
    const start = animationsTs.indexOf('function lineOffset');
    const body = animationsTs.slice(start, animationsTs.indexOf('\n}', start));
    assert.match(body, /parentElement/, 'the offset must come from the mask that clips the line');
    assert.match(body, /getBoundingClientRect\(\)\.height/, 'the measurement must be a rendered height, not a font-relative percentage');
  });
});

describe('parallax keeps its percentage channel', () => {
  it('parallax is allowed yPercent because it targets an untransitioned element', () => {
    const start = animationsTs.indexOf('export function parallax');
    const end = animationsTs.indexOf('export function heroEntrance');
    const body = animationsTs.slice(start, end);
    assert.match(body, /yPercent/, 'parallax legitimately uses yPercent — it animates an image with no CSS transition on transform');
    assert.doesNotMatch(
      body,
      /lineSpan|line-mask/,
      'parallax must not be applied to a line span, where the two-channel split bites',
    );
  });
});

/**
 * The reveal observer must keep watching for elements that arrive late.
 *
 * This locks down a bug that was measured in a real browser and that no
 * screenshot caught.
 *
 * `RevealObserver` queried its targets once inside a `useEffect`. Any element
 * not in the DOM at that instant was never observed, so it kept the CSS start
 * state — `.js [data-image-reveal] { clip-path: inset(0 0 100% 0) }` — forever.
 * The element was loaded, opaque and in the layout, and clipped to nothing.
 *
 * Measured on the built site, before the fix:
 *
 *   /karya    0 of 6 images revealed
 *   /galeri   0 of 6 images revealed
 *   /berita   0 of 4 images revealed
 *   /        18 of 55 reveal targets never revealed
 *
 * Every automated signal said "fine": `img.complete` was true,
 * `getComputedStyle().opacity` was 1, `naturalWidth` was the real pixel width.
 * The only thing that showed it was counting revealed elements against the
 * total. So that is what this test protects — architecturally, since a source
 * assertion is the only thing that runs in the unit gate.
 */
describe('the reveal observer catches late-arriving elements', () => {
  const observerTs = readFileSync(
    new URL('../src/components/motion/RevealObserver.tsx', import.meta.url),
    'utf8',
  );

  it('watches for DOM mutations, not only the initial query', () => {
    assert.ok(
      observerTs.includes('MutationObserver'),
      'RevealObserver must use a MutationObserver — a single querySelectorAll cannot see ' +
        'elements that mount after the effect runs, and those stay permanently hidden',
    );
  });

  it('observes the document body subtree, so nested arrivals are seen', () => {
    assert.ok(
      /\.observe\(document\.body,\s*\{[^}]*subtree:\s*true/.test(observerTs),
      'the MutationObserver must watch `document.body` with `subtree: true`, or elements ' +
        'inside a streamed section are missed',
    );
  });

  it('reruns attachment when something changes', () => {
    // The mutation callback has to actually re-invoked the attach pass; a
    // MutationObserver that is constructed and then ignored is worse than none,
    // because it looks like the fix.
    assert.ok(
      /new MutationObserver\(\s*attach\s*\)/.test(observerTs),
      'the MutationObserver must call the attach pass, not be constructed unused',
    );
  });

  it('still honours reduced motion by revealing everything', () => {
    assert.ok(
      observerTs.includes('prefers-reduced-motion'),
      'reduced motion must still short-circuit to "everything revealed"',
    );
  });

  it('keeps the start state clip-path, so the wipe still exists', () => {
    // Guards the other direction: the fix must not be "delete the animation".
    assert.ok(
      globalCss.includes('clip-path: inset(0 0 100% 0)'),
      'the clipped start state must survive — the reveal is a wipe, not a fade',
    );
  });
});

/**
 * The reveal write must wait for React to take ownership of the element.
 *
 * This is the second half of the hydration fix, and the half that was missing
 * when the first fix was declared done. Switching `class` → `data-revealed`
 * removed the `className` diff but not the diff: React compares an element's
 * whole attribute set, so writing `data-revealed` before React hydrates that
 * element is still a mismatch. The dev overlay showed exactly that:
 *
 *     A tree hydrated but some attributes of the server rendered HTML
 *     didn't match the client properties.
 *       <div className="relative aspect-3/2 overflow-hidden"
 *            data-image-reveal={true}
 *     -      data-revealed=""  >
 *
 * Four candidate delays were measured against the moment React actually claims
 * the node, over four loads of `/kegiatan`:
 *
 *     candidate        run1    run2    run3    run4
 *     load+raf         -64ms   -49ms   -53ms   -64ms   before, every time
 *     load+raf x2      -48ms   -46ms   -39ms   -26ms   before, every time
 *     load+raf x3      -28ms   -33ms   -27ms   -14ms   before, every time
 *     requestIdleCb     +2ms   +25ms    +5ms    +4ms   after, by 2ms once
 *     load+100ms       +41ms    +9ms   +17ms   +26ms   after
 *
 * `requestAnimationFrame` is always too early, and a timer large enough to be
 * safe is a visible delay. So the gate does not use a timer at all: it waits
 * for the `__reactFiber$` key React attaches to nodes it owns, which by
 * definition means the comparison has already happened.
 *
 * The failure this must never have is a gate that never opens — that would hide
 * the site. Hence the assertions on the fallback deadline as well.
 */
describe('the reveal write waits for hydration', () => {
  const observerTs = readFileSync(
    new URL('../src/components/motion/RevealObserver.tsx', import.meta.url),
    'utf8',
  );

  it('gates on the React fiber key rather than on a timer', () => {
    // Assert on the *code*, not on the prose. The first version of this test
    // matched the file as a whole, so the string `__reactFiber$` in the
    // doc comment satisfied it even after the real list was emptied — the test
    // passed while the gate was broken. Stripping comments first is what makes
    // it a guard.
    const code = stripComments(observerTs);
    assert.match(
      code,
      /__reactFiber\$/,
      'the gate must key off `__reactFiber$` in code (not just in a comment): ' +
        'every timer measured (rAF, rAF x2, rAF x3) fired before hydration',
    );
  });

  it('the fiber prefix list is not empty', () => {
    // Guards the specific way this can silently stop working: an empty list
    // makes `claimed()` always return false, so the gate never opens on the
    // fiber signal and only the deadline saves it.
    const code = stripComments(observerTs);
    const match = code.match(/FIBER_KEY_PREFIXES\s*=\s*\[([^\]]*)\]/);
    assert.ok(match, 'FIBER_KEY_PREFIXES must be declared');
    const contents = match[1] ?? '';
    assert.ok(
      contents.includes('__reactFiber$'),
      'FIBER_KEY_PREFIXES must actually contain `__reactFiber$`; an empty list means ' +
        'claimed() never returns true and the gate degrades to a blind 800ms delay',
    );
  });

  it('does not schedule the reveal with requestAnimationFrame alone', () => {
    // The specific regression: a rAF chain *looks* like "after hydration" and
    // measurably is not. The gate may poll with rAF, but `start()` must be
    // reachable only through the claimed() check, so any rAF must be
    // accompanied by the fiber test.
    const stripped = stripComments(observerTs);
    if (stripped.includes('requestAnimationFrame')) {
      assert.ok(
        stripped.includes('claimed'),
        'requestAnimationFrame is used, so the fiber check must be present too — ' +
          'rAF alone was measured firing 14–64ms before hydration on every run',
      );
    }
  });

  it('fails open with a fallback deadline, so content is never trapped hidden', () => {
    assert.match(
      stripComments(observerTs),
      /FALLBACK_MS\s*=\s*\d+/,
      'the gate needs a bounded deadline: if React ever renames the fiber key the gate ' +
        'would never open and the whole site would stay at opacity 0',
    );
  });
});

/**
 * The "Ilustrasi program" flag must fit the box it is drawn in.
 *
 * Measured on the built site at 1440px and at 390px: the hero program image box
 * is 56px wide (`w-14`), and the string "Ilustrasi program" at the original
 * `0.5625rem` / `0.08em` needed 61px on one line. `scrollWidth` read 61 against
 * `clientWidth` 56, so the parent's `overflow: hidden` amputated the first word
 * — the close-up showed "ILUSTRAS / PROGRAM". A label whose entire purpose is
 * to clarify had become the most visibly broken thing in the hero.
 *
 * A source assertion cannot measure pixels, so it locks the two decisions that
 * caused the overflow instead: the type size and the tracking. The pixel-level
 * check lives in `outputs/audit/probe-note-flag.cjs`, which reads
 * `scrollWidth`/`clientWidth` from the running site — run it after touching
 * this rule.
 */
describe('the hero illustration flag fits its box', () => {
  it('keeps the flag type small enough for a 56px-wide box', () => {
    // Comments explain the measurement and could be mistaken for the values.
    const rule = stripComments(cssRule(globalCss, '.hero-program__note'));

    const size = rule.match(/font-size:\s*([\d.]+)rem/);
    assert.ok(size, 'the flag must declare an explicit font-size');
    const sizeRem = Number(size[1]);
    assert.ok(
      sizeRem <= 0.5,
      `font-size ${sizeRem}rem was measured to overflow the 56px hero box; 0.5rem is the tested maximum`,
    );

    const tracking = rule.match(/letter-spacing:\s*([\d.]+)em/);
    if (tracking) {
      assert.ok(
        Number(tracking[1]) <= 0.05,
        `letter-spacing ${tracking[1]}em pushes "Ilustrasi" past the box width — 0.04em is the tested value`,
      );
    }

    assert.doesNotMatch(
      rule,
      /white-space:\s*nowrap/,
      'the flag must be allowed to wrap, or a long word is clipped by the parent overflow:hidden',
    );
  });
});

/*
 * A closed menu that still paints.
 *
 * ---------------------------------------------------------------------------
 * The owner sent three screenshots from a phone on 2026-09-24 with the words
 * "ada beberapa garis yang muncul gajelas". They were right, and the cause was
 * a difference of one element:
 *
 *     <li className="border-b border-[var(--color-line)] last:border-b-0">
 *       <Link className={menuOpen ? '... opacity-100' : '... opacity-0'}>
 *
 * The hairline sits on the `<li>`; the `opacity-0` sits on the `<Link>` inside
 * it. **Opacity does not travel upwards**, so with the menu closed the text
 * vanished and the borders stayed painted. `primaryNav` holds six items and the
 * last drops its border, so the closed menu drew exactly **five** hairlines
 * across the hero.
 *
 * `inert` and `aria-hidden` were already on the panel, which is what made this
 * hard to see: the panel *was* removed from interaction and from the
 * accessibility tree, so every non-visual signal said "closed". Only the pixels
 * disagreed. And because the panel is `fixed inset-0`, the lines held their
 * screen position while the page scrolled underneath — which is what turns five
 * hairlines into "lines from nowhere".
 *
 * Measured with `outputs/verify-mobile-menu-lines.mjs`, which photographs the
 * viewport three times and counts painted rows: nine lines with the panel
 * rendered, four with it hidden — five of them the menu's. The same probe now
 * reports zero leaked and five when open, so the fix hides the menu without
 * killing it.
 *
 * The invariant a source test can hold: **the panel must be hidden from
 * painting, not merely from interaction.** `visibility: hidden` takes the whole
 * subtree out at once, so this cannot return for whatever child is added next.
 */
describe('the closed mobile menu paints nothing', () => {
  /** The class list of the menu panel, comments stripped. */
  function panelClasses(): string {
    const src = code('src/components/navigation/SiteHeader.tsx');
    const at = src.indexOf('id="menu-seluler"');
    assert.notEqual(at, -1, 'the mobile menu panel must keep id="menu-seluler"');

    const block = src.slice(at, at + 2000);
    const open = block.indexOf('className={cn(');
    assert.notEqual(open, -1, 'the panel must declare its classes through cn()');

    return block.slice(open, block.indexOf(')}', open));
  }

  it('toggles a visibility state, not only pointer-events', () => {
    const cls = panelClasses();

    assert.match(
      cls,
      /invisible/,
      'a closed panel must leave the painting tree — opacity on a child does not hide the parent\'s borders',
    );
    assert.match(
      cls,
      /menuOpen\s*\?\s*'visible/,
      'visibility must be driven by menuOpen, or the menu can never appear',
    );
  });

  it('still removes the closed panel from interaction and the a11y tree', () => {
    const src = code('src/components/navigation/SiteHeader.tsx');

    assert.match(src, /inert=\{!menuOpen\}/, 'a closed panel must be inert');
    assert.match(src, /aria-hidden=\{!menuOpen\}/, 'a closed panel must be hidden from screen readers');
  });

  it('keeps the borders inside the panel, so hiding the panel hides them', () => {
    const src = code('src/components/navigation/SiteHeader.tsx');

    // The nav list must live inside the panel subtree. If a border were hoisted
    // out of it — onto the header itself, say — `invisible` on the panel would
    // stop covering it and the hairlines would come back.
    const panelAt = src.indexOf('id="menu-seluler"');
    const listAt = src.indexOf('border-b border-[var(--color-line)] last:border-b-0');

    assert.notEqual(listAt, -1, 'the mobile nav list should still draw its separators');
    assert.ok(
      listAt > panelAt,
      'the nav separators must stay inside the panel, or hiding the panel will not hide them',
    );
  });
});
