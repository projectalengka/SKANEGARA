import Link from 'next/link';
import {
  getEvents,
  getGallery,
  getNews,
  getPrograms,
  getSchoolProfile,
  getStudentWork,
} from '@/lib/content';
import { getPrisma, isDatabaseConfigured } from '@/lib/db';
import { AdminHeading, AdminPanel } from '@/components/admin/AdminShell';
import { formatDateId } from '@/lib/utils';
import { isPlaceholder } from '@/data/defaults';

/**
 * The dashboard home.
 *
 * Its real job is not statistics — a school site does not have metrics worth
 * watching. It is to answer three questions in one screen:
 *
 *  1. **Is the site connected to a database?** If not, everything the
 *     administrator types will be lost, and that must be the first thing they
 *     learn.
 *  2. **What is still empty?** Every count here is a to-do item, and the
 *     placeholder detection surfaces the fields that are still `[ … ]` so an
 *     unfinished profile cannot hide behind a seemingly complete one.
 *  3. **What needs attention right now?** Drafts, unreviewed items.
 */
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [profile, programs, news, gallery, works, events] = await Promise.all([
    getSchoolProfile(),
    getPrograms({ includeUnpublished: true }),
    getNews({ includeUnpublished: true }),
    getGallery({ includeUnpublished: true }),
    getStudentWork({ includeUnpublished: true }),
    getEvents({ includeUnpublished: true }),
  ]);

  const configured = isDatabaseConfigured();
  const prisma = getPrisma();

  const drafts = news.filter((item) => !item.published).length;

  /**
   * The fields that still hold placeholder copy.
   *
   * Checked against the same `isPlaceholder` helper the public site uses for its
   * "belum diisi" markers, so the dashboard and the website can never disagree
   * about what is finished.
   */
  const pending = [
    { label: 'Deskripsi sekolah', done: !isPlaceholder(profile.description), href: '/admin/profil' },
    { label: 'Sejarah sekolah', done: !isPlaceholder(profile.history), href: '/admin/profil' },
    { label: 'Visi sekolah', done: !isPlaceholder(profile.vision), href: '/admin/profil' },
    { label: 'Alamat lengkap', done: !isPlaceholder(profile.address), href: '/admin/profil' },
    { label: 'Nomor telepon', done: !isPlaceholder(profile.phone), href: '/admin/profil' },
    { label: 'Alamat email', done: !isPlaceholder(profile.email), href: '/admin/profil' },
    { label: 'Foto galeri', done: gallery.length > 6, href: '/admin/galeri' },
    { label: 'Berita pertama', done: news.length > 0, href: '/admin/berita' },
    { label: 'Karya siswa', done: works.some((work) => !isPlaceholder(work.title)), href: '/admin/karya' },
  ];

  const incomplete = pending.filter((item) => !item.done);

  const counts = [
    { label: 'Program Keahlian', value: programs.length, href: '/admin/program' },
    { label: 'Berita', value: news.length, href: '/admin/berita' },
    { label: 'Foto Galeri', value: gallery.length, href: '/admin/galeri' },
    { label: 'Karya Siswa', value: works.length, href: '/admin/karya' },
    { label: 'Kegiatan', value: events.length, href: '/admin/kegiatan' },
  ];

  // The five most recent articles, whether published or not — a draft that has
  // been sitting untouched is the thing most likely to be forgotten.
  const recent = [...news]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <>
      <AdminHeading
        eyebrow="Dasbor"
        title="Selamat datang."
        description="Kelola seluruh konten situs SMK Jayanegara dari halaman ini. Perubahan yang Anda simpan langsung tampil di situs publik tanpa perlu mengunggah ulang."
      />

      {!configured ? (
        <div className="mb-8 border-l-2 border-[var(--color-accent-deep)] bg-[var(--color-paper)] px-6 py-5">
          <p className="label text-[var(--color-accent-deep)]">Basis data belum tersambung</p>
          <p className="mt-3 text-[var(--color-text-muted)]">
            Situs saat ini menampilkan konten bawaan, dan perubahan yang Anda simpan tidak akan
            tersimpan. Isi variabel berikut pada berkas <code className="font-[family-name:var(--font-mono)]">.env</code>{' '}
            lalu jalankan <code className="font-[family-name:var(--font-mono)]">npm run db:push</code>:
          </p>
          <ul className="mt-4 flex flex-col gap-1.5 font-[family-name:var(--font-mono)] text-[0.8125rem]">
            <li>DATABASE_URL</li>
            <li>DIRECT_URL</li>
          </ul>
          <p className="mt-4 text-[var(--color-text-muted)]">
            Petunjuk lengkap ada pada <strong>README.md</strong>.
          </p>
        </div>
      ) : prisma === null ? (
        <div className="mb-8 border-l-2 border-[var(--color-accent-deep)] bg-[var(--color-paper)] px-6 py-5">
          <p className="label text-[var(--color-accent-deep)]">Koneksi basis data bermasalah</p>
          <p className="mt-3 text-[var(--color-text-muted)]">
            Kredensial terdeteksi tetapi klien basis data gagal dibuat. Periksa kembali
            <code className="font-[family-name:var(--font-mono)]"> DATABASE_URL</code>.
          </p>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <AdminPanel title="Jumlah Konten" description="Ringkasan isi situs saat ini.">
          <ul className="flex flex-col">
            {counts.map((count) => (
              <li key={count.label} className="border-b border-[var(--color-line)] last:border-b-0">
                <Link
                  href={count.href}
                  className="group flex items-center justify-between gap-4 py-4 transition-colors duration-300 hover:text-[var(--color-accent)]"
                >
                  <span>{count.label}</span>
                  <span className="flex items-center gap-4">
                    <span className="display text-[1.5rem]">{String(count.value).padStart(2, '0')}</span>
                    <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {drafts > 0 ? (
            <p className="mt-5 border-t border-[var(--color-line)] pt-4 text-[0.9375rem] text-[var(--color-text-muted)]">
              {drafts} berita masih berstatus draf dan belum tampil di situs publik.
            </p>
          ) : null}
        </AdminPanel>

        <AdminPanel
          title="Perlu Dilengkapi"
          description="Data berikut masih berupa penanda dan belum diisi."
        >
          {incomplete.length === 0 ? (
            <p className="text-[var(--color-text-muted)]">
              Semua data utama sudah terisi. Terima kasih.
            </p>
          ) : (
            <ul className="flex flex-col">
              {incomplete.map((item) => (
                <li key={item.label} className="border-b border-[var(--color-line)] last:border-b-0">
                  <Link
                    href={item.href}
                    className="group flex items-center justify-between gap-4 py-4 transition-colors duration-300 hover:text-[var(--color-accent)]"
                  >
                    <span className="flex items-center gap-3">
                      <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 bg-[var(--color-accent)]" />
                      {item.label}
                    </span>
                    <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>
      </div>

      <div className="mt-8">
        <AdminPanel
          title="Berita Terakhir"
          description="Lima berita terbaru, termasuk yang masih berstatus draf."
          footer={
            <Link href="/admin/berita" className="link-line">
              Kelola semua berita →
            </Link>
          }
        >
          {recent.length === 0 ? (
            <div>
              <p className="text-[var(--color-text-muted)]">Belum ada berita.</p>
              <Link href="/admin/berita/baru" className="link-line mt-4 inline-flex">
                Tulis berita pertama →
              </Link>
            </div>
          ) : (
            <ul className="flex flex-col">
              {recent.map((item) => (
                <li key={item.id} className="border-b border-[var(--color-line)] last:border-b-0">
                  <Link
                    href={`/admin/berita/${item.id}`}
                    className="flex flex-col gap-2 py-4 transition-colors duration-300 hover:text-[var(--color-accent)] sm:flex-row sm:items-center sm:justify-between sm:gap-6"
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{item.title}</span>
                      <span className="label mt-1.5 block text-[var(--color-text-faint)]">
                        {formatDateId(item.publishedAt ?? item.createdAt)} · {item.category}
                      </span>
                    </span>
                    <span
                      className={
                        item.published
                          ? 'label shrink-0 text-[var(--color-text-muted)]'
                          : 'label shrink-0 text-[var(--color-accent-deep)]'
                      }
                    >
                      {item.published ? 'Terbit' : 'Draf'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>
      </div>

      <div className="mt-8">
        <AdminPanel title="Pintasan">
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/berita/baru" className="btn btn--solid">
              Tulis Berita
              <span className="btn__arrow" aria-hidden="true">
                →
              </span>
            </Link>
            <Link href="/admin/galeri" className="btn btn--ghost">
              Unggah Foto
            </Link>
            <Link href="/admin/profil" className="btn btn--ghost">
              Ubah Profil Sekolah
            </Link>
            <Link href="/" className="btn btn--ghost">
              Lihat Situs
            </Link>
          </div>
        </AdminPanel>
      </div>
    </>
  );
}
