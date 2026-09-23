'use client';

import { useEffect } from 'react';

/** Desktop-only enhancement; touch and reduced motion keep native scrolling. */
export function SmoothScroll() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarse = window.matchMedia('(pointer: coarse)');
    let cancelled = false;
    let generation = 0;
    let dispose: (() => void) | undefined;

    const configure = async () => {
      const current = ++generation;
      dispose?.();
      dispose = undefined;
      if (reduced.matches || coarse.matches) return;
      try {
        const [{ default: Lenis }, { gsap }, { ScrollTrigger }] = await Promise.all([
          import('lenis'), import('gsap'), import('gsap/ScrollTrigger'),
        ]);
        if (cancelled || current !== generation) return;
        gsap.registerPlugin(ScrollTrigger);
        const instance = new Lenis({
          // Explicitly disable default lerp: duration owns the wheel's settling time.
          lerp: 0, duration: 0.8,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          smoothWheel: true, syncTouch: false, autoRaf: false, anchors: true,
        });
        // GSAP reports seconds; Lenis requires milliseconds. Omitting this
        // conversion made a 600px wheel gesture move only 9px in two seconds.
        const tick = (seconds: number) => instance.raf(seconds * 1000);
        const onScroll = () => ScrollTrigger.update();
        const stop = () => instance.stop();
        const start = () => instance.start();
        instance.on('scroll', onScroll);
        gsap.ticker.add(tick);
        document.addEventListener('site:scroll-lock', stop);
        document.addEventListener('site:scroll-unlock', start);
        if (document.body.hasAttribute('data-scroll-locked')) stop();
        const frame = requestAnimationFrame(() => ScrollTrigger.refresh());
        dispose = () => {
          cancelAnimationFrame(frame);
          document.removeEventListener('site:scroll-lock', stop);
          document.removeEventListener('site:scroll-unlock', start);
          gsap.ticker.remove(tick);
          instance.off('scroll', onScroll);
          instance.destroy();
        };
      } catch {
        // A failed optional chunk must never disable the browser's native scroll.
      }
    };
    const onChange = () => { void configure(); };
    onChange();
    reduced.addEventListener('change', onChange);
    coarse.addEventListener('change', onChange);
    return () => {
      cancelled = true;
      generation += 1;
      reduced.removeEventListener('change', onChange);
      coarse.removeEventListener('change', onChange);
      dispose?.();
    };
  }, []);
  return null;
}
