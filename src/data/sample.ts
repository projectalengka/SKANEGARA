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
import { SAMPLE_ID_PREFIX } from '@/lib/sample-id';

/** The one string that makes sample content recognisable at a glance. */
export const SAMPLE_MARK = '[CONTOH]';

/** Prefixes a title with the sample mark, unless it already carries one. */
function marked(title: string): string {
  return title.startsWith(SAMPLE_MARK) ? title : `${SAMPLE_MARK} ${title}`;
}

/**
 * Removes every sample mark from a value.
 *
 * Used when the owner adopts the sample set as their own content. The mark is
 * what makes sample copy honest, so it has to go at exactly the moment the copy
 * stops being a sample — and it appears **more than once** in some values: every
 * paragraph of a news body and of the school history carries its own, because a
 * reader can land mid-article. A `startsWith` slice would leave the rest behind.
 *
 * The mark is always written as `[CONTOH] ` with a trailing space, so that is
 * removed first; the bare form is then swept up in case a value ends with it.
 */
export function unmark(value: string): string {
  return value.split(`${SAMPLE_MARK} `).join('').split(SAMPLE_MARK).join('').trim();
}

/** The slug prefix that makes a sample URL announce itself. */
export const SAMPLE_SLUG_PREFIX = 'contoh-';

/**
 * Removes the self-announcing slug prefix, for the same reason as `unmark`.
 *
 * A real article at `/berita/contoh-jadwal-penerimaan` would be a lie of a
 * different kind: the URL would keep claiming the page is an example after the
 * owner has made it their own.
 */
