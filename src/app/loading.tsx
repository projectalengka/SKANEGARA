import { ui } from '@/data/defaults';

/**
 * The route-level loading state.
 *
 * Rendered while a server component streams in. Deliberately quiet: a skeleton
 * that mimics the layout is more distracting than useful on a site whose pages
 * resolve in well under a second, and it makes the eventual content feel like a
 * replacement rather than an arrival.
 *
 * A thin rule that animates across the top of the viewport is the whole design —
 * it says "working" without pretending to know what is coming.
 */
export default function Loading() {
  return (
    <div className="fixed inset-x-0 top-0 z-[90] h-px overflow-hidden bg-transparent" role="status" aria-live="polite">
      <span className="sr-only">{ui.loading}</span>
      <span
        aria-hidden="true"
        className="block h-full w-1/3 bg-[var(--color-accent)]"
        style={{ animation: 'loading-bar 1.4s var(--ease-in-out) infinite' }}
      />
      <style>{`
        @keyframes loading-bar {
          0% { transform: translate3d(-100%, 0, 0); }
          100% { transform: translate3d(400%, 0, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          /* A moving bar is exactly the kind of thing reduced motion is asking
             about, so it stops and becomes a static mark instead. */
          [style*='loading-bar'] { animation: none !important; width: 100%; opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
