/**
 * Contoh data — content the site can be built against while the school's real
 * copy is still being written.
 *
 * ## Why this file exists, and how it stays honest
 *
 * The project's hardest rule is: **never invent facts about SMK Jayanegara.**
 * Verified news, real events, real student names — none of that may be made up,
 * because a visitor cannot tell an invented achievement from a real one.
 *
 * But a site with an empty newsroom, an empty agenda and empty works pages is a
 * site whose layouts have never been seen. Reviewing design against blank space
 * is impossible. Both needs are real, so the compromise is this file:
 *
 *   - Every title carries the literal prefix `[CONTOH]`. It is not decoration;
 *     it is the mechanism. A reader cannot mistake "`[CONTOH]` Kegiatan MPLS"
 *     for a factual claim, and a grep for `CONTOH` finds every single row.
 *   - The file is **on by default**, because a site whose layouts have never
 *     been seen cannot be reviewed, and because the switch used to live in an
 *     environment variable that only whoever holds the hosting account can set.
 *     Measured on 24 September 2026: the owner's own `.env` said `on` while the
 *     deployed site still served 74 empty placeholders, because Vercel's copy of
 *     the variable had never been created. The switch was in the wrong place for
 *     the person who needed to flip it.
 *   - Deleting it is one file and one call site. There is no database row, no
 *     migration, no cache to purge.
 *
 * ## Turning it off
 *
 *   SAMPLE_DATA=off       # in .env, then restart
 *
 * Anything else — `on`, `true`, `1`, or no value at all — means on. And nothing
 * here ever overrides the owner's own writing: see `sampleEnabled()` for why
 * "on" is a safe default.
 *
 * The moment the owner publishes real content through the dashboard, the
 * database rows win over these — `prefer()` in `lib/content.ts` lets the
 * database overlay every field. So sample data never fights real data; it only
 * fills the space *until* there is real data.
 */

import type {
  EventContent,
  GalleryContent,
  NewsContent,
  WorkContent,
} from './defaults';

/** The one string that makes sample content recognisable at a glance. */
export const SAMPLE_MARK = '[CONTOH]';

/** Prefixes a title with the sample mark, unless it already carries one. */
function marked(title: string): string {
  return title.startsWith(SAMPLE_MARK) ? title : `${SAMPLE_MARK} ${title}`;
}

/** Values that switch the sample dataset on explicitly. */
const SAMPLE_ON = ['on', 'true', '1'] as const;

/** Values that switch it off. **This is the only way to reach the empty state.** */
const SAMPLE_OFF = ['off', 'false', '0'] as const;

/** The mode the site will actually run in, once the raw value has been read. */
export type SampleMode = 'on' | 'off';

export type SampleSwitchReading = {
  /** The `SAMPLE_DATA` value this process saw, verbatim. `undefined` when unset. */
  raw: string | undefined;
  /** What the site will do. */
  mode: SampleMode;
  /** False only for a value this file does not understand (a typo). */
  recognised: boolean;
};

/**
 * Read the switch together with *why* it holds its value.
 *
 * Split out from `sampleEnabled()` because the interesting failure here is not
 * "off" — it is "I set it to on and the site stayed empty". That happened for
 * real during the audit: a long-running `next start` process had been started
 * before the variable existed, so it kept serving the old render while `.env`
 * said `on`. Nothing in the UI could have told the owner that, because "off"
 * and "on but not in this process" look identical from a page.
 *
 * So the raw value is reported verbatim, alongside the mode actually used, so
 * the dashboard can name what it saw.
 */
export function sampleSwitch(): SampleSwitchReading {
  const raw = process.env.SAMPLE_DATA;
  const value = raw?.trim() ?? '';

  // Unset — and blank, which is what `.env.example` ships — means the default.
  if (value === '') return { raw, mode: 'on', recognised: true };

  if (SAMPLE_ON.some((token) => token === value)) return { raw, mode: 'on', recognised: true };
  if (SAMPLE_OFF.some((token) => token === value)) return { raw, mode: 'off', recognised: true };

  // A typo (`On`, a stray quote, a trailing space). Fall back to the default
  // rather than guessing — but say so, because a silent fallback is precisely
  // what made the original bug take an afternoon to find.
  return { raw, mode: 'on', recognised: false };
}

