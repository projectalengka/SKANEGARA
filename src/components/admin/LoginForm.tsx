'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { login, type LoginState } from '@/app/admin/auth-actions';

const initialState: LoginState = { status: 'idle', message: '' };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" className="btn btn--solid w-full justify-between" disabled={pending}>
      {pending ? 'Memproses…' : 'Masuk'}
      <span className="btn__arrow" aria-hidden="true">
        {pending ? '·' : '→'}
      </span>
    </button>
  );
}

/**
 * The login form.
 *
 * `autoComplete` is set correctly on both fields so a password manager can do
 * its job — an admin who has to copy a 40-character secret out of a text file
 * every time will eventually pick a weak one.
 *
 * There is no "lupa kata sandi" link, and that is correct rather than an
 * omission: there is no email provider to send a reset through. The recovery
 * path is documented in the README and is a shell command, because the only
 * person who needs it is the person with server access.
 */
export function LoginForm({ returnTo }: { returnTo: string }) {
  const [state, formAction] = useActionState(login, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="lanjut" value={returnTo} />

      {state.status === 'error' && state.message ? (
        <p
          role="alert"
          aria-live="assertive"
          className="border-l-2 border-[var(--color-accent-deep)] bg-[var(--color-paper-warm)] px-5 py-4"
        >
          {state.message}
        </p>
      ) : null}

      <div className="field">
        <label className="field__label" htmlFor="masuk-email">
          Email
        </label>
        <input
          id="masuk-email"
          name="email"
          type="email"
          required
          autoComplete="username"
          autoFocus
          className="field__input"
          placeholder="admin@sekolah.sch.id"
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="masuk-sandi">
          Kata Sandi
        </label>
        <input
          id="masuk-sandi"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="field__input"
          placeholder="••••••••"
        />
      </div>

      <SubmitButton />
    </form>
  );
}
