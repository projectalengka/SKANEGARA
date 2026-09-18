-- ============================================================================
-- SMK Jayanegara — referensi skema untuk Supabase
-- ============================================================================
--
-- ## Kapan berkas ini dipakai
--
-- **Biasanya: tidak.** Prisma yang memiliki skema. `npm run db:migrate` dan
-- `npm run db:deploy` membuat dan memutakhirkan tabel secara otomatis, dan
-- itulah jalur yang dipakai sehari-hari. Berkas ini bukan sumber kebenaran —
-- kalau ia berbeda dengan `prisma/schema.prisma`, **schema.prisma yang benar**.
--
-- Yang berkas ini lakukan: menjadi rujukan saat Anda perlu menyiapkan tabel
-- langsung dari SQL Editor Supabase, misalnya untuk memeriksa hasil migrasi,
-- atau saat menyiapkan lingkungan pengujian yang terpisah.
--
-- ## Peringatan penting
--
-- **Jangan menjalankan berkas ini di basis data yang sudah berisi data.** DDL
-- di bawah memakai `CREATE TABLE IF NOT EXISTS` sehingga tidak akan menghapus
-- apa pun, tetapi menjalankannya di basis data yang sudah dimigrasi Prisma
-- dapat membuat Prisma menganggap migrasinya tidak sinkron.
--
-- Untuk memeriksa, ambil daftar tabelnya saja:
--
--     SELECT table_name FROM information_schema.tables
--     WHERE table_schema = 'public' ORDER BY table_name;
--
-- ## Catatan tentang RLS
--
-- Supabase menyalakan Row Level Security secara bawaan pada tabel baru. Aplikasi
-- ini **tidak** memakai klien Supabase untuk membaca data — ia terhubung ke
-- Postgres langsung lewat Prisma memakai peran `postgres`, yang melewati RLS.
--
-- Jadi: RLS tidak perlu dinyalakan, dan menyalakannya tanpa kebijakan justru
-- akan memblokir akses dari klien Supabase (misalnya lewat Table Editor).
-- Yang benar-benar menjaga data adalah otentikasi aplikasi di `/lib/auth.ts`:
-- setiap aksi admin diperiksa sesinya lewat `requireSession()`.
--
-- Kalau nanti ada kebutuhan mengakses tabel langsung dari klien Supabase,
-- **baru** nyalakan RLS dan tulis kebijakannya. Jangan dinyalakan "untuk aman"
-- tanpa kebijakan — itu menghasilkan tabel yang tampak kosong tanpa penjelasan.
--
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. Profil sekolah — selalu satu baris, slug = 'utama'
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "SchoolProfile" (
    id          TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
    slug        TEXT        NOT NULL DEFAULT 'utama',
    "schoolName" TEXT       NOT NULL DEFAULT 'SMK Jayanegara',
    tagline     TEXT        NOT NULL DEFAULT '',
    "heroLines" TEXT[]      NOT NULL DEFAULT '{}',
    description TEXT        NOT NULL DEFAULT '',
    history     TEXT        NOT NULL DEFAULT '',
    vision      TEXT        NOT NULL DEFAULT '',
    mission     TEXT[]      NOT NULL DEFAULT '{}',
    address     TEXT        NOT NULL DEFAULT '',
    city        TEXT        NOT NULL DEFAULT 'Mojokerto',
    province    TEXT        NOT NULL DEFAULT 'Jawa Timur',
    phone       TEXT        NOT NULL DEFAULT '',
    whatsapp    TEXT        NOT NULL DEFAULT '',
    email       TEXT        NOT NULL DEFAULT '',
    instagram   TEXT        NOT NULL DEFAULT '',
    youtube     TEXT        NOT NULL DEFAULT '',
    "mapsUrl"   TEXT        NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolProfile_pkey" PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS "SchoolProfile_slug_key" ON "SchoolProfile" (slug);


-- ---------------------------------------------------------------------------
-- 2. Program keahlian (jurusan)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Program" (
    id                 TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
    name               TEXT        NOT NULL,
    slug               TEXT        NOT NULL,
    "shortDescription" TEXT        NOT NULL DEFAULT '',
    description        TEXT        NOT NULL DEFAULT '',
    image              TEXT        NOT NULL DEFAULT '',
    "imagePublicId"    TEXT        NOT NULL DEFAULT '',
    features           TEXT[]      NOT NULL DEFAULT '{}',
    "order"            INTEGER     NOT NULL DEFAULT 0,
    published          BOOLEAN     NOT NULL DEFAULT true,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Program_pkey" PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS "Program_slug_key" ON "Program" (slug);
-- Matches @@index([published, order]) — the query the public site runs.
CREATE INDEX IF NOT EXISTS "Program_published_order_idx" ON "Program" (published, "order");


-- ---------------------------------------------------------------------------
-- 3. Berita
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "News" (
    id              TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
    title           TEXT        NOT NULL,
    slug            TEXT        NOT NULL,
    category        TEXT        NOT NULL DEFAULT 'Umum',
    excerpt         TEXT        NOT NULL DEFAULT '',
    content         TEXT        NOT NULL DEFAULT '',
    "coverImage"    TEXT        NOT NULL DEFAULT '',
    "coverPublicId" TEXT        NOT NULL DEFAULT '',
    published       BOOLEAN     NOT NULL DEFAULT false,
    "publishedAt"   TIMESTAMP(3),
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "News_pkey" PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS "News_slug_key" ON "News" (slug);
-- Matches @@index([published, publishedAt]) — newest-first listing.
CREATE INDEX IF NOT EXISTS "News_published_publishedAt_idx" ON "News" (published, "publishedAt");


-- ---------------------------------------------------------------------------
-- 4. Galeri
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "GalleryItem" (
    id          TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
    title       TEXT        NOT NULL,
    image       TEXT        NOT NULL,
    "publicId"  TEXT        NOT NULL DEFAULT '',
    category    TEXT        NOT NULL DEFAULT 'Umum',
    description TEXT        NOT NULL DEFAULT '',
    "order"     INTEGER     NOT NULL DEFAULT 0,
    published   BOOLEAN     NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GalleryItem_pkey" PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS "GalleryItem_published_order_idx" ON "GalleryItem" (published, "order");


-- ---------------------------------------------------------------------------
-- 5. Kegiatan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Event" (
    id          TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
    title       TEXT        NOT NULL,
    slug        TEXT        NOT NULL,
    description TEXT        NOT NULL DEFAULT '',
    image       TEXT        NOT NULL DEFAULT '',
    "publicId"  TEXT        NOT NULL DEFAULT '',
    date        TIMESTAMP(3) NOT NULL,
    "endDate"   TIMESTAMP(3),
    location    TEXT        NOT NULL DEFAULT '',
    published   BOOLEAN     NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS "Event_slug_key" ON "Event" (slug);
CREATE INDEX IF NOT EXISTS "Event_published_date_idx" ON "Event" (published, date);


-- ---------------------------------------------------------------------------
-- 6. Karya siswa
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "StudentWork" (
    id            TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
    title         TEXT        NOT NULL,
    "studentName" TEXT        NOT NULL DEFAULT '',
    category      TEXT        NOT NULL DEFAULT 'Desain Komunikasi Visual',
    description   TEXT        NOT NULL DEFAULT '',
    image         TEXT        NOT NULL,
    "publicId"    TEXT        NOT NULL DEFAULT '',
    year          INTEGER,
    "order"       INTEGER     NOT NULL DEFAULT 0,
    published     BOOLEAN     NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentWork_pkey" PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS "StudentWork_published_order_idx" ON "StudentWork" (published, "order");


-- ---------------------------------------------------------------------------
-- 7. Teks bagian halaman (hero, perkenalan, CTA, …)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "SiteSection" (
    id         TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
    key        TEXT        NOT NULL,
    eyebrow    TEXT        NOT NULL DEFAULT '',
    title      TEXT        NOT NULL DEFAULT '',
    body       TEXT        NOT NULL DEFAULT '',
    "ctaLabel" TEXT        NOT NULL DEFAULT '',
    "ctaHref"  TEXT        NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteSection_pkey" PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS "SiteSection_key_key" ON "SiteSection" (key);


-- ============================================================================
-- Pemeriksaan setelah menjalankan
-- ============================================================================
--
--     SELECT
--       (SELECT count(*) FROM "SchoolProfile") AS profil,
--       (SELECT count(*) FROM "Program")       AS program,
--       (SELECT count(*) FROM "News")          AS berita,
--       (SELECT count(*) FROM "GalleryItem")   AS galeri,
--       (SELECT count(*) FROM "Event")         AS kegiatan,
--       (SELECT count(*) FROM "StudentWork")   AS karya,
--       (SELECT count(*) FROM "SiteSection")   AS bagian;
--
-- Setelah `npm run db:seed`, yang diharapkan:
--
--     profil 1 · program 2 · berita 0 · galeri 6 · kegiatan 0 · karya 6 · bagian ~11
--
-- Berita dan kegiatan memang **0**. Itu bukan kegagalan seed — mengarang berita
-- sekolah akan melanggar aturan konten proyek ini. Isilah lewat Dasbor Admin.
--
-- ============================================================================