/**
 * Whether the sample dataset should be served.
 *
 * Read at call time rather than module load, because Next.js evaluates modules
 * once and a build-time constant would be baked into the bundle — the switch
 * would then need a rebuild to flip, which defeats the point of a toggle.
 *
 * ## Why the default is **on**
 *
 * It used to be off, on the reasoning that a deploy nobody configured should
 * show the honest empty state. That reasoning was sound and is still what the
 * `SAMPLE_DATA=off` escape hatch is for — but it made the default depend on an
 * environment variable, and an environment variable is something only whoever
 * holds the hosting account can set. Measured on 24 September 2026: the owner's
 * own `.env` said `on` while the deployed site served 74 empty placeholders,
 * because Vercel's copy of the variable had never been created. The switch was
 * in the wrong place for the person who needed to flip it.
 *
 * Defaulting to on costs nothing that matters, because sample content never
 * wins against real content: `sampleInsteadOf` only replaces collections still
 * holding seed rows, and `withSampleProfile` / `withSampleSections` only fill
 * fields still holding `placeholder()`. The moment the owner writes a real
 * vision, history, article or caption, the `[CONTOH]` text disappears from that
 * slot by itself. So "on" means "fill whatever is still empty", which is the
 * honest reading of an unfinished site.
 */
export function sampleEnabled(): boolean {
  return sampleSwitch().mode === 'on';
}

// ---------------------------------------------------------------------------
// Profile copy the sample content needs in order to read coherently
// ---------------------------------------------------------------------------

/**
 * Section copy, filled in for the sample mode.
 *
 * Only the `body` fields differ from `defaultSections` — the titles, eyebrows
 * and CTAs there are final interface copy and are reused verbatim. Keeping the
 * override minimal means the sample mode cannot quietly diverge from the real
 * design in ways the owner would not expect.
 */
export const sampleSectionBodies: Record<string, string> = {
  introduction:
    `${SAMPLE_MARK} Paragraf ini hanya penanda tempat. Ia menunjukkan seberapa panjang ` +
    'teks perkenalan yang pas untuk kolom ini, lalu diganti dengan kalimat Anda sendiri ' +
    'melalui Dasbor Admin.',
  about:
    `${SAMPLE_MARK} Ringkasan profil untuk halaman depan. Tuliskan dua atau tiga kalimat ` +
    'tentang sekolah, lalu simpan dari Dasbor Admin.',
  programs: `${SAMPLE_MARK} Kalimat pengantar sebelum daftar program keahlian ditampilkan.`,
  experience: `${SAMPLE_MARK} Kalimat pengantar untuk bagian kehidupan sekolah dan kegiatan.`,
  work: `${SAMPLE_MARK} Kalimat pengantar sebelum galeri karya siswa.`,
  gallery: `${SAMPLE_MARK} Kalimat pengantar sebelum mosaik galeri.`,
  cta: `${SAMPLE_MARK} Kalimat ajakan untuk calon siswa dan orang tua.`,
  contact: `${SAMPLE_MARK} Kalimat pengantar halaman kontak.`,
  footer: `${SAMPLE_MARK} Kalimat penutup di bagian bawah setiap halaman.`,
};

/** Longer-form profile fields, so the Tentang page has something to lay out. */
export const sampleProfileCopy = {
  description:
    `${SAMPLE_MARK} Deskripsi singkat sekolah. Bagian ini menjelaskan siapa yang dididik ` +
    'di sini dan keterampilan apa yang menjadi fokusnya.',
  history:
    `${SAMPLE_MARK} Sejarah sekolah. Ceritakan kapan sekolah berdiri dan bagaimana ` +
    'perjalanannya sampai sekarang.',
  vision: `${SAMPLE_MARK} Visi sekolah dalam satu kalimat yang mudah diingat.`,
  mission: [
    `${SAMPLE_MARK} Misi pertama sekolah.`,
    `${SAMPLE_MARK} Misi kedua sekolah.`,
    `${SAMPLE_MARK} Misi ketiga sekolah.`,
  ],
} as const;

// ---------------------------------------------------------------------------
// Programmes
// ---------------------------------------------------------------------------

/**
 * Descriptions for the two programmes.
 *
 * The programme *names* are given by the brief and are real. What is filled in
 * here is only the shape of the descriptive copy — how long a programme
 * description runs, how many feature bullets read well — so the layout can be
 * judged. Every line stays marked.
 */
