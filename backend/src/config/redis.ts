import IORedis from 'ioredis';

import { config } from './env';
import { logger } from '../lib/logger';

let redisClient: IORedis | null = null;

export const getRedisClient = (): IORedis => {
  if (redisClient) {
    return redisClient;
  }

  redisClient = new IORedis({
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    password: config.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => {
      if (times > 10) {
        logger.error('Redis: max retries reached. Giving up.');
        return null;
      }
      const delay = Math.min(times * 500, 5000);
      logger.warn(
        `Redis: retrying connection in ${delay}ms (attempt ${times})`,
      );
      return delay;
    },
    reconnectOnError: (err: Error) => {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ECONNREFUSED'];
      if (targetErrors.some((e) => err.message.includes(e))) {
        return true;
      }
      return false;
    },
    lazyConnect: false,
    enableOfflineQueue: true,
    connectTimeout: 10000,
    commandTimeout: 5000,
    keepAlive: 10000,
    showFriendlyErrorStack: config.IS_DEVELOPMENT,
  });

  redisClient.on('connect', () => {
    logger.info('✅ Redis: connected successfully');
  });

  redisClient.on('ready', () => {
    logger.info('✅ Redis: ready to accept commands');
  });

  redisClient.on('error', (err: Error) => {
    logger.error(`❌ Redis error: ${err.message}`);
  });

  redisClient.on('close', () => {
    logger.warn('⚠️  Redis: connection closed');
  });

  redisClient.on('reconnecting', () => {
    logger.warn('🔄 Redis: reconnecting...');
  });

  redisClient.on('end', () => {
    logger.warn('⚠️  Redis: connection ended');
  });

  return redisClient;
};

export const disconnectRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis: disconnected gracefully');
  }
};

export const redis = getRedisClient();
