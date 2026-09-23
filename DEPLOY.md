# DEPLOY.md — Dari laptop ke internet

Panduan kerja untuk menaikkan situs ini ke GitHub, Supabase, dan Vercel.
Beda dengan `README.md` (rujukan teknis) dan `PANDUAN.md` (panduan harian),
berkas ini adalah **daftar centang**: satu langkah, satu perintah, satu bukti.

```
laptop  ──push──►  GitHub  ──auto──►  Vercel  ──query──►  Supabase
(kode)             (kode)             (situs)             (basis data)
                                          └──upload──►  Cloudinary
```

**Yang perlu disiapkan:** akun GitHub, akun Supabase, akun Vercel
(semua gratis), dan opsional akun Cloudinary. Tidak ada yang perlu dipasang
di komputer selain Node.js 22 — sudah ada.

---

## Keadaan proyek saat panduan ini ditulis

Diperiksa 23 September 2026, bukan dikira-kira:

| Hal | Keadaan | Artinya |
| --- | --- | --- |
| Repositori git | Ada, 3 commit, cabang `master` | Belum ada `remote`, belum pernah di-push |
| Perubahan belum di-commit | **±173 berkas** | Harus di-commit dulu — lihat Bagian 1 |
| `npm run check` | ✅ lulus | — |
| `npm run lint` | ✅ lulus | — |
| `npm test` | ✅ 135/135 lulus | — |
| `npm run build` | ✅ selesai penuh | Sampai "Collecting build traces" + tabel rute |
| `npm run verify:build` | ✅ 4/4 lulus | Penjaga `/admin` ada di tempatnya |
| `prisma/migrations/` | Ada (`20260918000000_init`) | `db:deploy` akan benar-benar bekerja |
| Klien Prisma | Ter-commit (15 berkas di `src/generated/prisma`) | Vercel tidak perlu menjalankan `prisma generate` |
| Rahasia di riwayat git | Tidak ada | Hanya contoh di dokumentasi |
| `.env` | Masih menunjuk basis data **lokal** | Kredensial Supabase belum ada |
| Cloudinary | Belum diisi | Unggah gambar belum bisa — lihat Bagian 7 |

Jadi yang belum ada bukan kode, melainkan **akun dan kredensial**. Lima bagian
berikut mengisinya satu per satu.

---

## Bagian 0 — Pastikan tidak ada rahasia yang ikut

Jalankan dari folder proyek. Dua perintah ini harus **tidak** menemukan apa pun
selain contoh di dokumentasi:

```bash
git check-ignore -v .env .env.lokal .pgdata/PG_VERSION .workbuddy-ai/memory
git grep -inE 'AUTH_SECRET=|ADMIN_PASSWORD=|CLOUDINARY_API_SECRET=' HEAD -- ':!.env.example'
```

Perintah pertama harus menyebut aturan `.gitignore` yang cocok untuk keempatnya.
Perintah kedua hanya boleh menemukan baris contoh di `README.md`/`PANDUAN.md`.

- [ ] Keduanya bersih

> **Kenapa langkah ini tidak boleh dilewati.** `.gitignore` yang salah tulis
> **tidak memunculkan galat apa pun** — ia hanya diam-diam tidak melindungi.
> Dan begitu kredensial ter-push, mengganti isi berkasnya tidak cukup: nilainya
> tetap ada di riwayat git.

---

## Bagian 1 — Commit seluruh pekerjaan

```bash
git status --short | wc -l      # sekitar 173 — angka pasti tidak penting, yang penting tidak ada yang tertinggal
git add -A
git status --short | head -20   # tinjau sekali lagi sebelum dikunci
git commit -m "Lengkapi situs: art direction, animasi reveal, dan gerbang mutu"
```

- [ ] Sudah di-commit

> **Tiga berkas ini wajib ikut.** `src/data/sample.ts`, `src/lib/scroll-lock.ts`,
> dan `scripts/verify-build.ts` saat ini **belum dilacak git**. Padahal
> `src/lib/content.ts` mengimpor `@/data/sample`, dan `SiteHeader.tsx` serta
> `GalleryGrid.tsx` mengimpor `@/lib/scroll-lock`. Kalau ketiganya tertinggal,
> build di Vercel gagal dengan `Module not found` — padahal di laptop Anda
> semuanya tampak normal, karena berkasnya ada di disk.
>
> `git add -A` sudah menangkapnya. Yang perlu Anda pastikan adalah **tidak**
> memakai `git add` satu per satu.

