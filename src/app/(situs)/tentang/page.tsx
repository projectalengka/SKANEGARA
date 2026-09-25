import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getSchoolProfile } from '@/lib/content';
import { PageHero } from '@/components/ui/PageHero';

export const metadata: Metadata = {
  title: 'Tentang Kami',
  description:
    'Profil, sejarah, visi, dan misi SMK Jayanegara di Mojokerto, Jawa Timur. Mengenal lebih dekat sekolah dan arah pendidikannya.',
  alternates: { canonical: '/tentang' },
};

export const revalidate = 300;

export default async function AboutPage() {
  const profile = await getSchoolProfile();

  return (
    <>
      <PageHero
        index="01"
        eyebrow="Tentang Kami"
        title={'Kenali\nJayanegara.'}
        standfirst={profile.description}
      />

      <section className="section-y">
        <div className="shell-wide">
          {/* History. A two-column editorial spread: the label is a margin note,
              the body is the measure. */}
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-3">
              <h2 className="label text-[var(--color-text-muted)]" data-reveal>
                Sejarah
              </h2>
            </div>
            <div className="lg:col-span-9">
              <p className="prose-body !text-[length:var(--step-2)] !text-[var(--color-text)]" data-reveal>
                {profile.history}
              </p>
            </div>
          </div>

          {/* Foto sekolah. Selama pemilik belum mengunggahnya, yang tampil
              adalah placeholder `public/images/hero.svg` — dan `alt`-nya kosong
              dengan sengaja. Alt yang mendeskripsikan "foto" yang tidak ada
              adalah klaim palsu kepada setiap pembaca layar; versi pertama
              halaman ini melakukan tepat itu. Begitu fotonya sungguhan, alt-nya
              boleh menyebutnya, karena sekarang memang foto. */}
          <div className="relative mt-16 aspect-16/9 overflow-hidden lg:mt-24" data-image-reveal>
            <Image
              src={profile.image || '/images/hero.svg'}
              alt={profile.image ? `Foto ${profile.schoolName}` : ''}
              fill
              sizes="100vw"
              className="object-cover"
            />
          </div>

          {/* Vision and mission, side by side and deliberately unequal — the
              vision is one sentence and gets one column, the mission is a list
              and gets two. */}
          <div className="mt-16 grid gap-12 border-t border-[var(--color-line)] pt-14 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-4">
              <p className="label text-[var(--color-accent)]" data-reveal>
                02
              </p>
              <h2 className="display mt-5 text-[length:var(--step-5)] leading-[0.95]" data-reveal>
                Visi &amp;
                <br />
                <em>Misi.</em>
              </h2>
            </div>

            <div className="lg:col-span-4">
              <h3 className="label text-[var(--color-text-muted)]" data-reveal>
                Visi
              </h3>
              <p className="mt-5 text-[length:var(--step-1)]" data-reveal>
                {profile.vision}
              </p>
            </div>

            <div className="lg:col-span-4">
              <h3 className="label text-[var(--color-text-muted)]" data-reveal>
                Misi
              </h3>
              <ol className="mt-5 flex flex-col gap-5">
                {profile.mission.map((item, index) => (
                  <li key={item} className="flex gap-5 border-t border-[var(--color-line)] pt-4" data-reveal>
                    <span className="label shrink-0 pt-1 text-[var(--color-accent)]">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[var(--color-text-muted)]">{item}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section className="section-y bg-[var(--color-paper-warm)]">
        <div className="shell-wide">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-3">
              <p className="label text-[var(--color-accent)]">03</p>
              <p className="label mt-3 text-[var(--color-text-muted)]">Kunjungi</p>
            </div>
            <div className="lg:col-span-9">
              <h2 className="display text-[length:var(--step-6)] leading-[0.92]" data-reveal>
                Lokasi
                <br />
                <em>sekolah.</em>
              </h2>

              <div className="mt-10 grid gap-10 border-t border-[var(--color-line)] pt-10 sm:grid-cols-2">
                <address className="not-italic" data-reveal>
                  <p className="label text-[var(--color-text-muted)]">Alamat</p>
                  <p className="mt-3">{profile.address}</p>
                  <p>
                    {profile.city}
                    {profile.province ? `, ${profile.province}` : ''}
                  </p>
                </address>

                <div data-reveal>
                  <p className="label text-[var(--color-text-muted)]">Kontak</p>
                  <p className="mt-3">{profile.phone}</p>
                  <p>{profile.email}</p>
                </div>
              </div>

              <div className="mt-10 flex flex-wrap gap-3" data-reveal>
                {profile.mapsUrl ? (
                  <a
                    href={profile.mapsUrl}
                    className="btn btn--solid"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Kunjungi Sekolah
                    <span className="btn__arrow" aria-hidden="true">
                      →
                    </span>
                  </a>
                ) : null}
                <Link href="/kontak" className="btn btn--ghost">
                  Hubungi Kami
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
