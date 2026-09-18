import { getStudentWork } from '@/lib/content';
import { isDatabaseConfigured } from '@/lib/db';
import { AdminHeading } from '@/components/admin/AdminShell';
import { StudentWorkManager } from '@/components/admin/managers/StudentWorkManager';

export const metadata = { title: 'Karya Siswa' };
export const dynamic = 'force-dynamic';

export default async function AdminWorkPage() {
  const works = await getStudentWork({ includeUnpublished: true });
  const configured = isDatabaseConfigured();

  return (
    <>
      <AdminHeading
        eyebrow="Konten"
        title="Karya Siswa"
        description="Kelola karya siswa yang ditampilkan pada bagian Karya Siswa di halaman depan dan halaman Karya Siswa."
      />

      {!configured ? (
        <p className="mb-8 border-l-2 border-[var(--color-accent-deep)] bg-[var(--color-paper)] px-6 py-5 text-[var(--color-text-muted)]">
          Basis data belum tersambung, sehingga karya tidak dapat disimpan. Lihat petunjuk pada{' '}
          <strong>README.md</strong>.
        </p>
      ) : null}

      <StudentWorkManager works={works} />
    </>
  );
}
