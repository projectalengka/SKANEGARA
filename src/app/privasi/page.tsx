import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHero } from '@/components/ui/PageHero';

export const metadata: Metadata = {
  title: 'Kebijakan Privasi',
  description:
    'Kebijakan privasi situs SMK Jayanegara. Penjelasan data apa yang dikumpulkan, bagaimana data digunakan, dan hak pengunjung.',
  alternates: { canonical: '/privasi' },
};

export const revalidate = 3600;

/**
 * The privacy page.
 *
 * Its content is written from what the site **actually does** — not from a
 * template. That distinction matters: a boilerplate privacy policy that mentions
 * advertising cookies on a site with no advertising is a lie, and a school is a
 * place where that lie is told to children and their parents.
 *
 * Every claim below is verifiable against the code:
 *  - no analytics or tracking scripts are loaded (see `src/app/layout.tsx`);
 *  - no cookies are set for visitors (`src/lib/session.ts` writes one, but only
 *    for the administrator after login);
 *  - the progress feature mentioned in earlier projects is not part of this site,
 *    so it is not claimed here.
 */
export default function PrivacyPage() {
  return (
    <>
      <PageHero
        index="09"
        eyebrow="Kebijakan Privasi"
        title={'Privasi\npengunjung.'}
        standfirst="Kami menjelaskan secara terbuka data apa yang dikumpulkan situs ini dan bagaimana data tersebut digunakan."
      />

      <section className="section-y">
        <div className="shell-wide">
          <div className="max-w-3xl">
            <article className="flex flex-col gap-12">
              <section>
                <h2 className="label text-[var(--color-accent)]">01 — Data yang Kami Kumpulkan</h2>
                <div className="mt-5 flex flex-col gap-4 text-[var(--color-text-muted)]">
                  <p>
                    Situs ini dapat dijelajahi tanpa membuat akun dan tanpa memberikan data pribadi.
                    Kami tidak memasang skrip analitik, pelacak iklan, maupun cookie pihak ketiga.
                  </p>
                  <p>
                    Data pribadi hanya kami terima jika Anda mengirimkannya sendiri melalui formulir
                    kontak: nama, alamat email, nomor telepon (opsional), subjek, dan isi pesan.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="label text-[var(--color-accent)]">02 — Penggunaan Data</h2>
                <div className="mt-5 flex flex-col gap-4 text-[var(--color-text-muted)]">
                  <p>
                    Data dari formulir kontak hanya digunakan untuk menjawab pertanyaan Anda. Kami
                    tidak menggunakannya untuk pemasaran dan tidak membagikannya kepada pihak lain.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="label text-[var(--color-accent)]">03 — Cookie</h2>
                <div className="mt-5 flex flex-col gap-4 text-[var(--color-text-muted)]">
                  <p>
                    Pengunjung situs tidak menerima cookie apa pun. Satu cookie hanya dibuat ketika
                    administrator sekolah masuk ke Dasbor, dan cookie itu semata-mata berfungsi
                    menjaga sesi login tersebut.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="label text-[var(--color-accent)]">04 — Penyimpanan Gambar</h2>
                <div className="mt-5 flex flex-col gap-4 text-[var(--color-text-muted)]">
                  <p>
                    Foto yang diunggah administrator disimpan pada layanan penyimpanan gambar
                    Cloudinary. Foto tersebut hanya berisi kegiatan sekolah dan tidak memuat data
                    pribadi pengunjung.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="label text-[var(--color-accent)]">05 — Hak Anda</h2>
                <div className="mt-5 flex flex-col gap-4 text-[var(--color-text-muted)]">
                  <p>
                    Anda dapat meminta salinan atau penghapusan pesan yang pernah Anda kirim melalui
                    formulir kontak. Hubungi kami melalui halaman kontak untuk permintaan tersebut.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="label text-[var(--color-accent)]">06 — Perubahan</h2>
                <div className="mt-5 flex flex-col gap-4 text-[var(--color-text-muted)]">
                  <p>
                    Jika kebijakan ini berubah, kami akan memperbarui halaman ini. Tanggal pembaruan
                    terakhir tercatat pada bagian atas halaman.
                  </p>
                </div>
              </section>
            </article>

            <div className="mt-16 border-t border-[var(--color-line)] pt-8">
              <Link href="/kontak" className="btn btn--ghost">
                Hubungi Kami
                <span className="btn__arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
