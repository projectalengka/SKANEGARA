import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

/**
 * Admin authentication.
 *
 * Design decisions worth stating, because auth is the one place where a
 * reasonable-looking shortcut is a real vulnerability:
 *
 *  - **Passwords are hashed with scrypt**, not SHA-256 or plain text. scrypt is
 *    memory-hard, so a stolen hash cannot be brute-forced on a GPU the way a
 *    fast hash can. The salt is per-password and stored alongside the hash.
 *  - **The session cookie is signed, not encrypted.** It carries no secret — only
 *    the admin's email and an expiry. Signing is what makes it unforgeable.
 *  - **Comparison is constant-time.** `timingSafeEqual` rather than `===`, so the
 *    response time does not leak how many leading bytes of a signature matched.
 *  - **The cookie is HttpOnly and SameSite=Lax.** HttpOnly keeps it away from
 *    JavaScript (so an XSS cannot read it); Lax stops it riding along on
 *    cross-site form posts.
 *  - **No credentials are ever read on the client.** `AUTH_SECRET` and
 *    `ADMIN_PASSWORD` live in server-only modules and are never prefixed with
 *    `NEXT_PUBLIC_`.
 *
 * There is no user table. This site has exactly one administrator, and adding a
 * users table plus a registration flow would be more attack surface for no
 * benefit. If more administrators are ever needed, the hash format below already
 * accommodates a second row in the same shape.
 */

const scryptAsync = promisify(scrypt);

const KEY_LENGTH = 64;
const SESSION_COOKIE = 'smkj_session';
/** Seven days. Long enough to be usable, short enough to bound a stolen cookie. */
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export { SESSION_COOKIE };

export type SessionPayload = {
  email: string;
  expiresAt: number;
};

/** Whether admin auth is configured. Without it, `/admin` refuses to open at all. */
export function isAuthConfigured(): boolean {
  const secret = process.env.AUTH_SECRET;
  return typeof secret === 'string' && secret.trim().length >= 32;
}

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (typeof secret !== 'string' || secret.trim().length < 32) {
    throw new Error(
      'AUTH_SECRET belum diatur atau terlalu pendek (minimal 32 karakter). ' +
        'Jalankan `openssl rand -base64 48` lalu simpan hasilnya di .env.',
    );
  }
  return secret;
}

// ---------------------------------------------------------------------------
// Password hashing
// ---------------------------------------------------------------------------

/**
 * Hashes a password into a self-describing string: `scrypt$<salt>$<hash>`.
 *
 * Self-describing so the parameters can change later without invalidating
 * existing hashes — a verifier can read the algorithm off the stored value
 * instead of guessing from the config.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scryptAsync(password.normalize('NFKC'), salt, KEY_LENGTH)) as Buffer;
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

/** Verifies a password against a stored hash. Constant-time. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 3) return false;

  const [algorithm, salt, expectedHex] = parts;
  if (algorithm !== 'scrypt' || !salt || !expectedHex) return false;

  try {
    const expected = Buffer.from(expectedHex, 'hex');
    const derived = (await scryptAsync(password.normalize('NFKC'), salt, expected.length)) as Buffer;
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Session tokens
// ---------------------------------------------------------------------------

function sign(value: string): string {
  return createHmac('sha256', getSecret()).update(value).digest('base64url');
}

/** Creates a signed token for the given email. */
export function createSessionToken(email: string): string {
  const payload: SessionPayload = { email, expiresAt: Date.now() + SESSION_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${body}.${sign(body)}`;
}

/**
 * Verifies a token and returns its payload, or `null`.
 *
 * Returns `null` for every failure — malformed, wrong signature, expired — so a
 * caller cannot accidentally branch on *why* it failed, which is itself an
 * information leak.
 */
export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [body, signature] = parts;
  if (!body || !signature) return null;

  let expected: string;
  try {
    expected = sign(body);
  } catch {
    return null;
  }

  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(providedBuffer, expectedBuffer)) return null;

  try {
    const parsed: unknown = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (typeof parsed !== 'object' || parsed === null) return null;

    const payload = parsed as Partial<SessionPayload>;
    if (typeof payload.email !== 'string' || typeof payload.expiresAt !== 'number') return null;
    if (Date.now() > payload.expiresAt) return null;

    return { email: payload.email, expiresAt: payload.expiresAt };
  } catch {
    return null;
  }
}

export const sessionMaxAgeSeconds = Math.floor(SESSION_TTL_MS / 1000);

// ---------------------------------------------------------------------------
// Credential check
// ---------------------------------------------------------------------------

/**
 * Checks submitted credentials against the configured administrator.
 *
 * Two details that are easy to get wrong:
 *  - The email comparison lowercases both sides, because `ADMIN_EMAIL` is typed
 *    by hand and a case mismatch should not lock the owner out.
 *  - When `ADMIN_PASSWORD` is unset, login fails *closed* with a log line rather
 *    than matching anything. An unset password must never mean "any password".
 *
 * `ADMIN_PASSWORD` accepts both documented forms: a `scrypt$…` hash, or a
 * plaintext password. The plaintext form is hashed on the way in by
 * `resolveSeedHash`, so a deployment never has to store a hash by hand — but the
 * value that reaches this function is whatever is in the environment.
 *
 * Both are compared in constant time. The plaintext branch hashes the submitted
 * password with a throwaway salt and compares the digests, so its running time
 * does not depend on how many characters were correct.
 */
export async function checkCredentials(email: string, password: string): Promise<boolean> {
  const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const configuredPassword = process.env.ADMIN_PASSWORD;

  if (!configuredEmail || !configuredPassword) {
    console.error(
      '[auth] ADMIN_EMAIL / ADMIN_PASSWORD belum diatur. Login ditolak. ' +
        'Isi keduanya di .env lalu jalankan `npm run db:seed` untuk membuat akun.',
    );
    return false;
  }

  if (email.trim().toLowerCase() !== configuredEmail) return false;

  return verifyPassword(password, await resolveSeedHash(configuredPassword));
}

/**
 * Resolves the password to store for the seed administrator.
 *
 * Accepts either a pre-hashed `scrypt$…` value (so a deployment can avoid ever
 * putting a plaintext password in an environment variable) or a plaintext one,
 * which is hashed on the way in. Documented in the README, because "why is my
 * password already a hash" is a confusing thing to hit unannounced.
 */
export async function resolveSeedHash(configured: string): Promise<string> {
  if (configured.startsWith('scrypt$')) return configured;
  return hashPassword(configured);
}
