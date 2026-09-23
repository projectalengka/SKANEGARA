import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getNews } from '@/lib/content';
import { AdminHeading, AdminPanel } from '@/components/admin/AdminShell';
import { NewsForm } from '@/components/admin/managers/NewsManager';
import { saveNews } from '@/app/admin/content-actions';
import { DeleteNewsButton } from '@/components/admin/managers/DeleteNewsButton';
import { formatDateId } from '@/lib/utils';

export const metadata = { title: 'Ubah Berita' };
export const dynamic = 'force-dynamic';

/**
 * The edit screen.
 *
 * The article is looked up from the full list rather than by id, so a draft is
 * reachable here even though `getNewsBySlug` deliberately filters drafts out of
 * the public site. That separation is the point: the public read path and the
 * admin read path must not share a visibility filter.
 */
export default async function EditNewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const news = await getNews({ includeUnpublished: true });
  const article = news.find((item) => item.id === id);

  if (!article) notFound();

  return (
    <>
      <AdminHeading
        eyebrow="Berita"
        title="Ubah Berita"
        // This read `Terakhir diperbarui` while formatting `createdAt`. There is
        // no `updatedAt` column on News, so the label was simply wrong — it told
        // the administrator the article had been edited when it had only been
        // created. Showing the publication date (or creation, for a draft) is
        // both accurate and the date they actually care about.
        description={`${article.published ? 'Terbit' : 'Draf'} · ${formatDateId(article.publishedAt ?? article.createdAt)}`}
        action={
          <Link href="/admin/berita" className="btn btn--ghost">
            ← Kembali
          </Link>
        }
      />

      <NewsForm article={article} action={saveNews} />

      <div className="mt-8">
        <AdminPanel title="Hapus Berita">
          <p className="text-[var(--color-text-muted)]">
            Menghapus berita juga menghapus gambar utamanya dari penyimpanan. Tindakan ini tidak dapat
            dibatalkan. Untuk menyembunyikan saja, gunakan tombol Sembunyikan pada halaman daftar
            berita.
          </p>
          <div className="mt-6">
            <DeleteNewsButton id={article.id} />
          </div>
        </AdminPanel>
      </div>
    </>
  );
}
