import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

/**
 * Prisma 7 CLI configuration.
 *
 * ## Kenapa `.env` dimuat manual
 *
 * Prisma 5 memuat `.env` sendiri; **Prisma 7 tidak lagi**. Tanpa baris
 * `loadEnv()` di bawah, `prisma migrate deploy` gagal dengan
 * `Error: Connection url is empty` walaupun `.env` sudah diisi dengan benar —
 * pesan itu menyesatkan, karena masalahnya bukan URL-nya kosong, melainkan
 * berkasnya tidak pernah dibaca.
 *
 * `override: false` disengaja: variabel lingkungan yang sudah ada di shell
 * (mis. di CI, atau `DATABASE_URL=... npm run db:verify`) harus menang atas
 * isi `.env`. Kalau dibalik, nilai dari berkas akan menimpa kredensial yang
 * sengaja diberikan untuk satu perintah saja — dan hasilnya adalah perintah
 * yang tampak berjalan padahal menyentuh basis data yang salah.
 *
 * `quiet: true` menahan dotenv mencetak tip pemasangan di setiap perintah.
 *
 * ## Kenapa URL ada di sini, bukan di schema.prisma
 *
 * Itu kontrak Prisma 7. `DIRECT_URL` diutamakan karena CLI mengeluarkan DDL
 * dan advisory lock — hal-hal yang tidak dibawa transaction pooler. Ia jatuh
 * ke `DATABASE_URL` supaya satu URL saja (Postgres lokal, atau Neon tanpa
 * pgbouncer) tetap bekerja tanpa variabel kedua.
 *
 * Dibaca dengan `process.env`, bukan helper `env()`: `env()` melempar saat
 * variabel kosong, sehingga `prisma generate` — operasi lokal yang sepenuhnya
 * offline — akan gagal di mesin yang belum diberi kredensial. Generate tidak
 * boleh butuh basis data.
 */
loadEnv({ override: false, quiet: true });

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || '',
  },
});
