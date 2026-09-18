import { getNews } from '@/lib/content';
import { isDatabaseConfigured } from '@/lib/db';
import { AdminHeading } from '@/components/admin/AdminShell';
import { NewsManager } from '@/components/admin/managers/NewsManager';

export const metadata = { title: 'Berita' };
export const dynamic = 'force-dynamic';

export default async function AdminNewsPage() {
  const news = await getNews({ includeUnpublished: true });
  const configured = isDatabaseConfigured();

  return (
    <>
      <AdminHeading
        eyebrow="Konten"
        title="Berita"
        description="Tulis, ubah, terbitkan, atau sembunyikan berita sekolah. Berita yang diterbitkan langsung tampil pada halaman Berita di situs publik."
      />

      {!configured ? (
        <p className="mb-8 border-l-2 border-[var(--color-accent-deep)] bg-[var(--color-paper)] px-6 py-5 text-[var(--color-text-muted)]">
          Basis data belum tersambung, sehingga berita tidak dapat disimpan. Lihat petunjuk pada{' '}
          <strong>README.md</strong>.
        </p>
      ) : null}

      <NewsManager news={news} />
    </>
  );
}
