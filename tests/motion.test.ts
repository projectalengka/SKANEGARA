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

  it('the class-handoff path still gets a transition', () => {
    const rule = globalCss.slice(globalCss.indexOf('.js .is-revealed .line-mask > span'));
    assert.match(
      rule.slice(0, rule.indexOf('}')),
      /transition:\s*transform/,
      'the `.is-revealed` path reveals by adding a class, so it needs the transition GSAP does not provide',
    );
  });

  it('the transition is scoped to `.is-revealed`, not to every mask', () => {
    const start = globalCss.indexOf('.js .line-mask > span {');
    const end = globalCss.indexOf('.js .is-revealed .line-mask > span');
    assert.ok(end > start, 'the revealed rule must come after the base rule');
    assert.doesNotMatch(
      globalCss.slice(start, end),
      /transition/,
      'the base mask rule must not carry a transition',
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
