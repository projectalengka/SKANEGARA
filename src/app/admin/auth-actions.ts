'use server';

import { redirect } from 'next/navigation';
import { checkCredentials, isAuthConfigured } from '@/lib/auth';
import { startSession, endSession } from '@/lib/session';

/**
 * Login and logout actions.
 *
 * Three behaviours worth stating, because each is a decision rather than a
 * default:
 *
 *  - **Failure is indistinguishable.** A wrong email and a wrong password return
 *    the same message. Saying "email tidak ditemukan" would let anyone enumerate
 *    which account exists.
 *  - **The redirect target is validated.** `lanjut` comes from the query string,
 *    so it is attacker-controlled. Only a same-origin, absolute path is accepted;
 *    anything else falls back to the dashboard. Without this the login page is an
 *    open redirect, which is a standard phishing primitive.
 *  - **A failed attempt is logged.** Repeated failures are the one signal that a
 *    password is being guessed, and they are invisible otherwise.
 */

export type LoginState = { status: 'idle' | 'error'; message: string };

/**
 * Only accepts a path that stays on this site.
 *
 * `//evil.example.com` is the case people miss: a browser reads it as a
 * protocol-relative URL, so `redirect('//evil.example.com')` leaves the site even
 * though the string starts with a slash.
 */
function safeReturnTo(value: FormDataEntryValue | null, fallback: string): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw.startsWith('/')) return fallback;
  if (raw.startsWith('//')) return fallback;
  if (raw.includes('\\')) return fallback;
  return raw;
}

export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const returnTo = safeReturnTo(formData.get('lanjut'), '/admin/dasbor');

  if (!isAuthConfigured()) {
    return {
      status: 'error',
      message:
        'Autentikasi belum dikonfigurasi. Isi AUTH_SECRET, ADMIN_EMAIL, dan ADMIN_PASSWORD pada berkas .env, lalu jalankan ulang aplikasi.',
    };
  }

  if (!email || !password) {
    return { status: 'error', message: 'Email dan kata sandi wajib diisi.' };
  }

  const valid = await checkCredentials(email, password);

  if (!valid) {
    console.warn('[auth] Percobaan masuk gagal', {
      email,
      at: new Date().toISOString(),
    });
    return { status: 'error', message: 'Email atau kata sandi salah.' };
  }

  await startSession(email.toLowerCase());
  redirect(returnTo);
}

export async function logout(): Promise<void> {
  await endSession();
  redirect('/admin/masuk');
}
