import { getSchoolProfile } from '@/lib/content';
import { SiteShell } from '@/components/shell/SiteShell';

/**
 * The public site's layout.
 *
 * A route group — the parentheses keep `(situs)` out of the URL — so every page
 * inside it gets the school's header and footer, and nothing outside it does.
 * `/admin` sits outside, which is the point: the dashboard previously inherited
 * the public header, and a fixed site header over a dashboard sidebar is a
 * collision, not a design.
 *
 * The profile is fetched here rather than in each page because both the header
 * (the school's name) and the footer (address, contact details, social links)
 * need it. The content layer caches per request, so this is one read, not one
 * per component.
 */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSchoolProfile();

  return <SiteShell profile={profile}>{children}</SiteShell>;
}