export const sampleProgramCopy: Record<
  string,
  { shortDescription: string; description: string; features: string[] }
> = {
  'desain-komunikasi-visual': {
    shortDescription: `${SAMPLE_MARK} Ringkasan singkat program DKV.`,
    description:
      `${SAMPLE_MARK} Deskripsi lengkap program DKV. Jelaskan apa yang dipelajari siswa ` +
      'selama tiga tahun, dari dasar sampai karya akhir.',
    features: [
      `${SAMPLE_MARK} Dasar desain dan tipografi`,
      `${SAMPLE_MARK} Ilustrasi dan fotografi`,
      `${SAMPLE_MARK} Identitas visual dan branding`,
      `${SAMPLE_MARK} Persiapan portofolio`,
    ],
  },
  otomotif: {
    shortDescription: `${SAMPLE_MARK} Ringkasan singkat program Otomotif.`,
    description:
      `${SAMPLE_MARK} Deskripsi lengkap program Otomotif. Jelaskan apa yang dipelajari ` +
      'siswa selama tiga tahun, dari dasar sampai praktik kerja.',
    features: [
      `${SAMPLE_MARK} Dasar mesin dan kelistrikan`,
      `${SAMPLE_MARK} Perawatan berkala kendaraan`,
      `${SAMPLE_MARK} Diagnosa kerusakan`,
      `${SAMPLE_MARK} Praktik kerja lapangan`,
    ],
  },
};

// ---------------------------------------------------------------------------
// News
// ---------------------------------------------------------------------------

/**
 * Sample news articles.
 *
 * The headlines deliberately describe *kinds* of school announcements — a flag
 * ceremony, a workshop, an exam schedule — rather than specific claimed events
 * with dates and outcomes. Combined with the `[CONTOH]` mark, no reader could
 * take these for a record of something that happened.
 *
 * Slugs carry a `contoh-` prefix for the same reason: a URL containing
 * `contoh-kegiatan-sekolah` announces itself as sample content even when the
 * text is not visible.
 */
export const sampleNews: NewsContent[] = [
  {
    id: 'sample-news-1',
    title: marked('Upacara Bendera dan Pengumuman Jadwal Sekolah'),
    slug: 'contoh-upacara-bendera',
    category: 'Pengumuman',
    excerpt: marked('Contoh berita pengumuman mingguan sekolah.'),
    content:
      `${SAMPLE_MARK} Ini contoh isi berita. Paragraf pertama biasanya menjawab apa, ` +
      `siapa, kapan, dan di mana — supaya pembaca yang hanya membaca satu paragraf ` +
      `tetap mendapat informasi pokoknya.\n\n` +
      `${SAMPLE_MARK} Paragraf berikutnya bisa memuat detail: susunan acara, pihak yang ` +
      `terlibat, dan hal yang perlu disiapkan siswa. Perhatikan bagaimana panjang teks ` +
      `seperti ini terbaca di halaman detail.\n\n` +
      `${SAMPLE_MARK} Berita yang Anda terbitkan sendiri melalui Dasbor Admin akan ` +
      `menggantikan contoh ini sepenuhnya.`,
    coverImage: '/images/berita-01.svg',
    coverPublicId: '',
    published: true,
    publishedAt: '2026-08-04T01:00:00.000Z',
    createdAt: '2026-08-04T01:00:00.000Z',
  },
  {
    id: 'sample-news-2',
    title: marked('Kegiatan Praktik di Workshop Program Keahlian'),
    slug: 'contoh-praktik-workshop',
    category: 'Kegiatan',
    excerpt: marked('Contoh berita kegiatan praktik siswa.'),
    content:
      `${SAMPLE_MARK} Contoh isi berita kegiatan. Bagian ini menjelaskan bagaimana ` +
      `praktik berlangsung di workshop dan apa yang dikerjakan siswa.\n\n` +
      `${SAMPLE_MARK} Ganti seluruh isi paragraf ini dengan laporan Anda sendiri.`,
    coverImage: '/images/berita-02.svg',
    coverPublicId: '',
    published: true,
    publishedAt: '2026-08-18T01:00:00.000Z',
    createdAt: '2026-08-18T01:00:00.000Z',
  },
  {
    id: 'sample-news-3',
    title: marked('Informasi Jadwal Penerimaan Siswa Baru'),
    slug: 'contoh-jadwal-penerimaan',
    category: 'PPDB',
    excerpt: marked('Contoh berita informasi penerimaan siswa baru.'),
    content:
      `${SAMPLE_MARK} Contoh isi berita PPDB. Bagian ini memuat tahapan pendaftaran, ` +
      `dokumen yang perlu disiapkan, dan tanggal penting.\n\n` +
      `${SAMPLE_MARK} Catatan penting: jangan menerbitkan contoh ini sebelum tanggal dan ` +
      `syaratnya benar-benar Anda isi, karena informasi PPDB yang salah bisa menyesatkan.`,
    coverImage: '/images/berita-03.svg',
    coverPublicId: '',
    published: true,
    publishedAt: '2026-09-01T01:00:00.000Z',
    createdAt: '2026-09-01T01:00:00.000Z',
  },
  {
    id: 'sample-news-4',
    title: marked('Pameran Karya Siswa Akhir Semester'),
    slug: 'contoh-pameran-karya',
    category: 'Kegiatan',
    excerpt: marked('Contoh berita pameran karya siswa.'),
    content:
      `${SAMPLE_MARK} Contoh isi berita pameran. Bagian ini menjelaskan karya apa saja ` +
      `yang ditampilkan dan bagaimana pengunjung dapat melihatnya.\n\n` +
      `${SAMPLE_MARK} Ganti dengan laporan asli setelah pameran berlangsung.`,
    coverImage: '/images/berita-04.svg',
    coverPublicId: '',
    published: true,
    publishedAt: '2026-09-10T01:00:00.000Z',
    createdAt: '2026-09-10T01:00:00.000Z',
  },
];

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/**
 * Sample agenda entries.
 *
 * Dates sit in the near future relative to the sample set's own reference
 * period, so the "Akan Datang" / "Sudah Berlalu" split on the events page is
 * both populated and visibly exercised. `kegiatan/page.tsx` decides that split
 * against the real clock at request time, so as time passes these migrate to
 * the past column — which is itself worth seeing.
 */
