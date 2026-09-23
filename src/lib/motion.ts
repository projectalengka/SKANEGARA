/**
 * Shared motion constants.
 *
 * Every animation in the project reads its numbers from here. The reason is not
 * tidiness — it is that "smooth" is a single property of the whole site, and a
 * site where one section eases at 0.3s and the next at 0.9s feels broken even
 * when each animation is fine on its own.
 *
 * The curve is the important value. An expo-out leaves fast and settles for a
 * long time; a symmetric ease leaves and arrives at the same rate, which the eye
 * reads as mechanical. Combined with a *short travel over a long duration*, the
 * result reads as something with weight coming to rest — which is what "premium"
 * actually means in motion terms.
 */

/** Duration in seconds, for GSAP. */
export const DUR = {
  /** Instant feedback: hover, press. */
  tap: 0.35,
  /** Standard entrance for a block of content. */
  reveal: 0.65,
  /** Entrances that should feel like they settle, not arrive. */
  settle: 1.2,
  /** Full-screen transitions: the mobile menu, the lightbox. */
  screen: 0.7,
  /** Editorial reveal; short enough never to gate exploration. */
  hero: 0.95,
} as const;

/** Travel distance in pixels. Deliberately small — see the note above. */
export const TRAVEL = {
  sm: 14,
  md: 22,
  lg: 40,
} as const;

/** Cubic-bezier control points, for GSAP's CustomEase-free `ease` arrays. */
export const EASE = {
  /** Fast out, long settle. The default for everything. */
  out: [0.16, 1, 0.3, 1],
  /** Symmetric, for things that should read as mechanical: progress bars. */
  inOut: [0.65, 0, 0.35, 1],
  /** Sharp, for wipes and masks. */
  line: [0.83, 0, 0.17, 1],
} as const;

/** Stagger between sibling items, in seconds. */
export const STAGGER = {
  tight: 0.05,
  base: 0.08,
  loose: 0.12,
} as const;

/**
 * Breakpoints, mirrored from the CSS. GSAP needs numbers, and media queries
 * cannot be read from JavaScript without a `matchMedia`, so they live here too.
 * If these ever disagree with `tokens.css`, the animations win in the wrong
 * direction — so keep them adjacent in your head.
 */
export const BP = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

/** True when the visitor has asked the system for less motion. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** True on touch devices, where hover reveals and custom cursors are meaningless. */
export function isCoarsePointer(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

/** True when the viewport is at or above a breakpoint. */
export function atLeast(px: number): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(`(min-width: ${px}px)`).matches;
}

/**
 * How much to scale motion back on a small screen.
 *
 * The brief asks for mobile to be an intentional layout rather than a shrunken
 * desktop. Motion is part of that: parallax at 40px on a 1440px screen is
 * subtle, but the same 40px on a 390px screen is a third of the content width
 * moving at once. Returning a multiplier lets call sites stay declarative.
 */
export function motionScale(): number {
  if (typeof window === 'undefined') return 1;
  const width = window.innerWidth;
  if (width < BP.md) return 0.45;
  if (width < BP.lg) return 0.7;
  return 1;
}
