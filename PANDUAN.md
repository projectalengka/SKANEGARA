# PANDUAN — Menjalankan & Men-deploy Situs SMK Jayanegara

Catatan ini ditulis untuk dipakai sehari-hari. Semua perintah di dalamnya
**sudah dijalankan dan terbukti bekerja** — bukan contoh yang belum diuji.

Ada dua bagian besar:

- **Bagian A** — menjalankan di komputer sendiri (untuk mengelola konten).
- **Bagian B** — men-deploy ke internet supaya bisa diakses siapa saja.

---

## Ringkasan cepat

Kalau Anda hanya ingin situsnya hidup **sekarang**:

```
1. Klik dua kali:  .pgdata\start-db.cmd     (biarkan jendelanya terbuka)
2. Buka terminal, jalankan:  npm run dev
3. Buka browser:  http://localhost:3000
```

Selesai. Dasbor admin ada di `http://localhost:3000/admin/masuk`.

---

# BAGIAN A — Menjalankan di komputer sendiri

## Yang perlu sudah terpasang

| Kebutuhan | Versi | Status di komputer ini |
| --- | --- | --- |
| Node.js | 22 atau 24 | ✅ v22.22.2 |
| PostgreSQL | 18 | ✅ terpasang |
| Google Chrome | versi apa saja | ✅ dipakai untuk pemeriksaan otomatis |

Sisa kebutuhan (Next.js, Prisma, dan lainnya) sudah terpasang di folder
`node_modules/`. Kalau folder itu terhapus, kembalikan dengan `npm install`.

## Langkah 1 — Nyalakan basis data

**Klik dua kali berkas ini:**

```
.pgdata\start-db.cmd
```

Akan muncul jendela hitam. **Biarkan jendela itu terbuka** selama Anda memakai
situs — jendela itu *adalah* basis datanya. Menutupnya berarti mematikan basis
data.

> Basis data ini milik proyek sendiri, tersimpan di folder `.pgdata/`, berjalan
> di port **54432**. Sengaja dipisah dari PostgreSQL lain yang mungkin ada di
> komputer Anda, supaya data sekolah tidak tercampur.

Kalau muncul peringatan dari Windows Firewall, pilih **Allow** — itu untuk
koneksi lokal saja.

**Cara memastikan basis data sudah siap** (tunggu ±15 detik setelah
menjalankan skrip di atas):

```bash
npm run db:verify
```

Kalau diakhiri dengan `HASIL: jalur basis data sehat.` — basis data siap.

## Langkah 2 — Nyalakan situs

Buka terminal baru (jangan tutup jendela basis data), lalu:

```bash
cd C:\Users\User\Documents\SKAGARA
npm run dev
```

Tunggu sampai muncul tulisan `Ready`. Lalu buka browser:

```
http://localhost:3000
```

## Langkah 3 — Masuk ke Dasbor Admin

Buka:

```
http://localhost:3000/admin/masuk
```

Isi dengan kredensial yang ada di berkas `.env`:

| Kolom | Diambil dari baris `.env` |
| --- | --- |
| Email | `ADMIN_EMAIL` |
| Kata sandi | `ADMIN_PASSWORD` |

Buka berkas `.env` dengan Notepad untuk melihatnya. Kalau berhasil, Anda akan
diarahkan ke halaman **Dasbor** dengan tulisan **BASIS DATA AKTIF** di kiri bawah.

## Mengakses dari HP atau komputer lain

**Perhatikan:** `npm run dev` dan `npm start` sengaja hanya bisa dibuka dari
komputer sendiri. Untuk membuka dari HP, jalankan versi khusus jaringan:

```bash
npm run dev:jaringan          # mode pengembangan, port 3000
```

Lalu di HP (harus tersambung ke **WiFi yang sama**):

```
http://192.168.1.4:3000
```

Untuk mode produksi, build dulu lalu:

```bash
npm run build
npm start:jaringan
```

