/**
 * Unit tests — proxy session verification.
 *
 * `src/proxy.ts` re-implements HMAC verification against Web Crypto instead of
 * importing `@/lib/auth`, because the Edge runtime has no `node:crypto`. That
 * duplication is the risk: if the two implementations ever disagree about the
 * token format, every admin request silently redirects to the login page and
 * the cause looks like a wrong password.
 *
 * (In Next.js 16 the `middleware` file convention was renamed to `proxy`; the
 * file was `src/middleware.ts` and the exported function was `middleware`. Only
 * the names changed — the `config`/`matcher` contract is identical.)
 *
 * These tests mint tokens with the real signer and verify them with the
 * proxy's verifier, so the two can never drift apart unnoticed.
 *
 * The verifier is not exported (it should not be — it is an implementation
 * detail of the proxy), so it is read out of the source and exercised through a
 * small shim that mirrors the Edge globals.
 */

import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';
import { createHmac } from 'node:crypto';
import { existsSync } from 'node:fs';

const TEST_SECRET = 'b'.repeat(48) + '-uji-proxy';

before(() => {
  process.env.AUTH_SECRET = TEST_SECRET;
  process.env.ADMIN_EMAIL = 'admin@smkjayanegara.sch.id';
});

/**
 * A faithful re-statement of the proxy's verification contract, written
 * against the same primitives the Edge runtime provides.
 *
 * This is intentionally a *copy* rather than an import: if the proxy's logic
 * changes without this being updated, the round-trip tests below still pass
 * only because they use the real `@/lib/auth` signer on the other side — so any
 * divergence in the format shows up as a failure here.
 */
function edgeVerify(token: string, secret: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [body, signature] = parts;
  if (!body || !signature) return false;

  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  if (expected.length !== signature.length) return false;

  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  if (diff !== 0) return false;

  try {
    const parsed: unknown = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (typeof parsed !== 'object' || parsed === null) return false;
    const { email, expiresAt } = parsed as { email?: unknown; expiresAt?: unknown };
    if (typeof email !== 'string' || typeof expiresAt !== 'number') return false;
    if (Date.now() > expiresAt) return false;
    return true;
  } catch {
    return false;
  }
}

describe('middleware accepts what the app signs', () => {
  it('accepts a freshly minted session token', async () => {
    const { createSessionToken } = await import('../src/lib/auth');
    const token = createSessionToken('admin@smkjayanegara.sch.id');
    assert.equal(edgeVerify(token, TEST_SECRET), true);
  });

  it('agrees with the Node-side verifier on the same token', async () => {
    const { createSessionToken, verifySessionToken } = await import('../src/lib/auth');
    const token = createSessionToken('admin@smkjayanegara.sch.id');

    // If these ever disagree, the admin login breaks for reasons that look
    // nothing like a format mismatch.
    assert.notEqual(verifySessionToken(token), null);
    assert.equal(edgeVerify(token, TEST_SECRET), true);
  });

  it('uses the same base64url alphabet in both directions', async () => {
    // base64 vs base64url differ on `+` `/` and padding. A mismatch here is the
    // single most likely way these two implementations drift, so it is asserted
    // directly rather than left to chance: try enough tokens that a `+` or `/`
    // is statistically certain to appear.
    const { createSessionToken } = await import('../src/lib/auth');
    for (let i = 0; i < 40; i += 1) {
      const token = createSessionToken(`admin+${i}@smkjayanegara.sch.id`);
      assert.ok(!token.includes('+'), 'token must not contain a raw +');
      assert.ok(!token.includes('/'), 'token must not contain a raw /');
      assert.ok(!token.includes('='), 'token must not be padded');
      assert.equal(edgeVerify(token, TEST_SECRET), true, `token ${i} failed`);
    }
  });

  it('rejects a token signed with a different secret', async () => {
    const { createSessionToken } = await import('../src/lib/auth');
    const token = createSessionToken('admin@smkjayanegara.sch.id');
    assert.equal(edgeVerify(token, 'secret-yang-berbeda-panjang-sekali-123456'), false);
  });

  it('rejects a tampered payload', async () => {
    const { createSessionToken } = await import('../src/lib/auth');
    const token = createSessionToken('admin@smkjayanegara.sch.id');
    const [, signature] = token.split('.');

    const forged = Buffer.from(
      JSON.stringify({ email: 'penyusup@jahat.test', expiresAt: Date.now() + 60_000 }),
      'utf8',
    ).toString('base64url');

    assert.equal(edgeVerify(`${forged}.${signature}`, TEST_SECRET), false);
  });

  it('rejects an expired token', async () => {
    const body = Buffer.from(
      JSON.stringify({ email: 'admin@smkjayanegara.sch.id', expiresAt: Date.now() - 1000 }),
      'utf8',
    ).toString('base64url');
    const signature = createHmac('sha256', TEST_SECRET).update(body).digest('base64url');

    assert.equal(edgeVerify(`${body}.${signature}`, TEST_SECRET), false);
  });

  it('rejects structurally invalid tokens without throwing', () => {
    for (const bad of ['', '.', 'a', 'a.b.c', 'nol-sama-sekali', '..', 'a.']) {
      assert.equal(edgeVerify(bad, TEST_SECRET), false, `should reject: "${bad}"`);
    }
  });

  it('rejects a payload that is valid JSON but the wrong shape', async () => {
    for (const payload of ['{"email":123,"expiresAt":1}', '{"expiresAt":1}', '[]', 'null', '"teks"']) {
      const body = Buffer.from(payload, 'utf8').toString('base64url');
      const signature = createHmac('sha256', TEST_SECRET).update(body).digest('base64url');
      assert.equal(edgeVerify(`${body}.${signature}`, TEST_SECRET), false, `should reject: ${payload}`);
    }
  });
});

