import crypto from 'crypto';

import { config } from '../config/env';
import { logger } from './logger';

interface SecretValidation {
  key: string;
  value: string;
  minLength?: number;
  pattern?: RegExp;
  patternMessage?: string;
}

const validateSecret = (validation: SecretValidation): void => {
  const { key, value, minLength, pattern, patternMessage } = validation;

  if (!value || value.trim() === '') {
    throw new Error(
      `❌ Secret validation failed: ${key} is empty.\n` +
        `   Generate one with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`,
    );
  }

  const placeholders = [
    'your_',
    'change_me',
    'secret_here',
    'password_here',
    'example',
    'placeholder',
  ];

  if (placeholders.some((p) => value.toLowerCase().includes(p))) {
    if (config.IS_PRODUCTION) {
      throw new Error(
        `❌ Secret validation failed: ${key} appears to be a placeholder value.\n` +
          `   Please set a real secret in your .env file.`,
      );
    } else {
      logger.warn(
        `⚠️  ${key} appears to be a placeholder. Make sure to set a real value in production.`,
      );
    }
  }

  if (minLength && value.length < minLength) {
    throw new Error(
      `❌ Secret validation failed: ${key} is too short.\n` +
        `   Minimum length: ${minLength} characters.\n` +
        `   Current length: ${value.length} characters.`,
    );
  }

  if (pattern && !pattern.test(value)) {
    throw new Error(
      `❌ Secret validation failed: ${key} ${patternMessage || 'has invalid format'}.`,
    );
  }
};

export const validateSecrets = (): void => {
  logger.info('🔐 Validating secrets and environment variables...');

  const validations: SecretValidation[] = [
    {
      key: 'JWT_ACCESS_SECRET',
      value: config.JWT_ACCESS_SECRET,
      minLength: 32,
    },
    {
      key: 'JWT_REFRESH_SECRET',
      value: config.JWT_REFRESH_SECRET,
      minLength: 32,
    },
    {
      key: 'COOKIE_SECRET',
      value: config.COOKIE_SECRET,
      minLength: 16,
    },
    {
      key: 'DATABASE_URL',
      value: config.DATABASE_URL,
      pattern: /^postgresql:\/\/.+/,
      patternMessage: 'must be a valid PostgreSQL connection string',
    },
  ];

  let hasErrors = false;

  for (const validation of validations) {
    try {
      validateSecret(validation);
    } catch (err) {
      if (err instanceof Error) {
        logger.error(err.message);
        hasErrors = true;
      }
    }
  }

  if (hasErrors) {
    throw new Error(
      '❌ Server startup aborted due to secret validation failures.\n' +
        '   Please check your .env file and fix the issues above.',
    );
  }

  logger.info('✅ All secrets validated successfully');
};

export const generateSecret = (bytes = 64): string => {
  return crypto.randomBytes(bytes).toString('hex');
};

export default validateSecrets;