### Mencari alamat IP komputer

Alamat `192.168.1.4` di atas bisa berubah kalau Anda pindah jaringan. Untuk
melihat yang berlaku sekarang:

```bash
ipconfig
```

Cari baris **IPv4 Address** pada adapter WiFi Anda. Itulah angka yang dipakai
di HP.

> **Catatan keamanan.** Perintah `:jaringan` membuka situs ke seluruh perangkat
> di jaringan yang sama. Itu memang tujuannya — untuk mengajar atau
> memperlihatkan hasil kerja. Tapi artinya **siapa pun di WiFi itu bisa membuka
> dasbor admin** kalau tahu alamatnya. Karena itu:
>
> - Pakai hanya di jaringan yang Anda percaya (WiFi rumah, WiFi sekolah).
> - **Jangan** pakai di WiFi publik seperti kafe atau bandara.
> - Kalau selesai, matikan dengan Ctrl + C dan kembali pakai `npm run dev`.

Windows mungkin menampilkan peringatan firewall saat pertama kali. Pilih
**Allow** hanya kalau Anda memang sedang di jaringan yang tepercaya.

## Cara mematikan

1. Di jendela tempat `npm run dev` berjalan, tekan **Ctrl + C**.
2. Di jendela basis data, tekan **Ctrl + C**.

Urutannya tidak penting. Mematikan keduanya tidak menghapus data apa pun.

---

# BAGIAN B — Perintah sehari-hari

## Menyalakan & mematikan

| Perintah | Fungsi |
| --- | --- |
| `.pgdata\start-db.cmd` | Nyalakan basis data (klik dua kali) |
| `npm run dev` | Nyalakan situs — **hanya dari komputer sendiri** (port 3000) |
| `npm run dev:jaringan` | Nyalakan situs — bisa dibuka dari HP di WiFi yang sama |
| `npm run build` lalu `npm start` | Mode produksi — lebih cepat, untuk pemakaian sungguhan |
| `npm run build` lalu `npm start:jaringan` | Mode produksi, bisa dibuka dari HP |
| Ctrl + C | Matikan yang sedang berjalan |

> **Beda `dev` dan `start`:** `npm run dev` memantau perubahan berkas dan
> menyegarkan halaman otomatis — enak untuk mengembangkan. `npm start` menyajikan
> versi yang sudah dioptimalkan, tapi **harus dijalankan `npm run build` dulu**
> setiap kali ada perubahan.

## Basis data

| Perintah | Fungsi |
| --- | --- |
| `npm run db:verify` | **Periksa basis data sehat.** Pakai ini kalau ada yang aneh |
| `npm run db:seed` | Isi data awal. Aman dijalankan berulang kali |
| `npm run db:studio` | Buka penjelajah basis data di browser |
| `npm run db:deploy` | Terapkan migrasi yang belum jalan |

## Pemeriksaan mutu

| Perintah | Fungsi |
| --- | --- |
| `npm run check` | Periksa tipe TypeScript |
| `npm run lint` | Periksa gaya penulisan kode |
| `npm test` | Jalankan 100 uji otomatis |
| `npm run qa` | Jalankan keempatnya sekaligus |

Semuanya harus berakhir dengan kode `0`. Kalau ada yang merah, jangan diabaikan.

## Pemeriksaan tampilan di browser asli

Menyalakan situs **lalu** menjalankan (di terminal lain):

```bash
node outputs/qa.mjs --shots     # periksa 12 halaman × 6 ukuran layar
node outputs/probe-hero.mjs     # khusus judul halaman depan
node outputs/probe-auth.mjs     # khusus jalur login admin
```

Hasil tangkapan layar tersimpan di folder `outputs/`.

---

# BAGIAN C — Deploy ke internet

Tujuan: situs bisa dibuka siapa saja lewat alamat sendiri, dan Anda bisa
mengelola konten dari mana saja tanpa menyalakan komputer.

