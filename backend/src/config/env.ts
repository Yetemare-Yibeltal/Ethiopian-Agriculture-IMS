import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (value === undefined || value === '') {
    throw new Error(
      `❌ Missing required environment variable: ${key}\n` +
        `   Please add it to your .env file.\n` +
        `   See .env.example for reference.`,
    );
  }
  return value;
};

const getEnvOptional = (key: string, defaultValue = ''): string => {
  return process.env[key] || defaultValue;
};

const getEnvNumber = (key: string, defaultValue?: number): number => {
  const value = process.env[key];
  if (value === undefined || value === '') {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`❌ Missing required environment variable: ${key}`);
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(
      `❌ Environment variable ${key} must be a number. Got: ${value}`,
    );
  }
  return parsed;
};

const getEnvBoolean = (key: string, defaultValue = false): boolean => {
  const value = process.env[key];
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return value.toLowerCase() === 'true';
};

export const config = {
  // ─── Environment ───────────────────────────────────────
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_TEST: process.env.NODE_ENV === 'test',

  // ─── Server ────────────────────────────────────────────
  PORT: getEnvNumber('BACKEND_PORT', 5000),
  BACKEND_URL: getEnv('BACKEND_URL', 'http://localhost:5000'),
  API_PREFIX: getEnv('API_PREFIX', '/api/v1'),

  // ─── Frontend ──────────────────────────────────────────
  FRONTEND_URL: getEnv('FRONTEND_URL', 'http://localhost:3000'),

  // ─── Database ──────────────────────────────────────────
  DATABASE_URL: getEnv('DATABASE_URL'),

  // ─── Redis ─────────────────────────────────────────────
  REDIS_URL: getEnv('REDIS_URL', 'redis://localhost:6379'),
  REDIS_HOST: getEnv('REDIS_HOST', 'localhost'),
  REDIS_PORT: getEnvNumber('REDIS_PORT', 6379),
  REDIS_PASSWORD: getEnvOptional('REDIS_PASSWORD'),

  // ─── JWT ───────────────────────────────────────────────
  JWT_ACCESS_SECRET: getEnv('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: getEnv('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRES_IN: getEnv('JWT_ACCESS_EXPIRES_IN', '15m'),
  JWT_REFRESH_EXPIRES_IN: getEnv('JWT_REFRESH_EXPIRES_IN', '7d'),

  // ─── Cookie ────────────────────────────────────────────
  COOKIE_SECRET: getEnv('COOKIE_SECRET'),
  COOKIE_DOMAIN: getEnv('COOKIE_DOMAIN', 'localhost'),
  COOKIE_SECURE: getEnvBoolean('COOKIE_SECURE', false),

  // ─── File Upload ───────────────────────────────────────
  UPLOAD_DIR: getEnv('UPLOAD_DIR', 'uploads'),
  MAX_FILE_SIZE_MB: getEnvNumber('MAX_FILE_SIZE_MB', 5),
  ALLOWED_IMAGE_TYPES: getEnv(
    'ALLOWED_IMAGE_TYPES',
    'image/jpeg,image/png,image/webp',
  )
    .split(',')
    .map((t) => t.trim()),

  // ─── Export ────────────────────────────────────────────
  EXPORT_DIR: getEnv('EXPORT_DIR', 'exports'),
  EXPORT_BASE_URL: getEnv('EXPORT_BASE_URL', 'http://localhost:5000/exports'),

  // ─── Rate Limiting ─────────────────────────────────────
  RATE_LIMIT_WINDOW_MS: getEnvNumber('RATE_LIMIT_WINDOW_MS', 900000),
  RATE_LIMIT_MAX_REQUESTS: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
  AUTH_RATE_LIMIT_MAX: getEnvNumber('AUTH_RATE_LIMIT_MAX', 10),

  // ─── CORS ──────────────────────────────────────────────
  CORS_ORIGIN: getEnv('CORS_ORIGIN', 'http://localhost:3000'),

  // ─── Logging ───────────────────────────────────────────
  LOG_LEVEL: getEnv('LOG_LEVEL', 'debug'),
  LOG_FILE_PATH: getEnv('LOG_FILE_PATH', 'logs/app.log'),

  // ─── Queue ─────────────────────────────────────────────
  QUEUE_CONCURRENCY: getEnvNumber('QUEUE_CONCURRENCY', 3),
  QUEUE_MAX_RETRIES: getEnvNumber('QUEUE_MAX_RETRIES', 3),
  QUEUE_RETRY_DELAY_MS: getEnvNumber('QUEUE_RETRY_DELAY_MS', 5000),

  // ─── Seed Admin ────────────────────────────────────────
  SEED_ADMIN_NAME: getEnv('SEED_ADMIN_NAME', 'Super Admin'),
  SEED_ADMIN_EMAIL: getEnv('SEED_ADMIN_EMAIL', 'admin@agroethiopia.gov.et'),
  SEED_ADMIN_PASSWORD: getEnv('SEED_ADMIN_PASSWORD', 'Admin@123456'),

  // ─── System ────────────────────────────────────────────
  DEFAULT_LANGUAGE: getEnv('DEFAULT_LANGUAGE', 'en'),
  DEFAULT_PAGE_SIZE: getEnvNumber('DEFAULT_PAGE_SIZE', 20),
  MAX_PAGE_SIZE: getEnvNumber('MAX_PAGE_SIZE', 100),
  DEFAULT_SEASON: getEnv('DEFAULT_SEASON', 'Meher'),

  // ─── Alerts ────────────────────────────────────────────
  YIELD_ALERT_THRESHOLD_PERCENT: getEnvNumber(
    'YIELD_ALERT_THRESHOLD_PERCENT',
    70,
  ),
};

export type Config = typeof config;
