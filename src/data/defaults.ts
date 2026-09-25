/**
 * Placeholder content.
 *
 * The brief is unambiguous: never invent facts about SMK Jayanegara. So this
 * file contains no plausible-looking numbers, no invented achievements, no
 * accreditation, no staff counts. What it contains is the *structural* copy the
 * layout needs to be designed against — section names, button labels, the
 * occasional clearly-marked placeholder — plus explicitly-empty factual fields.
 *
 * The rule that keeps this honest:
 *
 *   - Strings that are obviously ours (labels, CTAs, gallery captions) are real
 *     and final. They are interface copy, not claims about the school.
 *   - Anything factual about the school is either empty or wrapped in
 *     `placeholder()` so it is impossible to mistake for verified content and
 *     impossible to miss in the admin dashboard.
 *
 * Once `DATABASE_URL` is configured and the seed has run, every value here is
 * overridden by the database. This file is the floor the site stands on, not
 * the ceiling.
 */

/** Marks copy that is deliberately unfilled. Visible in the CMS, flagged in the UI. */
export function placeholder(hint: string): string {
  return `[${hint} — isi melalui Dasbor Admin]`;
}

/** True when a value is still the untouched placeholder produced above. */
export function isPlaceholder(value: string | null | undefined): boolean {
  if (!value) return true;
  return value.startsWith('[[') || value.startsWith('[') || value.trim().length === 0;
}

export type SchoolProfileContent = {
  schoolName: string;
  tagline: string;
  heroLines: string[];
  description: string;
  history: string;
  vision: string;
  mission: string[];
  address: string;
  city: string;
  province: string;
  phone: string;
  whatsapp: string;
  email: string;
  instagram: string;
  youtube: string;
  mapsUrl: string;
  /**
   * Foto sekolah — gambar lebar di halaman Tentang dan pratinjau tautan saat
   * situs dibagikan. String kosong berarti halaman memakai placeholder
   * `public/images/hero.svg`, bukan berarti gambarnya rusak.
   */
  image: string;
  imagePublicId: string;
};

export const defaultSchoolProfile: SchoolProfileContent = {
  schoolName: 'SMK Jayanegara',
  // Editable from the dashboard. Indonesian, as the language directive requires.
  tagline: 'Tempat keterampilan menjadi masa depan.',
  heroLines: ['Tempat Keterampilan', 'Menjadi Masa Depan.'],
  description: placeholder('Deskripsi singkat sekolah'),
  history: placeholder('Sejarah sekolah'),
  vision: placeholder('Visi sekolah'),
  mission: [placeholder('Misi pertama'), placeholder('Misi kedua'), placeholder('Misi ketiga')],
  address: placeholder('Alamat lengkap'),
  city: 'Mojokerto',
  province: 'Jawa Timur',
  phone: placeholder('Nomor telepon'),
  whatsapp: '',
  email: placeholder('Alamat email'),
  instagram: '',
  youtube: '',
  mapsUrl: '',
  // Sengaja kosong: situs memakai placeholder yang jujur mengatakan fotonya
  // belum diunggah, bukan memakai gambar yang berpura-pura jadi foto sekolah.
  image: '',
  imagePublicId: '',
};

export type ProgramContent = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  image: string;
  imagePublicId: string;
  features: string[];
  order: number;
  published: boolean;
};

/**
 * The two programmes named in the brief. Names and slugs are given; every
 * descriptive field is left as a placeholder because we do not know what the
 * school teaches inside them.
 */
export const defaultPrograms: ProgramContent[] = [
  {
    id: 'seed-dkv',
    name: 'Desain Komunikasi Visual',
    slug: 'desain-komunikasi-visual',
    shortDescription: placeholder('Ringkasan singkat program DKV'),
    description: placeholder('Deskripsi lengkap program DKV'),
    image: '/images/program-dkv.svg',
    imagePublicId: '',
    features: [],
    order: 1,
    published: true,
  },
  {
    id: 'seed-otomotif',
    name: 'Otomotif',
    slug: 'otomotif',
    shortDescription: placeholder('Ringkasan singkat program Otomotif'),
    description: placeholder('Deskripsi lengkap program Otomotif'),
    image: '/images/program-otomotif.svg',
    imagePublicId: '',
    features: [],
    order: 2,
    published: true,
  },
];

export type NewsContent = {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  coverImage: string;
  coverPublicId: string;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
};

/**
 * No seed news. Fabricating school news would be the single clearest violation
 * of the content rule, and an empty newsroom is a state the design must handle
 * gracefully anyway — so the "Belum ada berita" path is the one that gets
 * exercised first, on purpose.
 */
