/**
 * Cache tags.
 *
 * Extracted into their own module because of a hard constraint in Next.js: a
 * module marked `'use server'` may only export async functions, so the tag
 * constants cannot live alongside the actions that use them. Sharing them from
 * one file is what keeps `revalidateTag('berita')` in the actions and
 * `cacheTag('berita')` in the reads from drifting apart — and a drifted tag is a
 * silent bug where an edit simply never appears.
 */
export const mainTags = {
  profile: 'profil',
  programs: 'program',
  news: 'berita',
  gallery: 'galeri',
  work: 'karya',
  events: 'kegiatan',
  sections: 'bagian',
} as const;

export type ContentTag = (typeof mainTags)[keyof typeof mainTags];

/** Admin navigation, in the order the brief specifies. */
export const adminNav = [
  {
    label: 'Konten',
    items: [
      { label: 'Dasbor', href: '/admin/dasbor' },
      { label: 'Profil Sekolah', href: '/admin/profil' },
      { label: 'Program Keahlian', href: '/admin/program' },
      { label: 'Berita', href: '/admin/berita' },
      { label: 'Galeri', href: '/admin/galeri' },
      { label: 'Karya Siswa', href: '/admin/karya' },
      { label: 'Kegiatan', href: '/admin/kegiatan' },
    ],
  },
  {
    label: 'Pengaturan',
    items: [
      { label: 'Teks Bagian', href: '/admin/bagian' },
      { label: 'Pengaturan', href: '/admin/pengaturan' },
    ],
  },
] as const;
