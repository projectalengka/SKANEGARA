/**
 * Unit tests — authentication primitives.
 *
 * Auth is the one place where a plausible-looking shortcut is a real
 * vulnerability, so these tests deliberately attack the implementation rather
 * than only exercising the happy path.
 *
 * The tests set `AUTH_SECRET` themselves; `node:test` runs each file in its own
 * process, so this cannot leak into another test file.
 */

import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';

const TEST_SECRET = 'a'.repeat(48) + '-uji-coba-jangan-dipakai-di-produksi';

before(() => {
  process.env.AUTH_SECRET = TEST_SECRET;
  process.env.ADMIN_EMAIL = 'admin@smkjayanegara.sch.id';
});

describe('hashPassword / verifyPassword', () => {
  it('produces a self-describing scrypt hash', async () => {
    const { hashPassword } = await import('../src/lib/auth');
    const hash = await hashPassword('kata-sandi-rahasia');
    assert.match(hash, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
  });

  it('never stores the password in the hash', async () => {
    const { hashPassword } = await import('../src/lib/auth');
    const hash = await hashPassword('kata-sandi-rahasia');
    assert.ok(!hash.includes('kata-sandi-rahasia'));
  });

  it('salts per password, so equal passwords produce different hashes', async () => {
    const { hashPassword } = await import('../src/lib/auth');
    const [first, second] = await Promise.all([
      hashPassword('sama'),
      hashPassword('sama'),
    ]);
    assert.notEqual(first, second);
  });

  it('verifies the correct password', async () => {
    const { hashPassword, verifyPassword } = await import('../src/lib/auth');
    const hash = await hashPassword('benar-sekali');
    assert.equal(await verifyPassword('benar-sekali', hash), true);
  });

  it('rejects a wrong password', async () => {
    const { hashPassword, verifyPassword } = await import('../src/lib/auth');
    const hash = await hashPassword('benar-sekali');
    assert.equal(await verifyPassword('salah-sekali', hash), false);
  });

  it('rejects a malformed stored hash instead of throwing', async () => {
    const { verifyPassword } = await import('../src/lib/auth');
    for (const bad of ['', 'plaintext', 'scrypt$only-two', 'bcrypt$aa$bb', 'scrypt$$']) {
      assert.equal(await verifyPassword('apa saja', bad), false, `should reject: "${bad}"`);
    }
  });

  it('does not normalize away a genuinely different password', async () => {
    const { hashPassword, verifyPassword } = await import('../src/lib/auth');
    const hash = await hashPassword('KataSandi');
    assert.equal(await verifyPassword('katasandi', hash), false);
  });
});

describe('session tokens', () => {
  it('round-trips the email', async () => {
    const { createSessionToken, verifySessionToken } = await import('../src/lib/auth');
    const token = createSessionToken('admin@smkjayanegara.sch.id');
    const payload = verifySessionToken(token);
    assert.equal(payload?.email, 'admin@smkjayanegara.sch.id');
  });

  it('sets an expiry in the future', async () => {
    const { createSessionToken, verifySessionToken } = await import('../src/lib/auth');
    const payload = verifySessionToken(createSessionToken('a@b.c'));
    assert.ok(payload);
    assert.ok(payload.expiresAt > Date.now());
  });

  it('rejects a tampered payload', async () => {
    const { createSessionToken, verifySessionToken } = await import('../src/lib/auth');
    const token = createSessionToken('admin@smkjayanegara.sch.id');
    const [, signature] = token.split('.');

    // Re-encode the body claiming to be someone else, keep the old signature.
    const forgedBody = Buffer.from(
      JSON.stringify({ email: 'penyusup@jahat.test', expiresAt: Date.now() + 60_000 }),
      'utf8',
    ).toString('base64url');

    assert.equal(verifySessionToken(`${forgedBody}.${signature}`), null);
  });

  it('rejects a tampered signature', async () => {
    const { createSessionToken, verifySessionToken } = await import('../src/lib/auth');
    const token = createSessionToken('admin@smkjayanegara.sch.id');
    const [body] = token.split('.');
    assert.equal(verifySessionToken(`${body}.${'x'.repeat(43)}`), null);
  });

  it('rejects undefined, empty and structurally wrong tokens', async () => {
    const { verifySessionToken } = await import('../src/lib/auth');
    for (const bad of [undefined, '', '.', 'only-one-part', 'a.b.c']) {
      assert.equal(verifySessionToken(bad), null, `should reject: ${String(bad)}`);
    }
  });

  it('rejects an expired token', async () => {
    const { createSessionToken, verifySessionToken } = await import('../src/lib/auth');
    const token = createSessionToken('admin@smkjayanegara.sch.id');

    // Re-sign a body that expired an hour ago using the same secret.
    const { createHmac } = await import('node:crypto');
    const body = Buffer.from(
      JSON.stringify({ email: 'admin@smkjayanegara.sch.id', expiresAt: Date.now() - 3_600_000 }),
      'utf8',
    ).toString('base64url');
    const signature = createHmac('sha256', TEST_SECRET).update(body).digest('base64url');

    assert.equal(verifySessionToken(`${body}.${signature}`), null);
    // And confirm the fresh one still works, so the test is not passing vacuously.
    assert.ok(verifySessionToken(token));
  });
});

describe('checkCredentials', () => {
  it('accepts the configured email and password', async () => {
    const { hashPassword, checkCredentials } = await import('../src/lib/auth');
    process.env.ADMIN_PASSWORD = await hashPassword('sandi-admin');

    assert.equal(await checkCredentials('admin@smkjayanegara.sch.id', 'sandi-admin'), true);
  });

  it('is case-insensitive on the email, because it is typed by hand', async () => {
    const { hashPassword, checkCredentials } = await import('../src/lib/auth');
    process.env.ADMIN_PASSWORD = await hashPassword('sandi-admin');

    assert.equal(await checkCredentials('ADMIN@SMKJAYANEGARA.SCH.ID', 'sandi-admin'), true);
  });

  it('rejects a wrong password', async () => {
    const { hashPassword, checkCredentials } = await import('../src/lib/auth');
    process.env.ADMIN_PASSWORD = await hashPassword('sandi-admin');

    assert.equal(await checkCredentials('admin@smkjayanegara.sch.id', 'sandi-lain'), false);
  });

  // -------------------------------------------------------------------------
  // Bentuk teks biasa.
  //
  // `README.md` menyebut teks biasa lebih dulu, dan `.env.example` mengosongkan
  // `ADMIN_PASSWORD` supaya diisi apa adanya. Tapi setiap uji di atas menyetel
  // nilai berbentuk hash, jadi jalur teks biasa tidak pernah diperiksa — dan
  // ternyata memang tidak pernah bekerja: `checkCredentials()` menyerahkan nilai
  // mentah ke `verifyPassword()`, yang menolak apa pun yang tidak diawali
  // `scrypt$`. Artinya konfigurasi yang didokumentasikan paling awal justru
  // mengunci pemiliknya sendiri.
  //
  // Uji-uji ini ada supaya jalur itu tidak bisa hilang lagi tanpa suara.
  // -------------------------------------------------------------------------

  it('accepts a plaintext ADMIN_PASSWORD, the form the README documents first', async () => {
    const { checkCredentials } = await import('../src/lib/auth');
    process.env.ADMIN_PASSWORD = 'sandi-admin-teks-biasa';

    assert.equal(await checkCredentials('admin@smkjayanegara.sch.id', 'sandi-admin-teks-biasa'), true);
  });

  it('rejects a wrong password when ADMIN_PASSWORD is plaintext', async () => {
    const { checkCredentials } = await import('../src/lib/auth');
    process.env.ADMIN_PASSWORD = 'sandi-admin-teks-biasa';

    assert.equal(await checkCredentials('admin@smkjayanegara.sch.id', 'sandi-lain'), false);
  });

  it('normalises unicode the same way for plaintext and hashed passwords', async () => {
    const { checkCredentials } = await import('../src/lib/auth');
    // Bentuk NFD (é sebagai e + combining acute) harus cocok dengan NFC.
    process.env.ADMIN_PASSWORD = 'caf\u00e9-admin';

    assert.equal(await checkCredentials('admin@smkjayanegara.sch.id', 'cafe\u0301-admin'), true);
  });

  it('accepts a scrypt hash in ADMIN_PASSWORD without re-hashing it', async () => {
    const { hashPassword, checkCredentials } = await import('../src/lib/auth');
    const hash = await hashPassword('sandi-admin');
    process.env.ADMIN_PASSWORD = hash;

    assert.equal(await checkCredentials('admin@smkjayanegara.sch.id', 'sandi-admin'), true);
  });

  it('fails closed when ADMIN_EMAIL is unset', async () => {
    const { checkCredentials } = await import('../src/lib/auth');
    const saved = process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_EMAIL;

    assert.equal(await checkCredentials('admin@smkjayanegara.sch.id', 'apa saja'), false);

    process.env.ADMIN_EMAIL = saved;
  });
});

describe('resolveSeedHash', () => {
  it('passes through an already-hashed value unchanged', async () => {
    const { hashPassword, resolveSeedHash } = await import('../src/lib/auth');
    const hash = await hashPassword('sandi');
    assert.equal(await resolveSeedHash(hash), hash);
  });

  it('hashes a plaintext value', async () => {
    const { resolveSeedHash, verifyPassword } = await import('../src/lib/auth');
    const stored = await resolveSeedHash('sandi-baru');
    assert.ok(stored.startsWith('scrypt$'));
    assert.equal(await verifyPassword('sandi-baru', stored), true);
  });
});

describe('isAuthConfigured', () => {
  it('is true when the secret is long enough', async () => {
    const { isAuthConfigured } = await import('../src/lib/auth');
    process.env.AUTH_SECRET = TEST_SECRET;
    assert.equal(isAuthConfigured(), true);
  });

  it('is false when the secret is short, because a short secret is not a secret', async () => {
    const { isAuthConfigured } = await import('../src/lib/auth');
    const saved = process.env.AUTH_SECRET;
    process.env.AUTH_SECRET = 'pendek';
    assert.equal(isAuthConfigured(), false);
    process.env.AUTH_SECRET = saved;
  });
});
