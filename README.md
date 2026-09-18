# SMK Jayanegara — Situs Sekolah

Situs resmi SMK Jayanegara (Mojokerto, Jawa Timur): profil sekolah, program
keahlian, karya siswa, galeri, berita, dan agenda kegiatan — lengkap dengan
dasbor admin untuk mengelola seluruh isinya tanpa menyentuh kode.

Dibangun dengan Next.js App Router, PostgreSQL (Supabase), Prisma, Cloudinary,
GSAP + Lenis. Seluruh antarmuka berbahasa Indonesia.

---

## Daftar Isi

1. [Menjalankan di Komputer Sendiri](#1-menjalankan-di-komputer-sendiri)
2. [Variabel Lingkungan](#2-variabel-lingkungan)
3. [Menyiapkan Basis Data (Supabase)](#3-menyiapkan-basis-data-supabase)
4. [Prisma: Migrasi dan Seed](#4-prisma-migrasi-dan-seed)
5. [Menyiapkan Cloudinary](#5-menyiapkan-cloudinary)
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
| `CLOUDINARY_CLOUD_NAME` | untuk unggah | Nama cloud Cloudinary. |
| `CLOUDINARY_API_KEY` | untuk unggah | API key Cloudinary. |
| `CLOUDINARY_API_SECRET` | untuk unggah | API secret Cloudinary. **Rahasia.** |
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

## 5. Menyiapkan Cloudinary

1. Buat akun gratis di <https://cloudinary.com>.
2. Buka **Dashboard → Product Environment Credentials**.
3. Salin **Cloud name**, **API Key**, dan **API Secret** ke `.env`.

```
CLOUDINARY_CLOUD_NAME="nama-cloud-anda"
CLOUDINARY_API_KEY="123456789012345"
CLOUDINARY_API_SECRET="rahasia-anda"
```

Unggahan dikirim dari server ke Cloudinary lewat `upload_stream`, jadi **tidak
ada berkas yang ditulis ke disk**. Ini bukan sekadar kerapian: filesystem Vercel
bersifat sementara, sehingga gambar yang ditulis ke disk akan hilang begitu
fungsi selesai berjalan.

**Batas unggah:** 8 MB per berkas, format JPEG / PNG / WebP / AVIF.

Setelah diunggah, dasbor menyimpan dua nilai: URL gambar dan *public ID*.
Public ID dipakai untuk menghapus gambar dari Cloudinary saat item dihapus.
Menghapus gambar bersifat **tidak fatal** — kalau Cloudinary sedang tidak bisa
dihubungi, data tetap terhapus dari basis data dan kegagalan dicatat di log.
Gambar yatim lebih baik daripada operasi yang gagal di tengah jalan.

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

Repositori ini sudah di-`git init`. Yang **tidak** ikut ter-commit: `.env`
(kredensial sungguhan), `.pgdata/` (basis data lokal), dan `.workbuddy-ai/`
(catatan kerja). Ketiganya ada di `.gitignore`.

Sebelum commit pertama ke repositori publik, pastikan tidak ada kredensial yang
ikut. `.gitignore` yang salah tulis **tidak error** — ia hanya diam-diam tidak
melindungi apa pun. Ujilah polanya, jangan diasumsikan:

```bash
git check-ignore -v .env .pgdata/PG_VERSION   # harus menyebut aturan yang cocok
git grep -iE 'AUTH_SECRET|ADMIN_PASSWORD' HEAD -- ':!.env.example'
```

Perintah kedua harus **tidak** menemukan apa pun selain contoh di dokumentasi.

**Kalau `.env` sudah terlanjur ter-commit**, mengganti isinya dengan versi
kosong tidak cukup — nilainya tetap ada di riwayat git. Ganti dulu kredensialnya
(`AUTH_SECRET` dan `ADMIN_PASSWORD`), baru bersihkan riwayat. Menganggapnya
hilang setelah menimpa berkas adalah kesalahan yang mahal.

### Catatan khusus Vercel

- **Tidak ada berkas lokal.** Semua unggahan ke Cloudinary.
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

---

## 10. Struktur Proyek

```
src/
├── app/
│   ├── layout.tsx                 kerangka global, metadata, font
│   ├── page.tsx                   halaman depan (10 bagian)
│   ├── tentang/                   profil sekolah
│   ├── program-keahlian/          daftar + [slug] detail program
│   ├── berita/                    arsip + [slug] artikel
│   ├── galeri/                    galeri penuh
│   ├── karya/                     karya siswa
│   ├── kegiatan/                  agenda kegiatan
│   ├── kontak/                    kontak + formulir
│   ├── privasi/                   kebijakan privasi
│   ├── admin/
│   │   ├── masuk/                 halaman login (di luar grup terproteksi)
│   │   ├── auth-actions.ts        login, logout
│   │   ├── content-actions.ts     13 server action CRUD
│   │   ├── tags.ts                tag cache + menu dasbor
│   │   └── (dasbor)/              SEMUA rute di sini dilindungi oleh layout
│   ├── sitemap.ts, robots.ts      SEO
│   └── not-found.tsx, error.tsx, loading.tsx
├── components/
│   ├── sections/                  bagian halaman
│   ├── navigation/                header + menu seluler
│   ├── footer/
│   ├── motion/                    Lenis, observer, animasi hero
│   ├── admin/                     kerangka dasbor + manajer konten
│   └── ui/
├── data/defaults.ts               konten cadangan & tanda placeholder
├── lib/
│   ├── db.ts                      klien Prisma + readOrFallback
│   ├── content.ts                 SEMUA pembacaan publik
│   ├── auth.ts                    scrypt, token sesi
│   ├── session.ts                 cookie sesi
│   ├── cloudinary.ts              unggah & hapus gambar
│   ├── animations.ts              GSAP: splitLines, reveal, parallax, hero
│   ├── motion.ts                  konstanta durasi, breakpoint, easing
│   └── utils.ts                   slugify, format tanggal, dsb.
├── styles/
│   ├── tokens.css                 warna, font, skala tipe, easing
│   ├── fonts.css                  @font-face (font yang di-host sendiri)
│   └── global.css                 dasar, komponen, reveal, tombol
└── generated/prisma/              hasil `prisma generate` — jangan disunting
```

**Rute grup `(dasbor)`.** Tanda kurung membuat grup rute yang tidak muncul di
URL. Karena `layout.tsx` di dalamnya memanggil `requireSession()`, setiap
halaman di bawahnya terlindungi *secara struktural* — bukan karena tiap halaman
kebetulan ingat memanggil pemeriksaan sesi.

---

## 11. Perintah yang Tersedia

| Perintah | Kegunaan |
| --- | --- |
| `npm run dev` | Server pengembangan |
| `npm run build` | Build produksi |
| `npm run start` | Jalankan hasil build |
| `npm run lint` | ESLint |
| `npm run check` | TypeScript (`tsc --noEmit`) |
| `npm test` | Uji unit (`node:test`) |
| `npm run qa` | check → lint → test → build |
| `npm run db:generate` | Bangkitkan klien Prisma |
| `npm run db:migrate` | Buat + terapkan migrasi |
| `npm run db:push` | Dorong skema tanpa migrasi |
| `npm run db:deploy` | Terapkan migrasi yang ada (produksi) |
| `npm run db:studio` | Buka Prisma Studio |
| `npm run db:seed` | Isi konten awal |
| `npm run db:verify` | Verifikasi jalur basis data ujung ke ujung |

---

## 12. Pemeriksaan Kualitas

`npm run qa` menjalankan keempat gerbang secara berurutan:

```bash
npm run qa    # check && lint && test && build
```

Selain itu tersedia harness QA berbasis browser sungguhan di `outputs/qa.mjs`.
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

1. Periksa ketiga variabel `CLOUDINARY_*` sudah terisi.
2. Pastikan berkas di bawah 8 MB dan formatnya JPEG / PNG / WebP / AVIF.
3. Kalau unggah berhasil tapi gambar tidak tampil, periksa
   `next.config.ts` → `images.remotePatterns` sudah memuat
   `res.cloudinary.com`.

### Perubahan dari admin tidak muncul di situs

Tunggu beberapa detik — `revalidatePath()` berjalan setelah aksi selesai.
Kalau tetap tidak muncul, lakukan *hard refresh*. Perubahan **tidak** butuh
redeploy.

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

- Instrument Serif — © Instrument, SIL OFL 1.1
- Instrument Sans — © Instrument, SIL OFL 1.1
- JetBrains Mono — © JetBrains, SIL OFL 1.1

**Pustaka utama:** Next.js (MIT), React (MIT), Prisma (Apache-2.0),
Tailwind CSS (MIT), GSAP (standard "no charge" license), Lenis (MIT),
Cloudinary SDK (MIT), Supabase JS (MIT).

**Konten sekolah:** hak milik SMK Jayanegara.