export const sampleEvents: EventContent[] = [
  {
    id: 'sample-event-1',
    title: marked('Kegiatan Belajar Bersama Antar Kelas'),
    slug: 'contoh-belajar-bersama',
    description: marked('Contoh keterangan kegiatan belajar bersama.'),
    image: '/images/kegiatan-01.svg',
    publicId: '',
    date: '2027-02-10T00:00:00.000Z',
    endDate: null,
    location: marked('Lokasi kegiatan'),
    published: true,
  },
  {
    id: 'sample-event-2',
    title: marked('Workshop Singkat Program Keahlian'),
    slug: 'contoh-workshop-program',
    description: marked('Contoh keterangan workshop program keahlian.'),
    image: '/images/kegiatan-02.svg',
    publicId: '',
    date: '2027-03-06T00:00:00.000Z',
    endDate: null,
    location: marked('Lokasi kegiatan'),
    published: true,
  },
  {
    id: 'sample-event-3',
    title: marked('Pameran dan Bazar Sekolah'),
    slug: 'contoh-pameran-bazar',
    description: marked('Contoh keterangan pameran dan bazar sekolah.'),
    image: '/images/kegiatan-03.svg',
    publicId: '',
    date: '2027-04-18T00:00:00.000Z',
    endDate: '2027-04-20T00:00:00.000Z',
    location: marked('Lokasi kegiatan'),
    published: true,
  },
  {
    id: 'sample-event-4',
    title: marked('Pertemuan Orang Tua dan Wali Siswa'),
    slug: 'contoh-pertemuan-orang-tua',
    description: marked('Contoh keterangan pertemuan orang tua dan wali siswa.'),
    image: '/images/kegiatan-04.svg',
    publicId: '',
    date: '2027-05-22T00:00:00.000Z',
    endDate: null,
    location: marked('Lokasi kegiatan'),
    published: true,
  },
];

// ---------------------------------------------------------------------------
// Student work
// ---------------------------------------------------------------------------

