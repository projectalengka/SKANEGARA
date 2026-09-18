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
  deleteGalleryItem,
  saveGalleryItem,
  uploadContentImage,
  type ActionResult,
} from '@/app/admin/content-actions';
import type { GalleryContent } from '@/data/defaults';

/**
 * The gallery manager.
 *
 * A visual grid rather than a list, because a gallery *is* the images — an
 * administrator reordering photos needs to see them, and a row of filenames tells
 * them nothing.
 *
 * `order` is a plain number field rather than drag-and-drop. That is a deliberate
 * trade: drag-and-drop needs a library, keyboard support and a touch fallback to
 * be accessible, and the galleries here have six to twenty items where a number
 * is faster than a drag. If that stops being true, this is the seam.
 */

const CATEGORIES = ['Belajar', 'Workshop', 'Kegiatan', 'Proyek', 'Kolaborasi', 'Lingkungan', 'Prestasi', 'Umum'] as const;

export function GalleryManager({ items }: { items: GalleryContent[] }) {
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const { notice, clear, handle } = useActionNotice();
  const router = useRouter();

  const upload = (formData: FormData) => uploadContentImage(formData, 'galeri');

  const onDelete = (id: string) => async (): Promise<ActionResult> => {
    const result = await deleteGalleryItem(id);
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
          {creating ? 'Tutup Formulir' : 'Tambah Foto'}
          <span className="btn__arrow" aria-hidden="true">
            {creating ? '↑' : '+'}
          </span>
        </button>
        <p className="label text-[var(--color-text-muted)]">
          {String(items.length).padStart(2, '0')} foto tersimpan
        </p>
      </div>

      {creating ? (
        <div className="mb-8 border border-[var(--color-ink)] bg-[var(--color-paper)] px-6 py-7">
          <h2 className="display text-[1.5rem]">Foto Baru</h2>
          <p className="mt-2 text-[0.9375rem] text-[var(--color-text-muted)]">
            Unggah gambar, isi judul dan keterangannya, lalu simpan.
          </p>

          <div className="mt-6">
            <ActionForm
              action={saveGalleryItem}
              submitLabel="Tambah Foto"
              successReset
              onSuccess={() => {
                router.refresh();
                setCreating(false);
              }}
            >
              {(state) => (
                <GalleryFields upload={upload} errors={state?.fieldErrors ?? {}} />
              )}
            </ActionForm>
          </div>
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="border border-dashed border-[var(--color-line)] px-6 py-12 text-center text-[var(--color-text-muted)]">
          Belum ada foto di galeri.
        </p>
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const isOpen = openId === item.id;

              return (
                <li key={item.id} className="border border-[var(--color-line)] bg-[var(--color-paper)]">
                  <div className="relative aspect-4/3 overflow-hidden">
                    <Image src={item.image} alt="" fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" />
                    <span className="label absolute top-3 left-3 bg-[var(--color-ink)] px-2 py-1 text-[var(--color-paper)]">
                      {String(item.order).padStart(2, '0')}
                    </span>
                    {!item.published ? (
                      <span className="label absolute top-3 right-3 bg-[var(--color-accent)] px-2 py-1 text-[var(--color-paper)]">
                        Draf
                      </span>
                    ) : null}
                  </div>

                  <div className="px-4 py-4">
                    <p className="truncate text-[0.9375rem]">{item.title}</p>
                    <p className="label mt-1.5 text-[var(--color-text-faint)]">{item.category}</p>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setOpenId(isOpen ? null : item.id)}
                        aria-expanded={isOpen}
                        className="label border border-[var(--color-line)] px-3 py-2 transition-colors duration-300 hover:border-[var(--color-ink)]"
                      >
                        {isOpen ? 'Tutup' : 'Edit'}
                      </button>
                      <DeleteButton action={onDelete(item.id)} onDone={handle} />
                    </div>
                  </div>

                  {isOpen ? (
                    <div className="border-t border-[var(--color-line)] px-4 py-5">
                      <ActionForm
                        action={saveGalleryItem}
                        submitLabel="Simpan"
                        onSuccess={() => router.refresh()}
                      >
                        {(state) => (
                          <GalleryFields
                            upload={upload}
                            errors={state?.fieldErrors ?? {}}
                            item={item}
                          />
                        )}
                      </ActionForm>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <p className="mt-6 text-[0.9375rem] text-[var(--color-text-muted)]">
            Urutan tampil mengikuti angka pada kolom Urutan. Angka kecil tampil lebih dahulu.
          </p>
        </>
      )}
    </>
  );
}

function GalleryFields({
  item,
  errors,
  upload,
}: {
  item?: GalleryContent;
  errors: Record<string, string>;
  upload: (formData: FormData) => Promise<
    { ok: true; url: string; publicId: string } | { ok: false; message: string }
  >;
}) {
  return (
    <div className="flex flex-col gap-6">
      {item ? <input type="hidden" name="id" value={item.id} /> : null}

      <ImageUploadField
        name="image"
        label="Gambar"
        upload={upload}
        defaultUrl={item?.image ?? ''}
        defaultPublicId={item?.publicId ?? ''}
        error={errors.image}
      />

      <TextField
        name="title"
        label="Judul Foto"
        hint="Singkat dan deskriptif. Dibaca pengunjung pada keterangan foto."
        defaultValue={item?.title ?? ''}
        required
        error={errors.title}
      />

      <TextArea
        name="description"
        label="Keterangan"
        hint="Opsional. Tampil pada tampilan layar penuh."
        defaultValue={item?.description ?? ''}
        rows={3}
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <SelectField
          name="category"
          label="Kategori"
          options={CATEGORIES}
          defaultValue={item?.category ?? 'Umum'}
        />
        <TextField
          name="order"
          label="Urutan"
          type="number"
          defaultValue={String(item?.order ?? 0)}
        />
      </div>

      <CheckboxField
        name="published"
        label="Tampilkan di galeri"
        defaultChecked={item?.published ?? true}
      />
    </div>
  );
}
