/**
 * The id prefix every sample row carries — in a module with no data in it.
 *
 * ## Why this is not just a constant inside `src/data/sample.ts`
 *
 * Client components need to recognise a sample row, because the dashboard must
 * not offer an edit form for a row that has no database record behind it. Saving
 * such a row asks Prisma to update a primary key that does not exist, which
 * fails with a generic error the owner cannot act on — the bug this module was
 * introduced to close.
 *
 * Importing `src/data/sample.ts` to reach the prefix would pull eighteen student
 * works and four full news articles of prose into the admin JavaScript bundle
 * for the sake of one string. So the prefix lives here, and both the data module
 * and the client components import it: one definition, no data shipped.
 */

/** The prefix sample row ids start with. */
export const SAMPLE_ID_PREFIX = 'sample-';

/**
 * Whether a row id belongs to sample content rather than to the database.
 *
 * Ids in the database are Prisma `cuid()` values, which never start with this
 * prefix, so the test is exact rather than heuristic. It is still written as a
 * single definition here so the dashboard, the server actions and the tests
 * cannot drift apart.
 */
export function isSampleId(id: string): boolean {
  return id.startsWith(SAMPLE_ID_PREFIX);
}
