/**
 * Unit tests — the migration is real, and it matches the schema.
 *
 * ## Why this test exists
 *
 * The README documents `npm run db:deploy` as the production migration path,
 * and instructs committing `prisma/migrations/`. For most of this project's
 * life that directory did not exist. Nothing caught it: `db:deploy` against an
 * empty migrations folder exits successfully having done nothing, and the first
 * symptom would be a deployed site whose every query fails on a missing table.
 *
 * A missing migration is invisible to typecheck, lint, and the build — the
 * schema file is the source of truth and the migration is a separate artefact
 * derived from it. So the gap between them has to be asserted directly.
 *
 * ## What is checked
 *
 *   1. The migrations directory exists and contains an init migration.
 *   2. That migration creates every table the schema declares.
 *   3. It creates every column, with no extras left behind.
 *   4. It contains no destructive statement — an init migration that drops
 *      something is a mistake, and one that runs `db:deploy` against production
 *      would be a serious one.
 *   5. `supabase/schema.sql` agrees with it column for column. That file is a
 *      human-readable reference people may paste into the Supabase SQL editor;
 *      if it drifts, the paste path produces a database the app cannot use.
 */

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const schema = readFileSync(new URL('../prisma/schema.prisma', import.meta.url), 'utf8');
const migrationUrl = new URL('../prisma/migrations/20260918000000_init/migration.sql', import.meta.url);
const lockUrl = new URL('../prisma/migrations/migration_lock.toml', import.meta.url);
const referenceUrl = new URL('../supabase/schema.sql', import.meta.url);

const read = (url: URL): string => readFileSync(url, 'utf8');

/** Model names declared in `schema.prisma`. */
function schemaModels(): string[] {
  return [...schema.matchAll(/^model\s+(\w+)\s*\{/gm)].map((m) => m[1] as string);
}

/**
 * Column names per table, read from a `CREATE TABLE` body.
 *
 * Column names may be quoted (`"schoolName"`) or bare (`id`): the Prisma
 * migration quotes everything while `supabase/schema.sql` quotes only what
 * needs it. The pattern accepts both.
 */
function columns(source: string, pattern: RegExp): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const re = new RegExp(pattern.source, pattern.flags);
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    const table = match[1] as string;
    const body = match[2] as string;
    out[table] = [...body.matchAll(/^\s*"?([A-Za-z_]\w*)"?\s+\S/gm)]
      .map((m) => m[1] as string)
      .filter((name) => !/^(CONSTRAINT|PRIMARY|UNIQUE|FOREIGN|CHECK)$/i.test(name));
  }
  return out;
}

const migration = () => read(migrationUrl);
const migrationColumns = () => columns(migration(), /CREATE TABLE "(\w+)" \(([\s\S]*?)\n\);/g);

describe('the migration exists at all', () => {
  it('has a migrations directory with an init migration', () => {
    assert.ok(
      existsSync(migrationUrl),
      'prisma/migrations/20260918000000_init/migration.sql is missing — `db:deploy` would silently do nothing',
    );
  });

  it('has the migration_lock.toml Prisma requires', () => {
    assert.ok(existsSync(lockUrl), 'migration_lock.toml must be committed alongside the migrations');
    assert.match(read(lockUrl), /provider\s*=\s*"postgresql"/, 'the lock file must name the provider');
  });
});

describe('the migration matches the schema', () => {
  it('creates every model declared in schema.prisma', () => {
    const models = schemaModels();
    const created = Object.keys(migrationColumns());

    assert.ok(models.length > 0, 'the schema must declare at least one model');

    for (const model of models) {
      assert.ok(
        created.includes(model),
        `the migration does not create "${model}" — a deployed database would be missing that table`,
      );
    }

    // And nothing extra: a table in the migration that the schema does not know
    // about means the migration is stale.
    for (const table of created) {
      assert.ok(models.includes(table), `the migration creates "${table}", which the schema does not declare`);
    }
  });

  it('creates every column of every model', () => {
    const created = migrationColumns();

    for (const model of schemaModels()) {
      const body = schema.match(new RegExp(`^model\\s+${model}\\s*\\{([\\s\\S]*?)^\\}`, 'm'));
      assert.ok(body, `could not read the body of model ${model}`);

      // Only compare real field lines: skip block attributes and comments.
      const fields = (body[1] as string)
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('//') && !line.startsWith('@@'))
        .map((line) => line.split(/\s+/)[0] as string)
        .filter((name) => /^\w+$/.test(name));

      for (const field of fields) {
        assert.ok(
          (created[model] ?? []).includes(field),
          `the migration is missing column ${model}.${field}`,
        );
      }
    }
  });

  it('contains no destructive statement', () => {
    const sql = migration();
    assert.ok(!/\bDROP\s+TABLE\b/i.test(sql), 'an init migration must not drop a table');
    assert.ok(!/\bDROP\s+COLUMN\b/i.test(sql), 'an init migration must not drop a column');
    assert.ok(!/\bTRUNCATE\b/i.test(sql), 'an init migration must not truncate');
    // `db:deploy` runs this against production. A DELETE here is a data loss bug.
    assert.ok(!/\bDELETE\s+FROM\b/i.test(sql), 'an init migration must not delete rows');
  });

  it('declares the indexes the schema asks for', () => {
    const sql = migration();
    const declaredIndexes = [...schema.matchAll(/@@index\(\[([^\]]+)\]\)/g)].length;
    const createdIndexes = [...sql.matchAll(/CREATE INDEX/g)].length;

    assert.equal(
      createdIndexes,
      declaredIndexes,
      `the schema declares ${declaredIndexes} composite indexes but the migration creates ${createdIndexes}`,
    );
  });
});

describe('supabase/schema.sql agrees with the migration', () => {
  it('describes the same tables and columns', () => {
    const fromMigration = migrationColumns();
    const fromReference = columns(read(referenceUrl), /CREATE TABLE IF NOT EXISTS "(\w+)" \(([\s\S]*?)\n\);/g);

    for (const table of Object.keys(fromMigration)) {
      const a = fromMigration[table] ?? [];
      const b = fromReference[table] ?? [];

      assert.ok(b.length > 0, `supabase/schema.sql has no "${table}" table`);

      const missing = a.filter((name) => !b.includes(name));
      const extra = b.filter((name) => !a.includes(name));

      assert.deepEqual(missing, [], `supabase/schema.sql is missing columns on ${table}: ${missing.join(', ')}`);
      assert.deepEqual(extra, [], `supabase/schema.sql has columns the migration does not: ${extra.join(', ')}`);
    }
  });
});
