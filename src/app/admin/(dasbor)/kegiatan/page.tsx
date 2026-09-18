import { getEvents } from '@/lib/content';
import { isDatabaseConfigured } from '@/lib/db';
import { AdminHeading } from '@/components/admin/AdminShell';
import { EventManager } from '@/components/admin/managers/EventManager';

export const metadata = { title: 'Kegiatan' };
export const dynamic = 'force-dynamic';

export default async function AdminEventsPage() {
  const events = await getEvents({ includeUnpublished: true });
  const configured = isDatabaseConfigured();

  return (
    <>
      <AdminHeading
        eyebrow="Konten"
        title="Kegiatan"
        description="Catat agenda dan kegiatan sekolah beserta tanggal dan lokasinya."
      />

      {!configured ? (
        <p className="mb-8 border-l-2 border-[var(--color-accent-deep)] bg-[var(--color-paper)] px-6 py-5 text-[var(--color-text-muted)]">
          Basis data belum tersambung, sehingga kegiatan tidak dapat disimpan. Lihat petunjuk pada{' '}
          <strong>README.md</strong>.
        </p>
      ) : null}

      <EventManager events={events} />
    </>
  );
}
