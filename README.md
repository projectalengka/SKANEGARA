# SMK Jayanegara — Situs Sekolah

Situs resmi SMK Jayanegara (Mojokerto, Jawa Timur): profil sekolah, program
keahlian, karya siswa, galeri, berita, dan agenda kegiatan — lengkap dengan
dasbor admin untuk mengelola seluruh isinya tanpa menyentuh kode.

Dibangun dengan Next.js App Router, PostgreSQL (Supabase), Prisma, GSAP + Lenis.
Seluruh antarmuka berbahasa Indonesia.

> Langkah menjalankan di komputer sendiri ada di
> [bagian 1](#1-menjalankan-di-komputer-sendiri), dan urutan menaikkannya ke
> internet ada di [bagian 7](#7-deploy-ke-vercel).

---

## Daftar Isi

1. [Menjalankan di Komputer Sendiri](#1-menjalankan-di-komputer-sendiri)
2. [Variabel Lingkungan](#2-variabel-lingkungan)
3. [Menyiapkan Basis Data (Supabase)](#3-menyiapkan-basis-data-supabase)
4. [Prisma: Migrasi dan Seed](#4-prisma-migrasi-dan-seed)
5. [Menyimpan Gambar](#5-menyimpan-gambar)
6. [Mengatur Akun Admin](#6-mengatur-akun-admin)
7. [Deploy ke Vercel](#7-deploy-ke-vercel)
8. [Migrasi di Produksi](#8-migrasi-di-produksi)
9. [Arsitektur Konten](#9-arsitektur-konten)
10. [Struktur Proyek](#10-struktur-proyek)
11. [Perintah yang Tersedia](#11-perintah-yang-tersedia)
12. [Pemeriksaan Kualitas](#12-pemeriksaan-kualitas)
13. [Pemecahan Masalah](#13-pemecahan-masalah)
14. [Aturan Konten](#14-aturan-konten)
15. [Lisensi dan Atribusi](#15-lisensi-dan-atribusi)

---

## 1. Menjalankan di Komputer Sendiri

**Yang dibutuhkan:** Node.js 22 atau 23 (`>=22 <25`) dan npm.

```bash
# 1. Pasang dependensi
npm install

# 2. Siapkan berkas lingkungan
cp .env.example .env
#    lalu isi nilainya — lihat bagian 2

# 3. Bangkitkan klien Prisma
npm run db:generate

# 4. Jalankan
npm run dev
```

Buka <http://127.0.0.1:3000>.

> **Situs berjalan tanpa basis data.**
> Langkah 2–4 di bawah ini hanya perlu kalau Anda ingin mengelola konten.
> Tanpa `DATABASE_URL`, situs tetap tampil utuh memakai konten cadangan di
> `src/data/defaults.ts`. Dasbor akan menampilkan lencana **Mode cadangan**.
> Ini disengaja: desain harus bisa ditinjau sebelum ada akun apa pun.

### Mode pengembangan vs produksi

```bash
npm run dev      # pengembangan, hot reload
npm run build    # build produksi
npm run start    # jalankan hasil build
```

Ketiganya memakai `--webpack` (bukan Turbopack) dan `--hostname 127.0.0.1`.

---

## 2. Variabel Lingkungan

Salin `.env.example` menjadi `.env`. Jangan pernah meng-commit `.env` —
`.gitignore` sudah menutupnya.

| Variabel | Wajib | Kegunaan |
| --- | --- | --- |
| `DATABASE_URL` | untuk CMS | Koneksi **pooled** ke Postgres. Dipakai aplikasi saat melayani permintaan. |
| `DIRECT_URL` | untuk migrasi | Koneksi **langsung** (port 5432). Dipakai `prisma migrate` dan `db:seed`. |
| `AUTH_SECRET` | untuk CMS | Minimal 32 karakter. Menandatangani cookie sesi admin. |
| `ADMIN_EMAIL` | untuk CMS | Alamat email untuk masuk ke `/admin`. |
| `ADMIN_PASSWORD` | untuk CMS | Kata sandi admin — teks biasa **atau** hash `scrypt$…`. |
| `NEXT_PUBLIC_SUPABASE_URL` | opsional | Alamat proyek Supabase. Untuk penyimpanan berkas, bila dipakai. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | opsional | Kunci anon Supabase. Aman untuk publik. |
| `NEXT_PUBLIC_SITE_URL` | produksi | Alamat kanonik situs, mis. `https://smkjayanegara.sch.id`. |

### Membuat `AUTH_SECRET`

```bash
# macOS / Linux
openssl rand -base64 48

# Windows (PowerShell)
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Max 256 }))
```

Tempel hasilnya apa adanya. Jangan pakai kalimat yang mudah ditebak.

> Kalau `AUTH_SECRET` diganti, semua sesi yang sedang berjalan langsung tidak
> berlaku dan admin harus masuk ulang. Itu memang perilaku yang diinginkan.

---

## 3. Menyiapkan Basis Data (Supabase)

1. Buat proyek baru di <https://supabase.com/dashboard>.
2. Buka **Project Settings → Database → Connection string**.
3. Salin **dua** koneksi yang berbeda:

   - **Connection pooling** (port `6543`) → `DATABASE_URL`.
     Tambahkan `?pgbouncer=true&connection_limit=1` di belakangnya.
   - **Direct connection** (port `5432`) → `DIRECT_URL`.

```
DATABASE_URL="postgresql://postgres.xxxx:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.xxxx:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
```

**Kenapa dua koneksi?** Aplikasi ini berjalan di serverless, yang berarti
setiap permintaan bisa membuka koneksi baru. Connection pooler Supabase
mengurus itu. Sebaliknya, `prisma migrate` butuh sesi sungguhan yang tidak bisa
dilewatkan pooler — karena itu `DIRECT_URL`.

> **Catatan versi.** Proyek ini memakai Prisma 7, yang memindahkan URL koneksi
> keluar dari `schema.prisma`. URL tinggal di `prisma.config.ts` (untuk CLI) dan
> dibaca aplikasi lewat driver adapter di `src/lib/db.ts`. Kalau Anda menemukan
> panduan lama yang menaruh `url` di dalam `schema.prisma`, panduan itu untuk
> Prisma 5/6.

### Alternatif: PostgreSQL lokal (tanpa Supabase)

Untuk pengembangan sehari-hari, Supabase tidak wajib. Repositori ini sudah
disiapkan untuk menjalankan PostgreSQL **lokal** yang terpisah dari server
PostgreSQL lain di komputer Anda:

```bash
# 1. Nyatakan basis data (biarkan jendela ini terbuka)
.pgdata\start-db.cmd

# 2. Terapkan skema dan isi data awal
npm run db:deploy
npm run db:seed
npm run db:verify
```

Cluster-nya hidup di folder `.pgdata/` di dalam proyek (tidak ikut ter-commit)
pada port **54432** — sengaja tidak lazim supaya tidak bentrok dengan server
PostgreSQL lain yang mungkin sudah berjalan. Datanya milik proyek ini saja;
server PostgreSQL yang sudah ada di komputer Anda tidak disentuh.

Isi `.env` untuk mode ini:

```
DATABASE_URL="postgresql://skagara@127.0.0.1:54432/skagara"
DIRECT_URL="postgresql://skagara@127.0.0.1:54432/skagara"
```

Saat men-deploy, ganti keduanya ke koneksi Supabase. Basis data lokal dan
Supabase diisi lewat perintah yang sama, jadi tidak ada yang perlu diubah di
kode.

---

## 4. Prisma: Migrasi dan Seed

```bash
npm run db:generate     # bangkitkan klien Prisma ke src/generated/prisma
npm run db:migrate      # buat + terapkan migrasi (pengembangan)
npm run db:push         # dorong skema tanpa membuat berkas migrasi
npm run db:seed         # isi konten awal
npm run db:verify       # buktikan jalur basis data benar-benar sehat
npm run db:studio       # buka Prisma Studio (GUI)
```

Urutan yang benar untuk pertama kali:

```bash
npm run db:generate
npm run db:migrate      # beri nama migrasi, mis. "init"
npm run db:seed
npm run db:verify       # pastikan semuanya benar sebelum lanjut
```

### Mengapa ada `db:verify`

Seluruh pengujian otomatis di proyek ini berjalan **tanpa** basis data, memakai
lapisan cadangan `src/data/defaults.ts`. Itu memang disengaja — situs harus tetap
tampil tanpa `DATABASE_URL` — tetapi konsekuensinya: skema Prisma dan
`prisma/seed.ts` tidak pernah benar-benar dijalankan oleh gerbang mutu.

`npm run db:verify` menutup celah itu. Ia memeriksa, berurutan: koneksi
terbuka, setiap tabel ada dan bisa dibaca, bentuk data hasil seed sesuai
harapan, dan `readOrFallback()` benar-benar menimpa dengan data basis data
(bukan hanya tidak meledak). Ia keluar dengan kode ≠ 0 bila ada yang salah,
jadi bisa dipakai sebagai gerbang di CI maupun sebelum deploy.

Pemeriksaannya juga menegakkan **aturan konten**: berita dan kegiatan harus
**nol** baris. Kalau suatu saat jumlahnya bukan nol, itu tanda ada yang
mengarang agenda sekolah — dan skripnya akan bilang begitu.

> **`db:verify` butuh basis data sungguhan; `npm test` tidak.** Kalau tidak ada
> `DATABASE_URL`/`DIRECT_URL`, `db:verify` berhenti dengan pesan yang menjelaskan
> cara mengisinya, bukan galat mentah. Yang **bisa** diuji tanpa basis data
> adalah keberadaan dan isi migrasinya — itu tugas `tests/schema.test.ts`.

### Mengapa ada `tests/schema.test.ts`

Uji ini menutup kelas kegagalan yang berbeda dari `db:verify`, dan tidak bisa
ditangkap typecheck, lint, maupun build: `prisma/schema.prisma` adalah sumber
kebenaran, sementara `prisma/migrations/` adalah artefak turunan yang terpisah.
Kalau keduanya berbeda, tidak ada yang tahu sampai query gagal di produksi.

Yang dikunci uji ini:

1. `prisma/migrations/` ada dan berisi migrasi init.
2. Migrasi membuat **setiap** tabel yang dideklarasikan `schema.prisma`.
3. Migrasi membuat **setiap** kolom, tanpa kelebihan.
4. Tidak ada pernyataan destruktif (`DROP TABLE`, `DROP COLUMN`, `TRUNCATE`,
   `DELETE FROM`) — migrasi init yang menghapus sesuatu adalah kesalahan, dan
   menjalankannya lewat `db:deploy` terhadap produksi adalah kesalahan serius.
5. `supabase/schema.sql` setuju kolom per kolom. Berkas itu rujukan yang orang
   tempel ke SQL editor Supabase; kalau menyimpang, hasil tempelannya adalah
   basis data yang tidak bisa dipakai aplikasi.

Uji ini **berjalan di `npm test` biasa** — tanpa basis data, tanpa kredensial.
Membuat migrasi baru juga tidak butuh koneksi:

```bash
npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script \
  > prisma/migrations/<timestamp>_init/migration.sql
```

### Apa yang diisi oleh seed

| Tabel | Isi |
| --- | --- |
| `SchoolProfile` | Satu baris (`slug = "utama"`) dari `defaultSchoolProfile`. |
| `Program` | Dua program: Desain Komunikasi Visual, Otomotif. **Nama saja** — semua deskripsi masih placeholder. |
| `GalleryItem` | Enam item bergaya kategori. |
| `StudentWork` | Enam karya. **Tanpa nama siswa** — mengisi nama tanpa izin bukan hak kita. |
| `SiteSection` | Teks tiap bagian halaman depan. |
| `News` | **Kosong.** |
| `Event` | **Kosong.** |

Berita dan agenda sengaja dibiarkan kosong: mengarang berita sekolah adalah
pelanggaran paling jelas terhadap aturan konten, dan keadaan kosong itu sendiri
adalah tampilan yang harus diuji.

Semua penulisan memakai `upsert`, jadi menjalankan `db:seed` dua kali aman dan
tidak akan menimpa tulisan yang sudah Anda sunting — kecuali baris
`SiteSection` yang memang belum ada.

---

## 5. Menyimpan Gambar

**Tidak ada yang perlu disiapkan.** Gambar yang diunggah dari dasbor disimpan di
dalam basis data PostgreSQL yang sama dengan isi situs — tabel `MediaAsset`,
kolom `data` bertipe `bytea`. Selama `DATABASE_URL` sudah terisi (dan itu wajib
untuk konten apa pun), unggah gambar langsung bekerja.

Cara kerjanya: server menerima berkas, mengecilkannya, mengodekan ulang ke WebP,
lalu menyimpan hasilnya sebagai baris baru. Yang dikembalikan adalah URL pendek
berbentuk `/api/media/<id>`, dan URL itulah yang disimpan di kolom gambar pada
tabel program, berita, galeri, kegiatan, dan karya siswa. URL itu dilayani oleh
`src/app/api/media/[id]/route.ts`.

> **Kenapa tidak memakai layanan penyimpanan gambar.** Versi pertama proyek ini
> memakai Cloudinary. Itu berarti satu akun pihak ketiga dan tiga kredensial
> sebelum satu foto pun bisa diunggah — dan pada 24 September 2026 terukur
> bahwa kredensial itu masih kosong setelah berbulan-bulan, sehingga fitur
> unggah **belum pernah sekali pun bekerja**. Keluhan "saya tidak bisa mengunggah
> gambar" sebenarnya adalah deskripsi dari hal itu.
>
> Postgres sudah ada di sini sejak awal. Menaruh gambarnya di sana membuat satu-
> satunya syarat untuk mengunggah adalah variabel yang memang sudah wajib diisi.

Yang ditukar dengan keputusan itu, dan bagaimana masing-masing dijawab:

- **Kuota.** Paket gratis Supabase memberi **500 MB** basis data, dipakai
  bersama seluruh teks situs. Karena itu setiap gambar dikecilkan dan dikodekan
  ulang sebelum disimpan (sisi panjang maksimal 2400 px, WebP kualitas 82 —
  biasanya di bawah 300 KB untuk satu foto ponsel), dan halaman **Pengaturan**
  melaporkan berapa banyak yang sudah terpakai. Kuota yang tidak terlihat adalah
  kuota yang penuh diam-diam, dan begitu penuh yang gagal bukan hanya unggah:
  **seluruh penulisan di situs** ikut gagal.
- **CDN.** Gambar dilayani oleh route handler dengan header
  `Cache-Control: public, max-age=31536000, immutable`. Header itu jujur di sini:
  id dibuat saat byte ditulis, byte tidak pernah diubah, dan penggantian gambar
  adalah baris *baru* dengan id *baru* — jadi satu URL tidak mungkin menunjuk isi
  yang berbeda dari sebelumnya. Untuk lalu lintas situs sekolah, itu sudah cukup.

**Batas unggah:** 8 MB per berkas, format JPEG / PNG / WebP / AVIF.

> **Kenapa angka 8 MB punya pasangan di `next.config.ts`.** Server Action
> menolak badan permintaan di atas **1 MB** secara bawaan, dan penolakan itu
> terjadi *sebelum* action dijalankan — jadi `content-actions.ts` tidak pernah
> melihatnya dan tidak bisa melaporkannya. Selama nilainya dibiarkan bawaan,
> setiap foto antara 1 MB dan 8 MB gagal tanpa pesan apa pun: kolom unggah
> berhenti di "Mengunggah…" selamanya. Diukur 24 September 2026 dengan PNG
> 1,5 MB: HTTP 500 dan `Body exceeded 1 MB limit.` yang tidak tertangkap.
>
> `next.config.ts` kini menyetel `experimental.serverActions.bodySizeLimit` ke
> `9mb` — sengaja **di atas** 8 MB, karena yang dihitung adalah seluruh amplop
> multipart (boundary, header bagian, nama berkas), bukan hanya isi berkasnya.
> `tests/upload.test.ts` mengunci hubungan kedua angka itu supaya tidak bisa
> lepas lagi.

Kalau basis data belum tersambung, dasbor **mengatakannya sendiri**: ada
pemberitahuan tetap di sidebar ("Unggah gambar belum aktif") dan barisnya di
halaman **Pengaturan**. Kolom unggah tetap bisa diklik, tetapi akan menjawab
dengan kalimat yang menjelaskan sebabnya, bukan diam.

Setelah diunggah, dasbor menyimpan dua nilai: URL gambar dan *public ID* — yaitu
`id` barisnya di tabel `MediaAsset`. Public ID itulah yang dipakai untuk
menghapus gambar saat item dihapus. Menghapus gambar bersifat **tidak fatal** —
kalau penghapusan gagal, data tetap terhapus dari basis data dan kegagalan
dicatat di log. Gambar yatim lebih baik daripada operasi yang gagal di tengah
jalan.

> **Bug yang pernah ada di sini, dan cara menemukannya.** `ImageUploadField`
> memancarkan dua input tersembunyi: `image` (URL) dan `imagePublicId` (id
> asetnya). Action untuk **galeri** dan **karya siswa** membaca `publicId` —
> nama yang tidak pernah ada di formulir. Akibatnya id aset tersimpan sebagai
> string kosong, dan karena `deleteImage()` dijaga oleh `if (existing.publicId)`,
> ia tidak pernah berjalan: **setiap foto galeri yang diganti atau dihapus
> meninggalkan asetnya di basis data selamanya.** Action program membaca nama
> yang benar, jadi bug ini hanya mengenai dua dari tiga jalur — dan justru itu
> yang membuatnya lolos dari pemeriksaan manual.
>
> Ditemukan bukan dengan membaca kode, melainkan lewat
> `npm run media:bersihkan`, yang melaporkan empat aset uji dengan
> `dirujuk konten: 0` padahal foto ujinya sudah dihapus. Sekarang ada uji yang
> **menghitung** berapa kali tiap nama dibaca — bukan sekadar memeriksa apakah
> string-nya muncul di suatu tempat, karena tiga manajer memakai `name="image"`
> dan satu kemunculan saja sudah cukup untuk menipu pemeriksaan yang longgar.
> Lihat `tests/media.test.ts` bagian 7.

Karena kolom unggah mengirim berkas **begitu dipilih** — supaya gambar terlihat
sebelum disimpan — memilih berkas lalu menutup formulir tanpa menyimpan
meninggalkan satu aset yatim. Itu wajar, bukan bug. Bersihkan dengan:

```bash
npm run media:bersihkan              # lihat saja
npm run media:bersihkan -- --hapus   # benar-benar hapus
```

Aset yang lebih muda dari 60 menit sengaja dilewati, supaya gambar yang sedang
menunggu disimpan tidak ikut terhapus.

---

## 6. Mengatur Akun Admin

Ada tepat **satu** administrator, dikonfigurasi lewat variabel lingkungan.
Tidak ada tabel pengguna, tidak ada pendaftaran, tidak ada halaman lupa sandi —
dan itu disengaja, karena setiap fitur tambahan adalah permukaan serangan
tambahan untuk situs yang hanya punya satu pengelola.

```
AUTH_SECRET="hasil-openssl-rand-di-atas"
ADMIN_EMAIL="admin@smkjayanegara.sch.id"
ADMIN_PASSWORD="kata-sandi-yang-kuat"
```

Setelah mengisi ketiganya, buka `/admin/masuk`.

### Memakai kata sandi yang sudah di-hash

`ADMIN_PASSWORD` menerima dua bentuk:

- **Teks biasa** (`rahasia123`) — di-hash saat pemeriksaan berlangsung.
- **Hash** (`scrypt$<salt>$<hash>`) — dipakai langsung.

> **Catatan riwayat — bentuk teks biasa pernah tidak bisa dipakai masuk.**
> `checkCredentials()` dulu menyerahkan nilai `ADMIN_PASSWORD` mentah ke
> `verifyPassword()`, yang menolak apa pun yang tidak diawali `scrypt$`. Akibatnya
> bentuk teks biasa — yang didokumentasikan **paling awal** dan yang dipakai
> `.env.example` — tidak pernah bisa login, tanpa pesan galat yang menjelaskan.
> Bug ini bertahan karena setiap uji otentikasi menyetel `ADMIN_PASSWORD` ke
> nilai hasil `hashPassword()`, jadi hanya jalur yang bekerja yang pernah diuji.
> Sekarang `checkCredentials()` melewati `resolveSeedHash()`, dan `tests/auth.test.ts`
> memuat uji khusus untuk bentuk teks biasa. Jangan hapus uji itu.

Bentuk kedua berguna kalau Anda tidak ingin kata sandi asli pernah muncul di
dasbor hosting. Untuk membuatnya, jalankan:

```bash
node -e "
const { scryptSync, randomBytes } = require('crypto');
const sandi = 'kata-sandi-baru-anda';
const salt = randomBytes(16).toString('hex');
const hash = scryptSync(sandi.normalize('NFKC'), salt, 64).toString('hex');
console.log('scrypt\$' + salt + '\$' + hash);
"
```

Salin keluarannya ke `ADMIN_PASSWORD`.

### Kalau lupa kata sandi

Tidak ada alur pemulihan lewat email, dan itu memang disengaja. Cara
memulihkannya:

1. Buka pengaturan proyek di Vercel (atau `.env` bila lokal).
2. Ganti `ADMIN_PASSWORD`.
3. **Redeploy**, atau mulai ulang server pengembangan, agar variabel terbaca ulang.
4. Masuk dengan kata sandi baru.

### Cara kerja otentikasi

- Kata sandi disimpan sebagai **scrypt**, bukan SHA-256 dan bukan teks biasa.
  scrypt bersifat *memory-hard*, sehingga hash yang bocor tidak bisa
  dipecahkan dengan GPU secepat hash biasa.
- Cookie sesi **ditandatangani** (HMAC-SHA256), bukan dienkripsi. Isinya bukan
  rahasia — hanya email dan masa berlaku. Tanda tangan itulah yang membuatnya
  tidak bisa dipalsukan.
- Perbandingan memakai `timingSafeEqual`, sehingga waktu respons tidak
  membocorkan berapa banyak byte tanda tangan yang cocok.
- Cookie bersifat `HttpOnly` + `SameSite=Lax` + `Secure` di produksi.
- Masa berlaku **7 hari**.

---

## 7. Deploy ke Vercel

1. Dorong repositori ke GitHub.
2. Di Vercel, **Add New → Project**, lalu impor repositori tersebut.
3. Tambahkan **semua** variabel dari bagian 2 di
   **Settings → Environment Variables**. Terapkan untuk Production, Preview,
   dan Development sekaligus.
4. Pastikan `NEXT_PUBLIC_SITE_URL` berisi alamat produksi yang sebenarnya.
   Nilai ini dipakai untuk URL kanonik, `sitemap.xml`, dan tag Open Graph.
5. Deploy.

### Setelah deploy pertama

```bash
# dari komputer Anda, dengan DATABASE_URL/DIRECT_URL produksi di .env
npm run db:deploy    # terapkan migrasi yang sudah ada
npm run db:seed      # isi konten awal (hanya sekali)
```

Buka `https://<domain-anda>/admin/masuk` dan masuk.

### Kontrol versi

Repositori ini sudah di-`git init`. Yang **tidak** ikut ter-commit: semua varian
`.env` (kredensial sungguhan), `.pgdata/` (basis data lokal), dan catatan kerja
lokal. Semuanya ada di `.gitignore`.

> **Semua varian `.env` diabaikan, bukan hanya yang bernama persis `.env`.**
> Polanya `.env.*` ditambah `!.env.example`. Ini bukan kehati-hatian berlebihan:
> daftar nama satu per satu pernah gagal di proyek ini — `.env.lokal` dan
> `.env.produksi` tidak masuk daftar, padahal keduanya berisi kredensial
> Supabase sungguhan. Berkas yang tidak diabaikan
> **tidak memunculkan galat apa pun**; ia hanya diam-diam terunggah.
> `tests/verify-db.test.ts` mengunci pola ini.

Sebelum commit pertama ke repositori publik, pastikan tidak ada kredensial yang
ikut. `.gitignore` yang salah tulis **tidak error** — ia hanya diam-diam tidak
melindungi apa pun. Ujilah polanya, jangan diasumsikan:

```bash
git check-ignore -v .env .env.lokal .pgdata/PG_VERSION   # harus menyebut aturan yang cocok
git grep -iE 'AUTH_SECRET|ADMIN_PASSWORD' HEAD -- ':!.env.example'
```

Perintah kedua harus **tidak** menemukan apa pun selain contoh di dokumentasi.

**Kalau `.env` sudah terlanjur ter-commit**, mengganti isinya dengan versi
kosong tidak cukup — nilainya tetap ada di riwayat git. Ganti dulu kredensialnya
(`AUTH_SECRET` dan `ADMIN_PASSWORD`), baru bersihkan riwayat. Menganggapnya
hilang setelah menimpa berkas adalah kesalahan yang mahal.

### Catatan khusus Vercel

- **Tidak ada berkas lokal.** Setiap unggahan masuk ke basis data sebagai kolom
  `bytea`; tidak ada yang ditulis ke disk, jadi tidak ada yang hilang saat
  fungsi selesai berjalan.
- **Kolam koneksi dibatasi 5** (`max: 5` di `src/lib/db.ts`) supaya tidak
  menghabiskan jatah koneksi Supabase saat lalu lintas naik.
- **Halaman admin selalu dinamis** (`force-dynamic`), jadi tidak ada data
  sensitif yang ikut di-cache.
- **Perubahan dari admin langsung tampil** tanpa redeploy, lewat
  `revalidateTag()` + `revalidatePath()`.
- **Header keamanan** sudah dipasang di `next.config.ts`
  (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`,
  `Permissions-Policy`).

---

## 8. Migrasi di Produksi

Migrasi **tidak** dijalankan otomatis saat deploy. Jalankan manual:

```bash
# 1. Uji dulu di Preview
npm run db:deploy

# 2. Kalau aman, jalankan di produksi
npm run db:deploy
```

`db:deploy` hanya menerapkan migrasi yang sudah ada; ia tidak akan membuat
migrasi baru dan tidak akan menghapus data. Perintah ini juga aman dijalankan
berulang kali.

> **Peringatan — `db:deploy` bisa "sukses" tanpa melakukan apa pun.**
> Kalau folder `prisma/migrations/` tidak ada atau kosong, `db:deploy` keluar
> dengan kode `0` dan tidak menerapkan apa pun. Tidak ada pesan galat. Gejala
> pertamanya baru muncul setelah situs ter-deploy: setiap query ke basis data
> gagal karena tabelnya tidak pernah dibuat.
>
> Ini pernah terjadi di proyek ini. `tests/schema.test.ts` sekarang mengunci
> keberadaan migrasi, jadi jangan menghapus uji itu tanpa menggantinya.
> Untuk memastikan migrasi benar-benar ada **sebelum** deploy:
>
> ```bash
> ls prisma/migrations/          # harus ada folder berversi + migration_lock.toml
> npm test                       # menguji migrasi vs schema.prisma, tanpa basis data
> ```

**Sebelum mengubah `prisma/schema.prisma` di produksi:**

1. Buat migrasi secara lokal: `npm run db:migrate`.
2. Commit folder `prisma/migrations/` bersama perubahannya.
3. Tinjau SQL-nya — terutama kalau ada `DROP` atau `ALTER COLUMN`.
4. Baru jalankan `db:deploy`.

---

## 9. Arsitektur Konten

Ini bagian paling penting untuk dipahami sebelum mengubah apa pun.

**Basis data adalah lapisan di atas konten cadangan, bukan penggantinya.**

`src/data/defaults.ts` berisi seluruh struktur konten. Setiap pembacaan publik
di `src/lib/content.ts` memakai pola:

```ts
readOrFallback('program', (prisma) => prisma.program.findMany(), defaultPrograms)
```

Artinya:

| Keadaan | Yang terjadi |
| --- | --- |
| `DATABASE_URL` kosong | Konten cadangan dipakai. Situs tampil penuh. |
| Basis data terhubung, data ada | Data basis data menimpa, **per field**. |
| Basis data terhubung, field kosong | Konten cadangan dipertahankan untuk field itu. |
| Kueri gagal | Kesalahan dicatat, konten cadangan dipakai. Halaman tetap tampil. |

Dua konsekuensi yang disengaja:

1. **Situs tidak pernah mati** hanya karena connection string kedaluwarsa.
   Situs sekolah yang mendadak kosong lebih buruk daripada situs yang menampilkan
   konten sedikit lama.
2. **Field kosong tidak pernah menimpa tulisan asli.** Fungsi `prefer()` di
   `src/lib/content.ts` menolak nilai kosong dari basis data, sehingga mengosongkan
   satu kolom di dasbor tidak akan membuat teks di situs hilang.

### Menandai konten yang belum diisi

```ts
placeholder('Sejarah sekolah');
// → "[Sejarah sekolah — isi melalui Dasbor Admin]"
```

`isPlaceholder()` dipakai bersama oleh situs publik dan dasbor, sehingga
keduanya tidak akan pernah berbeda pendapat soal apa yang masih kosong.
Dasbor menampilkan daftar **Perlu Dilengkapi** di halaman Dasbor.

### Data contoh (`SAMPLE_DATA`)

Kadang tata letak perlu dinilai sebelum tulisan asli sekolah ada. Halaman berita
yang kosong tidak bisa dinilai desainnya. Untuk itu ada `src/data/sample.ts`:
satu berkas berisi data contoh untuk berita, kegiatan, galeri dan karya siswa.

Aturannya, dan ini yang membuatnya aman dipakai di situs sekolah:

1. **Setiap judul diawali `[CONTOH]`.** Pembaca tidak mungkin salah kira.
   Slug-nya juga diawali `contoh-`, jadi URL-nya pun mengumumkan diri sendiri.
2. **Mati secara bawaan.** Hanya `SAMPLE_DATA=on` (atau `true` / `1`) yang
   menyalakannya. Salah tulis dianggap mati.
3. **Tidak menimpa tulisan Anda.** Data contoh hanya menggantikan konten yang
   **masih placeholder** — lihat bagian di bawah.
4. **Tidak ada nama siswa** di karya contoh, sama seperti data awal. Mengarang
   nama orang lalu memasangnya di karya karangan adalah pelanggaran aturan
   konten yang paling jelas.
5. **Dasbor memberi tahu.** Saat mode contoh aktif, sidebar dasbor menampilkan
   peringatan supaya Anda tidak perlu menebak apa yang dilihat pengunjung.

#### Kapan data contoh menggantikan, kapan tidak

Ini bagian yang paling mudah salah, dan sudah pernah salah dua kali. Aturannya:

| Keadaan | Yang terjadi |
| --- | --- |
| Berita / Kegiatan (memang sengaja kosong) | Data contoh menggantikan. |
| Karya siswa, judulnya masih `[Judul karya …]` | Data contoh menggantikan. |
| Karya siswa, sudah ada satu judul asli | **Tidak digantikan sama sekali.** |
| Galeri (keterangannya tulisan jadi, bukan placeholder) | **Tidak digantikan.** |
| Apa pun yang sudah Anda tulis di dasbor | **Tidak digantikan.** |

Dua kesalahan yang pernah terjadi, keduanya sudah ditutup oleh uji:

- Pemeriksaan pertama hanya berbunyi "apakah daftarnya kosong". Untuk karya dan
  galeri, daftarnya **tidak** kosong — ada isi awal — jadi syaratnya tak pernah
  terpenuhi dan data contoh diabaikan diam-diam.
- Pemeriksaan kedua hanya melihat konten cadangan di memori. Padahal
  `npm run db:seed` menyalin isi awal itu **ke basis data**, sehingga yang menang
  adalah baris basis data dan konten cadangan tidak pernah dibaca. Akibatnya
  `/karya` menampilkan satu kartu per kategori dengan dua kolom kosong di
  sampingnya.

Sekarang pemeriksaan dilakukan pada baris yang **benar-benar menang** — dari
memori atau dari Postgres — dengan melihat judulnya. Selama semuanya masih
placeholder, data contoh boleh menggantikan. Begitu ada satu judul asli, seluruh
koleksi itu dibiarkan apa adanya.

#### Cara memakai

Menyalakan:

```bash
# .env
SAMPLE_DATA=on
```

**Mulai ulang server** — nilai ini dibaca saat aplikasi menyala.

Mematikan — kembali ke keadaan kosong yang sebenarnya:

```bash
# .env
SAMPLE_DATA=off     # atau hapus barisnya sama sekali
```

Menghapus fitur ini sepenuhnya: hapus `src/data/sample.ts`, lalu hapus pemanggilan
`sampleInsteadOf` / `withSample*` / `isUneditedSeed` di `src/lib/content.ts`.
Tidak ada baris basis data dan tidak ada migrasi yang terlibat.

### Kenapa gambar punya animasi wipe, dan kenapa lapisnya di dalam

Gambar dengan `data-image-reveal` muncul lewat animasi *wipe* (terbuka dari atas
ke bawah), bukan fade.

**Klipnya dipasang pada gambarnya, bukan pada elemen yang diamati.** Ini bukan
detail gaya — ini pernah jadi bug yang membuat seluruh gambar di `/karya`,
`/galeri`, dan `/berita` tidak terlihat.

Sebabnya: elemen yang sepenuhnya terpotong `clip-path: inset(0 0 100%)`
**tidak terlihat oleh `IntersectionObserver`**. Diukur dengan dua kotak
identik: yang terpotong melaporkan `intersectionRatio: 0`, yang tidak terpotong
melaporkan `0.3`. Artinya observer yang tugasnya membuka klip tidak akan pernah
melihat elemen itu — terkunci oleh CSS kita sendiri. Setelah diperbaiki, 30
elemen yang sebelumnya tersembunyi jadi terlihat (110/110).

Karena itu, kalau menambah animasi masuk untuk elemen yang diamati observer,
**jangan memakai `clip-path`, `display: none`, atau `visibility: hidden`** pada
elemen itu sendiri. Pakai `opacity`, `transform`, atau pindahkan klipnya ke anak
elemen seperti yang dilakukan sekarang.

---

## 10. Struktur Proyek

```
src/
├── app/
│   ├── layout.tsx                 kerangka akar: <html>, <body>, metadata, font
│   ├── not-found.tsx              404 (di luar grup, jadi memakai SiteShell sendiri)
│   ├── (situs)/                   GRUP RUTE SITUS PUBLIK — tidak muncul di URL
│   │   ├── layout.tsx             memasang SiteShell
│   │   ├── page.tsx               halaman depan (10 bagian)
│   │   ├── tentang/               profil sekolah
│   │   ├── program-keahlian/      daftar + [slug] detail program
│   │   ├── berita/                arsip + [slug] artikel
│   │   ├── galeri/                galeri penuh
│   │   ├── karya/                 karya siswa
│   │   ├── kegiatan/              agenda kegiatan
│   │   ├── kontak/                kontak + formulir
│   │   ├── privasi/               kebijakan privasi
│   │   └── error.tsx, loading.tsx batas galat & status muat situs
│   ├── api/media/[id]/route.ts    menyajikan gambar yang tersimpan di basis data
│   ├── admin/
│   │   ├── masuk/                 halaman login (di luar grup terproteksi)
│   │   ├── auth-actions.ts        login, logout
│   │   ├── content-actions.ts     13 server action CRUD
│   │   ├── tags.ts                tag cache + menu dasbor
│   │   ├── error.tsx, loading.tsx batas galat & status muat dasbor
│   │   └── (dasbor)/              SEMUA rute di sini dilindungi oleh layout
│   ├── sitemap.ts, robots.ts      SEO
├── components/
│   ├── shell/SiteShell.tsx        kerangka situs: header + footer + kursor
│   ├── sections/                  bagian halaman
│   ├── navigation/                header + menu seluler
│   ├── footer/
│   ├── motion/                    Lenis, observer, animasi hero
│   ├── admin/                     kerangka dasbor + manajer konten
│   └── ui/                        RouteLoading, PageHero
├── data/defaults.ts               konten cadangan & tanda placeholder
├── lib/
│   ├── db.ts                      klien Prisma + readOrFallback
│   ├── content.ts                 SEMUA pembacaan publik
│   ├── auth.ts                    scrypt, token sesi
│   ├── session.ts                 cookie sesi
│   ├── media.ts                   simpan/baca/hapus gambar di basis data
│   ├── upload-limits.ts           aturan unggah, dibaca klien DAN server
│   ├── animations.ts              GSAP: splitLines, reveal, parallax, hero
│   ├── motion.ts                  konstanta durasi, breakpoint, easing
│   └── utils.ts                   slugify, format tanggal, dsb.
├── styles/
│   ├── tokens.css                 warna, font, skala tipe, easing
│   ├── fonts.css                  @font-face (font yang di-host sendiri)
│   └── global.css                 dasar, komponen, reveal, tombol
└── generated/prisma/              hasil `prisma generate` — jangan disunting
```

**Dua grup rute, dua kerangka.** `(situs)` dan `(dasbor)` sama-sama grup rute —
tanda kurung membuatnya tidak muncul di URL. Yang membedakan keduanya adalah
apa yang mereka pasang:

- `(situs)` memasang `SiteShell` — header, footer, gulir halus, kursor kustom.
- `(dasbor)` memasang `AdminShell` — sidebar, dan `requireSession()`.

Keduanya **tidak boleh** berbagi kerangka, dan sampai 24 September 2026 keduanya
berbagi: header dan footer dirender oleh `layout.tsx` akar, sehingga ikut terpasang
di `/admin/*`. Karena header situs bersifat `fixed`, ia melayang di atas sidebar
dasbor — terukur 2079 px² tumpang tindih antara merek sekolah dan judul sidebar,
setiap halaman dasbor berisi **dua** elemen `<main>`, dan Lenis mengambil alih
gulir di dalam CMS. Karena itu kerangka situs dipindahkan ke `(situs)`, dan
`tests/upload.test.ts` memastikan ia tidak kembali ke akar.

**Kenapa `requireSession()` ada di layout, bukan di tiap halaman.** Setiap
halaman di bawah `(dasbor)` terlindungi *secara struktural*. Kegagalan karena
lupa memanggil pemeriksaan sesi adalah rute terbuka, dan tidak ada yang
menyadarinya sampai halaman itu terindeks.

---

## 11. Perintah yang Tersedia

| Perintah | Kegunaan |
| --- | --- |
| `npm run dev` | Server pengembangan (hanya dari komputer sendiri) |
| `npm run dev:jaringan` | Sama, tapi bisa dibuka dari HP di WiFi yang sama |
| `npm run build` | Build produksi |
| `npm run start` | Jalankan hasil build (hanya dari komputer sendiri) |
| `npm run start:jaringan` | Jalankan hasil build, bisa dibuka dari HP |
| `npm run lint` | ESLint |
| `npm run check` | TypeScript (`tsc --noEmit`) |
| `npm test` | Uji unit (`node:test`) |
| `npm run verify:build` | Pastikan build benar-benar selesai (penjaga admin ada di tempatnya) |
| `npm run qa` | check → lint → test → build → verify:build |
| `npm run qa:lengkap` | Sama, ditambah pemeriksaan penjaga rute pada server yang hidup |
| `npm run db:generate` | Bangkitkan klien Prisma |
| `npm run db:migrate` | Buat + terapkan migrasi |
| `npm run db:push` | Dorong skema tanpa migrasi |
| `npm run db:deploy` | Terapkan migrasi yang ada (produksi) |
| `npm run db:studio` | Buka Prisma Studio |
| `npm run db:seed` | Isi konten awal |
| `npm run db:verify` | Verifikasi jalur basis data ujung ke ujung |
| `npm run media:bersihkan` | Lihat gambar yang tidak dipakai siapa pun (tambah `-- --hapus` untuk menghapus) |

> **Kenapa ada varian `:jaringan`.** Secara bawaan server hanya mengikat ke
> `127.0.0.1`, sehingga perangkat lain **tidak bisa** membukanya — itu pilihan
> sadar, bukan kelalaian. Untuk memperlihatkan situs dari HP, `:jaringan` membuka
> ke seluruh jaringan lokal. Pakai hanya di jaringan tepercaya, karena siapa pun
> di jaringan itu bisa membuka dasbor admin bila tahu alamatnya.

---

## 12. Pemeriksaan Kualitas

`npm run qa` menjalankan kelima gerbang secara berurutan:

```bash
npm run qa    # check && lint && test && build && verify:build
```

Gerbang terakhir itu penting dan mudah diremehkan. **Next menamai ulang
`.next/server/proxy.js` menjadi `.next/server/middleware.js` sebagai langkah
paling akhir build.** Runtime server memuat berkas dengan nama `middleware.js`
(`next-server.js:1082`), dan bila berkas itu tidak ada, galat
`MODULE_NOT_FOUND`-nya **ditelan diam-diam** (baris 1085). Akibatnya: build yang
terputus sedikit saja sebelum selesai menghasilkan situs yang tampak sehat
sepenuhnya — semua halaman 200 — tetapi penjaga rute admin tidak berjalan, dan
`/admin/dasbor` dibalas `200` alih-alih `307`.

Tidak ada galat di log, tidak ada yang merah di `check`/`lint`/`test`, dan
tidak ada yang terlihat di screenshot. Karena itu exit code `npm run build`
**tidak cukup** sebagai bukti; `verify:build` memeriksa artefaknya langsung,
termasuk memastikan tidak ada sisa `proxy.js` yang menandakan build terputus.

Bila build ditangani sendiri (bukan lewat `qa`), jalankan keduanya:

```bash
npm run build && npm run verify:build
```

Untuk sekaligus menguji perilakunya pada server yang hidup:

```bash
npm run start &            # atau: npm run start:jaringan
npm run qa:lengkap
```

> **Catatan untuk pengembang.** Bila `verify:build` melaporkan `middleware.js`
> tidak ada, jangan mencari kesalahan di `src/proxy.ts` — berkas itu biasanya
> benar. Periksa apakah build benar-benar selesai.

### Gerbang hidrasi pada animasi reveal

`RevealObserver` menulis atribut `data-revealed` untuk memicu transisi CSS.
**Penulisan itu tidak boleh terjadi sebelum React mengambil alih elemennya.**
React membandingkan *seluruh himpunan atribut* sebuah elemen dengan DOM virtual,
jadi atribut yang React tidak render tetap dilaporkan sebagai
*hydration mismatch* — dan itulah galat yang muncul di overlay dev.

Yang penting dipahami: **tidak ada jadwal waktu yang aman.** React menghidrasi
lewat banyak commit, dan Next memanggil `hydrateRoot` di dalam
`startTransition` (`next/dist/client/app-index.js`), jadi pekerjaannya terpecah.
Diukur di `/kegiatan` dengan `MutationObserver` + kait `onCommitFiberRoot`
React pada satu jam `performance.now()` yang sama:

```
 18.5ms  DOMContentLoaded              0/4 elemen sasaran diklaim React
639.9ms  commit React #1               0/4
706.4ms  commit React #6               0/4
1051.9ms versi sebelumnya menulis      mismatch tercipta di sini
1082.7ms React melaporkan mismatch     2/4
```

Empat kandidat jeda dibandingkan dengan momen React benar-benar mengklaim node,
selama empat kali pemuatan `/kegiatan`:

| kandidat | run1 | run2 | run3 | run4 | hasil |
| --- | --- | --- | --- | --- | --- |
| `load` + rAF | −64ms | −49ms | −53ms | −64ms | selalu lebih awal |
| `load` + rAF ×2 | −48ms | −46ms | −39ms | −26ms | selalu lebih awal |
| `load` + rAF ×3 | −28ms | −33ms | −27ms | −14ms | selalu lebih awal |
| `requestIdleCallback` | +2ms | +25ms | +5ms | +4ms | lolos, margin 2ms |
| `load` + 100ms | +41ms | +9ms | +17ms | +26ms | lolos |

`requestAnimationFrame` **selalu** terlambat, berapa pun frame yang dirantai.
Jadi gerbangnya bukan timer, melainkan sinyal yang dipakai React sendiri: node
yang sudah diambil alih React membawa kunci `__reactFiber$<acak>`. Begitu kunci
itu ada, perbandingan atribut untuk node tersebut sudah terjadi.

`FALLBACK_MS = 800` membuka gerbang apa pun yang terjadi. Kegagalan yang tidak
boleh terjadi di sini adalah konten yang tersembunyi selamanya, jadi gerbangnya
**gagal-terbuka**, bukan gagal-tertutup.

```bash
# Verifikasi perilaku reveal dan hidrasi di browser sungguhan.
node outputs/audit/probe-production.cjs http://127.0.0.1:3000   # produksi
node outputs/audit/probe-production.cjs http://127.0.0.1:3001   # dev
node outputs/audit/probe-hydration-repeat.cjs 6                 # uji ulang
node outputs/audit/shot-full-real.cjs http://127.0.0.1:3000 final / 1440
```

> **Catatan pengukuran.** Dua jebakan yang sudah memakan waktu:
>
> 1. **Overlay dev Next memutar ulang galat antar navigasi** dalam satu
>    browser/konteks, jadi menguji banyak rute di satu browser menghasilkan
>    positif palsu. Setiap halaman harus diuji di **browser baru** — itu yang
>    dilakukan `probe-production.cjs`.
> 2. **Menggulir sebelum halaman tenang menghasilkan laporan palsu.** Skrip yang
>    menggulir tepat setelah `load` melaporkan `13/55` elemen ter-reveal di
>    produksi dan `55/55` di dev — terlihat seperti regresi produksi, padahal
>    hanya soal waktu. Beri jeda ~1500ms sebelum menggulir.

Harness QA berbasis browser sungguhan ada di `outputs/qa.mjs`.
Ia menjalankan Chrome headless dan mengukur — bukan mengasumsikan:

- **error konsol** dan **respons HTTP ≥ 400** di setiap rute
- **overflow horizontal** di 320 / 390 / 768 / 1024 / 1440 / 1920 px
- **font benar-benar termuat**, lewat `document.fonts.check()` — bukan
  `getComputedStyle().fontFamily`, yang melaporkan nama font meski browser
  menggambar font lain
- **visibilitas hero**, termasuk **posisi setiap baris judul di dalam
  topengnya** — kolom `lines:n/m`. Ini ada karena pemeriksaan lama hanya membaca
  opasitas `<h1>`, dan itu lulus sementara judulnya sama sekali tidak terlihat
- jumlah `<h1>`, gambar rusak, jumlah bagian
- **prefers-reduced-motion**: memastikan tidak ada elemen yang tertinggal
  tersembunyi
- **urutan fokus keyboard**

```bash
node outputs/qa.mjs                  # jalankan pemeriksaan
node outputs/qa.mjs --shots          # sekaligus simpan tangkapan layar
```

Laporan tertulis ke `outputs/qa-report.json`.

### Pemeriksaan khusus judul hero

`outputs/probe-hero.mjs` memeriksa satu hal saja, dengan teliti: apakah judul
hero benar-benar tergambar. Ia mengambil sampel posisi baris di dalam topengnya
dari frame pertama hingga animasi selesai, di lima viewport. Kegagalan yang
dicarinya adalah kegagalan sunyi — tween yang melaporkan sukses tapi tidak
pernah menggerakkan apa pun — jadi ia membandingkan posisi awal dan akhir, bukan
hanya keadaan akhirnya.

```bash
node outputs/probe-hero.mjs          # keluar dengan kode ≠ 0 kalau judul gagal
```

> **Catatan.** Harness memakai Chrome yang terpasang di sistem. Sesuaikan
> `CHROME_PATH` di bagian atas berkas kalau lokasinya berbeda.

### Pemeriksaan khusus jalur login admin

`outputs/probe-auth.mjs` menguji login ujung ke ujung di browser sungguhan,
karena `src/lib/auth.ts` membaca kredensial dari variabel lingkungan dan **tidak
ada tabel pengguna** yang bisa diperiksa lewat SQL. Yang diuji:

1. Kredensial benar → diarahkan ke `/admin/dasbor`, cookie sesi terpasang.
2. Cookie sesi bersifat `httpOnly`.
3. Kredensial salah → tetap di `/admin/masuk`, tidak ada cookie sesi.
4. Tanpa login → `/admin/dasbor` ditolak dan tidak membocorkan markup dasbor.

```bash
# Server harus berjalan lebih dulu, dengan kredensial ada di lingkungan server.
ADMIN_EMAIL="admin@sekolah.sch.id" ADMIN_PASSWORD="kata-sandi" \
  node outputs/probe-auth.mjs
```

> **Kredensial harus ada di lingkungan server, bukan hanya di perintah ini.**
> Kalau `ADMIN_EMAIL` / `ADMIN_PASSWORD` tidak terlihat oleh proses server,
> login akan gagal **dengan benar** (fail-closed) dan probe akan melaporkan
> kegagalan — itu perilaku yang diinginkan, bukan bug.

### Pemeriksaan khusus unggah gambar dan kerangka dasbor

Dua probe ini ada karena laporan pemilik proyek pada 24 September 2026 ("belum
bisa upload gambar"; tangkapan layar dasbor yang tumpang tindih). Keduanya
mengukur angka, bukan kesan, dan sengaja dibuat supaya bisa dijalankan **sebelum
dan sesudah** perbaikan lalu dibandingkan.

```bash
node --env-file=.env outputs/probe-upload.mjs        # TAG=before|after
node --env-file=.env outputs/probe-admin-shell.mjs   # TAG=before|after
node --env-file=.env outputs/probe-media.mjs         # rantai lengkap sampai beranda
```

`probe-upload.mjs` mengunggah tiga berkas berukuran berbeda lewat kolom berkas
yang sesungguhnya, lalu melaporkan pesan yang muncul dan permintaan POST yang
terjadi. Yang membedakan sebab-sebabnya adalah ukurannya:

| Berkas | Sebelum perbaikan | Sesudah perbaikan |
| --- | --- | --- |
| 200 KB | "Penyimpanan gambar belum dikonfigurasi…" (POST 200) | "Gambar berhasil diunggah." |
| 1,5 MB | **macet di "Mengunggah…"**, POST 500, `Body exceeded 1 MB limit.` | "Gambar berhasil diunggah." |
| 9 MB | **macet di "Mengunggah…"**, POST 500 | "Ukuran gambar melebihi 8 MB.", **tanpa POST sama sekali** |

> **Catatan penting soal berkas uji di probe itu.** PNG-nya disusun dengan
> menempelkan byte sampah di belakang PNG 1×1, jadi sharp **menolaknya** dan
> `media.ts` menyimpan byte aslinya lewat jalur penurunan. Artinya probe itu
> membuktikan batas badan Server Action dan sampainya permintaan ke action —
> bukan encoder-nya. Untuk mengukur encoder dan seluruh rantai penyajian, pakai
> `probe-media.mjs`, yang mengunggah PNG sah 1600×1000 hasil `sharp`.

`probe-media.mjs` berjalan dari ujung ke ujung dan berhenti di titik pertama yang
gagal, supaya laporannya menunjuk satu sebab alih-alih daftar kemungkinan:

| Langkah | Yang dibuktikan |
| --- | --- |
| pesan status | unggahan benar-benar sampai dan diproses |
| nilai tersembunyi `image` | bentuk URL-nya `/api/media/<id>`, bukan sesuatu yang lain |
| `GET` URL itu | rutenya benar-benar menyajikan, dengan `Content-Type` gambar |
| `Content-Length` == byte diterima | panjang yang dijanjikan sama dengan yang dikirim |
| magic bytes `RIFF…WEBP` | byte-nya hasil encode, bukan berkas asli yang disimpan karena encoder gagal |
| ukuran akhir < ukuran sumber | pengecilan benar-benar terjadi |
| `naturalWidth` pratinjau | peramban benar-benar berhasil men-decode-nya |
| URL ditemukan di HTML beranda | gambar tampil di halaman depan, bukan hanya tersimpan |
| `<img>` di beranda ter-decode | elemennya ada **dan** gambarnya benar-benar tergambar |
| jumlah aset kembali nol | menghapus item juga menghapus asetnya — tidak ada yang bocor |

> **Kenapa "ada di HTML" belum cukup, dan kenapa `naturalWidth` nol belum tentu
> bug.** Beranda memuat sepuluh bagian dan galerinya ada di bawah, jadi tangkapan
> layar bagian atas halaman tidak membuktikan apa pun. Probe ini menggulirkan
> elemennya ke tampilan lalu memotret elemen itu sendiri
> (`outputs/screenshots/probe-media-foto.png`).
>
> `scrollIntoViewIfNeeded()` dipakai, bukan `window.scrollTo()` — halaman ini
> ber-Lenis, dan menggulir lewat `window` tidak menggerakkan viewport-nya. Dan
> `naturalWidth` nol **hampir selalu** berarti `loading="lazy"` belum terpicu,
> bukan gambar rusak: elemennya ada, kotaknya terisi 677×452 px, tapi gambarnya
> belum dimuat. Probe ini menunggu peristiwa `load`-nya, dan kalau tetap nol baru
> memaksa `loading="eager"` untuk memisahkan "pemicu lazy-nya tidak jalan" dari
> "byte-nya bermasalah". Yang kedua barulah bug. Pada jalur yang benar hasilnya
> `natural 742×464, loading="lazy"`.

Probe itu menulis ke basis data lalu **membersihkan dirinya sendiri**: foto
ujinya disimpan, diperiksa di beranda, lalu dihapus lagi — dan karena
`deleteGalleryItem` memanggil `deleteImage()`, asetnya ikut terhapus. Langkah
terakhirnya memeriksa justru hal itu: kalau `npm run media:bersihkan` masih
menemukan aset sesudah probe selesai, yang rusak adalah **jalur hapusnya**, bukan
jalur unggahnya.

`probe-admin-shell.mjs` mengukur jumlah `<main>`, keberadaan header/footer situs,
kursor kustom, Lenis, dan **luas tumpang tindih** antara merek situs dan judul
sidebar dalam piksel persegi:

| | Sebelum | Sesudah |
| --- | --- | --- |
| `<main>` per halaman | 2 (`konten`, `dasbor-konten`) | 1 (`dasbor-konten`) |
| Header situs publik | ada (6 tautan nav) | tidak ada |
| Footer situs publik | ada | tidak ada |
| Kursor kustom | ada | tidak ada |
| Lenis mengambil alih gulir | ya | tidak |
| Tumpang tindih merek × judul | **2079 px²** | 0 |

### Mengukur rasio dan ukuran gambar

`outputs/probe-image-ratios.mjs` menjawab pertanyaan "gambar sebesar apa yang
harus saya siapkan?" dengan mengukur, bukan menebak. Ia membuka delapan rute pada
enam lebar layar (320–1920 px) lalu melaporkan kotak setiap gambar beserta rasio
yang **benar-benar tergambar**.

```bash
BASE=https://skagara.vercel.app node outputs/probe-image-ratios.mjs
```

Dua jebakan yang sudah memakan waktu saat menulisnya:

- **Rasio tidak selalu ada di induk langsung `<img>`.** Di galeri, `next/image`
  dengan `fill` duduk di dalam `<span class="absolute inset-0">`, dan
  `aspect-ratio`-nya ada di **kakek**-nya. Mengukur induk langsung menghasilkan
  `aspect-ratio: auto` — angka yang benar, tetapi milik elemen yang salah. Karena
  itu elemen ber-`data-image-reveal` dicari lebih dulu, baru elemen terdekat yang
  punya rasio nyata.
- **Ringkasan pernah memotong rasionya sendiri.** Pemisah antar kolom dulu
  `' / '`, padahal nilai `aspect-ratio` CSS juga berbunyi `"4 / 5"` — sehingga
  `split` mengubah `4 / 5` menjadi `4`. Sekarang pemisahnya `' ||| '`.

`object-fit: cover` berarti gambar **selalu dipotong**, jadi rasio berkas yang
diunggah tidak mengubah tampilan sama sekali — yang menentukan hanya rasio
kotaknya. Itulah sebabnya pertanyaan "berapa rasio gambarnya?" punya jawaban
**per slot**, bukan satu jawaban. Ringkasan rasio yang terukur:

| Rasio CSS | Kotak terbesar terukur | Terkecil | Dipakai di |
| --- | --- | --- | --- |
| `4 / 5` | 827×1033 | 56 px | hero, kartu program, karya siswa, galeri, kegiatan |
| `4 / 3` | 746×560 | 222 px | kisi galeri, "Sekilas Jayanegara" |
| `3 / 2` | 1051×700 | 280 px | berita, "Hari-hari di sekolah", pita `/kegiatan` |
| `16 / 9` | 1824×1026 | 280 px | tentang, banner program, banner berita |
| `21 / 9` | 1824×782 | 280 px | pita foto `/kegiatan` |
| `13 / 17` | 208×272 | 208 px | pratinjau ikut kursor (`ProgramList`, desktop) |
| `7 / 8` | 56×64 | 56 px | thumbnail program di HP (`ProgramList`) |

Bentuknya ditentukan **posisi di dalam daftar**, bukan bentuk fotonya: kisi
galeri memakai `index % 3 === 0` → 4:5 dan sisanya 4:3, sedangkan pita
`/kegiatan` memakai `index % 3` → 3:2, 4:5, 21:9. Nama variabelnya `isPortrait`
tetapi **bukan** deteksi orientasi — ia hanya penomoran. Konsekuensinya urutan
item menentukan potongan, dan urutan itu diatur dari kolom Urutan di dasbor.

> Panduan praktis untuk pemilik proyek — ukuran berkas yang disarankan per bagian
> dan aturan area aman — ada di `PANDUAN.md` bagian "Ukuran dan rasio gambar di
> setiap bagian". Berkas itu **tidak ikut ke repositori** (lihat `.gitignore`),
> jadi tabel di atas adalah rujukan yang tersimpan di sini.

### Garis hantu dari panel menu seluler yang tertutup

Keluhan pemilik proyek (24 September 2026): di ponsel muncul "beberapa garis
yang muncul gajelas". Tiga tangkapan layar — dua di hero, satu di footer —
ternyata **satu bug yang sama**.

`SiteHeader.tsx` menaruh `border-b` pada `<li>` tetapi `opacity-0` pada `<Link>`
**di dalamnya**, dan `opacity` tidak merambat ke atas. Jadi saat menu tertutup
teksnya hilang sementara garisnya tetap tergambar. Panelnya `fixed inset-0 z-40`,
sehingga garis-garis itu melayang pada koordinat viewport yang tetap dan ikut
diam saat halaman digulir. Di footer yang gelap, lima garis terang `#e2e2e2` itu
jatuh tepat di bawah beberapa tautan dan terbaca seperti garis bawah.
`primaryNav` berisi enam item dan yang terakhir memakai `last:border-b-0`, jadi
jumlah yang bocor tepat **lima**.

`inert` dan `aria-hidden` **tidak** menghentikan penggambaran — keduanya hanya
mencabut interaksi dan pohon aksesibilitas. Yang menghentikannya adalah
`visibility: hidden`, dan itu dipakai pada panelnya (`invisible`/`visible` +
`transition-[visibility]`) supaya tidak bisa kembali untuk anak apa pun yang
ditambahkan nanti.

> **Potret elemen tidak bisa melihat bug ini.** `footer.screenshot()` memotret
> kotak elemen, dan elemen `fixed` yang jatuh di luar kotak itu tidak ikut
> terekam — potret footer selalu tampak bersih. Yang harus dipotret adalah
> viewport, pada beberapa posisi gulir.

```bash
node outputs/verify-mobile-menu-lines.mjs                                  # bocor: harus 0
BASE=https://skagara.vercel.app node outputs/verify-mobile-menu-lines.mjs
node outputs/probe-lines-viewport.mjs                                      # garis per posisi gulir
TAG=sesudah node outputs/probe-lines-viewport.mjs
```

| Pengukuran (viewport 390 px) | Deploy lama | Sesudah perbaikan |
| --- | --- | --- |
| Garis bocor saat menu tertutup | **5** — y = 274, 335, 396, 457, 518 | **0** |
| Garis milik panel saat menu terbuka | 10 | 10 — menunya utuh |
| Garis di dasar halaman `/` | **6** — `73, 275, 336, 397, 458, 519` | **1** — hanya `73`, garis header |
| Garis di dasar `/program-keahlian` | **6** | **1** |

Gerbang regresinya ada di `tests/motion.test.ts` (`the closed mobile menu paints
nothing`) dan sudah dibuktikan **gagal** saat bug-nya dikembalikan, lalu lulus
saat diperbaiki.

### Memverifikasi produksi, bukan hanya localhost

Semua probe di atas menerima `BASE`, jadi bisa diarahkan ke situs yang sudah
ter-deploy. Ini penting: **kode yang ada di komputer dan kode yang ada di Vercel
adalah dua hal berbeda sampai di-push.** Tangkapan layar pemilik proyek
(24 September 2026) memperlihatkan pesan
`"Penyimpanan gambar belum dikonfigurasi. Isi kredensial Cloudinary di berkas .env."`
— kalimat yang sudah tidak ada di pohon kerja mana pun, karena `src/lib/cloudinary.ts`
dihapus. Sumbernya ternyata deploy lama yang tertinggal dua commit.

```bash
BASE=https://skagara.vercel.app node --env-file=.env outputs/probe-admin-shell.mjs
BASE=https://skagara.vercel.app node --env-file=.env outputs/probe-media.mjs
```

Cara memisahkan "deploy-nya lama" dari "kode barunya rusak" tanpa login — dua
pemeriksaan HTTP yang hasilnya berbeda di kedua versi:

| Pemeriksaan | Deploy lama | Deploy sekarang |
| --- | --- | --- |
| `GET /api/media/tidak-ada-xyz` | `text/html` — halaman 404 HTML, rutenya **tidak ada** | `text/plain` — `Gambar tidak ditemukan.` |
| Chunk layout akar | memuat `SiteHeader`, `SmoothScroll`, `RevealObserver`, `CustomCursor` | tidak satu pun |

Hasil pada deploy `ddd2d48` (24 September 2026):

| Pemeriksaan | Hasil |
| --- | --- |
| `/admin/dasbor` tanpa login | `307` → `/admin/masuk?lanjut=%2Fadmin%2Fdasbor` |
| `<main>` per halaman dasbor | 1 (`dasbor-konten`) |
| Header/footer publik, kursor kustom, Lenis di dasbor | tidak ada semua |
| Tumpang tindih merek × judul | `null px²` |
| Pemberitahuan "Unggah gambar belum aktif" | tidak tampil — penyimpanan memang aktif |
| `probe-media.mjs` ujung ke ujung | **17/17 langkah lolos**, 224 KB → 47 KB, `natural 742×464` |
| Aset sesudah probe | 0 — pembersihannya ikut jalan |

> **Satu gerbang di probe itu pernah memberi laporan palsu.** Langkah terakhir
> `probe-media.mjs` dulu menunggu tetap 2500 ms lalu memeriksa barisnya masih ada
> atau tidak. Terhadap localhost itu selalu cukup; terhadap Vercel + Supabase
> lintas wilayah tidak — server action-nya sudah selesai dan barisnya sudah
> lenyap dari basis data, tetapi DOM-nya belum sempat menyusul, sehingga probe
> melaporkan `MASIH ADA — hapus manual` padahal `media:bersihkan` menunjukkan
> 0 aset. Sekarang gerbangnya menunggu baris itu benar-benar lepas
> (`waitFor({ state: 'detached' })`, batas 20 detik), dan menghitung pada `<li>`
> alih-alih `getByText` — teks judulnya juga hidup di dalam input formulir, dan
> itu membuat hitungannya tidak pernah nol.

---

## 13. Pemecahan Masalah

### "Belum dikonfigurasi" di halaman masuk

`AUTH_SECRET` kurang dari 32 karakter, atau `ADMIN_EMAIL` / `ADMIN_PASSWORD`
belum diisi. Panel di `/admin/masuk` mencantumkan variabel mana yang masih
kosong. Perbaiki di `.env`, lalu mulai ulang server.

### Login selalu ditolak padahal kredensial benar

Periksa log server. Dua penyebab yang mungkin:

1. **`[auth] ADMIN_EMAIL / ADMIN_PASSWORD belum diatur`** — proses server tidak
   melihat variabelnya. Di Vercel, variabel harus disetel di pengaturan proyek
   dan **di-redeploy**; di lokal, mulai ulang server setelah mengubah `.env`.
2. **Server tidak mencatat apa pun** — email tidak cocok. Pencocokan email
   mengabaikan besar-kecil huruf, tapi tidak mengabaikan spasi di dalamnya.

Kata sandi berbentuk teks biasa **maupun** hash `scrypt$…` keduanya diterima.

### Login selalu gagal

1. Pastikan `ADMIN_EMAIL` sama persis dengan yang Anda ketik (perbandingan
   email tidak membedakan huruf besar/kecil, tapi spasi ikut dihitung — jangan
   ada spasi di ujung nilai `.env`).
2. Kalau `ADMIN_PASSWORD` berupa hash, pastikan diawali `scrypt$` dan tidak
   terpotong saat disalin.
3. Ganti `AUTH_SECRET`, lalu coba lagi — token sesi lama akan ditolak.

### "Database belum terhubung"

`DATABASE_URL` tidak diawali `postgres`, atau nilainya kosong. Periksa apakah
tanda kutip di `.env` sudah benar dan tidak ada baris terpotong.

### `Connection url is empty` padahal `.env` sudah diisi

**Prisma 7 tidak memuat `.env` sendiri** — Prisma 5 memuatnya, dan hampir semua
panduan di internet masih mengasumsikan perilaku lama itu. Karena
`prisma.config.ts` membaca `process.env`, berkas `.env` harus dimuat lebih dulu
oleh skripnya sendiri.

Tiga tempat memuatnya secara eksplisit (`loadEnv({ override: false })`):

| Berkas | Untuk perintah |
| --- | --- |
| `prisma.config.ts` | `db:deploy`, `db:migrate`, `db:push`, `db:studio` |
| `prisma/seed.ts` | `db:seed` |
| `scripts/verify-db.ts` | `db:verify` |

Dua yang terakhir dijalankan `tsx` langsung, **di luar** jalur
`prisma.config.ts` — jadi keduanya butuh pemuatnya masing-masing. Kalau salah
satu tertinggal, hanya perintah itu yang gagal sementara yang lain bekerja,
dan pesannya menuduh hal yang salah. `tests/verify-db.test.ts` mengunci
ketiganya.

**Jangan** mengandalkan `dotenv/config` sebagai flag baris perintah di dalam
skrip `package.json`: itu akan menimpa variabel yang sudah ada di shell, dan
akibatnya `DATABASE_URL=... npm run db:verify` menyentuh basis data dari `.env`,
bukan yang diberikan. Jadi Anda bisa mengira sedang memeriksa basis data uji
padahal yang diperiksa adalah basis data lain.

### `prisma migrate` gagal / menggantung

`DIRECT_URL` kemungkinan menunjuk ke port pooler (`6543`). Migrasi butuh
koneksi langsung. Ganti ke port `5432`.

### "Terlalu banyak koneksi" dari Supabase

Turunkan `max` di `src/lib/db.ts` (sekarang `5`), atau pastikan
`?pgbouncer=true&connection_limit=1` ada di `DATABASE_URL`.

### Unggah gambar gagal

Ada dua sebab yang berbeda, dan gejalanya sengaja dibedakan supaya bisa
dipisahkan tanpa membuka log:

| Yang Anda lihat | Sebabnya | Tindakan |
| --- | --- | --- |
| "Penyimpanan gambar belum aktif. Basis data belum dikonfigurasi…" | `DATABASE_URL` kosong | Isi `DATABASE_URL`, jalankan migrasi, mulai ulang server |
| "Ukuran gambar melebihi 8 MB." | Berkas terlalu besar — ditolak di peramban, **tidak dikirim** | Perkecil gambarnya |
| "Format gambar harus JPG, PNG, WebP, atau AVIF." | Tipe berkas di luar daftar | Ubah formatnya |
| "Gambar gagal diunggah. Periksa koneksi Anda…" | Permintaan gagal di jalan, sebelum action berjalan | Coba lagi; kalau tetap, periksa log server |
| "Gambar gagal disimpan. Silakan coba lagi." | Basis data menolak penulisan — sering berarti kuota penuh | Periksa pemakaian di halaman **Pengaturan** |

Pemberitahuan "Unggah gambar belum aktif" di sidebar menandakan baris pertama
bahkan sebelum Anda mencoba mengunggah.

Kalau unggahan **berhasil** tetapi gambarnya tidak tampil:

1. Pastikan itemnya diterbitkan — kotak "Tampilkan di galeri" harus tercentang.
2. Ingat bahwa halaman depan hanya memuat **6 foto pertama**, diurutkan dari
   angka Urutan terkecil. Beri angka kecil (misalnya `0` atau `1`) agar foto
   baru langsung terlihat di beranda.
3. Buka URL gambarnya langsung di tab baru (klik kanan → *Open image in new
   tab*). Kalau berbunyi "Gambar tidak ditemukan.", barisnya hilang dari tabel
   `MediaAsset` — biasanya karena item dihapus lebih dulu. Kalau gambarnya
   tampil di tab itu tetapi tidak di halaman, masalahnya ada di tata letak
   (angka Urutan atau status terbit), bukan di penyimpanan.

### Perubahan dari admin tidak muncul di situs

Kalau ini terjadi, **jangan** mulai dari `revalidateTag`. Diukur 24 September
2026, mekanisme yang benar-benar menjaga situs tetap segar adalah
`dynamic = 'force-dynamic'` di `src/app/layout.tsx`: setiap halaman dirender
ulang tiap permintaan, dengan header
`Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`. Tidak
ada cache halaman, dan tidak ada cache data bertag — `src/lib/db.ts` membaca
Prisma secara langsung, dan `cacheTag` tidak dipanggil di mana pun.

Artinya:

1. Perubahan **tidak** butuh redeploy, dan tidak perlu menunggu — cukup muat
   ulang halaman. Kalau masih lama, lakukan *hard refresh* (Ctrl+Shift+R) untuk
   membersihkan cache peramban.
2. Kalau perubahan tetap tidak muncul, sebabnya hampir selalu data: barisnya
   belum tersimpan, kolom **Tampilkan/terbitkan** belum dicentang, atau angkanya
   mengurutkannya ke luar batas yang ditampilkan (beranda hanya memuat 6 foto
   dan 4 berita teratas).
3. Kalau suatu saat halaman publik dibuat statis demi kecepatan, hapus dulu
   ketergantungan pada `force-dynamic` dengan memasang `unstable_cache` +
   `cacheTag` di `src/lib/content.ts`. Tanpa itu, menyetel halaman menjadi statis
   akan membuat perubahan dari dasbor berhenti muncul tanpa galat apa pun.

### Halaman tampil tanpa gambar sama sekali

Gambar cadangan ada di `public/images/`. Bangkitkan ulang dengan:

```bash
node --import tsx scripts/make-placeholders.ts
```

### Font tampil berbeda dari desain

Periksa `public/fonts/` berisi lima berkas `.woff2`. Harness QA
(`node outputs/qa.mjs`) melaporkan apakah ketiga rumpun font benar-benar
termuat — itu cara tercepat memastikan.

### Build gagal dengan "Deleting files" / bulk delete

Itu pembatas keamanan lingkungan kerja, bukan kesalahan kode. Hapus `.next`
secara manual lalu build ulang.

---

## 14. Aturan Konten

**Jangan pernah mengarang informasi tentang SMK Jayanegara.**

Tidak ada sejarah, akreditasi, penghargaan, jumlah siswa, jumlah guru, daftar
fasilitas, kerja sama, prestasi, statistik, nama guru, atau agenda yang boleh
dibuat-buat. Kalau informasinya belum ada, tandai dengan `placeholder()` dan
biarkan pemilik sekolah mengisinya lewat dasbor.

Ini bukan sekadar kesopanan. Situs sekolah dibaca calon siswa dan orang tua, dan
angka yang terlihat resmi tapi karangan adalah kerugian nyata bagi mereka.

Cara menjalankannya di kode:

- Semua fakta yang belum diketahui ada di `src/data/defaults.ts` sebagai
  `placeholder(...)` atau string kosong.
- `defaultNews` dan `defaultEvents` sengaja kosong.
- Karya siswa **tidak** disertai nama siswa sampai pemilik mengisinya —
  memublikasikan nama murid tanpa izin bukan hak kita.
- Gambar cadangan adalah bentuk abstrak yang digambar sendiri, bukan foto stok.
  Foto stok berisi orang asing akan menjadi klaim palsu tentang siapa yang
  belajar di sana.
- Font yang di-host hanya yang berlisensi SIL OFL. Font komersial dilarang
  dipasang tanpa lisensi yang jelas.

---

## 15. Lisensi dan Atribusi

**Font** (semuanya SIL Open Font License 1.1, boleh dipakai komersial):

- Instrument Sans — © Instrument, SIL OFL 1.1
- JetBrains Mono — © JetBrains, SIL OFL 1.1

**Pustaka utama:** Next.js (MIT), React (MIT), Prisma (Apache-2.0),
Tailwind CSS (MIT), GSAP (standard "no charge" license), Lenis (MIT),
sharp (Apache-2.0), Supabase JS (MIT).

**Konten sekolah:** hak milik SMK Jayanegara.
