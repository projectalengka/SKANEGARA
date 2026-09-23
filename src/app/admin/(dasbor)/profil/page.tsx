import Link from 'next/link';
import { getPrograms, getSchoolProfile } from '@/lib/content';
import { isDatabaseConfigured } from '@/lib/db';
import { AdminHeading, AdminPanel } from '@/components/admin/AdminShell';
import { ProgramManager } from '@/components/admin/managers/ProgramManager';
import { SchoolProfileForm } from '@/components/admin/managers/SchoolProfileForm';

export const metadata = { title: 'Profil Sekolah' };
export const dynamic = 'force-dynamic';

/**
 * School profile and programmes on one screen.
 *
 * They share a page because they are the same job — "describe the school" — and
 * splitting them across two sidebar entries would mean an administrator who
 * wants to add a programme has to guess whether that lives under "Profil" or
 * "Program". The brief lists them separately; the sidebar still links here by
 * both names via the anchor.
 */
export default async function SchoolProfilePage() {
  const [profile, programs] = await Promise.all([
    getSchoolProfile(),
    getPrograms({ includeUnpublished: true }),
  ]);

  const configured = isDatabaseConfigured();

  return (
    <>
      <AdminHeading
        eyebrow="Konten"
        title="Profil Sekolah"
        description="Ubah nama sekolah, tagline, sejarah, visi, misi, dan data kontak. Seluruh perubahan langsung tampil di situs publik."
        action={
          <Link href="#program" className="btn btn--ghost">
            Ke Program Keahlian
          </Link>
        }
      />

      {!configured ? (
        <p className="mb-8 border-l-2 border-[var(--color-accent-deep)] bg-[var(--color-paper)] px-6 py-5 text-[var(--color-text-muted)]">
          Basis data belum tersambung, sehingga perubahan tidak akan tersimpan. Lihat petunjuk pada{' '}
          <strong>README.md</strong>.
        </p>
      ) : null}

      <SchoolProfileForm profile={profile} />

      <div id="program" className="mt-12 scroll-mt-8">
        <AdminHeading
          level={2}
          eyebrow="Konten"
          title="Program Keahlian"
          description="Tambah, ubah, terbitkan, atau sembunyikan program keahlian."
        />
        <ProgramManager programs={programs} />
      </div>

      <div className="mt-8">
        <AdminPanel title="Catatan tentang Tagline">
          <p className="text-[var(--color-text-muted)]">
            Tagline tampil pada bagian hero di halaman depan dan pada footer. Gunakan kalimat Bahasa
            Indonesia yang singkat — misalnya &ldquo;Tempat keterampilan menjadi masa depan.&rdquo;
            Hindari tagline berbahasa Inggris kecuali memang dikehendaki.
          </p>
        </AdminPanel>
      </div>
    </>
  );
}
