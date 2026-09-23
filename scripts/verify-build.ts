/**
 * Verifies that a production build is actually *complete*.
 *
 * ## Why this exists
 *
 * The admin route guard lives in `src/proxy.ts`, which Next compiles to
 * `.next/server/proxy.js` and then — as the **last step of the build**, right
 * after "Collecting build traces" — renames to `.next/server/middleware.js`.
 * That rename is what the server runtime actually loads
 * (`server/next-server.js`, `loadNodeMiddleware()`).
 *
 * If the build is interrupted before that rename, `proxy.js` is left in place
 * and `middleware.js` never appears. The runtime then does this:
 *
 *     require('.next/server/middleware.js')   // -> MODULE_NOT_FOUND
 *     catch (err) { if (err.code !== 'MODULE_NOT_FOUND') throw err }
 *
 * `MODULE_NOT_FOUND` is explicitly *swallowed*, so the failure is completely
 * silent: the build looks fine, `next start` looks fine, every content page
 * renders — and `/admin/*` quietly stops redirecting. Measured during the
 * 2026-09-20 audit: `/admin/dasbor` returned `200` with an empty body instead
 * of `307` to the login page.
 *
 * Nothing in a screenshot, a log line, or a green `tsc` reveals this. The only
 * reliable signal is the presence of the renamed file, so that is what this
 * script checks — plus a spot-check that the guard actually redirects when the
 * built server is running.
 *
 * ## Usage
 *
 *     npm run verify:build          # build artifacts only (fast, offline)
 *     npm run verify:build -- --url http://127.0.0.1:3000
 *                                   # also make a live request to the guard
 *
 * Run it after every `npm run build`. `npm run qa` does this automatically.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const serverDir = path.join(root, '.next', 'server');

const proxyBundle = path.join(serverDir, 'proxy.js');
const middlewareBundle = path.join(serverDir, 'middleware.js');
const functionsConfig = path.join(serverDir, 'functions-config-manifest.json');

/** The `/admin/:path*` matcher Next records when it registers the proxy. */
const ADMIN_REGEX_FRAGMENT = '\\/admin';

type Check = { name: string; ok: boolean; detail: string };

const checks: Check[] = [];

function check(name: string, ok: boolean, detail: string): void {
  checks.push({ name, ok, detail });
}

// ---------------------------------------------------------------------------
// 1. The build finished at all
// ---------------------------------------------------------------------------

if (!existsSync(serverDir)) {
  console.error('✗ .next/server is missing — run `npm run build` first.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 2. The proxy was registered
// ---------------------------------------------------------------------------
//
// `functions-config-manifest.json` is how Next tells the runtime that a Node
// middleware exists. If this is absent, the proxy was never compiled in.

let registered = false;
let matcherIsAdminScoped = false;

if (existsSync(functionsConfig)) {
  try {
    const config = JSON.parse(readFileSync(functionsConfig, 'utf8')) as {
      functions?: Record<string, { matchers?: { regexp?: string }[] }>;
    };
    const entry = config.functions?.['/_middleware'];
    registered = Boolean(entry);
    matcherIsAdminScoped = Boolean(
      entry?.matchers?.some((m) => m.regexp?.includes(ADMIN_REGEX_FRAGMENT)),
    );
  } catch (error) {
    check(
      'functions-config-manifest.json is readable',
      false,
      error instanceof Error ? error.message : String(error),
    );
  }
}

check(
  'proxy registered in functions-config-manifest.json',
  registered,
  registered ? 'found /_middleware' : 'no /_middleware entry — the proxy was not compiled',
);

if (registered) {
  check(
    'proxy matcher is scoped to /admin',
    matcherIsAdminScoped,
    matcherIsAdminScoped ? 'matcher targets /admin' : 'matcher does not mention /admin',
  );
}

// ---------------------------------------------------------------------------
// 3. THE critical check: the rename happened
// ---------------------------------------------------------------------------
//
// This is the one that caught the real bug. `middleware.js` exists only if the
// build reached its final step. `proxy.js` still being present is the tell-tale
// sign of an interrupted finalization.

const hasMiddlewareBundle = existsSync(middlewareBundle);
const hasLeftoverProxy = existsSync(proxyBundle);

check(
  '.next/server/middleware.js exists (build reached its final rename)',
  hasMiddlewareBundle,
  hasMiddlewareBundle
    ? 'present — the runtime will find the guard'
    : 'ABSENT — the build was cut short; the admin guard will silently not run',
);

check(
  'no leftover .next/server/proxy.js',
  !hasLeftoverProxy,
  hasLeftoverProxy
    ? 'proxy.js was never renamed — the build did not finish'
    : 'renamed cleanly',
);

// ---------------------------------------------------------------------------
// 4. Optional live check
// ---------------------------------------------------------------------------

const urlIndex = process.argv.indexOf('--url');
const liveUrl = urlIndex !== -1 ? process.argv[urlIndex + 1] : undefined;

/** Wrapped in a function because this file is bundled as CJS (no top-level await). */
async function checkLiveGuard(url: string): Promise<void> {
  const target = `${url.replace(/\/$/, '')}/admin/dasbor`;
  try {
    const response = await fetch(target, { redirect: 'manual' });
    const location = response.headers.get('location') ?? '';
    const redirected = response.status === 307 && location.includes('/admin/masuk');
    check(
      `anonymous ${target} redirects to the login page`,
      redirected,
      redirected
        ? `307 -> ${location}`
        : `got ${response.status}${location ? ` -> ${location}` : ''}, expected 307 to /admin/masuk`,
    );
  } catch (error) {
    check(
      `live check of ${target}`,
      false,
      `could not reach the server (${error instanceof Error ? error.message : String(error)})`,
    );
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function report(): never {
  console.log('');
  for (const { name, ok, detail } of checks) {
    console.log(`  ${ok ? '✓' : '✗'} ${name}`);
    console.log(`      ${detail}`);
  }
  console.log('');

  const failed = checks.filter((c) => !c.ok);

  if (failed.length > 0) {
    console.error(`✗ Build verification failed (${failed.length} of ${checks.length}).`);
    console.error('');
    console.error('  The most likely cause is a build that did not finish. Rebuild with:');
    console.error('');
    console.error('      npm run build');
    console.error('');
    console.error('  and make sure it prints "Collecting build traces" followed by the');
    console.error('  route table. If the process is killed during that phase — by a');
    console.error('  sandbox guard, a timeout, or Ctrl-C — .next is left in a state where');
    console.error('  the admin guard silently stops working.');
    process.exit(1);
  }

  console.log(`✓ Build verified: all ${checks.length} checks passed.`);
  if (!liveUrl) {
    console.log('  (Run with --url http://127.0.0.1:3000 to also test the live guard.)');
  }
  process.exit(0);
}

async function main(): Promise<void> {
  if (liveUrl) await checkLiveGuard(liveUrl);
  report();
}

void main();