> **Tangkapan layar QA tidak ikut.** 177 berkas PNG di `outputs/` (±20 MB) sudah
> dikecualikan lewat `.gitignore` — tidak satu pun dipakai saat membangun situs.
> Skrip probe `.mjs`/`.cjs` tetap ikut, karena beberapa dirujuk oleh `README.md`.

---

## Bagian 2 — Buat repositori GitHub dan push

### 2a. Buat repositori kosong

Buka <https://github.com/new>:

- **Repository name:** `smk-jayanegara`
- **Visibility:** pilih **Private** dulu. Publik bisa kapan saja setelah Anda
  yakin tidak ada kredensial yang ikut.
- **Jangan** centang *Add a README file*, *Add .gitignore*, atau *Choose a
  license* — repositori lokal Anda sudah punya semuanya, dan menambahkannya di
  sini akan membuat `git push` pertama ditolak.

### 2b. Sambungkan dan push

```bash
git remote add origin https://github.com/<AKUN-ANDA>/smk-jayanegara.git
git branch -M main
git push -u origin main
```

- [ ] Kode sudah terlihat di GitHub

> **Kalau muncul jendela browser untuk masuk:** itu Git Credential Manager,
> ikuti saja — cara termudah. Kalau yang muncul malah permintaan
> *username* dan *password* di terminal, GitHub **tidak** menerima kata sandi
> akun untuk operasi git. Buat **Personal Access Token** (Settings → Developer
> settings → Personal access tokens → *Tokens (classic)*, centang cakupan
> `repo`), lalu tempel token itu sebagai kata sandi.
>
> Cabang diubah `master` → `main` karena itu yang diharapkan Vercel dan GitHub
> sekarang. Nama lama tetap ada sebagai cadangan.

---

## Bagian 3 — Buat basis data Supabase

1. Masuk <https://supabase.com/dashboard> → **New project**.
2. Isi nama proyek, dan **catat kata sandi basis datanya** — hanya ditampilkan
   sekali di layar ini.
3. **Region:** pilih yang terdekat, `Southeast Asia (Singapore)`.
4. Tunggu ±2 menit sampai proyek selesai disiapkan.
5. Buka **Project Settings → Database → Connection string**, lalu salin **dua**
   koneksi yang berbeda:

| Yang disalin | Untuk | Bentuk |
| --- | --- | --- |
| **Connection pooling** (port `6543`) | `DATABASE_URL` | tambahkan `?pgbouncer=true&connection_limit=1` di belakangnya |
| **Direct connection** (port `5432`) | `DIRECT_URL` | apa adanya |

Hasil akhirnya kira-kira begini — `<...>` diganti nilai sungguhan:

```
DATABASE_URL="postgresql://postgres.abcd:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.abcd:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
```

- [ ] Dua URL sudah dicatat

> **Kenapa harus dua.** Situs berjalan di server yang membuka koneksi baru tiap
> permintaan — pooler (6543) yang mengurus itu, dan itu bukan optimasi
> melainkan yang menjaga jumlah koneksi tetap waras. Sebaliknya, `prisma migrate`
> butuh sesi sungguhan yang tidak bisa dilewatkan pooler, karena itu 5432.
> Kalau `DIRECT_URL` keliru menunjuk ke 6543, migrasi akan menggantung.

> **Jangan pakai `supabase/schema.sql` untuk membuat tabel.** Berkas itu ada
> sebagai rujukan yang bisa Anda tempel ke SQL Editor untuk *membandingkan*,
> dan ada uji otomatis yang menjaga isinya setia pada `prisma/schema.prisma`.
> Jalan yang benar adalah migrasi — Bagian 4.

---

## Bagian 4 — Isi basis data produksi

Dijalankan **dari laptop Anda**, bukan dari Vercel. Sekali saja.

```bash
# 1. Simpan konfigurasi lokal supaya bisa dikembalikan
cp .env .env.lokal

# 2. Buka .env dengan Notepad, ganti DATABASE_URL dan DIRECT_URL ke koneksi Supabase
notepad .env

# 3. Buat tabel, isi konten awal, lalu buktikan
npm run db:deploy
npm run db:seed
npm run db:verify

# 4. Kembalikan konfigurasi lokal
cp .env.lokal .env
```

- [ ] Ketiga perintah selesai tanpa galat
- [ ] `.env` sudah dikembalikan (buka `notepad .env`, pastikan menunjuk `54432` lagi)

> **Kenapa mengedit berkas, bukan sekali jalan di terminal.** Kata sandi
> Supabase bisa mengandung `@`, `:`, `/`, atau `?` yang akan dipecah oleh shell
> dan menghasilkan koneksi yang salah — atau lebih buruk, perintah yang tampak
> berjalan padahal menyentuh basis data yang keliru.

