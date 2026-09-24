'use client';

import { useState, useTransition } from 'react';
import { adoptSampleContent } from '@/app/admin/content-actions';
import { ActionNotice, useActionNotice } from '@/components/admin/FormFields';
import type { SampleCollection } from '@/data/sample';

/**
 * The dashboard's explanation of, and remedy for, sample content.
 *
 * ## Why this component exists at all
 *
 * Sample rows live in `src/data/sample.ts`, never in Postgres, but the list pages
 * rendered them as ordinary records with an edit form. Saving one asked Prisma to
 * update an id that does not exist and the owner saw *"Terjadi kesalahan. Silakan
 * coba lagi."* — with the image already uploaded, so the report naturally blamed
 * the upload. Measured on 2026-09-24: the database held six student-work rows,
 * every one a cuid, and `sample-work-1` was absent.
 *
 * The fix is not to make the save button lie. It is to stop offering an action
 * that cannot work, say plainly what the rows are, and give one button that
 * really does turn them into the owner's content.
 *
 * ## Why the button asks twice
 *
 * It writes a whole collection into the database and deletes the placeholder
 * rows nobody filled in. Neither is reachable from the interface once done, so
 * the first click arms and the second commits — the same idiom as `DeleteButton`,
 * including the timeout that disarms a stray click.
 */

/** What one row of each collection is called, for the copy. */
const NOUNS: Record<SampleCollection, string> = {
  karya: 'karya',
  galeri: 'foto',
  berita: 'berita',
  kegiatan: 'kegiatan',
};

export function SampleContentPanel({
  collection,
  count,
}: {
  collection: SampleCollection;
  count: number;
}) {
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();
  const { notice, clear, handle } = useActionNotice();

  const noun = NOUNS[collection];

  /**
   * Nothing to adopt, nothing to say.
   *
   * Guarded here rather than at each call site, and that is a correction rather
   * than a preference: the first version returned the panel unconditionally, and
   * `/admin/galeri` rendered *"0 foto contoh ini menjadi milik Anda"* — measured
   * on the built site. Gallery is the collection that can legitimately have no
   * sample rows, because its seed captions are finished copy rather than
   * placeholders, so the sample set never stands in for it. Four call sites each
   * remembering the guard is four chances to forget it.
   */
  if (count === 0) return null;

  const onClick = () => {
    if (!armed) {
      setArmed(true);
      // Disarm after a few seconds, so a stray click does not leave the control
      // one click away from writing to the database.
      window.setTimeout(() => setArmed(false), 6000);
      return;
    }

    startTransition(async () => {
      handle(await adoptSampleContent(collection));
      setArmed(false);
    });
  };

  return (
    <div className="mb-8 border-l-2 border-[var(--color-accent-deep)] bg-[var(--color-paper)] px-6 py-5">
      <ActionNotice notice={notice} onDismiss={clear} />

      <p className="label text-[var(--color-text-faint)]">Data contoh</p>

      <p className="mt-3">
        {count} {noun} di bawah ini masih data contoh. Isinya tersimpan di berkas, bukan di basis
        data, jadi belum bisa diedit satu per satu.
      </p>

      <p className="mt-3 text-[var(--color-text-muted)]">
        Pakai sebagai data saya untuk menyalinnya ke basis data. Setelah itu semuanya bisa diedit,
        dihapus, dan gambarnya bisa diunggah seperti biasa. {count} {noun} contoh ini menjadi milik
        Anda — silakan ganti isinya dengan data asli kapan saja.
      </p>

      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="btn btn--solid mt-5 disabled:opacity-60"
      >
        {pending
          ? 'Menyimpan…'
          : armed
            ? `Yakin? ${count} ${noun} akan disimpan`
            : 'Pakai sebagai data saya'}
      </button>
    </div>
  );
}

/**
 * The badge a sample row wears in place of its *Edit* button.
 *
 * Deliberately not a button. An affordance that opens a form which cannot save
 * is what produced the original bug report, so the row advertises what it is and
 * points at the one control that does work.
 */
export function SampleRowBadge() {
  return (
    <span
      className="label shrink-0 border border-[var(--color-line)] px-3 py-2 text-[var(--color-text-faint)]"
      title="Data contoh — pakai tombol di atas halaman untuk memindahkannya ke basis data."
    >
      Contoh
    </span>
  );
}
