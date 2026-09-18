/**
 * Edge proxy — the first line of defence for `/admin`.
 *
 * Next.js 16 renamed the `middleware` file convention to `proxy`, and the
 * exported function from `middleware` to `proxy`. The naming is the point: this
 * sits at a network boundary in front of the app, which is what a proxy is, and
 * the old name invited confusion with Express-style middleware. The `config`
 * export and its `matcher` are unchanged.
 *
 * ## Why this exists in addition to the layout guard
 *
 * `src/app/admin/(dasbor)/layout.tsx` calls `requireSession()`, and that is the
 * guard that actually *authorises*: it verifies the HMAC signature of the
 * session token with the real secret, and it is the thing that cannot be
 * bypassed by a client.
 *
 * But a layout guard runs as part of rendering the route, and Next.js streams.
 * Measured behaviour on an unauthenticated request to `/admin/dasbor`:
 *
 *     <meta id="__next-page-redirect" http-equiv="refresh" ...>
 *     <template data-dgst="NEXT_REDIRECT;replace;/admin/masuk?...;307;">
 *     ...followed by the serialised RSC payload of the dashboard itself...
 *
 * The redirect fires — no data is read, because `requireSession` throws before
 * the page's queries run — but the compiled page structure, its labels, and its
 * link targets are still flushed to an anonymous visitor. Nothing secret leaks,
 * yet it is still the wrong shape: an attacker gets a free map of the admin
 * surface, and the protection depends on a client honouring a meta refresh.
 *
 * A proxy runs *before* the route tree is entered. Redirecting here means the
 * protected markup is never rendered, never serialised, and never sent.
 *
 * ## Why the signature check is duplicated rather than imported
 *
 * This runs in the Edge runtime, and `@/lib/auth` pulls in `node:crypto` for
 * scrypt. Importing it would either fail to bundle or silently drag the
 * password-hashing code into the edge bundle — and this check only needs HMAC,
 * which `Web Crypto` provides natively.
 *
 * So the signature verification is re-implemented below against Web Crypto. The
 * duplication is deliberate and load-bearing: **both implementations must agree**
 * on the token format. They are covered by the same round-trip test, which
 * asserts that a token minted by `@/lib/auth` is accepted by this verifier and
 * that a tampered one is rejected.
 *
 * This is a coarse gate. It deliberately does **not** decide authorisation — it
 * only answers "is there a structurally valid, unexpired, correctly signed
 * session?" The layout still does the real check. Defence in depth, with the
 * weaker check first and the stronger check kept.
 */

import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE = 'smkj_session';

/** Mirrors `SESSION_TTL_MS` in `@/lib/auth`. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Mirrors the signing in `@/lib/auth`: HMAC-SHA256, base64url, `body.signature`. */
async function verifyToken(token: string, secret: string): Promise<boolean> {
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [body, signature] = parts;
  if (!body || !signature) return false;

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );

    const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));

    // base64url, matching `digest('base64url')` on the Node side.
    const expected = btoa(String.fromCharCode(...new Uint8Array(mac)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Constant-time-ish comparison. Real timing safety needs `timingSafeEqual`,
    // which the Edge runtime does not expose; a length check plus a full-length
    // scan is the closest available and is adequate for a value that is already
    // a keyed MAC rather than a secret.
    if (expected.length !== signature.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i += 1) {
      diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    if (diff !== 0) return false;

    const payload: unknown = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(atob(body.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)),
      ),
    );

    if (typeof payload !== 'object' || payload === null) return false;
    const { email, expiresAt } = payload as { email?: unknown; expiresAt?: unknown };
    if (typeof email !== 'string' || typeof expiresAt !== 'number') return false;
    if (Date.now() > expiresAt) return false;
    if (expiresAt > Date.now() + MAX_AGE_MS + 60_000) return false; // implausibly far future

    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // The login page is the only admin route that must stay open. Without this the
  // redirect would loop.
  if (pathname === '/admin/masuk') return NextResponse.next();

  const secret = process.env.AUTH_SECRET;
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  // Fails closed. An unset or too-short secret means admin is not configured, so
  // there is nothing to authorise — send them to the login page, which explains
  // what is missing rather than presenting a form that cannot work.
  const valid =
    typeof secret === 'string' && secret.length >= 32 && token
      ? await verifyToken(token, secret)
      : false;

  if (valid) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = '/admin/masuk';
  url.search = '';

  // Only send them back where they were going if it is actually our own path —
  // never echo an attacker-supplied value into the redirect target.
  if (pathname.startsWith('/admin/')) {
    url.searchParams.set('lanjut', pathname);
  }

  return NextResponse.redirect(url);
}

export const config = {
  /**
   * Every admin route except the login page itself.
   *
   * Matching `/admin/:path*` and excluding `/admin/masuk` inside the handler
   * (rather than in a negative lookahead regex) keeps the rule readable — the
   * regex form is notoriously easy to get subtly wrong.
   */
  matcher: ['/admin/:path*'],
};