> **Peringatan yang mahal kalau diabaikan.** `npm run db:deploy` bisa keluar
> dengan kode `0` **tanpa melakukan apa pun** kalau folder `prisma/migrations/`
> kosong. Tidak ada pesan galat. Gejalanya baru muncul setelah situs ter-deploy:
> setiap query gagal karena tabelnya tidak pernah dibuat. Di proyek ini folder
> migrasinya ada dan ada uji yang menjaganya — pastikan ia ikut ter-commit:

```bash
ls prisma/migrations/     # harus ada folder berversi + migration_lock.toml
```

> **`.env.lokal` aman.** Pola `.env.*` di `.gitignore` menutupnya, dan
> `tests/verify-db.test.ts` mengunci pola itu.

---

## Bagian 5 — Deploy di Vercel

1. Masuk <https://vercel.com> dengan akun GitHub Anda.
2. **Add New → Project**, lalu **Import** repositori `smk-jayanegara`.
3. Biarkan **Framework Preset** (Next.js), **Build Command**, dan **Output
   Directory** apa adanya — semuanya terdeteksi otomatis.
4. Buka **Settings → General → Node.js Version**, pilih **22.x**. Proyek ini
   mensyaratkan `>=22 <25` di `package.json`, dan versi yang salah adalah
   penyebab build gagal yang membingungkan.
5. Buka **Environment Variables** dan isi tabel di bawah. Centang
   **Production**, **Preview**, dan **Development** sekaligus untuk setiap baris.

| Nama | Isi | Perlu? |
| --- | --- | --- |
| `DATABASE_URL` | Connection pooling Supabase (6543) + `?pgbouncer=true&connection_limit=1` | **wajib** |
| `DIRECT_URL` | Direct connection Supabase (5432) | **wajib** |
| `AUTH_SECRET` | Teks acak **baru**, minimal 32 karakter | **wajib** |
| `ADMIN_EMAIL` | Email admin Anda | **wajib** |
| `ADMIN_PASSWORD` | Kata sandi admin (teks biasa atau `scrypt$…`) | **wajib** |
| `NEXT_PUBLIC_SITE_URL` | `https://<nama-proyek>.vercel.app` — **tanpa** `/` di akhir | **wajib** |
| `CLOUDINARY_CLOUD_NAME` | Dari Cloudinary | untuk unggah gambar |
| `CLOUDINARY_API_KEY` | Dari Cloudinary | untuk unggah gambar |
| `CLOUDINARY_API_SECRET` | Dari Cloudinary | untuk unggah gambar |
| `SAMPLE_DATA` | Kosongkan untuk situs sebenarnya | opsional |
| `NEXT_PUBLIC_SUPABASE_URL` | — | **tidak perlu** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | — | **tidak perlu** |

Membuat `AUTH_SECRET` yang baru:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

6. Tekan **Deploy**.

- [ ] Deploy selesai tanpa galat

> **Pakai `AUTH_SECRET` yang BARU, jangan menyalin dari `.env` lokal.** Kalau
> nilai pengembangan bocor, siapa pun yang memegangnya bisa menempa cookie sesi
> admin di produksi. Menggantinya juga langsung membatalkan semua sesi yang
> sedang berjalan — itu memang perilaku yang diinginkan.

> **Dua variabel Supabase itu sengaja tidak dipakai.** Paket `@supabase/ssr`
> dan `supabase-js` memang terpasang, tetapi tidak satu berkas pun di `src/`
> membacanya — sudah diperiksa dengan `grep`. Di sini Supabase berperan
> **hanya sebagai PostgreSQL**, bukan sebagai penyimpanan berkas atau
> penyedia login. Autentikasi admin ditangani `src/lib/auth.ts` sendiri.
> Isi keduanya nanti kalau Anda memang menambah Supabase Storage/Auth.

> **`SAMPLE_DATA=on` di produksi berarti pengunjung melihat data bertanda
> `[CONTOH]`.** Aman untuk memperlihatkan tata letak kepada pihak sekolah, tapi
> jangan dinyalakan saat situs diumumkan. Kosongkan atau isi `off`.

> **Setiap perubahan variabel lingkungan butuh redeploy.** Vercel tidak
> menerapkannya ke deployment yang sudah jadi. Ini penyebab paling umum dari
> "sudah saya isi kok masih tidak jalan".

---

## Bagian 6 — Verifikasi setelah deploy

Jangan lewati bagian ini. Deploy yang hijau belum membuktikan apa pun tentang
penjaga rute admin.

