'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

/**
 * The custom pointer.
 *
 * Three things this deliberately does *not* do:
 *
 *  - **It does not hide the native cursor.** The native cursor stays visible and
 *    this augments it. Hiding it and drawing a replacement is the common
 *    approach, but it strands the visitor during the window before hydration and
 *    everywhere a synthetic cursor cannot reach (text selection, form fields,
 *    browser chrome). A cursor that augments never leaves someone without one.
 *  - **It does not run on touch devices.** A "custom cursor" on a phone is one
 *    the finger never sees; it only costs work per pointer event.
 *  - **It does not run under `prefers-reduced-motion`.** A cursor that trails the
 *    pointer is motion, and the brief asks for that preference to be honoured.
 *
 * Beyond that, the work is kept out of React's render path entirely: position is
 * written to the DOM inside a single `requestAnimationFrame` loop, and React
 * state only changes when the *mode* changes. A mouse crossing the page causes
 * zero re-renders.
 */

/**
 * Reads a media query as external state.
 *
 * `useSyncExternalStore` is the right tool here rather than `useEffect` +
 * `setState`. The question — "is this a fine pointer, and does the visitor want
 * reduced motion?" — is a fact about the outside world, not component state.
 * Reading it in an effect and pushing it into state causes an extra render pass
 * on every mount for no benefit, and React flags that pattern.
 *
 * The server snapshot is `false`, so the cursor is absent during SSR and appears
 * only once the client has actually confirmed the hardware supports it. That is
 * also what keeps hydration stable: server and first client render agree.
 */
function useMediaQuery(query: string): boolean {
  const subscribe = (onChange: () => void) => {
    const list = window.matchMedia(query);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  };

  const getSnapshot = () => window.matchMedia(query).matches;
  const getServerSnapshot = () => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Whether we are running on the client.
 *
 * A `useState(false)` + `useEffect(() => setState(true))` pair is the common way
 * to write this, but it costs an extra render pass and React flags setting state
 * synchronously in an effect.
 *
 * `useSyncExternalStore` expresses the same thing without either problem: the
 * server snapshot is always `false`, and the client snapshot is always `true`,
 * so hydration is stable by construction.
 */
const emptySubscribe = () => () => {};

function useIsClient(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

export function CustomCursor() {
  const finePointer = useMediaQuery('(pointer: fine)');
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const isClient = useIsClient();
  const enabled = finePointer && !reducedMotion;

  const dotRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(12);
  const [filled, setFilled] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    const dot = dotRef.current;
    if (!dot) return;

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let currentX = x;
    let currentY = y;
    let frame = 0;
    let visible = false;

    // Mode is tracked locally and only pushed into state when it actually
    // changes, so hovering across a page does not re-render per element.
    let mode: 'default' | 'link' | 'media' = 'default';

    const applyMode = (next: typeof mode) => {
      if (next === mode) return;
      mode = next;
      setSize(next === 'link' ? 44 : next === 'media' ? 56 : 12);
      setFilled(next === 'default');
    };

    const onMove = (event: PointerEvent) => {
      x = event.clientX;
      y = event.clientY;

      // A pointer that is only visible after the first move avoids a stray dot
      // parked in the middle of the screen on page load.
      if (!visible) {
        visible = true;
        dot.style.opacity = '1';
      }

      const target = event.target as Element | null;
      if (target?.closest('a, button, [role="button"], input, select, textarea, summary')) {
        applyMode('link');
      } else if (target?.closest('figure, [data-image-reveal]')) {
        applyMode('media');
      } else {
        applyMode('default');
      }
    };

    const onLeave = () => {
      visible = false;
      dot.style.opacity = '0';
    };

    const render = () => {
      // Ease toward the pointer. 0.18 is where it still reads as attached to the
      // hand rather than trailing behind it.
      currentX += (x - currentX) * 0.18;
      currentY += (y - currentY) * 0.18;
      dot.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
      frame = requestAnimationFrame(render);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave);
    frame = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(frame);
    };
  }, [enabled]);

  if (!enabled || !isClient) return null;

  return createPortal(
    <div
      ref={dotRef}
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-[100] mix-blend-difference"
      style={{
        opacity: 0,
        transition: 'opacity 300ms var(--ease-out)',
        willChange: 'transform',
      }}
    >
      <span
        className="block rounded-full border"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderColor: 'var(--color-paper)',
          backgroundColor: filled ? 'var(--color-paper)' : 'transparent',
          transition:
            'width 400ms var(--ease-out), height 400ms var(--ease-out), background-color 400ms var(--ease-out)',
        }}
      />
    </div>,
    document.body,
  );
}
