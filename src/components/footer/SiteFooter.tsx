import Link from 'next/link';
import { footerNav, primaryNav, ui } from '@/data/defaults';
import type { SchoolProfileContent } from '@/data/defaults';
import { telHref, whatsappHref } from '@/lib/utils';

/**
 * The footer.
 *
 * Deliberately dark. The page is white throughout, so a black footer acts as a
 * full stop — it tells the visitor the document has ended rather than trailing
 * off into more sections. It also gives the brand mark one last, large outing.
 *
 * `profile.address` and friends may still be placeholders. When they are, the
 * footer renders the placeholder text rather than hiding the row: an invisible
 * gap is how a school ends up with a live site and no contact details, whereas
 * visible placeholder copy is a to-do list nobody can miss.
 */
export function SiteFooter({ profile }: { profile: SchoolProfileContent }) {
  const year = new Date().getFullYear();
  const tel = profile.phone ? telHref(profile.phone) : '';
  const wa = profile.whatsapp ? whatsappHref(profile.whatsapp) : '';

  const socials = [
    profile.instagram ? { label: 'Instagram', href: profile.instagram } : null,
    profile.youtube ? { label: 'YouTube', href: profile.youtube } : null,
  ].filter((entry): entry is { label: string; href: string } => entry !== null);

  return (
    <footer className="bg-[var(--color-ink)] text-[var(--color-paper)]">
      <div className="shell-wide section-y">
        <div className="grid gap-14 lg:grid-cols-[1.4fr_1fr_1fr] lg:gap-10">
          <div>
            <p className="label text-[var(--color-text-faint)]">Sekolah Menengah Kejuruan</p>
            <p className="display mt-5 text-[length:var(--step-7)] leading-[0.9]">
              SMK
              <br />
              <em>{profile.schoolName.replace(/^SMK\s+/i, '')}</em>
            </p>
            <p className="mt-7 max-w-sm text-[var(--color-text-faint)]">
              {profile.tagline || 'Tempat keterampilan menjadi masa depan.'}
            </p>
          </div>

          <nav aria-label="Navigasi footer">
            <h2 className="label text-[var(--color-text-faint)]">Jelajahi</h2>
            <ul className="mt-6 flex flex-col gap-3">
              <li>
                <Link href="/" className="link-line">
                  Beranda
                </Link>
              </li>
              {primaryNav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="link-line">
                    {item.label}
                  </Link>
                </li>
              ))}
              {footerNav.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="link-line">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="label text-[var(--color-text-faint)]">Kontak</h2>
            <address className="mt-6 flex flex-col gap-3 not-italic">
              <span>{profile.address}</span>
              <span>
                {profile.city}
                {profile.province ? `, ${profile.province}` : ''}
              </span>
              {tel ? (
                <a href={tel} className="link-line">
                  {profile.phone}
                </a>
              ) : (
                <span>{profile.phone}</span>
              )}
              {wa ? (
                <a href={wa} className="link-line" target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>
              ) : null}
              {profile.email ? (
                <a href={`mailto:${profile.email}`} className="link-line">
                  {profile.email}
                </a>
              ) : (
                <span>{profile.email}</span>
              )}
            </address>

            {socials.length > 0 ? (
              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
                {socials.map((social) => (
                  <li key={social.label}>
                    <a
                      href={social.href}
                      className="link-line"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {social.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}

            {profile.mapsUrl ? (
              <a
                href={profile.mapsUrl}
                className="btn btn--on-dark mt-8"
                target="_blank"
                rel="noopener noreferrer"
              >
                Kunjungi Sekolah
                <span className="btn__arrow" aria-hidden="true">
                  →
                </span>
              </a>
            ) : null}
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-[var(--color-line-dark)] pt-6 font-[family-name:var(--font-mono)] text-[length:var(--step--2)] uppercase tracking-[0.12em] text-[var(--color-text-faint)] sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {profile.schoolName}
          </p>
          <p>{ui.footerRights}</p>
        </div>
      </div>
    </footer>
  );
}