export const defaultNews: NewsContent[] = [];

export type GalleryContent = {
  id: string;
  title: string;
  image: string;
  publicId: string;
  category: string;
  description: string;
  order: number;
  published: boolean;
};

/**
 * Gallery entries exist so the immersive composition has something to compose.
 * The captions describe *categories of school life* (learning, workshop,
 * activity) rather than specific events — no date, no claim, nothing that
 * could be read as a factual record. Each one is flagged in the UI as awaiting
 * a real photograph.
 */
export const defaultGallery: GalleryContent[] = [
  {
    id: 'seed-gal-1',
    title: 'Kegiatan Belajar',
    image: '/images/gallery-01.svg',
    publicId: '',
    category: 'Belajar',
    description: placeholder('Keterangan foto'),
    order: 1,
    published: true,
  },
  {
    id: 'seed-gal-2',
    title: 'Praktik di Workshop',
    image: '/images/gallery-02.svg',
    publicId: '',
    category: 'Workshop',
    description: placeholder('Keterangan foto'),
    order: 2,
    published: true,
  },
  {
    id: 'seed-gal-3',
    title: 'Kegiatan Siswa',
    image: '/images/gallery-03.svg',
    publicId: '',
    category: 'Kegiatan',
    description: placeholder('Keterangan foto'),
    order: 3,
    published: true,
  },
  {
    id: 'seed-gal-4',
    title: 'Proyek Siswa',
    image: '/images/gallery-04.svg',
    publicId: '',
    category: 'Proyek',
    description: placeholder('Keterangan foto'),
    order: 4,
    published: true,
  },
  {
    id: 'seed-gal-5',
    title: 'Kolaborasi',
    image: '/images/gallery-05.svg',
    publicId: '',
    category: 'Kolaborasi',
    description: placeholder('Keterangan foto'),
    order: 5,
    published: true,
  },
  {
    id: 'seed-gal-6',
    title: 'Lingkungan Sekolah',
    image: '/images/gallery-06.svg',
    publicId: '',
    category: 'Lingkungan',
    description: placeholder('Keterangan foto'),
    order: 6,
    published: true,
  },
];