Yang dipakai: **Vercel** (menghost situs) + **Supabase** (basis data).

```
Komputer Anda  ──push──►  GitHub  ──auto──►  Vercel  ──baca/tulis──►  Supabase
  (kode)                 (kode)             (situs)                  (data)
```

## Langkah 1 — Buat basis data di Supabase

1. Daftar/masuk di <https://supabase.com/dashboard>.
2. **New project**. Catat kata sandi basis data yang Anda buat.
3. Tunggu ±2 menit sampai proyek selesai disiapkan.
4. Buka **Project Settings → Database → Connection string**, lalu salin **dua**
   koneksi yang berbeda:

   - **Connection pooling** (port `6543`) → untuk `DATABASE_URL`
     Tambahkan `?pgbouncer=true&connection_limit=1` di belakangnya.
   - **Direct connection** (port `5432`) → untuk `DIRECT_URL`

> **Kenapa dua?** Situs berjalan di server yang membuka koneksi baru setiap
> permintaan — pooler yang mengurus itu. Sebaliknya, perintah migrasi butuh
> koneksi langsung yang tidak bisa dilewatkan pooler.

## Langkah 2 — Buat akun GitHub & unggah kode

```bash
# di folder proyek
git remote add origin https://github.com/NAMA-ANDA/smk-jayanegara.git
git branch -M main
git push -u origin main
```

> Repositori git lokal sudah siap dengan 2 commit. Yang **tidak** ikut terunggah:
> `.env` (kredensial), `.pgdata/` (basis data lokal), dan catatan kerja internal.
> Itu sudah diatur di `.gitignore`.

## Langkah 3 — Deploy di Vercel

1. Masuk <https://vercel.com> dengan akun GitHub Anda.
2. **Add New → Project**, lalu pilih repositori `smk-jayanegara`.
3. **Sebelum menekan Deploy**, buka **Environment Variables** dan isi semua ini
   (berlaku untuk Production, Preview, dan Development):

| Nama | Isi |
| --- | --- |
| `DATABASE_URL` | Koneksi pooling Supabase (port 6543) |
| `DIRECT_URL` | Koneksi langsung Supabase (port 5432) |
| `AUTH_SECRET` | Teks acak, **minimal 32 karakter** |
| `ADMIN_EMAIL` | Email admin Anda |
| `ADMIN_PASSWORD` | Kata sandi admin (boleh teks biasa) |
| `NEXT_PUBLIC_SITE_URL` | `https://alamat-anda.vercel.app` (tanpa `/` di akhir) |

Untuk membuat `AUTH_SECRET` yang acak dan kuat:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

4. Tekan **Deploy** dan tunggu selesai.

## Langkah 4 — Isi basis data produksi

Dari komputer Anda, jalankan **satu kali** — dengan koneksi Supabase:

```bash
npm run db:deploy     # buat semua tabel
npm run db:seed       # isi konten awal
npm run db:verify     # pastikan sehat
```

Cara paling sederhana dan paling kecil risikonya: **salin dulu `.env` Anda**
supaya bisa dikembalikan, lalu ganti isinya ke koneksi Supabase.

```bash
# 1. Simpan konfigurasi lokal supaya bisa dikembalikan
cp .env .env.lokal

# 2. Buka .env, ganti DATABASE_URL dan DIRECT_URL ke koneksi Supabase
#    (pakai Notepad)

# 3. Jalankan ketiga perintah ini
npm run db:deploy
npm run db:seed
npm run db:verify

# 4. Kembalikan konfigurasi lokal
cp .env.lokal .env
```

> **Kenapa tidak sekali jalan lewat terminal?** Karena kata sandi Supabase bisa
> mengandung karakter seperti `@`, `:`, `/`, dan `?` yang akan dipecah oleh
> shell dan menghasilkan koneksi yang salah — atau lebih buruk, perintah yang
> tampak berjalan padahal menyentuh basis data yang keliru. Mengganti isi
> berkas tidak punya masalah itu.

