import type { Metadata, Viewport } from 'next';
import { siteUrl } from '@/lib/utils';
import { getSchoolProfile } from '@/lib/content';
import '@/styles/global.css';

/**
 * The root layout.
 *
 * It renders `<html>`, `<body>`, the document metadata and the stylesheet — and
 * nothing else. Next.js allows exactly one root layout and it wraps *every*
 * route, so anything put here is imposed on the dashboard as well as on the
 * site. The site's own frame (header, footer, smooth scroll, custom pointer)
 * therefore lives in `src/app/(situs)/layout.tsx`, and the dashboard's in
 * `src/app/admin/(dasbor)/layout.tsx`.
 *
 * That split is not cosmetic. Until 2026-09-24 the header and footer were
 * rendered here, so `/admin/*` inherited them: the fixed site header floated
 * over the sidebar, the public navigation crossed the dashboard's page title,
 * the custom cursor drew a dot in the middle of a form, and every dashboard page
 * contained two `<main>` elements. See `src/components/shell/SiteShell.tsx` for
 * the measurements.
 */

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getSchoolProfile();
  const url = siteUrl();

  return {
    metadataBase: new URL(url),
    title: {
      default: `${profile.schoolName} — ${profile.tagline || 'Sekolah Menengah Kejuruan'}`,
      template: `%s — ${profile.schoolName}`,
    },
    description:
      profile.description ||
      `${profile.schoolName} di ${profile.city}, ${profile.province}. Profil sekolah, program keahlian, kegiatan, karya siswa, dan informasi PPDB.`,
    applicationName: profile.schoolName,
    keywords: [
      profile.schoolName,
      `SMK ${profile.city}`,
      'SMK Mojokerto',
      'Desain Komunikasi Visual',
      'Otomotif',
      'PPDB',
      'sekolah kejuruan',
    ],
    authors: [{ name: profile.schoolName }],
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      locale: 'id_ID',
      url,
      siteName: profile.schoolName,
      title: `${profile.schoolName} — ${profile.tagline}`,
      description: profile.description || `${profile.schoolName} di ${profile.city}, ${profile.province}.`,
      images: [{ url: '/images/hero.svg', width: 1920, height: 1200, alt: profile.schoolName }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${profile.schoolName} — ${profile.tagline}`,
      description: profile.description || `${profile.schoolName} di ${profile.city}, ${profile.province}.`,
      images: ['/images/hero.svg'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
    },
    icons: {
      icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    },
  };
}

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
  // Zoom is deliberately left enabled: disabling it is an accessibility failure,
  // and the type scale is fluid enough that it is not needed as a crutch.
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /*
      `className="js"` is rendered by the *server*, not added by a script.

      It used to be added by the inline `<head>` script below, and that produced
      a hydration mismatch React reported on every page:

        <html lang="id"
        -   className="js"

      The class deliberately is *not* rendered here. `.js [data-reveal]` sets
      `opacity: 0`, and `data-revealed` is what brings it back, so a visitor
      whose JavaScript is disabled would receive `class="js"` from the server,
      get the hiding rule, and have no script left to reveal anything — they
      would see a permanently blank page. The class must therefore stay a
      client-side decision, which means React has to be told to tolerate it.

      `suppressHydrationWarning` covers `js` here and `lenis`, which Lenis adds
      to `<html>` once it is actually driving the scroll. Both are correct by
      design and impossible to server-render. Note this covers only `<html>`'s
      own attributes — every descendant is still compared normally, so a
      mismatch anywhere else in the page is still reported.
    */
    <html lang="id" suppressHydrationWarning>
      <head>
        {/*
          Preload the one face that paints above the fold — Instrument Sans,
          used by both the hero headline and the navigation. The mono can wait;
          it appears below the fold.

          Dulu ada dua preload di sini karena judul memakai serif yang berbeda.
          Setelah seluruh situs memakai satu rumpun, preload kedua tidak lagi
          merujuk berkas yang dipakai siapa pun — dan preload untuk font yang
          tidak terpakai tetap memakan satu permintaan di jalur kritis.

          `crossOrigin` is required even for same-origin fonts: without it the
          preload is fetched in a different CORS mode than the CSS request and the
          browser downloads the file twice.
        */}
        <link
          rel="preload"
          href="/fonts/instrument-sans-var.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />

        {/*
          Mark the document as script-capable before paint.

          The whole progressive-enhancement system hangs on the `.js` class:
          every CSS rule that hides content for an animation is gated behind it,
          so that a visitor whose bundle never loads sees the finished page
          rather than an empty one. That gate is backwards-invisible — without
          this script the site renders, nothing errors, and the animations
          simply never hide or reveal anything.

          It must run *before* the first paint, which is why it is an inline
          blocking script in `<head>` rather than an effect inside a client
          component: an effect runs after hydration, so a masked headline would
          flash in its final position and then jump back to be re-animated.

          `dangerouslySetInnerHTML` is not needed — Next.js serialises a string
          child of `<script>` verbatim, and the content is a static literal with
          no interpolation, so there is no injection surface.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.classList.add('js')}catch(e){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

/**
 * The layout is dynamic rather than static.
 *
 * The content layer falls back to seed data when the database is unreachable,
 * and that is a per-request fact: caching the shell statically would serve one
 * visitor's state to another.
 */
export const dynamic = 'force-dynamic';