export type WorkContent = {
  id: string;
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

/**
 * Student work placeholders. These deliberately carry **no student names** —
 * attributing invented artwork to a named person would be worse than leaving
 * the field blank. The exhibition layout needs captions to be designed against,
 * so the captions name design categories instead.
 */
const workCategories = ['Poster', 'Branding', 'Ilustrasi', 'Fotografi', 'Desain Produk', 'Tipografi'];

export const defaultStudentWork: WorkContent[] = workCategories.map((category, index) => ({
  id: `seed-work-${index + 1}`,
  title: placeholder(`Judul karya ${category}`),
  studentName: '',
  category,
  description: placeholder('Deskripsi karya'),
  image: `/images/karya-0${index + 1}.svg`,
  publicId: '',
  year: null,
  order: index + 1,
  published: true,
}));

export type EventContent = {
  id: string;
  title: string;
  slug: string;
  description: string;
  image: string;
  publicId: string;
  date: string;
  endDate: string | null;
  location: string;
  published: boolean;
};

/** No seed events, for the same reason as news: an event is a factual claim. */
export const defaultEvents: EventContent[] = [];

export type SectionContent = {
  key: string;
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
};

/**
 * Editable section copy. Everything here is either interface language or an
 * explicit placeholder, and every one of these rows is overwritten by the
 * `site_section` table the moment the database is connected.
 */
export const defaultSections: Record<string, SectionContent> = {
  hero: {
    key: 'hero',
    eyebrow: 'SMK Jayanegara — Mojokerto, Jawa Timur',
    title: 'Tempat Keterampilan\nMenjadi Masa Depan.',
    body: '',
    ctaLabel: 'Lihat Program Keahlian',
    ctaHref: '/program-keahlian',
  },
  introduction: {
    key: 'introduction',
    eyebrow: 'Perkenalan',
    title: 'Belajar.\nBerkarya.\nBerkembang.',
    body: placeholder('Paragraf perkenalan sekolah'),
    ctaLabel: 'Tentang Kami',
    ctaHref: '/tentang',
  },
  about: {
    key: 'about',
    eyebrow: 'Tentang Kami',
    title: 'SMK\nJayanegara',
    body: placeholder('Ringkasan profil sekolah untuk halaman depan'),
    ctaLabel: 'Selengkapnya',
    ctaHref: '/tentang',
  },
  programs: {
    key: 'programs',
    eyebrow: 'Program Keahlian',
    title: 'Dua jalur,\nsatu arah.',
    body: placeholder('Kalimat pengantar program keahlian'),
    ctaLabel: 'Pelajari Program',
    ctaHref: '/program-keahlian',
  },
  experience: {
    key: 'experience',
    eyebrow: 'Kehidupan di Jayanegara',
    title: 'Hari-hari\ndi sekolah.',
    body: placeholder('Kalimat pengantar kegiatan sekolah'),
    ctaLabel: 'Lihat Kegiatan',
    ctaHref: '/kegiatan',
  },
  work: {
    key: 'work',
    eyebrow: 'Karya Siswa',
    title: 'Yang mereka\nkerjakan.',
    body: placeholder('Kalimat pengantar karya siswa'),
    ctaLabel: 'Lihat Karya',
    ctaHref: '/karya',
  },
  gallery: {
    key: 'gallery',
    eyebrow: 'Galeri',
    title: 'Sekilas\nJayanegara.',
    body: placeholder('Kalimat pengantar galeri'),
    ctaLabel: 'Lihat Galeri',
    ctaHref: '/galeri',
  },
  news: {
    key: 'news',
    eyebrow: 'Berita Terkini',
    title: 'Kabar dari\nsekolah.',
    body: '',
    ctaLabel: 'Baca Berita',
    ctaHref: '/berita',
  },
  cta: {
    key: 'cta',
    eyebrow: 'Ayo Bergabung',
    title: 'Siap\nMemulai?',
    body: placeholder('Kalimat ajakan untuk calon siswa'),
    ctaLabel: 'Informasi PPDB',
    ctaHref: '/kontak',
  },
  contact: {
    key: 'contact',
    eyebrow: 'Kontak',
    title: 'Hubungi\nKami.',
    body: placeholder('Kalimat pengantar halaman kontak'),
    ctaLabel: 'Kirim Pesan',
    ctaHref: '/kontak',
  },
  footer: {
    key: 'footer',
    eyebrow: '',
    title: '',
    body: placeholder('Kalimat penutup footer'),
    ctaLabel: '',
    ctaHref: '',
  },
};

/** Navigation, in the order and wording the language directive specifies. */
export const primaryNav = [
  { label: 'Tentang Kami', href: '/tentang' },
  { label: 'Program Keahlian', href: '/program-keahlian' },
  { label: 'Kegiatan', href: '/kegiatan' },
  { label: 'Karya Siswa', href: '/karya' },
  { label: 'Galeri', href: '/galeri' },
  { label: 'Berita', href: '/berita' },
] as const;

export const footerNav = [
  { label: 'Kontak', href: '/kontak' },
  { label: 'Informasi PPDB', href: '/kontak' },
  { label: 'Kebijakan Privasi', href: '/privasi' },
] as const;

/** Shared interface strings. Centralised so no two screens disagree. */
export const ui = {
  loading: 'Memuat…',
  saving: 'Menyimpan…',
  save: 'Simpan',
  cancel: 'Batal',
  delete: 'Hapus',
  edit: 'Edit',
  add: 'Tambah',
  upload: 'Unggah',
  publish: 'Terbitkan',
  unpublish: 'Sembunyikan',
  published: 'Terbit',
  draft: 'Draf',
  emptyNews: 'Belum ada berita.',
  emptyGallery: 'Belum ada foto di galeri.',
  emptyEvents: 'Belum ada kegiatan.',
  emptyWork: 'Belum ada karya siswa.',
  emptyGeneric: 'Belum ada data.',
  genericError: 'Terjadi kesalahan. Silakan coba lagi.',
  savedOk: 'Data berhasil disimpan.',
  deletedOk: 'Data berhasil dihapus.',
  uploadedOk: 'Gambar berhasil diunggah.',
  notFoundTitle: 'Halaman tidak ditemukan.',
  notFoundBody: 'Alamat yang Anda buka tidak tersedia atau sudah dipindahkan.',
  notFoundCta: 'Kembali ke Beranda',
  serverErrorTitle: 'Terjadi kesalahan.',
  serverErrorBody: 'Kami tidak dapat memuat halaman ini. Silakan coba lagi.',
  serverErrorCta: 'Coba Lagi',
  backHome: 'Kembali ke Beranda',
  readMore: 'Lihat Selengkapnya',
  allNews: 'Semua Berita',
  allPrograms: 'Semua Program',
  footerRights: 'Seluruh hak cipta dilindungi.',
  menuOpen: 'Buka menu',
  menuClose: 'Tutup menu',
} as const;
