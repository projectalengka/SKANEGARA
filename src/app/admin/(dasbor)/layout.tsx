import type { Metadata } from 'next';
import { requireSession } from '@/lib/session';
import { contentMode, getSchoolProfile, sampleMode, sampleRawValue } from '@/lib/content';
import { AdminShell } from '@/components/admin/AdminShell';

export const metadata: Metadata = {
  title: {
    default: 'Dasbor',
    template: '%s — Dasbor',
  },
  // The dashboard must never appear in a search result. `robots.txt` asks
  // politely; this is the directive a crawler must honour.
  robots: { index: false, follow: false, nocache: true },
};

/**
 * The dashboard layout.
 *
 * `requireSession` runs here rather than in each page, so a new admin page is
 * protected by virtue of existing inside this folder. That is a meaningfully
 * safer default than asking each page to remember a guard — the failure mode of
 * forgetting is an unprotected route, and nobody notices until it is indexed.
 *
 * `force-dynamic` because every screen here depends on the session cookie and on
 * data that changes; a statically cached dashboard would show one administrator
 * another's content.
 */
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [session, profile] = await Promise.all([requireSession('/admin/dasbor'), getSchoolProfile()]);

  return (
    <AdminShell
      email={session.email}
      mode={contentMode()}
      schoolName={profile.schoolName}
      sample={sampleMode()}
      sampleRaw={sampleRawValue()}
    >
      {children}
    </AdminShell>
  );
}
