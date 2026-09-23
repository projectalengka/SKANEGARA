'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
// The route group's parentheses are part of the path: `kontak` now lives at
// `src/app/(situs)/kontak/actions.ts`.
import { submitContact, type ContactState } from '@/app/(situs)/kontak/actions';

/**
 * The public contact form.
 *
 * A client component because it needs `useActionState` for inline errors and to
 * preserve what the visitor typed when validation fails — losing a long message
 * because one email field was malformed is the kind of thing that stops someone
 * contacting a school at all.
 *
 * Accessibility details that are not optional on a form:
 *  - Every input has a real `<label>` bound by `htmlFor`.
 *  - Errors are linked with `aria-describedby` and announced by
 *    `role="alert"`, so a screen reader hears them without hunting.
 *  - Invalid fields carry `aria-invalid`.
 *  - The submit button reports its own pending state, so a slow submit cannot be
 *    double-fired by an impatient click.
 */

const initialState: ContactState = { status: 'idle', message: '' };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="btn btn--solid w-full justify-between sm:w-auto" disabled={pending}>
      {pending ? 'Mengirim…' : 'Kirim Pesan'}
      <span className="btn__arrow" aria-hidden="true">
        {pending ? '·' : '→'}
      </span>
    </button>
  );
}

export function ContactForm() {
  const [state, formAction] = useActionState(submitContact, initialState);

  const values = state.values;
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {state.status !== 'idle' && state.message ? (
        <p
          role="alert"
          aria-live="polite"
          className={
            state.status === 'success'
              ? 'border-l-2 border-[var(--color-accent)] bg-[var(--color-paper-warm)] px-5 py-4'
              : 'border-l-2 border-[var(--color-accent-deep)] bg-[var(--color-paper-warm)] px-5 py-4'
          }
        >
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="field">
          <label className="field__label" htmlFor="kontak-nama">
            Nama Lengkap
          </label>
          <input
            id="kontak-nama"
            name="name"
            type="text"
            required
            autoComplete="name"
            defaultValue={values?.name ?? ''}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'galat-nama' : undefined}
            className="field__input"
            placeholder="Nama Anda"
          />
          {errors.name ? (
            <p id="galat-nama" className="field__hint !text-[var(--color-accent-deep)]">
              {errors.name}
            </p>
          ) : null}
        </div>

        <div className="field">
          <label className="field__label" htmlFor="kontak-email">
            Email
          </label>
          <input
            id="kontak-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            defaultValue={values?.email ?? ''}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'galat-email' : undefined}
            className="field__input"
            placeholder="nama@contoh.com"
          />
          {errors.email ? (
            <p id="galat-email" className="field__hint !text-[var(--color-accent-deep)]">
              {errors.email}
            </p>
          ) : null}
        </div>

        <div className="field">
          <label className="field__label" htmlFor="kontak-telepon">
            Nomor Telepon <span className="normal-case">(opsional)</span>
          </label>
          <input
            id="kontak-telepon"
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            defaultValue={values?.phone ?? ''}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? 'galat-telepon' : undefined}
            className="field__input"
            placeholder="08xx xxxx xxxx"
          />
          {errors.phone ? (
            <p id="galat-telepon" className="field__hint !text-[var(--color-accent-deep)]">
              {errors.phone}
            </p>
          ) : null}
        </div>

        <div className="field">
          <label className="field__label" htmlFor="kontak-subjek">
            Subjek
          </label>
          <input
            id="kontak-subjek"
            name="subject"
            type="text"
            required
            defaultValue={values?.subject ?? ''}
            aria-invalid={Boolean(errors.subject)}
            aria-describedby={errors.subject ? 'galat-subjek' : undefined}
            className="field__input"
            placeholder="Informasi PPDB"
          />
          {errors.subject ? (
            <p id="galat-subjek" className="field__hint !text-[var(--color-accent-deep)]">
              {errors.subject}
            </p>
          ) : null}
        </div>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="kontak-pesan">
          Pesan
        </label>
        <textarea
          id="kontak-pesan"
          name="message"
          required
          rows={7}
          defaultValue={values?.message ?? ''}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? 'galat-pesan' : 'bantuan-pesan'}
          className="field__textarea"
          placeholder="Tulis pertanyaan atau pesan Anda di sini."
        />
        {errors.message ? (
          <p id="galat-pesan" className="field__hint !text-[var(--color-accent-deep)]">
            {errors.message}
          </p>
        ) : (
          <p id="bantuan-pesan" className="field__hint">
            Minimal 10 karakter. Jelaskan kebutuhan Anda agar kami dapat menjawab dengan tepat.
          </p>
        )}
      </div>

      {/* Honeypot. Hidden from sight and from assistive technology, but present
          in the DOM for anything that fills every input it finds. */}
      <div aria-hidden="true" className="absolute h-0 w-0 overflow-hidden">
        <label htmlFor="kontak-website">Website</label>
        <input id="kontak-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-col gap-4 border-t border-[var(--color-line)] pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="field__hint max-w-sm">
          Data yang Anda kirim hanya digunakan untuk menjawab pesan ini.
        </p>
        <SubmitButton />
      </div>
    </form>
  );
}
