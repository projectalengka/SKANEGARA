/**
 * Shared helpers for the tests that read the source tree.
 *
 * ## Why `code()` exists
 *
 * Assertions about what a file *renders* must not be satisfiable by what it
 * *says*. The first draft of `upload.test.ts` failed because `src/app/layout.tsx`
 * explains, in a comment, that the dashboard used to contain two `<main>`
 * elements — and a naive `/<main\b/` matched the prose. Comments are where the
 * reasoning lives in this project, so they are long by design, and a test that
 * reads them is a test that will keep lying.
 *
 * ## Why the helpers live in one file
 *
 * The storage tests need exactly the same readers as the upload tests, and a
 * subtly different copy of `code()` in each file is how one of them ends up not
 * stripping comments — the failure would be invisible, because the test would
 * still pass.
 *
 * This file is deliberately not named `*.test.ts`: `npm test` runs
 * `tsx --test tests/*.test.ts`, and a helper is not a test.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';

const rootUrl = new URL('../', import.meta.url);

/** Reads a file relative to the project root, as text. */
export function read(relative: string): string {
  return readFileSync(new URL(relative, rootUrl), 'utf8');
}

/** Whether a path relative to the project root exists. */
export function exists(relative: string): boolean {
  return existsSync(new URL(relative, rootUrl));
}

/**
 * Source with comments removed.
 *
 * Block comments go first, then line comments — with `://` skipped so a URL in a
 * string literal is not mistaken for the start of a comment.
 */
export function code(relative: string): string {
  return read(relative)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/gm, '$1');
}

/**
 * Every TypeScript source file under a directory, as project-relative paths.
 *
 * Separators are normalised to `/` because `readdirSync` joins with the platform
 * separator, and `new URL()` percent-encodes a Windows backslash — so a
 * recursive listing on Windows would produce paths that cannot be read back.
 *
 * `exclude` takes prefixes, not globs: the generated Prisma client is checked in
 * and contains the whole schema as a string, including the words this suite
 * searches for.
 */
export function sourceFiles(relativeDir: string, options: { exclude?: string[] } = {}): string[] {
  const dir = new URL(relativeDir, rootUrl);
  const prefix = `${relativeDir.replace(/\/$/, '')}/`;
  const excluded = options.exclude ?? [];

  return (readdirSync(dir, { recursive: true, encoding: 'utf8' }) as string[])
    .map((name) => `${prefix}${name}`.replace(/\\/g, '/'))
    .filter((name) => /\.tsx?$/.test(name))
    .filter((name) => !excluded.some((skip) => name.startsWith(skip)));
}
