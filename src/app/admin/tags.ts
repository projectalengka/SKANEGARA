/**
 * Cache tags, and the dashboard navigation.
 *
 * ## Why these are literals and not imported from `@/lib/content`
 *
 * The obvious de-duplication — re-export the tag strings from the module that
 * applies them with `cacheTag` — is a build-breaking mistake, and it is worth
 * recording why so nobody "fixes" it back.
 *
 * This module is imported by `AdminShell`, which is a **client** component (it
 * needs the active path and the mobile menu state). `@/lib/content` imports
 * `@/lib/db`, which imports the `pg` driver for its connection pool. Pulling
 * that chain into a client component makes webpack try to bundle Node's `net`
 * and `tls` into the browser bundle, and the build fails with
 * `Module not found: Can't resolve 'net'`.
 *
 * So the tags stay literals here, and `tests/content.test.ts` asserts that this
 * object and the `tags` object in `@/lib/content` are equal key by key. That
 * test is the guard against drift — it is checked by the quality gate on every
 * run, which an import could not be without breaking the browser build.
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
