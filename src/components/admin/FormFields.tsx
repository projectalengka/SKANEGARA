'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition, type ReactNode } from 'react';
import type { ActionResult } from '@/app/admin/content-actions';
import { cn } from '@/lib/utils';

/**
 * The form primitives the dashboard is built from.
 *
 * All client components, and they earn it: each one needs `useActionState` or
 * `useFormStatus`, both of which only exist on the client. The pages that use
 * them stay server components.
 *
 * The shared contract is that a server action returns `{ ok, message }` rather
 * than throwing. That is what lets the form show an error *and keep the user's
 * input* — a thrown action discards the whole form and returns them to an error
 * page, which on a CMS means retyping a news article.
 */

export type ActionFormState = ActionResult | null;

/**
 * A form bound to a server action, with inline status reporting.
 *
 * `successReset` clears the fields after a successful create (so a second entry
 * starts blank) but not after an edit, where clearing would destroy the record
 * the administrator is working on.
 */
export function ActionForm({
  action,
  children,
  submitLabel = 'Simpan',
  successReset = false,
  className,
  onSuccess,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  children: (state: ActionFormState) => ReactNode;
  submitLabel?: string;
  successReset?: boolean;
  className?: string;
  onSuccess?: () => void;
}) {
  const [state, setState] = useState<ActionFormState>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await action(formData);
      setState(result);

      if (result.ok) {
        if (successReset) formRef.current?.reset();
        onSuccess?.();
      }
    });
  };

  // `noValidate` puts validation in the server action, where the rules live, and
  // keeps the browser's native tooltips from competing with the inline messages
  // this form renders. The `required` attributes stay for assistive technology.
  return (
    <form ref={formRef} onSubmit={handleSubmit} className={className} noValidate>
      {state ? <FormMessage state={state} /> : null}

      {children(state)}

      <div className="mt-8 flex items-center gap-4 border-t border-[var(--color-line)] pt-6">
        <button type="submit" className="btn btn--solid" disabled={pending}>
          {pending ? 'Menyimpan…' : submitLabel}
          <span className="btn__arrow" aria-hidden="true">
            {pending ? '·' : '→'}
          </span>
        </button>
        {pending ? <span className="label text-[var(--color-text-muted)]">Memuat…</span> : null}
      </div>
    </form>
  );
}

function FormMessage({ state }: { state: ActionResult }) {
  if (!state.message) return null;

  return (
    <p
      role="alert"
      aria-live="polite"
      className={cn(
        'mb-7 border-l-2 px-5 py-4',
        state.ok
          ? 'border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_8%,var(--color-paper))]'
          : 'border-[var(--color-accent-deep)] bg-[color-mix(in_srgb,var(--color-accent-deep)_8%,var(--color-paper))]',
      )}
    >
      {state.message}
    </p>
  );
}

/** A text input with label, hint and inline error. */
export function TextField({
  name,
  label,
  hint,
  placeholder,
  defaultValue,
  required = false,
  type = 'text',
  error,
}: {
  name: string;
  label: string;
  hint?: string;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
  type?: 'text' | 'email' | 'url' | 'tel' | 'number' | 'date' | 'datetime-local';
  error?: string;
}) {
  const id = `bidang-${name}`;
  const hintId = hint ? `bantuan-${name}` : undefined;
  const errorId = error ? `galat-${name}` : undefined;

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label} {required ? <span className="text-[var(--color-accent)]">*</span> : null}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId ?? hintId}
        className="field__input"
      />
      {error ? (
        <p id={errorId} className="field__hint !text-[var(--color-accent-deep)]">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="field__hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** A textarea, with the same label/error contract as `TextField`. */
export function TextArea({
  name,
  label,
  hint,
  placeholder,
  defaultValue,
  rows = 6,
  required = false,
  error,
}: {
  name: string;
  label: string;
  hint?: string;
  placeholder?: string;
  defaultValue?: string;
  rows?: number;
  required?: boolean;
  error?: string;
}) {
  const id = `bidang-${name}`;
  const hintId = hint ? `bantuan-${name}` : undefined;
  const errorId = error ? `galat-${name}` : undefined;

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label} {required ? <span className="text-[var(--color-accent)]">*</span> : null}
      </label>
      <textarea
        id={id}
        name={name}
        rows={rows}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId ?? hintId}
        className="field__textarea"
      />
      {error ? (
        <p id={errorId} className="field__hint !text-[var(--color-accent-deep)]">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="field__hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** A select with a fixed option list. */
export function SelectField({
  name,
  label,
  options,
  defaultValue,
  hint,
  error,
}: {
  name: string;
  label: string;
  options: readonly string[];
  defaultValue?: string;
  hint?: string;
  error?: string;
}) {
  const id = `bidang-${name}`;

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <select id={id} name={name} defaultValue={defaultValue} className="field__select" aria-invalid={Boolean(error)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error ? (
        <p className="field__hint !text-[var(--color-accent-deep)]">{error}</p>
      ) : hint ? (
        <p className="field__hint">{hint}</p>
      ) : null}
    </div>
  );
}

/** A checkbox row for the publish flag. */
export function CheckboxField({
  name,
  label,
  hint,
  defaultChecked = false,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked?: boolean;
}) {
  const id = `bidang-${name}`;

  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-ink)]"
      />
      <div>
        <label htmlFor={id} className="field__label !text-[var(--color-text)]">
          {label}
        </label>
        {hint ? <p className="field__hint mt-1">{hint}</p> : null}
      </div>
    </div>
  );
}

/**
 * A delete button with a two-step confirmation.
 *
 * A native `confirm()` would be one line, but it is unstyled, untranslatable by
 * the page's own CSS, and blocked in some embedded browsers. Two clicks in the
 * same place is honest about being destructive and works everywhere.
 */