**1. Situs terbuka.** Buka `https://<nama-proyek>.vercel.app` — halaman depan
tampil lengkap.

**2. Penjaga admin benar-benar bekerja.** Buka jendela **privat** (tanpa sesi),
lalu akses `/admin/dasbor`. Yang benar adalah **dialihkan ke `/admin/masuk`**.
Kalau halaman dasbor terbuka begitu saja, penjaga rutenya tidak jalan — dan itu
gejala khas build yang terputus, bukan kesalahan konfigurasi. Ulangi deploy.

```bash
curl -sI https://<nama-proyek>.vercel.app/admin/dasbor | head -3
# harus memuat: 307  dan  location: /admin/masuk
```

- [ ] `/admin/dasbor` membalas `307`, bukan `200`

**3. Login berhasil.** Buka `/admin/masuk`, masuk dengan `ADMIN_EMAIL` dan
`ADMIN_PASSWORD`. Kalau ditolak padahal yakin benar, lihat Bagian 8.

**4. Konten dari basis data yang muncul.** Buka `/program-keahlian`. Kalau
isinya masih placeholder padahal `db:seed` sudah dijalankan, `DATABASE_URL`
kemungkinan salah — tapi perhatikan bahwa **situs tetap tampil**, karena
lapisan cadangan bekerja. Itu disengaja.

**5. SEO memakai domain yang benar.** Buka `/sitemap.xml` dan `/robots.txt` —
alamatnya harus domain Vercel Anda, bukan `localhost`.

- [ ] Kelima poin di atas sudah diperiksa

> **Yang berubah tanpa redeploy:** konten yang Anda edit di dasbor. Perubahan
> kode butuh `git push`; Vercel men-deploy ulang sendiri setiap ada push ke `main`.

---

## Bagian 7 — Cloudinary, supaya unggah gambar hidup

Tanpa ini, dasbor tetap bisa dipakai untuk mengedit teks, tetapi **unggah
gambar akan gagal**. Situs tetap tampil rapi memakai gambar SVG bawaan di
`public/images/`, jadi ini bukan penghalang untuk deploy pertama.

1. Buat akun di <https://cloudinary.com>.
2. Buka **Dashboard → Product Environment Credentials**.
3. Salin **Cloud name**, **API Key**, dan **API Secret**.
4. Tambahkan ketiganya sebagai variabel lingkungan di Vercel, lalu **redeploy**.

- [ ] Ketiga variabel sudah diisi dan di-redeploy
- [ ] Sudah dicoba mengunggah satu gambar dari dasbor produksi

> Unggahan dikirim dari server ke Cloudinary lewat `upload_stream`, jadi tidak
> ada berkas yang ditulis ke disk. Ini bukan sekadar kerapian: filesystem Vercel
> bersifat sementara, sehingga gambar yang ditulis ke disk akan hilang begitu
> fungsi selesai berjalan.
>
> Batas unggah: **8 MB** per berkas, format JPEG / PNG / WebP / AVIF.

---

## Bagian 8 — Kalau ada masalah

### Build di Vercel gagal: `Module not found: @/data/sample`

`src/data/sample.ts` (atau `src/lib/scroll-lock.ts`) tidak ikut ter-commit.
Jalankan `git status`, pastikan tidak ada berkas sumber yang tertinggal, commit,
lalu push.

### Build di Vercel gagal: `Module not found: @/generated/prisma`

Klien Prisma tidak ikut ter-commit. Di proyek ini ia **sudah** ikut (15 berkas
di `src/generated/prisma`), jadi ini hanya terjadi kalau `src/generated/`
terhapus dari repo. Perbaikannya:

```bash
npm run db:generate
git add src/generated && git commit -m "Bangkitkan ulang klien Prisma" && git push
```

### Build gagal karena versi Node

`package.json` mensyaratkan `>=22 <25`. Setel **Settings → General → Node.js
Version** ke 22.x, lalu redeploy.

### Situs terbuka tapi seluruh isinya masih placeholder

`DATABASE_URL` kosong, salah, atau tabelnya belum dibuat. Urutan pemeriksaan:

1. Jalankan `npm run db:verify` **dari laptop** dengan `.env` menunjuk Supabase.
2. Pastikan Bagian 4 (`db:deploy` → `db:seed`) benar-benar sudah dijalankan.
3. Pastikan tidak ada spasi atau tanda kutip yang salah di nilai variabel.

Situs tetap tampil dalam keadaan ini — itu memang rancangannya. Situs sekolah
yang mendadak kosong lebih buruk daripada situs yang menampilkan konten
sedikit lama.

