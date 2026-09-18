'use client';

import { ActionForm, TextArea, TextField } from '@/components/admin/FormFields';
import { saveSection } from '@/app/admin/content-actions';
import type { SectionContent } from '@/data/defaults';

/**
 * The section-copy editor.
 *
 * This is what makes the brief's "all copy must be editable" requirement true
 * rather than aspirational. Every heading, eyebrow, standfirst and button label
 * the public site renders from `SiteSection` is writable here, grouped by the
 * section it belongs to and labelled with where it appears.
 *
 * The labels name the *page position* ("Judul di bagian hero halaman depan")
 * rather than the database key, because the person editing this knows the page
 * and not the schema.
 */

const SECTION_LABELS: Record<string, { title: string; description: string }> = {
  hero: {
    title: 'Hero (Halaman Depan, Paling Atas)',
    description: 'Bagian pertama yang dilihat pengunjung. Judul di sini adalah headline utama.',
  },
  introduction: {
    title: 'Perkenalan',
    description: 'Tiga kata besar dan satu paragraf pembuka setelah hero.',
  },
  about: {
    title: 'Tentang Kami (Halaman Depan)',
    description: 'Ringkasan profil sekolah pada halaman depan. Teks lengkap diatur di halaman Profil Sekolah.',
  },
  programs: {
    title: 'Program Keahlian (Halaman Depan)',
    description: 'Judul dan pengantar daftar program keahlian.',
  },
  experience: {
    title: 'Kehidupan di Jayanegara',
    description: 'Bagian foto kegiatan pada halaman depan.',
  },
  work: {
    title: 'Karya Siswa (Halaman Depan)',
    description: 'Judul dan pengantar bagian karya siswa.',
  },
  gallery: {
    title: 'Galeri (Halaman Depan)',
    description: 'Judul dan pengantar bagian galeri.',
  },
  news: {
    title: 'Berita Terkini (Halaman Depan)',
    description: 'Judul dan pengantar bagian berita.',
  },
  cta: {
    title: 'Ajakan Bergabung',
    description: 'Bagian besar berwarna hitam di bagian bawah halaman depan.',
  },
  contact: {
    title: 'Halaman Kontak',
    description: 'Judul halaman Kontak.',
  },
  footer: {
    title: 'Footer',
    description: 'Kalimat pada bagian bawah setiap halaman.',
  },
};

export function SectionEditor({ sections }: { sections: SectionContent[] }) {
  return (
    <div className="flex flex-col gap-8">
      {sections.map((section) => {
        const meta = SECTION_LABELS[section.key] ?? {
          title: section.key,
          description: '',
        };

        return (
          <section
            key={section.key}
            className="border border-[var(--color-line)] bg-[var(--color-paper)] px-6 py-6"
          >
            <header className="border-b border-[var(--color-line)] pb-5">
              <h2 className="display text-[1.35rem]">{meta.title}</h2>
              {meta.description ? (
                <p className="mt-2 text-[0.9375rem] text-[var(--color-text-muted)]">{meta.description}</p>
              ) : null}
              <p className="label mt-3 text-[var(--color-text-faint)]">Kunci: {section.key}</p>
            </header>

            <div className="mt-6">
              <ActionForm action={saveSection} submitLabel="Simpan Bagian Ini">
                {() => (
                  <div className="flex flex-col gap-6">
                    <input type="hidden" name="key" value={section.key} />

                    <div className="grid gap-6 sm:grid-cols-2">
                      <TextField
                        name="eyebrow"
                        label="Label Kecil (eyebrow)"
                        hint="Teks kecil di atas judul. Contoh: Tentang Kami"
                        defaultValue={section.eyebrow}
                      />
                      <TextField
                        name="ctaLabel"
                        label="Teks Tombol"
                        hint="Kosongkan bila bagian ini tidak memiliki tombol."
                        defaultValue={section.ctaLabel}
                      />
                    </div>

                    <TextArea
                      name="title"
                      label="Judul"
                      hint="Satu baris per baris judul. Baris terakhir otomatis ditampilkan miring."
                      defaultValue={section.title}
                      rows={3}
                    />

                    <TextField
                      name="ctaHref"
                      label="Tautan Tombol"
                      hint="Contoh: /program-keahlian"
                      defaultValue={section.ctaHref}
                    />

                    <TextArea
                      name="body"
                      label="Teks Isi"
                      hint="Paragraf pendukung. Biarkan kosong bila bagian ini hanya berisi judul."
                      defaultValue={section.body}
                      rows={4}
                    />
                  </div>
                )}
              </ActionForm>
            </div>
          </section>
        );
      })}
    </div>
  );
}
