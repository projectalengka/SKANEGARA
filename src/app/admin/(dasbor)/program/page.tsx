import Link from 'next/link';
import { getPrograms } from '@/lib/content';
import { isDatabaseConfigured } from '@/lib/db';
import { AdminHeading } from '@/components/admin/AdminShell';
import { ProgramManager } from '@/components/admin/managers/ProgramManager';

export const metadata = { title: 'Program Keahlian' };
export const dynamic = 'force-dynamic';

/**
 * The programme admin screen.
 *
 * A standalone route as well as being embedded in the profile page, because the
 * sidebar links here directly and an administrator who clicks "Program Keahlian"
 * should land on a page titled the same thing.
 */
export default async function AdminProgramsPage() {
  const programs = await getPrograms({ includeUnpublished: true });
  const configured = isDatabaseConfigured();

  return (
    <>
      <AdminHeading
        eyebrow="Konten"
        title="Program Keahlian"
        description="Tambah, ubah, terbitkan, atau sembunyikan program keahlian sekolah. Setiap program memiliki halaman sendiri di situs publik."
        action={
          <Link href="/program-keahlian" className="btn btn--ghost">
            Lihat di Situs
          </Link>
        }
      />

      {!configured ? (
        <p className="mb-8 border-l-2 border-[var(--color-accent-deep)] bg-[var(--color-paper)] px-6 py-5 text-[var(--color-text-muted)]">
          Basis data belum tersambung, sehingga program tidak dapat disimpan. Lihat petunjuk pada{' '}
          <strong>README.md</strong>.
        </p>
      ) : null}

      <ProgramManager programs={programs} />
    </>
  );
}