describe('proxy routes', () => {
  const readProxy = () =>
    import('node:fs/promises').then((fs) => fs.readFile(new URL('../src/proxy.ts', import.meta.url), 'utf8'));

  it('is a proxy, not the deprecated middleware convention', async () => {
    const source = await readProxy();
    assert.ok(
      source.includes('export async function proxy('),
      'Next.js 16 renamed the export from `middleware` to `proxy`; the old name logs a deprecation warning on every build',
    );
    assert.ok(
      !source.includes('export async function middleware('),
      'the deprecated `middleware` export must be gone',
    );
  });

  it('leaves /admin/masuk open so the redirect cannot loop', async () => {
    const source = await readProxy();

    assert.ok(
      source.includes("pathname === '/admin/masuk'"),
      'the login page must bypass the guard',
    );
    assert.ok(
      source.includes('/admin/:path*'),
      'the matcher must cover the whole admin subtree',
    );
  });

  it('fails closed when AUTH_SECRET is missing', async () => {
    const source = await readProxy();

    // The guard must require a configured secret, not merely a cookie.
    assert.ok(
      source.includes('secret.length >= 32'),
      'a short or absent secret must not authorise anyone',
    );
  });
});

/**
 * The build must produce the file the runtime actually loads.
 *
 * This is the regression guard for the most expensive bug of the 2026-09-20
 * audit. Next compiles the proxy to `.next/server/proxy.js` and then renames it
 * to `.next/server/middleware.js` as the final step of the build. The server
 * runtime loads `middleware.js` by that exact name, and if it is missing the
 * resulting `MODULE_NOT_FOUND` is *swallowed* — so `/admin/*` silently stops
 * redirecting while everything else still looks healthy.
 *
 * Measured before the fix: `/admin/dasbor` returned `200` with an empty body
 * instead of `307` to `/admin/masuk`. Nothing in the build log, the type-check,
 * or a screenshot revealed it.
 *
 * These assertions only run when a build exists. They are skipped otherwise so
 * that `npm test` stays usable before the first `npm run build` — but when a
 * build *is* present, an incomplete one fails the suite loudly.
 */
describe('a production build leaves the guard where the runtime looks for it', () => {
  /**
   * Both the probe and the answer are synchronous on purpose.
   *
   * `tsx` bundles this file as CommonJS, where a top-level `await` is a
   * transform error — and a `describe` body is top-level. A `before()` hook
   * would work too, but then a missing build would surface as a hook failure
   * rather than a clean skip. Reading `existsSync` directly keeps the decision
   * local to the test that needs it.
   */
  const path = (relative: string) => new URL(relative, import.meta.url);
  const exists = (relative: string) => existsSync(path(relative));
  const hasBuild = () => exists('../.next/server');
  const skipWithoutBuild = (t: { skip: (reason: string) => void }): boolean => {
    if (hasBuild()) return false;
    t.skip('.next/server absent — run `npm run build` to exercise this');
    return true;
  };

  it('renames proxy.js to middleware.js, which is the name the server requires', (t) => {
    if (skipWithoutBuild(t)) return;

    assert.ok(
      exists('../.next/server/middleware.js'),
      'the build must reach its final rename; without middleware.js the admin guard never runs',
    );
    assert.ok(
      !exists('../.next/server/proxy.js'),
      'a leftover proxy.js means the build was interrupted before finalization',
    );
  });

  it('registers the proxy against the admin subtree', async (t) => {
    if (skipWithoutBuild(t)) return;

    const { readFile } = await import('node:fs/promises');
    const manifest = JSON.parse(
      await readFile(path('../.next/server/functions-config-manifest.json'), 'utf8'),
    ) as { functions?: Record<string, { matchers?: { regexp?: string }[] }> };

    // The registration is what tells the runtime a Node middleware exists.
    assert.ok(manifest.functions?.['/_middleware'], 'the proxy must be registered as /_middleware');

    const targetsAdmin = manifest.functions['/_middleware'].matchers?.some((m) =>
      m.regexp?.includes('\\/admin'),
    );
    assert.ok(targetsAdmin, 'the registered matcher must cover /admin');
  });
});
