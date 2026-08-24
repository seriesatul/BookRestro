import 'dotenv/config';
import { z } from 'zod';

const isProduction = process.env.NODE_ENV === 'production';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
});

export const env = envSchema.parse({
  ...process.env,
  DATABASE_URL:
    process.env.DATABASE_URL ??
    (isProduction ? undefined : 'postgresql://bookrestro:bookrestro@localhost:5432/bookrestro'),
  JWT_ACCESS_SECRET:
    process.env.JWT_ACCESS_SECRET ??
    (isProduction ? undefined : 'development-access-secret-change-before-production'),
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET ??
    (isProduction ? undefined : 'development-refresh-secret-change-before-production'),
});
