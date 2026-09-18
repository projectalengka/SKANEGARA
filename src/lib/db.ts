import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

/**
 * Prisma client singleton.
 *
 * Prisma 7 connects through an explicit driver adapter rather than a URL in the
 * schema, so the connection is constructed here and handed to the client. The
 * client is only ever built when a connection string actually exists — see
 * `isDatabaseConfigured`. Nothing in this module may throw at import time: it is
 * imported by the root layout, and a throw there would take down every route
 * including the ones that do not read the database.
 *
 * On Vercel every invocation may reuse a warm container, and in development
 * Next.js re-evaluates modules on every hot reload. Both create a new client per
 * module load unless it is parked on `globalThis`, which exhausts the connection
 * limit fast. That is the documented fix, not a hack — and it matters more here
 * than usual, because the pooler has a hard cap on concurrent clients.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Whether the database is configured at all.
 *
 * This is the switch the whole content layer hangs on. When it is false the site
 * renders from `src/data/defaults.ts` — which is what lets the design be built,
 * reviewed and deployed before anyone has provisioned Postgres. It is a check on
 * the *presence* of the variable rather than a try/catch around a query, so no
 * query is ever issued against an unconfigured connection string.
 */
export function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL;
  return typeof url === 'string' && url.trim().startsWith('postgres');
}

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL ?? '';

  const adapter = new PrismaPg({
    connectionString,
    // Serverless: each instance holds a small pool and releases it quickly.
    // A large pool here multiplies across instances and trips the pooler limit.
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

let cached: PrismaClient | null = globalForPrisma.prisma ?? null;

/**
 * Returns the shared client, or `null` when no database is configured.
 *
 * Returning `null` rather than throwing is what keeps the fallback path
 * reachable: callers ask "is there a database", and if there is not, they read
 * the seed content. There is no code path in which a missing connection string
 * produces an error page.
 */
export function getPrisma(): PrismaClient | null {
  if (cached) return cached;
  if (!isDatabaseConfigured()) return null;

  try {
    cached = createClient();
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = cached;
    }
    return cached;
  } catch (error) {
    console.error('[db] Gagal membuat klien Prisma.', error);
    return null;
  }
}

/**
 * Runs a database read, falling back to seed content when the database is absent
 * or unreachable.
 *
 * The failure mode this is designed around: a school website must not go blank
 * because a connection string expired or a pooler hiccuped. It must show its
 * last known content. Every failure is logged, so it is never a *silent*
 * failure — the brief is explicit about that.
 */
export async function readOrFallback<T>(
  label: string,
  query: (client: PrismaClient) => Promise<T>,
  fallback: T,
): Promise<T> {
  const client = getPrisma();
  if (!client) return fallback;

  try {
    return await query(client);
  } catch (error) {
    console.error(`[db] Kueri "${label}" gagal, memakai konten cadangan.`, error);
    return fallback;
  }
}
