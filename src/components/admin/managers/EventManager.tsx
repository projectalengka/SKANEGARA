'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ActionForm,
  ActionNotice,
  CheckboxField,
  DeleteButton,
  TextArea,
  TextField,
  useActionNotice,
} from '@/components/admin/FormFields';
import {
  deleteEvent,
  saveEvent,
  type ActionResult,
} from '@/app/admin/content-actions';
import type { EventContent } from '@/data/defaults';
import { formatDateId, toDateTimeAttribute } from '@/lib/utils';

/**
 * The events manager.
 *
 * Dates are handled carefully here because a date input is where timezone bugs
 * come from. The stored value is a full `Date`; the input shows a local
 * `datetime-local` value derived from it and the action parses it back in the
 * server's timezone. The site displays everything in WIB explicitly (see
 * `formatDateId`), so an event created in Jakarta reads the same everywhere.
 *
 * `toDateTimeAttribute` and the slicing below are what keep the input from
 * showing a shifted hour when the browser and the server disagree about UTC.
 */
export function EventManager({ events }: { events: EventContent[] }) {
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const { notice, clear, handle } = useActionNotice();
  const router = useRouter();

  // A single "now" for the whole list, captured once per mount.
  //
  // Calling `Date.now()` inside the map below would be reading the clock during
  // render, which React treats as impure: two renders a millisecond apart could
  // classify the same event differently and produce output that does not match
  // its input. It would also make the "sudah berlalu" label drift between items
  // in a long list.
  //
  // Initialising from a lazy `useState` keeps the capture to exactly one read.
  // `null` on the server, then filled in on mount, would be the alternative —
  // but this label is only ever shown in the admin, behind auth, so there is no
  // SEO or progressive-enhancement reason to prefer it.
  const [now] = useState(() => Date.now());

  const onDelete = (id: string) => async (): Promise<ActionResult> => {
    const result = await deleteEvent(id);
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
          {creating ? 'Tutup Formulir' : 'Tambah Kegiatan'}
          <span className="btn__arrow" aria-hidden="true">
            {creating ? '↑' : '+'}
          </span>
        </button>
        <p className="label text-[var(--color-text-muted)]">
          {String(events.length).padStart(2, '0')} kegiatan tersimpan
        </p>
      </div>

      {creating ? (
        <div className="mb-8 border border-[var(--color-ink)] bg-[var(--color-paper)] px-6 py-7">
          <h2 className="display text-[length:var(--step-3)]">Kegiatan Baru</h2>
          <p className="mt-2 text-[length:var(--step-0)] text-[var(--color-text-muted)]">
            Kegiatan dengan tanggal setelah hari ini tampil pada bagian Akan Datang di halaman
            Kegiatan.
          </p>

          <div className="mt-6">
            <ActionForm
              action={saveEvent}
              submitLabel="Tambah Kegiatan"
              successReset
              onSuccess={() => {
                router.refresh();
                setCreating(false);
              }}
            >
              {(state) => <EventFields errors={state?.fieldErrors ?? {}} />}
            </ActionForm>
          </div>
        </div>
      ) : null}

      {events.length === 0 ? (
        <p className="border border-dashed border-[var(--color-line)] px-6 py-12 text-center text-[var(--color-text-muted)]">
          Belum ada kegiatan.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {events.map((event) => {
            const isOpen = openId === event.id;
            const isPast = new Date(event.date).getTime() < now;

            return (
              <li key={event.id} className="border border-[var(--color-line)] bg-[var(--color-paper)]">
                <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{event.title}</p>
                    <p className="label mt-1.5 text-[var(--color-text-faint)]">
                      {formatDateId(event.date)}
                      {event.location ? ` · ${event.location}` : ''}
                      {isPast ? ' · sudah berlalu' : ''}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : event.id)}
                      aria-expanded={isOpen}
                      className="label border border-[var(--color-line)] px-3 py-2 transition-colors duration-300 hover:border-[var(--color-ink)]"
                    >
                      {isOpen ? 'Tutup' : 'Edit'}
                    </button>
                    <DeleteButton action={onDelete(event.id)} onDone={handle} />
                  </div>
                </div>

                {isOpen ? (
                  <div className="border-t border-[var(--color-line)] px-6 py-6">
                    <ActionForm
                      action={saveEvent}
                      submitLabel="Simpan Perubahan"
                      onSuccess={() => router.refresh()}
                    >
                      {(state) => <EventFields event={event} errors={state?.fieldErrors ?? {}} />}
                    </ActionForm>
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

/** Converts a stored date into the `YYYY-MM-DDTHH:mm` an input expects. */
function toInputValue(iso: string | null | undefined): string {
  const full = toDateTimeAttribute(iso);
  return full ? full.slice(0, 16) : '';
}

function EventFields({
  event,
  errors,
}: {
  event?: EventContent;
  errors: Record<string, string>;
}) {
  return (
    <div className="flex flex-col gap-6">
      {event ? <input type="hidden" name="id" value={event.id} /> : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <TextField
          name="title"
          label="Nama Kegiatan"
          defaultValue={event?.title ?? ''}
          required
          error={errors.title}
        />
        <TextField
          name="slug"
          label="Slug URL"
          hint="Kosongkan untuk dibuat otomatis."
          defaultValue={event?.slug ?? ''}
          error={errors.slug}
        />
        <TextField
          name="date"
          label="Tanggal Mulai"
          type="datetime-local"
          defaultValue={toInputValue(event?.date)}
          required
          error={errors.date}
        />
        <TextField
          name="endDate"
          label="Tanggal Selesai (opsional)"
          type="datetime-local"
          defaultValue={toInputValue(event?.endDate)}
          error={errors.endDate}
        />
        <div className="sm:col-span-2">
          <TextField
            name="location"
            label="Lokasi"
            hint="Contoh: Aula SMK Jayanegara"
            defaultValue={event?.location ?? ''}
          />
        </div>
      </div>

      <TextArea
        name="description"
        label="Deskripsi"
        defaultValue={event?.description ?? ''}
        rows={4}
      />

      <TextField
        name="image"
        label="URL Gambar (opsional)"
        type="url"
        hint="Unggah gambar melalui Dasbor Galeri terlebih dahulu, lalu salin tautannya ke sini."
        defaultValue={event?.image ?? ''}
      />
      <input type="hidden" name="publicId" value={event?.publicId ?? ''} />

      <CheckboxField
        name="published"
        label="Tampilkan di situs"
        defaultChecked={event?.published ?? true}
      />
    </div>
  );
}
