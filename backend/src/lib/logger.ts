import path from 'path';
import { createLogger, format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const { combine, timestamp, errors, json, colorize, printf, splat } = format;

// ─── Custom console format for development ─────────────
const devFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let log = `${timestamp} [${level}]: ${stack || message}`;
  if (Object.keys(meta).length > 0) {
    log += `\n${JSON.stringify(meta, null, 2)}`;
  }
  return log;
});

// ─── Production file format ────────────────────────────
const prodFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  splat(),
  json(),
);

// ─── Development console format ────────────────────────
const devConsoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  splat(),
  devFormat,
);

// ─── Log directory ─────────────────────────────────────
const logDir = path.join(process.cwd(), 'logs');

// ─── Daily rotate file transport ───────────────────────
const dailyRotateTransport = new DailyRotateFile({
  dirname: logDir,
  filename: 'app-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  format: prodFormat,
  level: 'info',
});

const errorRotateTransport = new DailyRotateFile({
  dirname: logDir,
  filename: 'error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  format: prodFormat,
  level: 'error',
});

// ─── Create logger ─────────────────────────────────────
export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  defaultMeta: {
    service: 'agro-ethiopia-mis',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    // Always log errors to error file
    errorRotateTransport,
  ],
  exceptionHandlers: [
    new DailyRotateFile({
      dirname: logDir,
      filename: 'exceptions-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      dirname: logDir,
      filename: 'rejections-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
    }),
  ],
  exitOnError: false,
});

// ─── Add transports based on environment ───────────────
if (process.env.NODE_ENV === 'production') {
  logger.add(dailyRotateTransport);
} else {
  // Development — colorful console output
  logger.add(
    new transports.Console({
      format: devConsoleFormat,
      handleExceptions: true,
      handleRejections: true,
    }),
  );
}

// ─── Stream for Morgan HTTP logger ─────────────────────
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

export default logger;
