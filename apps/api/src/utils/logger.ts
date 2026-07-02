import winston from 'winston';
import { env } from '../config/env.js';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  env.NODE_ENV === 'production'
    ? winston.format.json()
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${String(timestamp)} [${String(level)}] ${String(message)}${metaStr}`;
        }),
      ),
);

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: logFormat,
  defaultMeta: { service: 'ai-analytics-api' },
  transports: [
    new winston.transports.Console(),
  ],
});