### Login ditolak padahal kredensial benar

1. Pastikan variabel sudah di-**redeploy**, bukan sekadar disimpan.
2. Cek log fungsi di Vercel: cari `[auth] ADMIN_EMAIL / ADMIN_PASSWORD belum diatur`.
   Kalau muncul, proses server tidak melihat variabelnya.
3. Kalau tidak ada catatan apa pun, emailnya tidak cocok. Pencocokan mengabaikan
   besar-kecil huruf, **tidak** mengabaikan spasi di ujung nilai.
4. Lupa kata sandi: ganti `ADMIN_PASSWORD` di Vercel → redeploy → masuk.

### `Terlalu banyak koneksi` dari Supabase

Pastikan `DATABASE_URL` memakai port **6543** dan berakhiran
`?pgbouncer=true&connection_limit=1`. Kolam koneksi aplikasi sudah dibatasi
`max: 5` di `src/lib/db.ts`.

### `prisma migrate` menggantung

`DIRECT_URL` menunjuk ke port pooler. Ganti ke **5432**.

### Halaman admin menampilkan galat penyimpanan, situs publik baik-baik saja

Kemungkinan besar proyek Supabase Anda **ter-pause**. Supabase menjeda proyek
paket gratis yang aktivitasnya rendah selama 7 hari. Situs publik tetap tampil
lewat konten cadangan, tetapi dasbor tidak bisa menyimpan. Pulihkan proyek dari
dasbor Supabase, tunggu beberapa menit, lalu muat ulang.

Kalau situs ini akan jarang dibuka (misalnya libur panjang), pertimbangkan
menaikkan paket Supabase atau membuka dasbor sesekali.

### Halaman menampilkan perubahan lama

Konten dari dasbor tampil lewat `revalidatePath()`/`revalidateTag()` — tunggu
beberapa detik, lalu lakukan *hard refresh*. Perubahan **tidak** butuh redeploy.

### Unggah gambar gagal

Ketiga variabel `CLOUDINARY_*` belum diisi, atau berkas melebihi 8 MB, atau
formatnya di luar JPEG / PNG / WebP / AVIF. Lihat Bagian 7.

---

## Setelah situs hidup

### Mengubah struktur basis data nanti

```bash
npm run db:migrate      # buat berkas migrasi (di laptop)
git add prisma/migrations && git commit -m "Migrasi: ..." && git push
npm run db:deploy       # terapkan ke basis data produksi
```

Tinjau dulu SQL-nya, terutama kalau ada `DROP` atau `ALTER COLUMN`. Kalau
`prisma/schema.prisma` berubah, jangan lupa `npm run db:generate` dan commit
`src/generated/prisma` — Vercel tidak menjalankannya sendiri.

### Domain sekolah sendiri

**Vercel → Settings → Domains → Add**, lalu ikuti petunjuk DNS-nya. Setelah
domain aktif, ubah `NEXT_PUBLIC_SITE_URL` ke domain itu dan **redeploy** —
nilainya dipakai untuk URL kanonik, `sitemap.xml`, dan tag Open Graph.

### Pemeriksaan mutu sebelum setiap push besar

```bash
npm run qa
```

Lima gerbang berurutan: `check` → `lint` → `test` → `build` → `verify:build`.
Jangan menganggap pekerjaan selesai kalau ada yang merah — dan jangan menganggap
build sudah selesai hanya karena exit code-nya `0`. Lihat `README.md` bagian 12
untuk alasannya; ringkasnya, Next menamai ulang berkas penjaga rute sebagai
langkah paling akhir build, dan build yang terputus sedikit saja menghasilkan
situs yang tampak sehat tetapi penjaga `/admin`-nya mati diam-diam.

---

## Daftar centang ringkas

- [ ] **0** Tidak ada rahasia yang ikut ter-commit
- [ ] **1** ±173 berkas di-commit, termasuk `src/data/sample.ts` dan `src/lib/scroll-lock.ts`
- [ ] **2** Repositori GitHub dibuat, `git push -u origin main` berhasil
- [ ] **3** Proyek Supabase dibuat, dua URL (6543 + 5432) tercatat
- [ ] **4** `db:deploy` → `db:seed` → `db:verify` sukses, `.env` dikembalikan ke lokal
- [ ] **5** Vercel: Node 22.x, 6 variabel wajib terisi untuk tiga environment
- [ ] **6** `/admin/dasbor` membalas `307`, login berhasil, sitemap benar
- [ ] **7** Cloudinary terpasang dan unggah gambar diuji
