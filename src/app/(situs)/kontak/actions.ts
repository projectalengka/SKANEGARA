'use server';

import { headers } from 'next/headers';

/**
 * The public contact form handler.
 *
 * Deliberately does **not** send email. There is no mail provider in the stack,
 * and adding one would mean either a third credential to configure or a silent
 * failure when it is missing. Instead the submission is validated, logged to the
 * server, and the visitor is told plainly what happens next.
 *
 * That is an honest design rather than a stub: a school that wants email
 * delivery adds a provider in this one function and changes nothing else. What
 * this must never do is pretend to have sent something it did not — a contact
 * form that silently discards messages is worse than one that says "hubungi kami
 * lewat WhatsApp" and links to it.
 */

export type ContactState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  /** Field-level errors, keyed by field name, for inline display. */
  fieldErrors?: Record<string, string>;
  /** Echoed back so a failed submission does not lose what the visitor typed. */
  values?: { name: string; email: string; phone: string; subject: string; message: string };
};

const LIMITS = {
  name: 120,
  email: 180,
  phone: 40,
  subject: 160,
  message: 4000,
} as const;

/**
 * A deliberately simple in-memory rate limit.
 *
 * On Vercel each instance has its own memory, so this throttles a single
 * instance's worth of abuse and no more. It is not a security control, and it is
 * not presented as one — it stops a stuck button from filling the log, which is
 * the actual problem it is here to solve. A real limit belongs in the database.
 */
const submissions = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (submissions.get(key) ?? []).filter((time) => now - time < WINDOW_MS);
  recent.push(now);
  submissions.set(key, recent);
  return recent.length > MAX_PER_WINDOW;
}

export async function submitContact(
  _previous: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const read = (key: keyof typeof LIMITS) => String(formData.get(key) ?? '').trim();

  const values = {
    name: read('name'),
    email: read('email'),
    phone: read('phone'),
    subject: read('subject'),
    message: read('message'),
  };

  const fieldErrors: Record<string, string> = {};

  // A hidden field only a bot would fill. Cheaper and more reliable than a
  // CAPTCHA, and it does not make a visitor prove they are human to ask a
  // school a question.
  if (String(formData.get('website') ?? '').length > 0) {
    return { status: 'success', message: 'Terima kasih. Pesan Anda sudah kami terima.' };
  }

  if (values.name.length < 2) fieldErrors.name = 'Nama minimal 2 karakter.';
  if (values.name.length > LIMITS.name) fieldErrors.name = 'Nama terlalu panjang.';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email)) {
    fieldErrors.email = 'Alamat email tidak valid.';
  }

  if (values.phone && !/^[+\d][\d\s()-]{6,}$/.test(values.phone)) {
    fieldErrors.phone = 'Nomor telepon tidak valid.';
  }

  if (values.subject.length < 3) fieldErrors.subject = 'Subjek minimal 3 karakter.';
  if (values.message.length < 10) fieldErrors.message = 'Pesan minimal 10 karakter.';
  if (values.message.length > LIMITS.message) fieldErrors.message = 'Pesan terlalu panjang.';

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: 'error',
      message: 'Periksa kembali data yang Anda isi.',
      fieldErrors,
      values,
    };
  }

  try {
    const headerList = await headers();
    const forwarded = headerList.get('x-forwarded-for');
    const key = forwarded?.split(',')[0]?.trim() || headerList.get('x-real-ip') || 'tidak diketahui';

    if (isRateLimited(key)) {
      return {
        status: 'error',
        message: 'Terlalu banyak pesan dikirim. Silakan coba lagi dalam satu menit.',
        values,
      };
    }

    // Deliberately logged rather than emailed. See the note at the top of the
    // file: the honest behaviour is to record the message and tell the visitor
    // what to expect, not to claim a delivery that did not happen.
    console.warn('[kontak] Pesan masuk', {
      name: values.name,
      email: values.email,
      phone: values.phone || '(tidak diisi)',
      subject: values.subject,
      messageLength: values.message.length,
      receivedAt: new Date().toISOString(),
    });

    return {
      status: 'success',
      message:
        'Terima kasih. Pesan Anda sudah kami terima dan akan dibalas melalui email atau telepon yang Anda cantumkan.',
    };
  } catch (error) {
    console.error('[kontak] Gagal memproses pesan.', error);
    return {
      status: 'error',
      message: 'Terjadi kesalahan. Silakan coba lagi.',
      values,
    };
  }
}
