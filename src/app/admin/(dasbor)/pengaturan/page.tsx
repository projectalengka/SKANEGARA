import { getSchoolProfile } from '@/lib/content';
import { isAuthConfigured } from '@/lib/auth';
import { formatBytes, isMediaStorageConfigured, mediaUsage } from '@/lib/media';
import { contentMode } from '@/lib/content';
import { isDatabaseConfigured } from '@/lib/db';
import { AdminHeading, AdminPanel } from '@/components/admin/AdminShell';
import { siteUrl } from '@/lib/utils';

export const metadata = { title: 'Pengaturan' };
export const dynamic = 'force-dynamic';

/**
 * The database size the storage report measures against.
 *
 * Supabase's free tier gives 500 MB, and the images share it with every article,
 * programme and caption on the site. Stated here rather than hidden, because the
 * failure it warns about is not "uploads stop" — once the database is full,
 * *every write on the site* starts failing, and tracing that back to a
 * photograph uploaded months earlier is not something the owner should have to
 * do. If the project moves to a paid plan, this is the one number to change.
 */
const STORAGE_QUOTA_BYTES = 500 * 1024 * 1024;

/**
 * The settings screen.
 *
 * It is a **diagnostic**, not a form, and that is the honest design. Environment
 * variables are read at boot on the server; they cannot be edited from the
 * dashboard, and a settings page with editable credential fields would either be
 * a lie or a security hole. So this screen answers the only question that
 * matters: what is connected, what is not, and what to do about it.
 *
 * Each row states the consequence of its own state. "Basis data belum
 * tersambung" is not useful; "perubahan Anda tidak akan tersimpan" is.
 */