/**
 * Sample student works.
 *
 * **No student names.** Even marked as sample content, attaching an invented
 * name to invented artwork drags a real-person-shaped detail into the page. The
 * `studentName` field therefore stays empty — the same rule `defaultStudentWork`
 * follows — and the captions describe design categories instead.
 *
 * ## Why each category has three items, not one
 *
 * `/karya` groups works by category and lays each group out in a three-column
 * grid. One item per category therefore renders as six rows of a single card
 * with two empty columns beside it — measured on the built site, and visible in
 * a full-page screenshot as a page that looks broken rather than sparse.
 *
 * Three per category is not an arbitrary number: it is the column count. The
 * sample set exists so the layout can be *judged*, and a set that cannot fill
 * the grid cannot do that. There are six categories, so eighteen works, which
 * also gives the page enough length to exercise its own scrolling.
 */
const workCategoryNames = ['Poster', 'Branding', 'Ilustrasi', 'Fotografi', 'Desain Produk', 'Tipografi'];
const worksPerCategory = 3;

export const sampleStudentWork: WorkContent[] = workCategoryNames.flatMap((category, categoryIndex) =>
  Array.from({ length: worksPerCategory }, (_, slot) => {
    const index = categoryIndex * worksPerCategory + slot;

    return {
      id: `sample-work-${index + 1}`,
      // Numbered inside the category, so the grid reads as a small collection
      // rather than the same caption repeated three times.
      title: marked(`Karya ${category} ${slot + 1}`),
      studentName: '',
      category,
      description:
        `${SAMPLE_MARK} Deskripsi singkat karya. Jelaskan gagasan di baliknya dan hal ` +
        `yang ingin disampaikan.`,
      // The plate set is six drawings; cycle through them across the eighteen
      // works so the grid is not six images repeated three times in a column.
      image: `/images/karya-0${(index % 6) + 1}.svg`,
      publicId: '',
      year: null,
      order: index + 1,
      published: true,
    };
  }),
);


// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------

/**
 * Sample gallery entries.
 *
 * Every image is a drawn placeholder — no stock photograph of strangers, which
 * would be a fabricated claim about who studies at the school. The captions
 * extend the six category captions already in `defaults.ts` into a set large
 * enough to show the mosaic's real rhythm.
 */
const gallerySampleTitles = [
  'Kegiatan Belajar',
  'Praktik di Workshop',
  'Kegiatan Siswa',
  'Proyek Siswa',
  'Kolaborasi',
  'Lingkungan Sekolah',
  'Kerja Kelompok',
  'Presentasi Kelas',
];

const gallerySampleCategories = [
  'Belajar',
  'Workshop',
  'Kegiatan',
  'Proyek',
  'Kolaborasi',
  'Lingkungan',
  'Belajar',
  'Kegiatan',
];

export const sampleGallery: GalleryContent[] = gallerySampleTitles.map((title, index) => ({
  id: `sample-gal-${index + 1}`,
  // Captions keep the category wording but carry the sample mark, so they are
  // never read as a record of a specific photographed event.
  title: marked(title),
  image: `/images/galeri-0${index + 1}.svg`,
  publicId: '',
  category: gallerySampleCategories[index] ?? 'Kegiatan',
  description: `${SAMPLE_MARK} Keterangan foto. Ganti dengan foto asli sekolah melalui ` +
    `Dasbor Admin.`,
  order: index + 1,
  published: true,
}));

// ---------------------------------------------------------------------------
// The bundle
// ---------------------------------------------------------------------------

export type SampleContent = {
  news: NewsContent[];
  events: EventContent[];
  gallery: GalleryContent[];
  studentWork: WorkContent[];
};

/**
 * Returns the sample dataset, or `null` when the switch is off.
 *
 * Callers do not branch on this themselves — `lib/content.ts` does, in one
 * place, so the toggle cannot be half-applied.
 *
 * Note what is *not* in this bundle: programmes, sections and the school
 * profile. Those collections are not empty in the seed, so sample content does
 * not replace them wholesale — it fills their blank fields instead, through the
 * `withSample*` helpers in `lib/content.ts`. Only collections that are empty on
 * purpose (news, events) and collections the mosaic wants more of (gallery,
 * works) are substituted here.
 */
export function sampleContent(): SampleContent | null {
  if (!sampleEnabled()) return null;

  return {
    news: sampleNews,
    events: sampleEvents,
    gallery: sampleGallery,
    studentWork: sampleStudentWork,
  };
}
