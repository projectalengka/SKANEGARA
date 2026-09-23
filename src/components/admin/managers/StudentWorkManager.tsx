'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ActionForm,
  ActionNotice,
  CheckboxField,
  DeleteButton,
  ImageUploadField,
  SelectField,
  TextArea,
  TextField,
  useActionNotice,
} from '@/components/admin/FormFields';
import {
  deleteStudentWork,
  saveStudentWork,
  uploadContentImage,
  type ActionResult,
} from '@/app/admin/content-actions';
import type { WorkContent } from '@/data/defaults';

/**
 * The student work manager.
 *
 * The student's name is an optional field, and the form says so explicitly. That
 * matters for a school: publishing a named minor's work without a consent process
 * is a real risk, and the honest default is to leave the field blank until
 * someone has checked. The public site only renders the name when it is filled
 * in, so an unattributed plate looks intentional rather than broken.
 */

const CATEGORIES = [
  'Poster',
  'Branding',
  'Ilustrasi',
  'Fotografi',
  'Video',
  'Tipografi',
  'Desain Produk',
  'Desain Komunikasi Visual',
] as const;

export function StudentWorkManager({ works }: { works: WorkContent[] }) {
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const { notice, clear, handle } = useActionNotice();
  const router = useRouter();

  const upload = (formData: FormData) => uploadContentImage(formData, 'karya');

  const onDelete = (id: string) => async (): Promise<ActionResult> => {
    const result = await deleteStudentWork(id);
    if (result.ok) router.refresh();
    return result;
  };

  return (
    <>
      <ActionNotice notice={notice} onDismiss={clear} />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setCreating((value) => !value);
            setOpenId(null);
          }}
          className="btn btn--solid"
        >
          {creating ? 'Tutup Formulir' : 'Tambah Karya'}
          <span className="btn__arrow" aria-hidden="true">
            {creating ? '↑' : '+'}
          </span>
        </button>
        <p className="label text-[var(--color-text-muted)]">
          {String(works.length).padStart(2, '0')} karya tersimpan
        </p>
      </div>

      {creating ? (
        <div className="mb-8 border border-[var(--color-ink)] bg-[var(--color-paper)] px-6 py-7">
          <h2 className="display text-[length:var(--step-3)]">Karya Baru</h2>
          <div className="mt-6">
            <ActionForm
              action={saveStudentWork}
              submitLabel="Tambah Karya"
              successReset
              onSuccess={() => {
                router.refresh();
                setCreating(false);
              }}
            >
              {(state) => <WorkFields upload={upload} errors={state?.fieldErrors ?? {}} />}
            </ActionForm>
          </div>
        </div>
      ) : null}

      {works.length === 0 ? (
        <p className="border border-dashed border-[var(--color-line)] px-6 py-12 text-center text-[var(--color-text-muted)]">
          Belum ada karya siswa.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {works.map((work) => {
            const isOpen = openId === work.id;

            return (
              <li key={work.id} className="border border-[var(--color-line)] bg-[var(--color-paper)]">
                <div className="flex items-center gap-5 px-5 py-5">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden border border-[var(--color-line)]">
                    <Image src={work.image} alt="" fill sizes="64px" className="object-cover" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate">{work.title}</p>
                    <p className="label mt-1.5 text-[var(--color-text-faint)]">
                      {work.category}
                      {work.studentName ? ` · ${work.studentName}` : ' · tanpa nama siswa'}
                      {work.year ? ` · ${work.year}` : ''}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : work.id)}
                    aria-expanded={isOpen}
                    className="label shrink-0 border border-[var(--color-line)] px-3 py-2 transition-colors duration-300 hover:border-[var(--color-ink)]"
                  >
                    {isOpen ? 'Tutup' : 'Edit'}
                  </button>
                </div>

                {isOpen ? (
                  <div className="border-t border-[var(--color-line)] px-6 py-6">
                    <ActionForm
                      action={saveStudentWork}
                      submitLabel="Simpan Perubahan"
                      onSuccess={() => router.refresh()}
                    >
                      {(state) => (
                        <WorkFields upload={upload} errors={state?.fieldErrors ?? {}} work={work} />
                      )}
                    </ActionForm>

                    <div className="mt-6 border-t border-[var(--color-line)] pt-5">
                      <DeleteButton action={onDelete(work.id)} onDone={handle} />
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function WorkFields({
  work,
  errors,
  upload,
}: {
  work?: WorkContent;
  errors: Record<string, string>;
  upload: (formData: FormData) => Promise<
    { ok: true; url: string; publicId: string } | { ok: false; message: string }
  >;
}) {
  return (
    <div className="flex flex-col gap-6">
      {work ? <input type="hidden" name="id" value={work.id} /> : null}

      <ImageUploadField
        name="image"
        label="Gambar Karya"
        upload={upload}
        defaultUrl={work?.image ?? ''}
        defaultPublicId={work?.publicId ?? ''}
        hint="Gunakan foto orientasi tegak (portrait) agar seragam dengan karya lain."
        error={errors.image}
      />

      <TextField
        name="title"
        label="Judul Karya"
        defaultValue={work?.title ?? ''}
        required
        error={errors.title}
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <SelectField
          name="category"
          label="Kategori"
          options={CATEGORIES}
          defaultValue={work?.category ?? 'Desain Komunikasi Visual'}
        />
        <TextField
          name="studentName"
          label="Nama Siswa (opsional)"
          hint="Kosongkan bila belum ada izin menampilkan nama."
          defaultValue={work?.studentName ?? ''}
        />
        <TextField
          name="year"
          label="Tahun (opsional)"
          type="number"
          defaultValue={work?.year ? String(work.year) : ''}
        />
        <TextField
          name="order"
          label="Urutan"
          type="number"
          defaultValue={String(work?.order ?? 0)}
        />
      </div>

      <TextArea
        name="description"
        label="Deskripsi Karya (opsional)"
        defaultValue={work?.description ?? ''}
        rows={3}
      />

      <CheckboxField
        name="published"
        label="Tampilkan di situs"
        defaultChecked={work?.published ?? true}
      />
    </div>
  );
}
