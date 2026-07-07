import { config } from 'dotenv';
import { z } from 'zod';

config({ path: '../../.env' });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),

  // Database
  DATABASE_URL: z.string().url(),
  DATABASE_URL_READ: z.string().url().optional(),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  BCRYPT_ROUNDS: z.coerce.number().min(12).default(12),

  // AI (Gemini — primary LLM)
  GOOGLE_GENAI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),

  // AWS
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().default('ai-analytics-uploads'),

  // Limits
  MAX_FILE_SIZE_MB: z.coerce.number().default(500),
  MAX_ROW_COUNT: z.coerce.number().default(5_000_000),
  QUERY_TIMEOUT_DEFAULT_MS: z.coerce.number().default(30_000),
  QUERY_TIMEOUT_MAX_MS: z.coerce.number().default(300_000),
  RESULT_CACHE_TTL_SECONDS: z.coerce.number().default(3600),
  SCHEMA_CACHE_TTL_SECONDS: z.coerce.number().default(300),

  // Monitoring
  LOG_LEVEL: z.string().default('info'),
  SENTRY_DSN: z.string().optional(),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
