import { PrismaClient, Prisma } from '@prisma/client';

import { config } from '../config/env';

// ─── Prisma query log levels by environment ───────────────
const getLogLevels = (): Prisma.LogLevel[] => {
  if (config.IS_TEST) {
    return ['error'];
  }
  if (config.IS_DEVELOPMENT) {
    return ['query', 'info', 'warn', 'error'];
  }
  return ['warn', 'error'];
};

// ─── Prisma client factory ────────────────────────────────
const createPrismaClient = (): PrismaClient => {
  const client = new PrismaClient({
    log: getLogLevels(),
    errorFormat: config.IS_DEVELOPMENT ? 'pretty' : 'minimal',
    datasources: {
      db: {
        url: config.DATABASE_URL,
      },
    },
  });

  // ─── Query logging in development ──────────────────────
  if (config.IS_DEVELOPMENT) {
    client.$on('query' as never, (e: Prisma.QueryEvent) => {
      if (e.duration > 500) {
        console.warn(`⚠️  Slow query detected (${e.duration}ms):\n${e.query}`);
      }
    });
  }

  return client;
};

// ─── Singleton pattern ────────────────────────────────────
// Prevents multiple PrismaClient instances during hot reload
// in development (Next.js / nodemon restart)
declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

export const db: PrismaClient =
  globalThis.__prismaClient ?? createPrismaClient();

if (!config.IS_PRODUCTION) {
  globalThis.__prismaClient = db;
}

// ─── Connect to PostgreSQL ────────────────────────────────
export const connectDB = async (): Promise<void> => {
  try {
    await db.$connect();
    console.warn('✅ PostgreSQL: connected successfully via Prisma');
  } catch (error) {
    console.error('❌ PostgreSQL: connection failed\n', error);
    await db.$disconnect();
    process.exit(1);
  }
};

// ─── Disconnect from PostgreSQL ───────────────────────────
export const disconnectDB = async (): Promise<void> => {
  try {
    await db.$disconnect();
    console.warn('PostgreSQL: disconnected gracefully');
  } catch (error) {
    console.error('PostgreSQL: error during disconnection\n', error);
    process.exit(1);
  }
};

// ─── Database health check ────────────────────────────────
export const checkDBHealth = async (): Promise<{
  healthy: boolean;
  latencyMs?: number;
  error?: string;
}> => {
  const start = Date.now();
  try {
    await db.$queryRaw`SELECT 1 AS health_check`;
    return {
      healthy: true,
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
  }
};

// ─── Run in transaction ───────────────────────────────────
// Helper for operations that must be atomic
export const withTransaction = async <T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> => {
  return db.$transaction(fn, {
    maxWait: 5000,
    timeout: 10000,
    isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
  });
};

// ─── Paginate helper ──────────────────────────────────────
export const getPaginationParams = (
  page: number,
  perPage: number,
): { skip: number; take: number } => {
  const safePage = Math.max(1, page);
  const safePerPage = Math.min(Math.max(1, perPage), config.MAX_PAGE_SIZE);
  return {
    skip: (safePage - 1) * safePerPage,
    take: safePerPage,
  };
};

// ─── Build sort params ────────────────────────────────────
export const getSortParams = (
  sortBy = 'createdAt',
  sortOrder: 'asc' | 'desc' = 'desc',
): Record<string, 'asc' | 'desc'> => {
  return { [sortBy]: sortOrder };
};

export default db;
