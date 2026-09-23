'use client';

import { ActionForm, TextArea, TextField } from '@/components/admin/FormFields';
import { saveSchoolProfile } from '@/app/admin/content-actions';
import type { SchoolProfileContent } from '@/data/defaults';

/**
 * The school profile form.
 *
 * One form for the whole profile rather than a field-by-field save. The reason is
 * practical: an administrator filling in six fields does not want six save
 * buttons, and a partial save leaves the public site in a half-updated state that
 * is hard to reason about.
 *
 * The layout groups the fields by what they are for — identity, description,
 * contact — rather than by database column order, because the person filling
 * this in is thinking about the school, not about the schema.
 */
export function SchoolProfileForm({ profile }: { profile: SchoolProfileContent }) {
  return (
    <ActionForm action={saveSchoolProfile} submitLabel="Simpan Profil">
      {(state) => {
        const errors = state?.fieldErrors ?? {};

        return (
          <div className="flex flex-col gap-8">
            <section className="border border-[var(--color-line)] bg-[var(--color-paper)] px-6 py-6">
              <h2 className="display text-[length:var(--step-3)]">Identitas</h2>
              <p className="mt-2 text-[length:var(--step-0)] text-[var(--color-text-muted)]">
                Nama sekolah dan tagline yang tampil di halaman depan.
              </p>

              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <TextField
                  name="schoolName"
                  label="Nama Sekolah"
                  defaultValue={profile.schoolName}
                  required
                  error={errors.schoolName}
                />
                <TextField
                  name="tagline"
                  label="Tagline"
                  hint="Satu kalimat singkat dalam Bahasa Indonesia."
                  defaultValue={profile.tagline}
                  required
                  error={errors.tagline}
                />
              </div>

              <div className="mt-6">
                <TextArea
                  name="heroLines"
                  label="Baris Judul Hero"
                  hint="Satu baris per baris judul. Maksimal dua baris agar tetap terbaca."
                  defaultValue={profile.heroLines.join('\n')}
                  rows={2}
                />
              </div>
            </section>

            <section className="border border-[var(--color-line)] bg-[var(--color-paper)] px-6 py-6">
              <h2 className="display text-[length:var(--step-3)]">Deskripsi &amp; Sejarah</h2>
              <p className="mt-2 text-[length:var(--step-0)] text-[var(--color-text-muted)]">
                Teks ini tampil pada halaman Tentang Kami dan ringkasannya di halaman depan.
              </p>

              <div className="mt-6 flex flex-col gap-6">
                <TextArea
                  name="description"
                  label="Deskripsi Singkat"
                  hint="Dua sampai tiga kalimat. Tampil juga sebagai deskripsi situs di hasil pencarian."
                  defaultValue={profile.description}
                  rows={4}
                  error={errors.description}
                />
                <TextArea
                  name="history"
                  label="Sejarah Sekolah"
                  hint="Tuliskan tahun berdiri dan latar belakang sekolah."
                  defaultValue={profile.history}
                  rows={6}
                />
              </div>
            </section>

            <section className="border border-[var(--color-line)] bg-[var(--color-paper)] px-6 py-6">
              <h2 className="display text-[length:var(--step-3)]">Visi &amp; Misi</h2>

              <div className="mt-6 flex flex-col gap-6">
                <TextArea
                  name="vision"
                  label="Visi"
                  hint="Satu kalimat."
                  defaultValue={profile.vision}
                  rows={3}
                />
                <TextArea
                  name="mission"
                  label="Misi"
                  hint="Satu poin per baris."
                  defaultValue={profile.mission.join('\n')}
                  rows={6}
                />
              </div>
            </section>

            <section className="border border-[var(--color-line)] bg-[var(--color-paper)] px-6 py-6">
              <h2 className="display text-[length:var(--step-3)]">Alamat &amp; Kontak</h2>
              <p className="mt-2 text-[length:var(--step-0)] text-[var(--color-text-muted)]">
                Data ini tampil pada footer, halaman Kontak, dan halaman Tentang Kami.
              </p>

              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <TextField
                    name="address"
                    label="Alamat Lengkap"
                    hint="Nama jalan, nomor, RT/RW, kode pos."
                    defaultValue={profile.address}
                  />
                </div>
                <TextField name="city" label="Kota/Kabupaten" defaultValue={profile.city} />
                <TextField name="province" label="Provinsi" defaultValue={profile.province} />
                <TextField
                  name="phone"
                  label="Telepon"
                  type="tel"
                  hint="Contoh: (0321) 123456"
                  defaultValue={profile.phone}
                />
                <TextField
                  name="whatsapp"
                  label="WhatsApp"
                  type="tel"
                  hint="Nomor lokal atau internasional. Contoh: 08123456789"
                  defaultValue={profile.whatsapp}
                />
                <TextField
                  name="email"
                  label="Email"
                  type="email"
                  hint="Contoh: info@smkjayanegara.sch.id"
                  defaultValue={profile.email}
                />
                <TextField
                  name="mapsUrl"
                  label="Tautan Peta"
                  type="url"
                  hint="Tautan Google Maps ke lokasi sekolah."
                  defaultValue={profile.mapsUrl}
                />
              </div>
            </section>

            <section className="border border-[var(--color-line)] bg-[var(--color-paper)] px-6 py-6">
              <h2 className="display text-[length:var(--step-3)]">Media Sosial</h2>
              <p className="mt-2 text-[length:var(--step-0)] text-[var(--color-text-muted)]">
                Kosongkan bila sekolah belum memiliki akun. Ikonnya hanya tampil jika tautan diisi.
              </p>

              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <TextField
                  name="instagram"
                  label="Instagram"
                  type="url"
                  hint="Alamat lengkap, contoh: https://instagram.com/smkjayanegara"
                  defaultValue={profile.instagram}
                />
                <TextField
                  name="youtube"
                  label="YouTube"
                  type="url"
                  hint="Alamat lengkap kanal sekolah."
                  defaultValue={profile.youtube}
                />
              </div>
            </section>
          </div>
        );
      }}
    </ActionForm>
  );
}
