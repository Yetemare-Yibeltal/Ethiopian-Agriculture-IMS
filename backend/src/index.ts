import { createApp } from './app';
import { config } from './config/env';
import { disconnectRedis, redis } from './config/redis';
import { connectDB, disconnectDB } from './lib/db';
import { logger } from './lib/logger';
import { validateSecrets } from './lib/secrets';

// ─── Track server state ───────────────────────────────────
let isShuttingDown = false;

// ─── Graceful shutdown handler ────────────────────────────
const gracefulShutdown = async (signal: string): Promise<void> => {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress...');
    return;
  }

  isShuttingDown = true;
  logger.info(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  // Give existing requests 30 seconds to complete
  const shutdownTimeout = setTimeout(() => {
    logger.error('⚠️  Graceful shutdown timed out after 30s. Forcing exit.');
    process.exit(1);
  }, 30000);

  try {
    // Stop accepting new connections
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
      logger.info('✅ HTTP server closed — no longer accepting connections');
    }

    // Disconnect from PostgreSQL
    await disconnectDB();
    logger.info('✅ PostgreSQL disconnected');

    // Disconnect from Redis
    await disconnectRedis();
    logger.info('✅ Redis disconnected');

    clearTimeout(shutdownTimeout);
    logger.info('✅ Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during graceful shutdown:', error);
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
};

// ─── Handle uncaught errors ───────────────────────────────
process.on('uncaughtException', (error: Error) => {
  logger.error('💥 Uncaught Exception:', {
    message: error.message,
    stack: error.stack,
    name: error.name,
  });
  // Exit immediately — uncaught exceptions leave app in undefined state
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('💥 Unhandled Promise Rejection:', {
    reason:
      reason instanceof Error
        ? {
            message: reason.message,
            stack: reason.stack,
          }
        : reason,
  });
  // Exit after graceful shutdown attempt
  gracefulShutdown('unhandledRejection').catch(() => process.exit(1));
});

// ─── Handle shutdown signals ──────────────────────────────
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon restart

// ─── Bootstrap server ─────────────────────────────────────
let server: ReturnType<typeof app.listen>;

const bootstrap = async (): Promise<void> => {
  try {
    logger.info('🚀 Starting AgroEthiopia MIS Backend...');
    logger.info(`   Environment: ${config.NODE_ENV}`);
    logger.info(`   Port: ${config.PORT}`);
    logger.info(`   API Prefix: ${config.API_PREFIX}`);

    // ── Step 1: Validate secrets ────────────────────────
    logger.info('Step 1/4: Validating secrets...');
    validateSecrets();

    // ── Step 2: Connect to PostgreSQL ───────────────────
    logger.info('Step 2/4: Connecting to PostgreSQL...');
    await connectDB();

    // ── Step 3: Connect to Redis ─────────────────────────
    logger.info('Step 3/4: Connecting to Redis...');
    try {
      await redis.ping();
      logger.info('✅ Redis: connected successfully');
    } catch (redisError) {
      logger.warn(
        '⚠️  Redis connection failed — caching and queues unavailable',
        redisError,
      );
      // Do not exit — Redis is important but not critical for basic operation
    }

    // ── Step 4: Start HTTP server ────────────────────────
    logger.info('Step 4/4: Starting HTTP server...');
    const app = createApp();

    server = app.listen(config.PORT, () => {
      logger.info('');
      logger.info('═══════════════════════════════════════════════');
      logger.info('  🌾 AgroEthiopia MIS Backend is running!');
      logger.info('═══════════════════════════════════════════════');
      logger.info(`  Environment : ${config.NODE_ENV}`);
      logger.info(`  Backend URL : ${config.BACKEND_URL}`);
      logger.info(`  API Base    : ${config.BACKEND_URL}${config.API_PREFIX}`);
      logger.info(`  Health      : ${config.BACKEND_URL}/health`);
      logger.info(`  Frontend    : ${config.FRONTEND_URL}`);
      logger.info('═══════════════════════════════════════════════');
      logger.info('');
    });

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(
          `❌ Port ${config.PORT} is already in use.\n` +
            `   Please stop the other process or change BACKEND_PORT in .env`,
        );
      } else {
        logger.error('❌ Server error:', error);
      }
      process.exit(1);
    });

    // Set server timeout — 60 seconds
    server.timeout = 60000;

    // Set keep-alive timeout
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// ─── Start the server ─────────────────────────────────────
bootstrap();
