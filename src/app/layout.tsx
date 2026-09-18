import type { Metadata, Viewport } from 'next';
import { siteUrl } from '@/lib/utils';
import { SmoothScroll } from '@/components/motion/SmoothScroll';
import { RevealObserver } from '@/components/motion/RevealObserver';
import { CustomCursor } from '@/components/motion/CustomCursor';
import { SiteHeader } from '@/components/navigation/SiteHeader';
import { SiteFooter } from '@/components/footer/SiteFooter';
import { getSchoolProfile } from '@/lib/content';
import '@/styles/global.css';

/**
 * The root layout.
 *
 * Server-rendered by default. Only three things below this line are client
 * components, and each one has to be: smooth scroll owns a global scroll
 * instance, the reveal observer owns an IntersectionObserver, and the header
 * owns menu state. Everything else — every section, every page — is a server
 * component, which is what keeps the bundle honest.
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSchoolProfile();

  return (
    <html lang="id">
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
          The progressive-enhancement switch. `.js` gates every rule that hides
          content for an entrance animation, so this runs before paint and the
          site is visible-but-unrevealed rather than hidden-then-visible. If
          scripting is off, the class is never added and all content is simply
          present.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add('js');`,
          }}
        />
      </head>
      <body>
        <a className="skip-link" href="#konten">
          Lompat ke konten utama
        </a>
        <SmoothScroll />
        <RevealObserver />
        <CustomCursor />
        <SiteHeader schoolName={profile.schoolName} />
        <main id="konten">{children}</main>
        <SiteFooter profile={profile} />
      </body>
    </html>
  );
}

/**
 * The layout is dynamic rather than static.
 *
 * The header renders differently depending on whether an admin session cookie
 * is present, and the content layer falls back to seed data when the database
 * is unreachable. Both of those are per-request facts, so caching the shell
 * statically would serve one visitor's state to another.
 */
export const dynamic = 'force-dynamic';
