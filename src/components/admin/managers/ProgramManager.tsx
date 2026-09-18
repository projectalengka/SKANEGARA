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
  TextArea,
  TextField,
  useActionNotice,
} from '@/components/admin/FormFields';
import {
  deleteProgram,
  saveProgram,
  uploadContentImage,
  type ActionResult,
} from '@/app/admin/content-actions';
import type { ProgramContent } from '@/data/defaults';
import { cn } from '@/lib/utils';

/**
 * The programme manager.
 *
 * A list where each row expands into its own edit form, rather than a list and a
 * separate edit page. For a school with two or three programmes, navigating to a
 * separate page to change one sentence is a lot of ceremony, and the expanded
 * form keeps the context — you can see the other programmes while editing one.
 *
 * The upload action is bound per-field so the field does not need to know which
 * Cloudinary folder it belongs to; that decision stays here, where it is obvious.
 */
export function ProgramManager({ programs }: { programs: ProgramContent[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { notice, clear, handle } = useActionNotice();
  const router = useRouter();

  const upload = (formData: FormData) => uploadContentImage(formData, 'program');

  const onDelete = (id: string) => async (): Promise<ActionResult> => {
    const result = await deleteProgram(id);
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
          {creating ? 'Tutup Formulir' : 'Tambah Program'}
          <span className="btn__arrow" aria-hidden="true">
            {creating ? '↑' : '+'}
          </span>
        </button>
        <p className="label text-[var(--color-text-muted)]">
          {String(programs.length).padStart(2, '0')} program tersimpan
        </p>
      </div>

      {creating ? (
        <div className="mb-8 border border-[var(--color-ink)] bg-[var(--color-paper)] px-6 py-7">
          <h2 className="display text-[1.5rem]">Program Baru</h2>
          <p className="mt-2 text-[0.9375rem] text-[var(--color-text-muted)]">
            Isi nama program, lalu simpan. Deskripsi dan gambar dapat dilengkapi setelahnya.
          </p>

          <div className="mt-6">
            <ActionForm
              action={saveProgram}
              submitLabel="Tambah Program"
              successReset
              onSuccess={() => {
                router.refresh();
                setCreating(false);
              }}
            >
              {(state) => (
                <ProgramFields
                  upload={upload}
                  errors={state?.fieldErrors ?? {}}
                  showOrder={false}
                />
              )}
            </ActionForm>
          </div>
        </div>
      ) : null}

      {programs.length === 0 ? (
        <p className="border border-dashed border-[var(--color-line)] px-6 py-12 text-center text-[var(--color-text-muted)]">
          Belum ada data.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {programs.map((program) => {
            const isOpen = openId === program.id;

            return (
              <li key={program.id} className="border border-[var(--color-line)] bg-[var(--color-paper)]">
                <div className="flex items-center gap-5 px-5 py-5">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden border border-[var(--color-line)]">
                    {program.image ? (
                      <Image src={program.image} alt="" fill sizes="64px" className="object-cover" />
                    ) : (
                      <div className="h-full w-full bg-[var(--color-paper-warm)]" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate">{program.name}</p>
                    <p className="label mt-1.5 text-[var(--color-text-faint)]">
                      /program-keahlian/{program.slug} · urutan {program.order}
                    </p>
                  </div>

                  <span
                    className={cn(
                      'label hidden shrink-0 sm:block',
                      program.published ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-accent-deep)]',
                    )}
                  >
                    {program.published ? 'Terbit' : 'Draf'}
                  </span>

                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : program.id)}
                    aria-expanded={isOpen}
                    className="label shrink-0 border border-[var(--color-line)] px-3 py-2 transition-colors duration-300 hover:border-[var(--color-ink)]"
                  >
                    {isOpen ? 'Tutup' : 'Edit'}
                  </button>
                </div>

                {isOpen ? (
                  <div className="border-t border-[var(--color-line)] px-6 py-7">
                    <ActionForm
                      action={saveProgram}
                      submitLabel="Simpan Perubahan"
                      onSuccess={() => router.refresh()}
                    >
                      {(state) => (
                        <ProgramFields
                          upload={upload}
                          errors={state?.fieldErrors ?? {}}
                          program={program}
                        />
                      )}
                    </ActionForm>

                    <div className="mt-6 flex items-center justify-between gap-4 border-t border-[var(--color-line)] pt-5">
                      <p className="text-[0.875rem] text-[var(--color-text-muted)]">
                        Menghapus program juga menghapus gambarnya dari penyimpanan.
                      </p>
                      <DeleteButton action={onDelete(program.id)} onDone={handle} />
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

/** The programme fields, shared by the create form and the inline edit form. */
function ProgramFields({
  program,
  errors,
  upload,
  showOrder = true,
}: {
  program?: ProgramContent;
  errors: Record<string, string>;
  upload: (formData: FormData) => Promise<
    { ok: true; url: string; publicId: string } | { ok: false; message: string }
  >;
  showOrder?: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      {program ? <input type="hidden" name="id" value={program.id} /> : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <TextField
          name="name"
          label="Nama Program"
          defaultValue={program?.name ?? ''}
          required
          error={errors.name}
        />
        <TextField
          name="slug"
          label="Slug URL"
          hint="Kosongkan untuk dibuat otomatis dari nama."
          defaultValue={program?.slug ?? ''}
          error={errors.slug}
        />
      </div>

      <TextArea
        name="shortDescription"
        label="Deskripsi Singkat"
        hint="Satu sampai dua kalimat. Tampil pada daftar program di halaman depan."
        defaultValue={program?.shortDescription ?? ''}
        rows={3}
        error={errors.shortDescription}
      />

      <TextArea
        name="description"
        label="Deskripsi Lengkap"
        hint="Tampil pada halaman detail program."
        defaultValue={program?.description ?? ''}
        rows={6}
      />

      <TextArea
        name="features"
        label="Kompetensi"
        hint="Satu poin per baris. Contoh: Dasar desain grafis"
        defaultValue={program?.features.join('\n') ?? ''}
        rows={5}
      />

      <ImageUploadField
        name="image"
        label="Gambar Program"
        upload={upload}
        defaultUrl={program?.image ?? ''}
        defaultPublicId={program?.imagePublicId ?? ''}
        hint="Gunakan foto orientasi tegak (portrait) agar tampil konsisten."
        error={errors.image}
      />

      <div className="grid gap-6 sm:grid-cols-2">
        {showOrder ? (
          <TextField
            name="order"
            label="Urutan Tampil"
            type="number"
            hint="Angka kecil tampil lebih dahulu."
            defaultValue={String(program?.order ?? 0)}
          />
        ) : (
          <input type="hidden" name="order" value={String((program?.order ?? 0) + 1)} />
        )}

        <div className="flex items-end pb-2">
          <CheckboxField
            name="published"
            label="Terbitkan"
            hint="Jika tidak dicentang, program tidak tampil di situs publik."
            defaultChecked={program?.published ?? true}
          />
        </div>
      </div>
    </div>
  );
}
