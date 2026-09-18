import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  SESSION_COOKIE,
  createSessionToken,
  isAuthConfigured,
  sessionMaxAgeSeconds,
  verifySessionToken,
  type SessionPayload,
} from './auth';

/**
 * Server-side session helpers.
 *
 * `cookies()` is async in this version of Next.js, and reading cookies is what
 * makes a route dynamic — which is correct here: an admin page must never be
 * served from a static cache shared between users.
 */

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: sessionMaxAgeSeconds,
} as const;

/** Reads and verifies the current session, or returns `null`. */
export async function getSession(): Promise<SessionPayload | null> {
  if (!isAuthConfigured()) return null;
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

/** Starts a session for the given email. Called only from the login action. */
export async function startSession(email: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(email), cookieOptions);
}

/** Ends the current session. */
export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * Guards an admin route or server action.
 *
 * Redirects rather than throwing, so an expired session lands on the login page
 * with a reason instead of an error boundary. Server actions that must not
 * redirect (a mutation triggered from a form) should call `getSession` and
 * return an error result instead — a redirect inside an action would discard the
 * form state the user is looking at.
 */
export async function requireSession(returnTo = '/dasbor'): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect(`/admin/masuk?lanjut=${encodeURIComponent(returnTo)}`);
  }
  return session;
}