> **Penting:** ketiga perintah ini dijalankan dari komputer Anda, **bukan** dari
> Vercel. Langkah 4 jangan sampai terlewat, supaya `npm run dev` kembali
> menyentuh basis data pengembangan.

## Langkah 5 — Selesai

Buka `https://alamat-anda.vercel.app` — situs sudah online.
Dasbor: `https://alamat-anda.vercel.app/admin/masuk`

> **Perubahan konten dari dasbor langsung tampil** tanpa perlu deploy ulang.
> Yang butuh deploy ulang hanyalah perubahan **kode**.

## Kalau mengubah struktur basis data nanti

Setiap kali `prisma/schema.prisma` diubah:

```bash
npm run db:migrate     # buat berkas migrasi (di komputer sendiri)
git add prisma/migrations && git commit -m "..." && git push
npm run db:deploy      # terapkan ke basis data produksi
```

> **Peringatan:** `npm run db:deploy` bisa "sukses" tanpa melakukan apa pun
> kalau folder `prisma/migrations/` kosong. Ia keluar dengan kode `0` tanpa
> pesan galat. Karena itu folder itu **wajib ikut di-commit** — sudah diatur
> begitu di repositori ini, dan ada uji otomatis yang menjaganya.

---

# BAGIAN D — Mengelola konten

Setelah masuk ke dasbor, menu di kiri berisi:

| Menu | Untuk mengubah |
| --- | --- |
| **Dasbor** | Ringkasan: jumlah konten & daftar yang masih kosong |
| **Profil Sekolah** | Nama, sejarah, visi, alamat, telepon, email, sosial media |
| **Program Keahlian** | Daftar jurusan beserta deskripsinya |
| **Berita** | Tulisan berita sekolah |
| **Galeri** | Foto-foto kegiatan |
| **Karya Siswa** | Hasil karya murid |
| **Kegiatan** | Agenda/acara sekolah |
| **Teks Bagian** | Teks tiap bagian di halaman depan |
| **Pengaturan** | Judul situs, deskripsi, SEO |

## Hal penting soal konten

Situs ini **tidak pernah mengarang informasi tentang sekolah**. Bagian yang
belum diisi akan tampil sebagai:

```
[Deskripsi — isi melalui Dasbor Admin]
```

Halaman **Dasbor** punya kotak **"Perlu Dilengkapi"** yang menunjukkan daftar
apa saja yang masih kosong. Itu panduan kerja Anda — isi satu per satu.

Saat ini yang masih kosong: deskripsi sekolah, sejarah, visi, alamat lengkap,
nomor telepon, dan alamat email. **Berita dan Kegiatan sengaja kosong** karena
saya tidak boleh mengarang berita sekolah — isi kalau memang sudah ada datanya.

## Nama siswa

Data karya siswa sengaja **tanpa nama**. Memublikasikan nama murid tanpa izin
bukan hak kita. Kalau ingin mencantumkan nama, pastikan sudah ada izin.

## Mengganti kata sandi admin

1. Buka berkas `.env` (untuk lokal) atau pengaturan Vercel (untuk produksi).
2. Ganti nilai `ADMIN_PASSWORD`.
3. **Mulai ulang server** (lokal) atau **redeploy** (Vercel) — variabel
   lingkungan hanya dibaca saat aplikasi dinyalakan.

Kata sandi boleh ditulis apa adanya (teks biasa) — sistem yang akan
meng-hash-nya. Kalau ingin lebih aman, bisa juga diisi dalam bentuk hash
`scrypt$...` (lihat README bagian 6).

---

# BAGIAN E — Kalau ada masalah

## Situs tidak bisa dibuka

Periksa jendela tempat `npm run dev` berjalan. Kalau ada tulisan `EADDRINUSE`,
artinya port sedang dipakai program lain. Solusi: tutup program itu, atau
jalankan di port lain:

```bash
npx next dev --port 3001
```

## Halaman tampil tapi login ditolak

