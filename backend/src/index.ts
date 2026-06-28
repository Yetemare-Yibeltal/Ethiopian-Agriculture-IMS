import { createApp } from './app';
import { config } from './config/env';
import { disconnectRedis, redis } from './config/redis';
import { connectDB, disconnectDB } from './lib/db';
import { logger } from './lib/logger';
import { validateSecrets } from './lib/secrets';

// ─── Track shutdown state ─────────────────────────────────
let isShuttingDown = false;
let server: ReturnType<typeof app.listen>;

// Declare app at module level so gracefulShutdown can access it
// eslint-disable-next-line prefer-const
let app = createApp();

// ─── Graceful shutdown ────────────────────────────────────
const gracefulShutdown = async (signal: string): Promise<void> => {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress — ignoring signal');
    return;
  }

  isShuttingDown = true;
  logger.info(`\n🛑 ${signal} received — starting graceful shutdown...`);

  // Force exit after 30 seconds if shutdown hangs
  const forceExitTimer = setTimeout(() => {
    logger.error('❌ Graceful shutdown timed out after 30s — forcing exit');
    process.exit(1);
  }, 30000);

  try {
    // 1. Stop accepting new HTTP connections
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
      logger.info('✅ HTTP server closed');
    }

    // 2. Disconnect from PostgreSQL
    await disconnectDB();
    logger.info('✅ PostgreSQL disconnected');

    // 3. Disconnect from Redis
    await disconnectRedis();
    logger.info('✅ Redis disconnected');

    clearTimeout(forceExitTimer);
    logger.info('✅ Graceful shutdown complete — goodbye!');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during graceful shutdown:', error);
    clearTimeout(forceExitTimer);
    process.exit(1);
  }
};

// ─── Handle uncaught errors ───────────────────────────────
process.on('uncaughtException', (error: Error) => {
  logger.error('💥 Uncaught Exception — shutting down:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
  });
  // Uncaught exceptions leave the app in undefined state
  // Must exit immediately
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('💥 Unhandled Promise Rejection:', {
    reason:
      reason instanceof Error
        ? { message: reason.message, stack: reason.stack }
        : reason,
  });
  gracefulShutdown('unhandledRejection').catch(() => {
    process.exit(1);
  });
});

// ─── OS shutdown signals ──────────────────────────────────
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2'));

// ─── Bootstrap function ───────────────────────────────────
const bootstrap = async (): Promise<void> => {
  try {
    logger.info('');
    logger.info('🌾 Starting AgroEthiopia MIS Backend...');
    logger.info(`   Environment : ${config.NODE_ENV}`);
    logger.info(`   Port        : ${config.PORT}`);
    logger.info(`   API Prefix  : ${config.API_PREFIX}`);
    logger.info('');

    // ── Step 1: Validate all secrets ─────────────────────
    logger.info('📋 Step 1/4: Validating environment secrets...');
    validateSecrets();
    logger.info('✅ Step 1/4: Secrets validated');

    // ── Step 2: Connect to PostgreSQL ─────────────────────
    logger.info('🗄️  Step 2/4: Connecting to PostgreSQL...');
    await connectDB();
    logger.info('✅ Step 2/4: PostgreSQL connected');

    // ── Step 3: Connect to Redis ──────────────────────────
    logger.info('⚡ Step 3/4: Connecting to Redis...');
    try {
      const pingResult = await redis.ping();
      if (pingResult === 'PONG') {
        logger.info('✅ Step 3/4: Redis connected');
      } else {
        logger.warn('⚠️  Step 3/4: Redis ping returned unexpected response');
      }
    } catch (redisError) {
      logger.warn(
        '⚠️  Step 3/4: Redis unavailable — caching and queues disabled',
        redisError,
      );
      // Continue without Redis — app still works but without caching
    }

    // ── Step 4: Start HTTP server ─────────────────────────
    logger.info('🌐 Step 4/4: Starting HTTP server...');
    app = createApp();

    server = app.listen(config.PORT, () => {
      logger.info('');
      logger.info('╔═══════════════════════════════════════════════╗');
      logger.info('║   🌾  AgroEthiopia MIS Backend Running!        ║');
      logger.info('╠═══════════════════════════════════════════════╣');
      logger.info(`║   Env     : ${config.NODE_ENV.padEnd(34)}║`);
      logger.info(`║   URL     : ${config.BACKEND_URL.padEnd(34)}║`);
      logger.info(
        `║   API     : ${(config.BACKEND_URL + config.API_PREFIX).padEnd(34)}║`,
      );
      logger.info(
        `║   Health  : ${(config.BACKEND_URL + '/health').padEnd(34)}║`,
      );
      logger.info('╚═══════════════════════════════════════════════╝');
      logger.info('');
    });

    // Handle port already in use error
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(
          `❌ Port ${config.PORT} is already in use.\n` +
            `   Stop the other process or change BACKEND_PORT in .env`,
        );
      } else {
        logger.error('❌ HTTP server error:', error);
      }
      process.exit(1);
    });

    // Set server timeouts
    server.timeout = 60000;
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
  } catch (error) {
    logger.error('❌ Failed to start AgroEthiopia MIS Backend:', error);
    process.exit(1);
  }
};

// ─── Start the application ────────────────────────────────
bootstrap();
