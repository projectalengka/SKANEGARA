'use client';

import { useEffect } from 'react';

/**
 * Smooth scrolling.
 *
 * Lenis with `duration` + an explicit expo-out, deliberately not `lerp`.
 * `lerp` is evaluated per frame, so the same wheel input travels measurably
 * further per second on a 144 Hz display than on a 60 Hz laptop — which means
 * the scroll feel would be a property of the visitor's hardware. `duration` is
 * wall-clock, so it feels the same everywhere.
 *
 * Three gates, in this order:
 *
 *  1. `prefers-reduced-motion: reduce` — never start. Vestibular disorders are
 *     real and hijacking the scroll wheel is the most common way a site hurts
 *     someone. Not "slower": absent.
 *  2. Touch (`pointer: coarse`) — never start. Native momentum scrolling on a
 *     phone is better than anything a library produces, and fighting it is the
 *     classic way to make a site feel broken on mobile.
 *  3. Everything else — start, and hand the instance to GSAP's ticker so the
 *     scroll position is updated once per frame in the same place as every
 *     ScrollTrigger calculation. Two independent rAF loops is how scroll-linked
 *     animations end up one frame behind the scroll itself.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    let lenis: { raf: (time: number) => void; destroy: () => void } | null = null;
    let frame = 0;
    let cancelled = false;

    const start = async () => {
      // Both libraries are loaded lazily. Neither is needed for the first paint,
      // and neither is needed at all for a visitor with reduced motion or a
      // phone — so neither should be in the initial bundle.
      const [{ default: Lenis }, { gsap, ScrollTrigger }] = await Promise.all([
        import('lenis'),
        import('gsap').then(async (module) => {
          const { ScrollTrigger: ST } = await import('gsap/ScrollTrigger');
          module.gsap.registerPlugin(ST);
          return { gsap: module.gsap, ScrollTrigger: ST };
        }),
      ]);

      if (cancelled) return;

      const instance = new Lenis({
        duration: 1.05,
        // Expo-out: leaves quickly, settles slowly. A symmetric ease here is what
        // makes a site feel like it is lagging rather than gliding.
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        // Horizontal scrolling is never smoothed: a horizontally scrollable
        // element (a gallery rail, a table) must keep its native behaviour where
        // a trackpad gesture and a shift-wheel mean different things.
        syncTouch: false,
        wheelMultiplier: 1,
        touchMultiplier: 1.6,
      });

      lenis = instance;

      const tick = (time: number) => {
        instance.raf(time);
      };

      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);

      // ScrollTrigger has to be told that the scroll position is now controlled
      // by something other than the browser, or every trigger fires against a
      // stale `scrollY`.
      const onScroll = () => ScrollTrigger.update();
      instance.on('scroll', onScroll);

      frame = requestAnimationFrame(() => ScrollTrigger.refresh());
    };

    void start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      // `destroy` restores native scrolling, so a hot reload in development does
      // not stack two instances on top of each other.
      lenis?.destroy();
    };
  }, []);

  return null;
}
