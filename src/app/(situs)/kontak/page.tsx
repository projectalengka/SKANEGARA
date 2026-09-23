import type { Metadata } from 'next';
import { getSections, getSchoolProfile } from '@/lib/content';
import { PageHero } from '@/components/ui/PageHero';
import { ContactForm } from '@/components/sections/ContactForm';
import { telHref, whatsappHref } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Kontak',
  description:
    'Hubungi SMK Jayanegara Mojokerto. Alamat, telepon, email, dan formulir pesan untuk pertanyaan seputar PPDB dan informasi sekolah.',
  alternates: { canonical: '/kontak' },
};

export const revalidate = 300;

export default async function ContactPage() {
  const [profile, sections] = await Promise.all([getSchoolProfile(), getSections()]);
  const section = sections.contact;

  const tel = profile.phone ? telHref(profile.phone) : '';
  const wa = profile.whatsapp ? whatsappHref(profile.whatsapp, 'Halo, saya ingin bertanya tentang SMK Jayanegara.') : '';

  const channels = [
    { label: 'Alamat', value: `${profile.address}\n${profile.city}, ${profile.province}` },
    { label: 'Telepon', value: profile.phone, href: tel },
    { label: 'WhatsApp', value: profile.whatsapp ? 'Kirim pesan' : '', href: wa },
    { label: 'Email', value: profile.email, href: profile.email ? `mailto:${profile.email}` : '' },
  ].filter((channel) => channel.value.trim().length > 0);

  /**
   * Structured data for the school's location. Every field is drawn from the
   * database or an explicit placeholder — nothing is invented, and a field that
   * is still a placeholder is simply omitted rather than guessed at.
   */
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: profile.schoolName,
    description: profile.description,
    address: {
      '@type': 'PostalAddress',
      streetAddress: profile.address,
      addressLocality: profile.city,
      addressRegion: profile.province,
      addressCountry: 'ID',
    },
    telephone: profile.phone,
    email: profile.email,
    sameAs: [profile.instagram, profile.youtube].filter(Boolean),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <PageHero
        index="08"
        eyebrow={section?.eyebrow ?? 'Kontak'}
        title={'Hubungi\nKami.'}
        standfirst={section?.body}
      />

      <section className="section-y">
        <div className="shell-wide">
          <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <h2 className="label text-[var(--color-text-muted)]">Informasi Kontak</h2>

              <dl className="mt-8 flex flex-col">
                {channels.map((channel) => (
                  <div key={channel.label} className="border-t border-[var(--color-line)] py-5">
                    <dt className="label text-[var(--color-text-muted)]">{channel.label}</dt>
                    <dd className="mt-2 whitespace-pre-line">
                      {channel.href ? (
                        <a
                          href={channel.href}
                          className="link-line"
                          {...(channel.href.startsWith('http')
                            ? { target: '_blank', rel: 'noopener noreferrer' }
                            : {})}
                        >
                          {channel.value}
                        </a>
                      ) : (
                        channel.value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>

              {profile.mapsUrl ? (
                <a
                  href={profile.mapsUrl}
                  className="btn btn--ghost mt-8"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Lihat di Peta
                  <span className="btn__arrow" aria-hidden="true">
                    →
                  </span>
                </a>
              ) : null}

              {/*
                No "Jam Layanan" block here.

                It used to read "Senin–Jumat, 07.00–15.00 WIB" — a specific claim
                about when the school is open, invented to fill the space. Nobody
                told us the school's office hours, and a parent who drives over on
                a public holiday because the website said it was open has been
                actively misled. The school profile has no field for opening
                hours, so rather than guess the block is removed; it can come
                back the day there is a real value to show.
              */}
            </div>

            <div className="lg:col-span-7">
              <h2 className="label text-[var(--color-text-muted)]">Kirim Pesan</h2>
              <div className="mt-8">
                <ContactForm />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
