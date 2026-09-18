import { getSections } from '@/lib/content';
import { isDatabaseConfigured } from '@/lib/db';
import { AdminHeading } from '@/components/admin/AdminShell';
import { SectionEditor } from '@/components/admin/managers/SectionEditor';

export const metadata = { title: 'Teks Bagian' };
export const dynamic = 'force-dynamic';

/** The order the sections appear on the page, top to bottom. */
const ORDER = [
  'hero',
  'introduction',
  'about',
  'programs',
  'experience',
  'work',
  'gallery',
  'news',
  'cta',
  'contact',
  'footer',
];

export default async function AdminSectionsPage() {
  const sectionMap = await getSections();
  const configured = isDatabaseConfigured();

  // Rendered in page order rather than database order, so the editor scrolls the
  // way the website does.
  const sections = ORDER.map((key) => sectionMap[key]).filter(
    (section): section is NonNullable<typeof section> => Boolean(section),
  );

  return (
    <>
      <AdminHeading
        eyebrow="Pengaturan"
        title="Teks Bagian"
        description="Ubah judul, label, dan teks tombol pada setiap bagian halaman depan. Perubahan langsung tampil di situs publik."
      />

      {!configured ? (
        <p className="mb-8 border-l-2 border-[var(--color-accent-deep)] bg-[var(--color-paper)] px-6 py-5 text-[var(--color-text-muted)]">
          Basis data belum tersambung, sehingga perubahan tidak akan tersimpan. Lihat petunjuk pada{' '}
          <strong>README.md</strong>.
        </p>
      ) : null}

      <SectionEditor sections={sections} />
    </>
  );
}
