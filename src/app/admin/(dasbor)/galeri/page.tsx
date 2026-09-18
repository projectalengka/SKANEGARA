import { getGallery } from '@/lib/content';
import { isDatabaseConfigured } from '@/lib/db';
import { AdminHeading } from '@/components/admin/AdminShell';
import { GalleryManager } from '@/components/admin/managers/GalleryManager';

export const metadata = { title: 'Galeri' };
export const dynamic = 'force-dynamic';

export default async function AdminGalleryPage() {
  const items = await getGallery({ includeUnpublished: true });
  const configured = isDatabaseConfigured();

  return (
    <>
      <AdminHeading
        eyebrow="Konten"
        title="Galeri"
        description="Unggah dan atur foto galeri. Foto tersimpan di Cloudinary, bukan di server, sehingga tidak hilang saat situs diperbarui."
      />

      {!configured ? (
        <p className="mb-8 border-l-2 border-[var(--color-accent-deep)] bg-[var(--color-paper)] px-6 py-5 text-[var(--color-text-muted)]">
          Basis data belum tersambung, sehingga foto tidak dapat disimpan. Lihat petunjuk pada{' '}
          <strong>README.md</strong>.
        </p>
      ) : null}

      <GalleryManager items={items} />
    </>
  );
}