export function DeleteButton({
  action,
  label = 'Hapus',
  confirmLabel = 'Yakin hapus?',
  onDone,
}: {
  action: () => Promise<ActionResult>;
  label?: string;
  confirmLabel?: string;
  onDone?: (result: ActionResult) => void;
}) {
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleClick = () => {
    if (!armed) {
      setArmed(true);
      // Disarm after a few seconds so a stray click does not leave the control
      // in a state where the next click deletes something.
      window.setTimeout(() => setArmed(false), 4000);
      return;
    }

    startTransition(async () => {
      const result = await action();
      onDone?.(result);
      setArmed(false);
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={cn(
        'label border px-3 py-2 transition-colors duration-300',
        armed
          ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-paper)]'
          : 'border-[var(--color-line)] text-[var(--color-text-muted)] hover:border-[var(--color-accent-deep)] hover:text-[var(--color-accent-deep)]',
      )}
    >
      {pending ? 'Menghapus…' : armed ? confirmLabel : label}
    </button>
  );
}

/**
 * The image upload control.
 *
 * Uploads immediately on file selection rather than on form submit, and stores
 * the resulting URL and public id in hidden inputs. Doing it this way means the
 * administrator sees the image before committing the record, and a failed upload
 * cannot leave a saved row pointing at nothing.
 *
 * The public id travels with the URL because Cloudinary needs the id — not the
 * URL — to delete an asset later.
 */
export function ImageUploadField({
  name,
  label,
  upload,
  defaultUrl = '',
  defaultPublicId = '',
  hint,
  error,
}: {
  name: string;
  label: string;
  upload: (formData: FormData) => Promise<{ ok: true; url: string; publicId: string } | { ok: false; message: string }>;
  defaultUrl?: string;
  defaultPublicId?: string;
  hint?: string;
  error?: string;
}) {
  const [url, setUrl] = useState(defaultUrl);
  const [publicId, setPublicId] = useState(defaultPublicId);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus('uploading');
    setMessage('');

    const formData = new FormData();
    formData.append('image', file);

    const result = await upload(formData);

    if (result.ok) {
      setUrl(result.url);
      setPublicId(result.publicId);
      setStatus('idle');
      setMessage('Gambar berhasil diunggah.');
    } else {
      setStatus('error');
      setMessage(result.message);
      // Reset the input so selecting the same file again re-fires the change.
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const id = `unggah-${name}`;

  return (
    <div className="field">
      <span className="field__label">{label}</span>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div
          className={cn(
            'relative h-32 w-full shrink-0 overflow-hidden border sm:w-48',
            error ? 'border-[var(--color-accent-deep)]' : 'border-[var(--color-line)]',
          )}
        >
          {url ? (
            // A plain <img> rather than next/image: the source is a remote
            // Cloudinary URL supplied by the administrator, and the optimiser
            // would need every possible hostname allow-listed in next.config.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center bg-[var(--color-paper-warm)]">
              <span className="label text-[var(--color-text-faint)]">Belum ada gambar</span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={handleChange}
            disabled={status === 'uploading'}
            className="block w-full text-[0.875rem] file:mr-4 file:border file:border-[var(--color-line)] file:bg-[var(--color-paper)] file:px-4 file:py-2.5 file:font-[family-name:var(--font-mono)] file:text-[0.6875rem] file:uppercase file:tracking-[0.12em]"
          />

          <p className="field__hint mt-3">
            {hint ?? 'JPG, PNG, WebP, atau AVIF. Maksimal 8 MB.'}
          </p>

          {status === 'uploading' ? (
            <p className="field__hint mt-2" role="status">
              Mengunggah…
            </p>
          ) : message ? (
            <p
              role="status"
              className={cn(
                'field__hint mt-2',
                status === 'error' ? '!text-[var(--color-accent-deep)]' : '!text-[var(--color-text)]',
              )}
            >
              {message}
            </p>
          ) : null}

          {url ? (
            <button
              type="button"
              onClick={() => {
                setUrl('');
                setPublicId('');
                setMessage('');
                setStatus('idle');
                if (inputRef.current) inputRef.current.value = '';
              }}
              className="link-line mt-3 text-[0.875rem]"
            >
              Hapus gambar
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className="field__hint !text-[var(--color-accent-deep)]">{error}</p> : null}

      <input type="hidden" name={`${name}`} value={url} />
      <input type="hidden" name={`${name}PublicId`} value={publicId} />
    </div>
  );
}

/**
 * Turns a client-side delete result into a visible notice.
 *
 * Rendered by list pages so a failed delete is never silent — the brief is
 * explicit that there must be no silent failures, and a delete button that
 * appears to do nothing is exactly that.
 */
export function useActionNotice() {
  const [notice, setNotice] = useState<ActionResult | null>(null);
  const router = useRouter();

  return {
    notice,
    clear: () => setNotice(null),
    handle: (result: ActionResult) => {
      setNotice(result);
      if (result.ok) router.refresh();
    },
  };
}

/** The notice strip rendered by list pages. */
export function ActionNotice({ notice, onDismiss }: { notice: ActionResult | null; onDismiss: () => void }) {
  if (!notice) return null;

  return (
    <p
      role="alert"
      aria-live="polite"
      className={cn(
        'mb-7 flex items-center justify-between gap-4 border-l-2 px-5 py-4',
        notice.ok
          ? 'border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_8%,var(--color-paper))]'
          : 'border-[var(--color-accent-deep)] bg-[color-mix(in_srgb,var(--color-accent-deep)_8%,var(--color-paper))]',
      )}
    >
      {notice.message}
      <button type="button" onClick={onDismiss} className="label shrink-0 underline">
        Tutup
      </button>
    </p>
  );
}
