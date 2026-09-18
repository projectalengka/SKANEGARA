# Font — Asal-Usul dan Lisensi

Semua font di folder ini **di-host sendiri** (self-hosted). Tidak ada permintaan
ke Google Fonts atau CDN mana pun saat halaman dibuka.

Ada dua alasan, dan keduanya praktis:

1. **Privasi pengunjung.** Memuat font dari server pihak ketiga mengirim alamat
   IP setiap pengunjung ke server itu. Untuk situs sekolah yang dibaca murid,
   itu bukan pertukaran yang perlu dilakukan demi kenyamanan.
2. **Kecepatan.** Satu permintaan lebih sedikit, tanpa DNS lookup tambahan, dan
   tanpa risiko CDN lambat. Font ikut ter-cache bersama sisa berkas situs.

---

## Berkas

| Berkas | Rumpun | Berat | Gaya |
| --- | --- | --- | --- |
| `instrument-sans-var.woff2` | Instrument Sans | 400–700 (variabel) | normal |
| `instrument-sans-var-italic.woff2` | Instrument Sans | 400–700 (variabel) | miring |
| `jetbrains-mono-var.woff2` | JetBrains Mono | 400–700 (variabel) | normal |

Semuanya format **WOFF2** dengan `font-display: swap`.

> **Instrument Serif sudah dihapus.** Judul dulu memakai serif; pemilik proyek
> memintanya diganti sans minimalis. Kedua berkas serif (`instrument-serif-400`
> dan versi miringnya, total ~43 KB) ikut dihapus — preload untuk font yang
> tidak dipakai siapa pun tetap memakan satu permintaan di jalur kritis, dan
> berkasnya hanya membebani pengunjung.

---

## Lisensi

Kedua rumpun berlisensi **SIL Open Font License 1.1** — lisensi bebas yang
mengizinkan penggunaan komersial, penyematan, dan pendistribusian ulang.

| Font | Pemegang hak | Lisensi |
| --- | --- | --- |
| Instrument Sans | © Instrument | SIL OFL 1.1 |
| JetBrains Mono | © JetBrains | SIL OFL 1.1 |

Teks lengkap lisensi: <https://openfontlicense.org>

**Yang wajib dipatuhi:** berkas font tidak boleh dijual sendiri, dan versi yang
dimodifikasi tidak boleh memakai Reserved Font Name milik pembuat aslinya.

---

## Kenapa font ini

| Peran | Font | Alasan |
| --- | --- | --- |
| Judul **dan** teks | **Instrument Sans** | Satu rumpun untuk seluruh situs. Sans modern dengan tinggi-x besar, sehingga tetap terbaca di ukuran kecil di ponsel maupun di judul raksasa. Kontras antar keduanya dibangun dari **berat**, bukan dari rumpun kedua. |
| Label / meta | **JetBrains Mono** | Monospace untuk label huruf kapital kecil: nomor bagian, tanggal, penanda kategori. Lebar tetapnya membuat label sejajar rapi di beberapa baris, dan kesan teknisnya memberi kontras terhadap sans. |

### Bagaimana kontras dibangun tanpa serif

Dulu kontras judul datang dari *roman vs miring* pada serif. Dengan satu rumpun,
kontras itu dibangun ulang dari dua hal:

1. **Berat.** Judul `600`, teks `400`. Bagian yang ditekankan di dalam judul
   turun ke `400` terhadap judulnya — tetap terbaca sebagai penekanan, tanpa
   bergantung pada miring.
2. **Tracking.** Judul memakai `letter-spacing: -0.035em` (lebih rapat daripada
   serif). Tanpa serif, huruf berdiri lebih berjarak, dan judul besar jadi
   terasa longgar kalau tidak dirapatkan.

Mono tetap dipertahankan dan bukan sisa yang terlupa — ia alat ukur untuk label
berlebar tetap, bukan hiasan.

---

## Yang **tidak** dipakai, dan kenapa

Ini bagian yang paling perlu diketahui sebelum menambahkan font baru.

**Mauren** — font display yang beredar bebas untuk penggunaan **non-profit**.
Situs sekolah negeri mungkin tampak seperti kasus yang aman, tetapi "non-profit"
dalam lisensinya tidak otomatis mencakup situs yang dibiayai anggaran sekolah,
dan batasannya tidak jelas. Ketidakjelasan itu sendiri sudah cukup alasan untuk
tidak memakainya. **Jangan tambahkan tanpa membaca lisensinya lebih dulu.**

**Fracktif** — zip yang beredar umum adalah **build demo** Fontspring: hanya
memuat sekitar 96 glif dan tidak punya tanda hubung/en dash yang benar. Memasang
build demo di situs produksi adalah pelanggaran lisensi, dan teksnya akan rusak
begitu ada tanda baca di luar himpunan glif itu. **Build penuh berbayar; jangan
pakai versi demo.**

---

## Cara menambahkan font baru

1. **Periksa lisensinya lebih dulu.** Kalau tidak jelas boleh dipakai komersial,
   jangan pasang. Aturan ini tidak bisa ditawar untuk situs sekolah.
2. Letakkan berkas `.woff2` di folder ini.
3. Daftarkan di `src/styles/fonts.css` dengan `@font-face` dan `font-display: swap`.
4. Tambahkan variabelnya di blok `@theme` pada `src/styles/tokens.css`.
5. Perbarui tabel di README ini.
6. **Verifikasi font benar-benar termuat**, bukan hanya terdaftar:

   ```bash
   node outputs/qa.mjs
   ```

   Harness QA memanggil `document.fonts.check()`. Ini penting: memeriksa
   `getComputedStyle().fontFamily` **tidak membuktikan apa pun** — properti itu
   melaporkan nama font yang diminta meski browser sebenarnya menggambar font
   cadangan karena berkasnya gagal dimuat. Satu-satunya bukti yang sah adalah
   `document.fonts.check()` atau mengukur lebar teks.

---

## Catatan teknis

- **Subsetting.** Font sengaja **tidak** di-subset. Subsetting memotong glif
  yang tidak dipakai untuk menghemat ukuran berkas, tetapi teks di halaman
  admin ditulis manusia — dan memotong glif berarti suatu hari ada nama atau
  kata yang tiba-tiba tampil sebagai kotak kosong. Berkasnya sudah WOFF2 dan
  masing-masing di bawah 40 KB, jadi penghematannya tidak sebanding dengan
  risikonya.
- **Preload.** Hanya satu font di-`preload` di `src/app/layout.tsx`:
  `instrument-sans-var`, karena ia dipakai judul **dan** navigasi — keduanya
  di atas lipatan. Mono menunggu; ia muncul di bawah lipatan. Atribut
  `crossOrigin="anonymous"` wajib: tanpanya permintaan preload dianggap berbeda
  dari permintaan CSS dan berkasnya terunduh dua kali.
- **Cache.** `next.config.ts` memasang header `immutable` untuk `/fonts/(.*)`,
  sehingga font hanya diunduh sekali per pengunjung.