export default async function AdminSettingsPage() {
  const [profile, usage] = await Promise.all([getSchoolProfile(), mediaUsage()]);

  const usedPercent = usage ? Math.min(100, (usage.bytes / STORAGE_QUOTA_BYTES) * 100) : 0;

  const checks = [
    {
      label: 'Basis data',
      configured: isDatabaseConfigured(),
      env: ['DATABASE_URL', 'DIRECT_URL'],
      okMessage: `Terhubung. Mode konten: ${contentMode() === 'database' ? 'basis data' : 'cadangan'}.`,
      failMessage: 'Belum tersambung. Perubahan yang Anda simpan tidak akan tersimpan.',
    },
    {
      label: 'Autentikasi',
      configured: isAuthConfigured(),
      env: ['AUTH_SECRET', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'],
      okMessage: 'Sesi administrator aktif.',
      failMessage: 'Belum dikonfigurasi. Dasbor tidak dapat diakses.',
    },
    {
      // Deliberately the same switch as "Basis data" — uploads go into that
      // database now. The message says so out loud, because two rows with one
      // cause would otherwise read as two independent settings, and the owner
      // would go looking for a second thing to configure that does not exist.
      label: 'Penyimpanan gambar',
      configured: isMediaStorageConfigured(),
      env: ['DATABASE_URL'],
      okMessage: 'Aktif. Gambar disimpan di basis data yang sama dengan konten situs.',
      failMessage: 'Belum aktif. Unggah gambar tidak akan berfungsi sebelum basis data tersambung.',
    },
    {
      label: 'URL situs',
      configured: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
      env: ['NEXT_PUBLIC_SITE_URL'],
      okMessage: `Terdaftar sebagai ${siteUrl()}`,
      failMessage: `Belum diatur. Tautan kanonik sementara memakai ${siteUrl()} — atur ke domain resmi sekolah sebelum situs diluncurkan.`,
    },
  ];

  return (
    <>
      <AdminHeading
        eyebrow="Pengaturan"
        title="Pengaturan"
        description="Status konfigurasi situs. Nilai di bawah dibaca dari berkas .env pada server dan tidak dapat diubah dari halaman ini."
      />

      <div className="flex flex-col gap-6">
        <AdminPanel title="Status Layanan">
          <ul className="flex flex-col">
            {checks.map((check) => (
              <li
                key={check.label}
                className="flex flex-col gap-3 border-b border-[var(--color-line)] py-5 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-8"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className={
                        check.configured
                          ? 'h-2 w-2 shrink-0 bg-[var(--color-accent)]'
                          : 'h-2 w-2 shrink-0 bg-[var(--color-accent-deep)]'
                      }
                    />
                    {check.label}
                  </p>
                  <p className="mt-2 pl-5 text-[length:var(--step-0)] text-[var(--color-text-muted)]">
                    {check.configured ? check.okMessage : check.failMessage}
                  </p>

                  {!check.configured ? (
                    <ul className="mt-3 flex flex-col gap-1 pl-5 font-[family-name:var(--font-mono)] text-[length:var(--step--1)] text-[var(--color-text-faint)]">
                      {check.env.map((name) => (
                        <li key={name}>{name}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <span
                  className={
                    check.configured
                      ? 'label shrink-0 text-[var(--color-text-muted)]'
                      : 'label shrink-0 text-[var(--color-accent-deep)]'
                  }
                >
                  {check.configured ? 'Aktif' : 'Belum aktif'}
                </span>
              </li>
            ))}
          </ul>
        </AdminPanel>

        <AdminPanel title="Penyimpanan Gambar">
          {usage ? (
            <>
              <dl className="flex flex-wrap gap-x-12 gap-y-6">
                <div>
                  <dt className="label text-[var(--color-text-muted)]">Jumlah gambar</dt>
                  <dd className="display mt-2 text-[length:var(--step-4)]">{usage.count}</dd>
                </div>
                <div>
                  <dt className="label text-[var(--color-text-muted)]">Terpakai gambar</dt>
                  <dd className="display mt-2 text-[length:var(--step-4)]">
                    {formatBytes(usage.bytes)}
                  </dd>
                </div>
                <div>
                  <dt className="label text-[var(--color-text-muted)]">Kuota basis data</dt>
                  <dd className="display mt-2 text-[length:var(--step-4)]">
                    {formatBytes(STORAGE_QUOTA_BYTES)}
                  </dd>
                </div>
              </dl>

              {/*
                A bar, not just a number: the point of this panel is to make a
                quota visible before it becomes a problem. A figure like "12 MB"
                reads as nothing; the same figure as a sliver of a bar reads as
                "there is room".
              */}
              <div className="mt-7 h-1.5 w-full bg-[var(--color-paper-warm)]">
                <div
                  className="h-full bg-[var(--color-accent)]"
                  style={{ width: `${usage.count > 0 ? Math.max(usedPercent, 0.5) : 0}%` }}
                />
              </div>
              <p className="mt-3 font-[family-name:var(--font-mono)] text-[length:var(--step--1)] text-[var(--color-text-muted)]">
                {usedPercent.toFixed(2)}% dari kuota terpakai oleh gambar
              </p>

              <p className="mt-6 border-t border-[var(--color-line)] pt-5 text-[length:var(--step-0)] text-[var(--color-text-muted)]">
                Angka di atas hanya menghitung gambar. Teks artikel, program, dan profil sekolah
                memakai kuota basis data yang sama, jadi pemakaian sebenarnya selalu lebih besar
                dari ini. Setiap gambar dikecilkan dan dikodekan ulang ke WebP sebelum disimpan,
                sehingga satu foto ponsel biasanya memakai kurang dari 300 KB.
              </p>
            </>
          ) : (
            <p className="text-[var(--color-text-muted)]">
              Pemakaian penyimpanan belum dapat dibaca karena basis data belum tersambung.
            </p>
          )}
        </AdminPanel>

        <AdminPanel title="SEO & Metadata">
          <dl className="flex flex-col gap-5">
            <div>
              <dt className="label text-[var(--color-text-muted)]">Judul Situs</dt>
              <dd className="mt-2">
                {profile.schoolName} — {profile.tagline}
              </dd>
            </div>
            <div>
              <dt className="label text-[var(--color-text-muted)]">Deskripsi</dt>
              <dd className="mt-2 text-[var(--color-text-muted)]">{profile.description}</dd>
            </div>
            <div>
              <dt className="label text-[var(--color-text-muted)]">Peta Situs</dt>
              <dd className="mt-2">
                <a href="/sitemap.xml" className="link-line font-[family-name:var(--font-mono)] text-[length:var(--step-0)]">
                  /sitemap.xml
                </a>
              </dd>
            </div>
            <div>
              <dt className="label text-[var(--color-text-muted)]">Berkas robots</dt>
              <dd className="mt-2">
                <a href="/robots.txt" className="link-line font-[family-name:var(--font-mono)] text-[length:var(--step-0)]">
                  /robots.txt
                </a>
              </dd>
            </div>
          </dl>

          <p className="mt-6 border-t border-[var(--color-line)] pt-5 text-[length:var(--step-0)] text-[var(--color-text-muted)]">
            Judul dan deskripsi diambil dari halaman <strong>Profil Sekolah</strong>. Ubah di sana
            agar meta description dan hasil pencarian ikut berubah.
          </p>
        </AdminPanel>

        <AdminPanel title="Akun Administrator">
          <p className="text-[var(--color-text-muted)]">
            Situs ini memiliki satu akun administrator. Kata sandi disimpan dalam bentuk hash scrypt,
            bukan teks biasa.
          </p>
          <p className="mt-4 text-[var(--color-text-muted)]">
            Untuk mengganti kata sandi, perbarui <code className="font-[family-name:var(--font-mono)]">ADMIN_PASSWORD</code>{' '}
            pada berkas <code className="font-[family-name:var(--font-mono)]">.env</code> di server,
            lalu mulai ulang aplikasi. Cara membuat hash scrypt dijelaskan pada <strong>README.md</strong>.
          </p>
        </AdminPanel>
      </div>
    </>
  );
}