1. **Pastikan jendela basis data masih terbuka.** Kalau tertutup, situs tetap
   tampil (memakai cadangan lokal) tapi login tidak bisa.
2. Jalankan `npm run db:verify` — harus berakhir `jalur basis data sehat`.
3. Periksa `ADMIN_EMAIL` dan `ADMIN_PASSWORD` di `.env` persis seperti saat
   login — huruf besar/kecil pada email tidak masalah, spasi di dalamnya iya.

## Muncul "Database belum terhubung"

`DATABASE_URL` di `.env` kosong atau salah. Periksa tanda kutipnya dan
pastikan tidak ada baris yang terpotong.

## Muncul `Connection url is empty` padahal `.env` sudah diisi

Ini pernah terjadi di proyek ini. Prisma 7 **tidak memuat `.env` otomatis**
(Prisma 5 memuatnya, dan panduan lama masih menganggap begitu). Sudah diperbaiki
di tiga berkas, dan ada uji otomatis yang menjaganya. Kalau muncul lagi, berarti
ada berkas baru yang perlu memuat `.env` sendiri:

```ts
import { config as loadEnv } from 'dotenv';
loadEnv({ override: false, quiet: true });
```

## Basis data tidak mau menyala

1. Pastikan tidak ada jendela `start-db.cmd` lain yang masih terbuka.
2. Periksa apakah port 54432 sedang dipakai: `netstat -ano | findstr 54432`
3. Kalau ada proses nyangkut, matikan lewat Task Manager, lalu coba lagi.

## Login ditolak padahal baru saja benar

Biasanya karena **kredensial diubah tapi server belum dimulai ulang**.
Variabel lingkungan hanya dibaca sekali saat aplikasi dinyalakan. Tekan Ctrl + C
lalu jalankan `npm run dev` lagi.

## Deploy berhasil tapi situs error

Buka **Vercel → Project → Logs** dan baca pesan galatnya. Penyebab tersering:
variabel lingkungan belum diisi, atau `npm run db:deploy` belum dijalankan
terhadap basis data Supabase.

---

## Alamat lengkap

### Di komputer sendiri

| Halaman | Alamat |
| --- | --- |
| Beranda | http://localhost:3000 |
| Tentang Kami | http://localhost:3000/tentang |
| Program Keahlian | http://localhost:3000/program-keahlian |
| Kegiatan | http://localhost:3000/kegiatan |
| Karya Siswa | http://localhost:3000/karya |
| Galeri | http://localhost:3000/galeri |
| Berita | http://localhost:3000/berita |
| Kontak | http://localhost:3000/kontak |
| **Dasbor Admin** | http://localhost:3000/admin/masuk |

### Dari HP (WiFi yang sama)

Jalankan `npm run dev:jaringan` lebih dulu, lalu ganti `localhost` dengan
`192.168.1.4` — misalnya `http://192.168.1.4:3000/admin/masuk`.

Cek alamat IP yang berlaku sekarang dengan `ipconfig` (lihat baris
**IPv4 Address**).

### Setelah deploy

Ganti `http://localhost:3000` dengan alamat Vercel Anda.

---

## Berkas yang sebaiknya tidak diutak-atik

| Berkas / folder | Kenapa |
| --- | --- |
| `.env` | Kredensial. **Jangan pernah dibagikan atau di-commit** |
| `.pgdata/` | Basis data lokal. Menghapusnya = kehilangan data lokal |
| `prisma/migrations/` | Riwayat perubahan struktur basis data. **Wajib di-commit** |
| `prisma/schema.prisma` | Sumber kebenaran struktur basis data |

## Kalau ingin dibantu lagi

Buka sesi baru dan sebutkan:

- Apa yang ingin dilakukan
- Pesan galatnya (kalau ada) — salin apa adanya, jangan diringkas
- Perintah apa yang tadi dijalankan

Semakin persis, semakin cepat masalahnya ketemu.