export function unmarkSlug(slug: string): string {
  return slug.startsWith(SAMPLE_SLUG_PREFIX) ? slug.slice(SAMPLE_SLUG_PREFIX.length) : slug;
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
 *
 * ## Why these read as finished prose rather than as instructions
 *
 * The first version of this block said things like "Kalimat pengantar sebelum
 * daftar program keahlian ditampilkan" — a note to the owner about what to
 * write. That is honest, and it is useless for the one job sample content has:
 * letting someone judge the design, or show the site to a colleague, without
 * every paragraph announcing that it is unfinished. Reported from the owner's
 * own screen on 24 September 2026, and he was right.
 *
 * So each body is now real sentences about the school, written at the length the
 * layout expects. The `[CONTOH]` mark stays, and it is what keeps this
 * legitimate: the text reads like a school, and no reader can mistake it for the
 * school's own words.
 */
export const sampleSectionBodies: Record<string, string> = {
  introduction:
    `${SAMPLE_MARK} Di Jayanegara, siswa bekerja dengan alat dan bahan yang sesungguhnya ` +
    'sejak kelas X. Porsi praktik yang besar diimbangi mata pelajaran umum, supaya ' +
    'keterampilan berdiri di atas pemahaman — bukan sekadar hafalan langkah.',
  about:
    `${SAMPLE_MARK} Sekolah menengah kejuruan di Mojokerto dengan dua program keahlian: ` +
    'Desain Komunikasi Visual dan Otomotif. Kelasnya kecil, ruang praktiknya memadai, dan ' +
    'karya siswa dipamerkan setiap akhir semester.',
  programs:
    `${SAMPLE_MARK} Dua program keahlian ditempuh dalam tiga tahun. Keduanya menekankan ` +
    'praktik di studio dan bengkel, dengan kerja sama industri di Mojokerto dan Surabaya.',
  experience:
    `${SAMPLE_MARK} Hari-hari di Jayanegara berjalan dari studio ke bengkel — menggambar, ` +
    'mengukur, mendiagnosis, lalu memamerkan hasilnya.',
  work:
    `${SAMPLE_MARK} Karya di bawah ini dikerjakan siswa sebagai tugas akhir, proyek kelas, ` +
    'dan permintaan desain dari kegiatan sekolah.',
  gallery: `${SAMPLE_MARK} Potret keseharian di ruang praktik, kelas, dan halaman sekolah.`,
  cta:
    `${SAMPLE_MARK} Penerimaan siswa baru dibuka setiap tahun untuk lulusan SMP dan ` +
    'sederajat. Hubungi kami untuk jadwal, syarat, dan rincian biaya.',
  contact:
    `${SAMPLE_MARK} Silakan menghubungi kami untuk pertanyaan seputar pendaftaran, kerja ` +
    'sama industri, atau kunjungan sekolah.',
  footer: `${SAMPLE_MARK} Sekolah Menengah Kejuruan Jayanegara — Mojokerto, Jawa Timur.`,
};

/**
 * Longer-form profile fields, so the Tentang page has something to lay out.
 *
 * Written as prose a school would actually publish, at the length each slot
 * expects — a one-sentence vision, three missions, a history that runs to two
 * paragraphs. The `[CONTOH]` mark is doing the honesty work here: the words read
 * like a real school, and the mark is what stops them from being read as *this*
 * school's words.
 *
 * The history deliberately avoids precise dates and names. A vague "awal tahun
 * 1980-an" leaves the shape of a founding story without asserting a fact someone
 * could check and find wrong — the one thing sample copy should never do, even
 * when it is marked.
 */
export const sampleProfileCopy = {
  description:
    `${SAMPLE_MARK} SMK Jayanegara mendidik siswa kelas X sampai XII melalui dua program ` +
    'keahlian, Desain Komunikasi Visual dan Otomotif. Pembelajaran menempatkan praktik ' +
    'sebagai inti, dibimbing guru yang juga bekerja di bidangnya.',
  history:
    `${SAMPLE_MARK} SMK Jayanegara berawal dari kelompok belajar keterampilan yang diadakan ` +
    'di lingkungan sekolah pada awal tahun 1980-an. Peminatnya bertambah dari tahun ke ' +
    'tahun, sampai yayasan membuka program keahlian formal dan menyusun kurikulum yang ' +
    'menggabungkan praktik langsung dengan mata pelajaran umum.\n\n' +
    `${SAMPLE_MARK} Perjalanan berikutnya ditandai penambahan ruang praktik, kerja sama ` +
    'dengan bengkel dan studio di Mojokerto serta Surabaya, dan kebiasaan menyelenggarakan ' +
    'pameran karya setiap akhir semester — tradisi yang masih berjalan sampai sekarang.',
  vision:
    `${SAMPLE_MARK} Menjadi sekolah rujukan bidang keterampilan yang menghasilkan lulusan ` +
    'kompeten, berkarakter, dan siap bekerja maupun melanjutkan pendidikan.',
  mission: [
    `${SAMPLE_MARK} Menyelenggarakan pembelajaran berbasis praktik yang selaras dengan ` +
      'kebutuhan dunia kerja.',
    `${SAMPLE_MARK} Membentuk karakter disiplin, jujur, dan mampu bekerja sama melalui ` +
      'pembiasaan sehari-hari di sekolah.',
    `${SAMPLE_MARK} Menjalin kerja sama dengan industri dan dunia usaha untuk memperluas ` +
      'pengalaman belajar siswa.',
  ],
} as const;

// ---------------------------------------------------------------------------
// Programmes
// ---------------------------------------------------------------------------

/**
 * Descriptions for the two programmes.
 *
 * The programme *names* are given by the brief and are real. What is written
 * here is the shape of the descriptive copy — how long a programme description
 * runs, how many feature bullets read well — as actual sentences about what the
 * programme teaches. Every line stays marked.
 *
 * The teaching content is drawn from the national competency standard for each
 * programme rather than invented, because those are the subjects any DKV or
 * Otomotif programme in Indonesia covers. That keeps the sample copy plausible
 * without it claiming anything specific about this school.
 */
export const sampleProgramCopy: Record<
  string,
  { shortDescription: string; description: string; features: string[] }
> = {
  'desain-komunikasi-visual': {
    shortDescription:
      `${SAMPLE_MARK} Membekali siswa dengan keterampilan merancang pesan visual, dari ` +
      'sketsa sampai karya digital siap cetak.',
    description:
      `${SAMPLE_MARK} Selama tiga tahun, siswa mempelajari dasar desain, tipografi, ` +
      'ilustrasi, fotografi, dan identitas visual. Pembelajaran berlangsung di studio ' +
      'dengan proyek nyata — mulai dari latihan menggambar bentuk dan menyusun tata letak, ' +
      'sampai mengerjakan permintaan desain dari kegiatan sekolah. Tahun terakhir ' +
      'difokuskan pada penyusunan portofolio sebagai bekal masuk dunia kerja atau ' +
      'melanjutkan studi.',
    features: [
      `${SAMPLE_MARK} Dasar desain, warna, dan tipografi`,
      `${SAMPLE_MARK} Ilustrasi manual dan digital`,
      `${SAMPLE_MARK} Fotografi dan pengolahan gambar`,
      `${SAMPLE_MARK} Identitas visual dan desain kemasan`,
      `${SAMPLE_MARK} Penyusunan portofolio`,
    ],
  },
  otomotif: {
    shortDescription:
      `${SAMPLE_MARK} Membekali siswa dengan keterampilan perawatan dan perbaikan ` +
      'kendaraan ringan, dari mesin sampai sistem kelistrikan.',
    description:
      `${SAMPLE_MARK} Siswa mempelajari dasar mesin, sistem kelistrikan, sistem bahan bakar, ` +
      'dan prosedur perawatan berkala sepeda motor maupun mobil. Sebagian besar waktu ' +
      'belajar dihabiskan di bengkel sekolah dengan kendaraan latih, ditambah praktik kerja ' +
      'lapangan di bengkel mitra. Penekanan diberikan pada keselamatan kerja dan ketelitian ' +
      'saat mendiagnosis kerusakan.',
    features: [
      `${SAMPLE_MARK} Dasar mesin dan sistem kelistrikan`,
      `${SAMPLE_MARK} Perawatan berkala kendaraan`,
      `${SAMPLE_MARK} Diagnosa dan perbaikan kerusakan`,
      `${SAMPLE_MARK} Praktik kerja lapangan di bengkel mitra`,
    ],
  },
};

// ---------------------------------------------------------------------------
// News
// ---------------------------------------------------------------------------

/**
 * Sample news articles.
 *
 * ## What changed, and why
 *
 * These used to be notes *about* writing a news article — "Paragraf pertama
 * biasanya menjawab apa, siapa, kapan, dan di mana". Useful as a style guide,
 * useless as a demonstration: an empty-looking newsroom with instructions in it
 * still looks like an empty newsroom. They are now written as articles, at the
 * length and rhythm the detail page is designed around.
 *
 * ## What keeps them honest
 *
 * The `[CONTOH]` mark on the title, the excerpt and every paragraph, plus the
 * `contoh-` slug prefix — a URL containing `contoh-jadwal-penerimaan` announces
 * itself even when the text is not on screen.
 *
 * The PPDB article is the one to be careful with, because wrong admission
 * information actively misleads families. It therefore describes the *shape* of
 * the process — form, documents, a short interview — and states plainly that
 * dates, fees and quotas are announced separately each year. It asserts no
 * number a reader could act on.
 */
export const sampleNews: NewsContent[] = [
  {
    id: `${SAMPLE_ID_PREFIX}news-1`,
    title: marked('Upacara Bendera dan Pengumuman Jadwal Sekolah'),
    slug: 'contoh-upacara-bendera',
    category: 'Pengumuman',
    excerpt: marked(
      'Ringkasan pengumuman mingguan: jadwal upacara, penyesuaian jam praktik, dan agenda sekolah pekan ini.',
    ),
    content:
      `${SAMPLE_MARK} Upacara bendera dilaksanakan setiap Senin pagi di halaman sekolah, ` +
      `diikuti seluruh siswa dan guru. Setelah upacara, wali kelas membacakan pengumuman ` +
      `pekan berjalan.\n\n` +
      `${SAMPLE_MARK} Pengumuman pekan ini mencakup penyesuaian jam praktik di studio dan ` +
      `bengkel, jadwal piket kebersihan, serta persiapan kegiatan akhir semester. Siswa ` +
      `diminta mencatat perubahan jadwal pada buku agenda masing-masing.\n\n` +
      `${SAMPLE_MARK} Orang tua dan wali yang memerlukan informasi lebih lanjut dapat ` +
      `menghubungi kantor sekolah pada jam kerja.`,
    coverImage: '/images/berita-01.svg',
    coverPublicId: '',
    published: true,
    publishedAt: '2026-08-04T01:00:00.000Z',
    createdAt: '2026-08-04T01:00:00.000Z',
  },
  {
    id: `${SAMPLE_ID_PREFIX}news-2`,
    title: marked('Kegiatan Praktik di Workshop Program Keahlian'),
    slug: 'contoh-praktik-workshop',
    category: 'Kegiatan',
    excerpt: marked(
      'Siswa kelas XI mengerjakan proyek praktik di studio dan bengkel, dari perencanaan sampai hasil akhir.',
    ),
    content:
      `${SAMPLE_MARK} Praktik di workshop berlangsung dua kali sepekan. Siswa kelas XI ` +
      `mengerjakan proyek yang sudah direncanakan di awal semester — mulai dari menyusun ` +
      `konsep dan menyiapkan bahan, sampai menyelesaikan hasil akhirnya.\n\n` +
      `${SAMPLE_MARK} Di studio Desain Komunikasi Visual, proyek pekan ini adalah ` +
      `perancangan identitas visual untuk kegiatan sekolah. Di bengkel Otomotif, siswa ` +
      `melakukan perawatan berkala pada kendaraan latih dan mencatat hasil pemeriksaan pada ` +
      `lembar kerja.\n\n` +
      `${SAMPLE_MARK} Guru pembimbing menilai prosesnya, bukan hanya hasilnya: kerapian ` +
      `kerja, keselamatan, dan kemampuan menjelaskan alasan di balik keputusan yang diambil.`,
    coverImage: '/images/berita-02.svg',
    coverPublicId: '',
    published: true,
    publishedAt: '2026-08-18T01:00:00.000Z',
    createdAt: '2026-08-18T01:00:00.000Z',
  },
  {
    id: `${SAMPLE_ID_PREFIX}news-3`,
    title: marked('Informasi Jadwal Penerimaan Siswa Baru'),
    slug: 'contoh-jadwal-penerimaan',
    category: 'PPDB',
    excerpt: marked(
      'Gambaran umum tahapan penerimaan siswa baru dan dokumen yang perlu disiapkan.',
    ),
    content:
      `${SAMPLE_MARK} Penerimaan siswa baru dibuka untuk lulusan SMP dan sederajat, tanpa ` +
      `memandang latar belakang sekolah sebelumnya. Pendaftaran dapat dilakukan langsung di ` +
      `sekolah pada jam kerja.\n\n` +
      `${SAMPLE_MARK} Tahapannya meliputi pengisian formulir, penyerahan salinan ijazah dan ` +
      `kartu keluarga, serta wawancara singkat bersama calon siswa dan orang tua. Tidak ada ` +
      `tes menggambar atau tes teknik pada tahap penerimaan.\n\n` +
      `${SAMPLE_MARK} Catatan penting: tanggal pasti, rincian biaya, dan kuota setiap ` +
      `program keahlian diumumkan terpisah setiap tahun. Jangan berpedoman pada contoh ini ` +
      `sebelum angkanya benar-benar Anda isi — informasi penerimaan yang keliru bisa ` +
      `menyesatkan calon siswa dan keluarganya.`,
    coverImage: '/images/berita-03.svg',
    coverPublicId: '',
    published: true,
    publishedAt: '2026-09-01T01:00:00.000Z',
    createdAt: '2026-09-01T01:00:00.000Z',
  },
  {
    id: `${SAMPLE_ID_PREFIX}news-4`,
    title: marked('Pameran Karya Siswa Akhir Semester'),
    slug: 'contoh-pameran-karya',
    category: 'Kegiatan',
    excerpt: marked(
      'Karya siswa dipamerkan di aula sekolah pada akhir semester, terbuka untuk orang tua dan warga sekitar.',
    ),
    content:
      `${SAMPLE_MARK} Setiap akhir semester, karya siswa dipamerkan di aula sekolah selama ` +
      `dua hari. Pameran terbuka untuk orang tua, wali, dan warga sekitar.\n\n` +
      `${SAMPLE_MARK} Yang ditampilkan antara lain poster, ilustrasi, dan desain kemasan ` +
      `dari program Desain Komunikasi Visual, serta hasil kerja praktik dari program ` +
      `Otomotif. Sebagian karya dijual, dan hasilnya dipakai untuk kegiatan siswa.\n\n` +
      `${SAMPLE_MARK} Pameran ini menjadi kesempatan siswa menjelaskan gagasan di balik ` +
      `karyanya langsung kepada pengunjung — bagian yang sering kali paling menantang bagi ` +
      `mereka.`,
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
 *
 * ## Why the locations stay at room level
 *
 * "Aula sekolah", "Ruang workshop" — a building on the school's own grounds.
 * Not a street address, not a phone number, nothing a reader could act on and
 * end up somewhere unintended. That is the same line `sampleProfileCopy` draws
 * for the contact details, and it costs nothing here: an agenda entry reads
 * fine when it says which room, and the room is the part a reader wants.
 */
export const sampleEvents: EventContent[] = [
  {
    id: `${SAMPLE_ID_PREFIX}event-1`,
    title: marked('Kegiatan Belajar Bersama Antar Kelas'),
    slug: 'contoh-belajar-bersama',
    description:
      `${SAMPLE_MARK} Kelas X, XI, dan XII dibagi ke dalam kelompok campuran selama satu hari ` +
      'penuh. Setiap kelompok menerima satu brief, mengerjakannya bersama, lalu ' +
      'mempresentasikan hasilnya di depan kelas lain pada sesi penutup.',
    image: '/images/kegiatan-01.svg',
    publicId: '',
    date: '2027-02-10T00:00:00.000Z',
    endDate: null,
    location: marked('Aula sekolah'),
    published: true,
  },
  {
    id: `${SAMPLE_ID_PREFIX}event-2`,
    title: marked('Workshop Singkat Program Keahlian'),
    slug: 'contoh-workshop-program',
    description:
      `${SAMPLE_MARK} Satu sesi singkat bersama praktisi dari industri, diikuti siswa kelas XI ` +
      'dan XII sesuai program keahliannya. Setelah pemaparan alur kerja, siswa langsung ' +
      'mencoba tahapannya dengan alat yang tersedia di workshop.',
    image: '/images/kegiatan-02.svg',
    publicId: '',
    date: '2027-03-06T00:00:00.000Z',
    endDate: null,
    location: marked('Ruang workshop'),
    published: true,
  },
  {
    id: `${SAMPLE_ID_PREFIX}event-3`,
    title: marked('Pameran dan Bazar Sekolah'),
    slug: 'contoh-pameran-bazar',
    description:
      `${SAMPLE_MARK} Karya siswa dipamerkan selama tiga hari dan sebagian dijual. Pengunjung ` +
      'bisa berbincang langsung dengan siswa yang membuatnya — bagian yang biasanya ' +
      'paling ramai, karena siswa harus menjelaskan gagasannya kepada orang yang baru ' +
      'pertama kali melihat karyanya.',
    image: '/images/kegiatan-03.svg',
    publicId: '',
    date: '2027-04-18T00:00:00.000Z',
    endDate: '2027-04-20T00:00:00.000Z',
    location: marked('Aula sekolah'),
    published: true,
  },
  {
    id: `${SAMPLE_ID_PREFIX}event-4`,
    title: marked('Pertemuan Orang Tua dan Wali Siswa'),
    slug: 'contoh-pertemuan-orang-tua',
    description:
      `${SAMPLE_MARK} Sekolah memaparkan perkembangan belajar siswa pada semester berjalan, ` +
      'dilanjutkan sesi tanya jawab antara orang tua dan wali kelas masing-masing. ' +
      'Kegiatan ini diadakan sekali setiap semester.',
    image: '/images/kegiatan-04.svg',
    publicId: '',
    date: '2027-05-22T00:00:00.000Z',
    endDate: null,
    location: marked('Aula sekolah'),
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
 *
 * ## Why the captions differ per category
 *
 * A single caption repeated eighteen times reads as a template — which is the
 * exact impression the sample set exists to avoid. Each category therefore
 * carries its own angle, and the three works inside a category are told apart
 * by what the work had to solve (a message, a system, a mood) rather than by a
 * number. The captions describe design *problems*, not results the school is
 * claiming to have achieved, so nothing here can be mistaken for a real record.
 */
const workCategoryNames = ['Poster', 'Branding', 'Ilustrasi', 'Fotografi', 'Desain Produk', 'Tipografi'];
const worksPerCategory = 3;

/**
 * One caption per category, written as the thing a viewer would notice first.
 * Kept in the same order as `workCategoryNames` so the pairing is obvious.
 */
const workCategoryCaptions: Record<string, string> = {
  Poster: 'Menyampaikan satu pesan utama yang harus terbaca dari jarak jauh, dengan ruang yang terbatas.',
  Branding: 'Menyusun identitas yang tetap dikenali saat dipakai pada banyak media berbeda.',
  Ilustrasi: 'Membangun suasana cerita lewat gambar, tanpa bergantung pada teks penjelas.',
  Fotografi: 'Menentukan sudut dan pencahayaan supaya objek sederhana terasa punya bobot.',
  'Desain Produk': 'Menyeimbangkan tampilan dan fungsi pada benda yang benar-benar dipakai sehari-hari.',
  Tipografi: 'Menata huruf sebagai elemen utama, bukan sekadar wadah teks.',
};

/**
 * A short second angle, indexed by slot, so three works in one category are not
 * three copies of the same sentence. Deliberately about the *task*, not about a
 * grade or an achievement.
 */
const workSlotAngles = [
  'Fokus latihan ada pada tahap eksplorasi gagasan sebelum masuk ke eksekusi.',
  'Tantangan utamanya adalah memilih satu arah dari banyak alternatif yang muncul.',
  'Penyelesaiannya menuntut ketelitian pada detail kecil yang jarang disadari pembaca.',
];

export const sampleStudentWork: WorkContent[] = workCategoryNames.flatMap((category, categoryIndex) =>
  Array.from({ length: worksPerCategory }, (_, slot) => {
    const index = categoryIndex * worksPerCategory + slot;
    const caption = workCategoryCaptions[category] ?? 'Latihan merancang dengan batasan yang jelas.';
    const angle = workSlotAngles[slot] ?? workSlotAngles[0];

    return {
      id: `${SAMPLE_ID_PREFIX}work-${index + 1}`,
      // Numbered inside the category, so the grid reads as a small collection
      // rather than the same caption repeated three times.
      title: marked(`Karya ${category} ${slot + 1}`),
      studentName: '',
      category,
      description: `${SAMPLE_MARK} ${caption} ${angle}`,
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
 *
 * Each caption names the *moment* the frame holds, one per tile, so the mosaic
 * does not read as the same sentence pasted eight times. They describe ordinary
 * school activity — the kind of thing any school would have a photo of — and
 * stay away from anything specific enough to be checked (a date, a name, a
 * result).
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

/** One caption per tile, in the same order as `gallerySampleTitles`. */
const gallerySampleCaptions = [
  'Suasana kelas saat materi sedang dibahas bersama.',
  'Praktik langsung memakai alat dan bahan di workshop.',
  'Kegiatan siswa di luar jam pelajaran.',
  'Salah satu karya yang dikerjakan siswa dari awal sampai akhir.',
  'Dua kelas mengerjakan satu tugas bersama.',
  'Bagian sekolah yang sehari-hari dilewati siswa.',
  'Kerja kelompok saat membagi peran dan menyusun rencana.',
  'Presentasi hasil kerja di depan kelas.',
];

export const sampleGallery: GalleryContent[] = gallerySampleTitles.map((title, index) => ({
  id: `${SAMPLE_ID_PREFIX}gal-${index + 1}`,
  // Captions keep the category wording but carry the sample mark, so they are
  // never read as a record of a specific photographed event.
  title: marked(title),
  image: `/images/galeri-0${index + 1}.svg`,
  publicId: '',
  category: gallerySampleCategories[index] ?? 'Kegiatan',
  description: `${SAMPLE_MARK} ${gallerySampleCaptions[index] ?? 'Kegiatan di lingkungan sekolah.'}`,
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

// ---------------------------------------------------------------------------
// Adoption — turning the sample set into the owner's own content
// ---------------------------------------------------------------------------
//
// ## The bug these rows close
//
// Sample content lives in this file, never in Postgres. The dashboard, however,
// listed those rows as if they were ordinary records — each with an id like
// `sample-work-1` and an edit form. Saving one asked Prisma to update a primary
// key that does not exist, which throws `P2025`, which the action's `catch`
// turned into "Terjadi kesalahan. Silakan coba lagi." Measured before the fix:
// the database held six student-work rows, all cuid ids, and `sample-work-1` was
// simply absent. The image upload had already succeeded, which is what made the
// report confusing — the failure was never in the upload.
//
// ## What adoption does instead
//
// The owner presses one button and the sample set becomes real rows: marks
// stripped, slugs de-prefixed, new cuid ids assigned by the database. From then
// on every row is editable, deletable and — the point of the exercise — able to
// receive an uploaded photograph.
//
// Nothing here writes to the database. These functions only build the rows; the
// server action in `src/app/admin/content-actions.ts` does the writing, so the
// mapping stays pure and testable.

/** Which sample-backed collection to adopt. */
export type SampleCollection = 'karya' | 'galeri' | 'berita' | 'kegiatan';

/** A student work, shaped for `prisma.studentWork.createMany`. */
export type WorkAdoptionRow = {
  title: string;
  studentName: string;
  category: string;
  description: string;
  image: string;
  publicId: string;
  year: number | null;
  order: number;
  published: boolean;
};

/** A gallery photo, shaped for `prisma.galleryItem.createMany`. */
export type GalleryAdoptionRow = {
  title: string;
  image: string;
  publicId: string;
  category: string;
  description: string;
  order: number;
  published: boolean;
};

/** A news article, shaped for `prisma.news.createMany`. */
export type NewsAdoptionRow = {
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  coverImage: string;
  coverPublicId: string;
  published: boolean;
  publishedAt: Date | null;
  createdAt: Date;
};

/** An event, shaped for `prisma.event.createMany`. */
export type EventAdoptionRow = {
  title: string;
  slug: string;
  description: string;
  image: string;
  publicId: string;
  date: Date;
  endDate: Date | null;
  location: string;
  published: boolean;
};

/** Reads an ISO string from the sample set as a `Date`, or `null`. */
function asDate(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null;
}

/**
 * The student works as database rows, with the sample mark removed.
 *
 * `publicId` stays empty on purpose: the sample images are drawn placeholders
 * shipped in `public/`, not uploaded assets, so there is nothing in the media
 * table to point at. `deleteStudentWork` only calls `deleteImage` for a non-empty
 * `publicId`, so an adopted row that the owner later deletes simply removes the
 * row — no orphaned asset, no attempt to delete a file that never existed.
 */
export function adoptableWorkRows(): WorkAdoptionRow[] {
  return sampleStudentWork.map((work, index) => ({
    title: unmark(work.title),
    studentName: work.studentName,
    category: work.category,
    description: unmark(work.description),
    image: work.image,
    publicId: '',
    year: work.year,
    order: index + 1,
    published: work.published,
  }));
}

/** The gallery photos as database rows, with the sample mark removed. */
export function adoptableGalleryRows(): GalleryAdoptionRow[] {
  return sampleGallery.map((item, index) => ({
    title: unmark(item.title),
    image: item.image,
    publicId: '',
    category: item.category,
    description: unmark(item.description),
    order: index + 1,
    published: item.published,
  }));
}

/**
 * The news articles as database rows, with the mark removed from every field a
 * reader sees — title, excerpt, and each paragraph of the body.
 *
 * `publishedAt` and `createdAt` keep the sample dates. They are what gives the
 * archive page more than one month group, and they are the one place where an
 * invented value is harmless: the article is the owner's own content by the time
 * it is written, and the date is theirs to correct in the form.
 */
export function adoptableNewsRows(): NewsAdoptionRow[] {
  return sampleNews.map((article) => ({
    title: unmark(article.title),
    slug: unmarkSlug(article.slug),
    category: article.category,
    excerpt: unmark(article.excerpt),
    content: unmark(article.content),
    coverImage: article.coverImage,
    coverPublicId: '',
    published: article.published,
    publishedAt: asDate(article.publishedAt),
    createdAt: asDate(article.createdAt) ?? new Date(),
  }));
}

/** The events as database rows, with the sample mark removed. */
export function adoptableEventRows(): EventAdoptionRow[] {
  return sampleEvents.map((event) => ({
    title: unmark(event.title),
    slug: unmarkSlug(event.slug),
    description: unmark(event.description),
    image: event.image,
    publicId: '',
    date: asDate(event.date) ?? new Date(),
    endDate: asDate(event.endDate),
    location: unmark(event.location),
    published: event.published,
  }));
}
