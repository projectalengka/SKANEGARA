'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  ActionForm,
  ActionNotice,
  CheckboxField,
  DeleteButton,
  SelectField,
  TextArea,
  useActionNotice,
} from '@/components/admin/FormFields';
import { deleteNews, toggleNewsPublished, type ActionResult } from '@/app/admin/content-actions';
import { isSampleId } from '@/lib/sample-id';
import { SampleContentPanel, SampleRowBadge } from '@/components/admin/SampleContentPanel';
import type { NewsContent } from '@/data/defaults';
import { cn, formatDateId, slugify } from '@/lib/utils';

/**
 * The news list.
 *
 * The primary CMS screen, so it carries more than the others: a status filter, a
 * one-click publish toggle, and slug generation as you type the title.
 *
 * The slug preview is the detail that matters most. An administrator typing a
 * title sees the URL it will produce, live — which means they find out *before*
 * publishing that "PPDB 2026/2027" becomes `ppdb-2026-2027` rather than a broken
 * route, and they can override it if they want something cleaner.
 */

const CATEGORIES = ['Umum', 'Kegiatan', 'Prestasi', 'Pengumuman', 'PPDB', 'Akademik'] as const;

type Filter = 'semua' | 'terbit' | 'draf';

export function NewsManager({ news }: { news: NewsContent[] }) {
  const [filter, setFilter] = useState<Filter>('semua');
  const { notice, clear, handle } = useActionNotice();
  const router = useRouter();

  const filtered = news.filter((item) => {
    if (filter === 'terbit') return item.published;
    if (filter === 'draf') return !item.published;
    return true;
  });

  const counts = {
    semua: news.length,
    terbit: news.filter((item) => item.published).length,
    draf: news.filter((item) => !item.published).length,
  };

  const sampleCount = news.filter((item) => isSampleId(item.id)).length;

  const onToggle = (id: string, published: boolean) => async (): Promise<ActionResult> => {
    const result = await toggleNewsPublished(id, published);
    if (result.ok) router.refresh();
    return result;
  };

  const onDelete = (id: string) => async (): Promise<ActionResult> => {
    const result = await deleteNews(id);
    if (result.ok) router.refresh();
    return result;
  };

  return (
    <>
      <ActionNotice notice={notice} onDismiss={clear} />

      <SampleContentPanel collection="berita" count={sampleCount} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div role="group" aria-label="Saring berita" className="flex flex-wrap gap-2">
          {(['semua', 'terbit', 'draf'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={cn(
                'label border px-4 py-2.5 transition-colors duration-300',
                filter === value
                  ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)]'
                  : 'border-[var(--color-line)] text-[var(--color-text-muted)] hover:border-[var(--color-ink)] hover:text-[var(--color-text)]',
              )}
            >
              {value === 'semua' ? 'Semua' : value === 'terbit' ? 'Terbit' : 'Draf'} ({counts[value]})
            </button>
          ))}
        </div>

        <Link href="/admin/berita/baru" className="btn btn--solid">
          Tulis Berita
          <span className="btn__arrow" aria-hidden="true">
            +
          </span>
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-[var(--color-line)] px-6 py-14 text-center">
          <p className="display text-[length:var(--step-3)]">
            {filter === 'semua' ? 'Belum ada berita.' : `Belum ada berita berstatus ${filter}.`}
          </p>
          <p className="mx-auto mt-3 max-w-md text-[var(--color-text-muted)]">
            Berita yang Anda terbitkan akan langsung tampil pada halaman Berita di situs publik.
          </p>
          <Link href="/admin/berita/baru" className="btn btn--solid mt-7">
            Tulis Berita Pertama
            <span className="btn__arrow" aria-hidden="true">
              →
            </span>
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {filtered.map((item) => {
            const isSample = isSampleId(item.id);

            return (
              <li key={item.id} className="border border-[var(--color-line)] bg-[var(--color-paper)]">
                <div className="flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-center">
                  <div className="relative h-20 w-full shrink-0 overflow-hidden border border-[var(--color-line)] sm:h-16 sm:w-24">
                    {item.coverImage ? (
                      <Image src={item.coverImage} alt="" fill sizes="96px" className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[var(--color-paper-warm)]">
                        <span className="label text-[var(--color-text-faint)]">Tanpa gambar</span>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate">{item.title}</p>
                    <p className="label mt-1.5 text-[var(--color-text-faint)]">
                      {formatDateId(item.publishedAt ?? item.createdAt)} · {item.category}
                      {item.published ? '' : ' · belum diterbitkan'}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {isSample ? (
                      <SampleRowBadge />
                    ) : (
                      <>
                        <PublishToggle
                          published={item.published}
                          action={onToggle(item.id, !item.published)}
                          onDone={handle}
                        />

                        <Link
                          href={`/admin/berita/${item.id}`}
                          className="label border border-[var(--color-line)] px-3 py-2 transition-colors duration-300 hover:border-[var(--color-ink)]"
                        >
                          Edit
                        </Link>

                        <DeleteButton action={onDelete(item.id)} onDone={handle} />
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

/**
 * The publish toggle.
 *
 * A single button rather than a checkbox, and it does not require saving the
 * form. Publishing is a decision made while scanning the list, and making the
 * administrator open an article to flip its status is the single most annoying
 * thing a CMS can do.
 */
function PublishToggle({
  published,
  action,
  onDone,
}: {
  published: boolean;
  action: () => Promise<ActionResult>;
  onDone: (result: ActionResult) => void;
}) {
  const [pending, setPending] = useState(false);

  const handle = async () => {
    setPending(true);
    const result = await action();
    onDone(result);
    setPending(false);
  };

  return (
    <button
      type="button"
      onClick={handle}
      disabled={pending}
      className={cn(
        'label border px-3 py-2 transition-colors duration-300',
        published
          ? 'border-[var(--color-line)] text-[var(--color-text)] hover:border-[var(--color-ink)]'
          : 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-paper)]',
      )}
    >
      {pending ? '…' : published ? 'Sembunyikan' : 'Terbitkan'}
    </button>
  );
}

/**
 * The article form.
 *
 * Titled panels for each block, and the slug preview described above.
 * `slugify` here is the same function the server action uses, imported from the
 * shared utility — so the preview cannot disagree with what the server saves.
 */
export function NewsForm({
  article,
  action,
}: {
  article?: NewsContent;
  action: (formData: FormData) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const [slug, setSlug] = useState(article?.slug ?? '');
  const [titleValue, setTitleValue] = useState(article?.title ?? '');

  return (
    <ActionForm action={action} submitLabel="Simpan Berita" onSuccess={() => router.refresh()}>
      {(state) => {
        const errors = state?.fieldErrors ?? {};

        return (
          <div className="flex flex-col gap-8">
            {article ? <input type="hidden" name="id" value={article.id} /> : null}

            <section className="border border-[var(--color-line)] bg-[var(--color-paper)] px-6 py-6">
              <h2 className="display text-[length:var(--step-3)]">Isi Berita</h2>

              <div className="mt-6 flex flex-col gap-6">
                <div className="field">
                  <label className="field__label" htmlFor="bidang-title">
                    Judul <span className="text-[var(--color-accent)]">*</span>
                  </label>
                  <input
                    id="bidang-title"
                    name="title"
                    type="text"
                    required
                    defaultValue={article?.title ?? ''}
                    aria-invalid={Boolean(errors.title)}
                    aria-describedby={errors.title ? 'galat-title' : undefined}
                    className="field__input"
                    placeholder="Judul berita"
                    onChange={(event) => setTitleValue(event.target.value)}
                  />
                  {errors.title ? (
                    <p id="galat-title" className="field__hint !text-[var(--color-accent-deep)]">
                      {errors.title}
                    </p>
                  ) : (
                    <p className="field__hint">Tulis satu kalimat yang jelas. Hindari huruf kapital semua.</p>
                  )}
                </div>

                <div className="field">
                  <label className="field__label" htmlFor="bidang-slug">
                    Slug URL
                  </label>
                  <input
                    id="bidang-slug"
                    name="slug"
                    type="text"
                    defaultValue={article?.slug ?? ''}
                    aria-invalid={Boolean(errors.slug)}
                    aria-describedby="bantuan-slug"
                    className="field__input"
                    placeholder={slugify(titleValue || 'judul-berita')}
                    onChange={(event) => setSlug(event.target.value)}
                  />
                  <p id="bantuan-slug" className="field__hint">
                    Alamat halaman:{' '}
                    <code className="font-[family-name:var(--font-mono)]">
                      /berita/{slug || slugify(titleValue || 'judul-berita')}
                    </code>
                    {errors.slug ? (
                      <span className="mt-1 block !text-[var(--color-accent-deep)]">{errors.slug}</span>
                    ) : null}
                  </p>
                </div>

                <TextArea
                  name="excerpt"
                  label="Ringkasan"
                  hint="Dua sampai tiga kalimat. Tampil pada daftar berita dan hasil pencarian."
                  defaultValue={article?.excerpt ?? ''}
                  rows={3}
                />

                <TextArea
                  name="content"
                  label="Isi Lengkap"
                  hint="Pisahkan antarparagraf dengan satu baris kosong."
                  defaultValue={article?.content ?? ''}
                  rows={14}
                  required
                  error={errors.content}
                />
              </div>
            </section>

            <section className="border border-[var(--color-line)] bg-[var(--color-paper)] px-6 py-6">
              <h2 className="display text-[length:var(--step-3)]">Gambar Utama</h2>
              <p className="mt-2 text-[length:var(--step-0)] text-[var(--color-text-muted)]">
                Unggah gambar melalui panel di atas. Bila dikosongkan, berita tetap dapat
                diterbitkan tanpa gambar.
              </p>

              <div className="mt-6">
                <label className="field__label" htmlFor="bidang-coverImage">
                  URL Gambar
                </label>
                <input
                  id="bidang-coverImage"
                  name="coverImage"
                  type="url"
                  defaultValue={article?.coverImage ?? ''}
                  className="field__input mt-2"
                  placeholder="/api/media/… atau https://…"
                />
                <p className="field__hint mt-2">
                  Kosongkan bila belum ada gambar. Kolom ini untuk gambar dari luar; untuk gambar
                  yang diunggah sendiri, pakai panel unggah di atas.
                </p>
                {article?.coverImage ? (
                  <div className="relative mt-4 aspect-3/2 w-full max-w-md overflow-hidden border border-[var(--color-line)]">
                    <Image src={article.coverImage} alt="" fill sizes="480px" className="object-cover" />
                  </div>
                ) : null}
                <input type="hidden" name="coverPublicId" value={article?.coverPublicId ?? ''} />
              </div>
            </section>

            <section className="border border-[var(--color-line)] bg-[var(--color-paper)] px-6 py-6">
              <h2 className="display text-[length:var(--step-3)]">Terbit</h2>

              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <SelectField
                  name="category"
                  label="Kategori"
                  options={CATEGORIES}
                  defaultValue={article?.category ?? 'Umum'}
                />

                <div className="flex items-end pb-2">
                  <CheckboxField
                    name="published"
                    label="Terbitkan sekarang"
                    hint="Jika tidak dicentang, berita disimpan sebagai draf dan tidak tampil di situs."
                    defaultChecked={article?.published ?? false}
                  />
                </div>
              </div>
            </section>
          </div>
        );
      }}
    </ActionForm>
  );
}

export { CATEGORIES };
