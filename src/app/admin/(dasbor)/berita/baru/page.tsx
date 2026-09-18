import Link from 'next/link';
import { getNews } from '@/lib/content';
import { AdminHeading } from '@/components/admin/AdminShell';
import { NewsForm } from '@/components/admin/managers/NewsManager';
import { saveNews } from '@/app/admin/content-actions';

export const metadata = { title: 'Tulis Berita' };
export const dynamic = 'force-dynamic';

/**
 * The new-article screen.
 *
 * Bound to `saveNews` with no id, so the same action inserts. Keeping create and
 * update on one action means the validation rules are stated once — the classic
 * bug in a CMS is a rule enforced on edit but not on create.
 */
export default async function NewNewsPage() {
  // Touching the content layer here means a missing database is reported on the
  // form rather than at submit time.
  await getNews({ includeUnpublished: true, limit: 1 });

  return (
    <>
      <AdminHeading
        eyebrow="Berita"
        title="Tulis Berita"
        description="Isi judul dan isi berita, lalu simpan sebagai draf atau langsung terbitkan."
        action={
          <Link href="/admin/berita" className="btn btn--ghost">
            ← Kembali
          </Link>
        }
      />

      <NewsForm action={saveNews} />
    </>
  );
}
