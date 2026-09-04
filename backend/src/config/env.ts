import dotenv from 'dotenv';
import path from 'node:path';
import { z } from 'zod';

// Load .env file if available
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().min(1).default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  SERVICE_NAME: z.string().default('lankaeats-backend'),
  SERVICE_VERSION: z.string().default('1.0.0'),
  MONGODB_URI: z.string().min(10).default('mongodb://127.0.0.1:27017/lankaeats'),
  JWT_SECRET: z.string().min(16).default('development_jwt_secret_key_lankaeats_2026_super_secure'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  SUPERADMIN_EMAIL: z.string().email().optional(),
  SUPERADMIN_PASSWORD: z.string().min(8).optional(),
  // Cloudflare R2 Storage Configurations
  R2_ACCOUNT_ID: z.string().optional().default(''),
  R2_ACCESS_KEY_ID: z.string().optional().default(''),
  R2_SECRET_ACCESS_KEY: z.string().optional().default(''),
  R2_BUCKET_NAME: z.string().optional().default('lankaeats-media'),
  R2_PUBLIC_BASE_URL: z.string().optional().default('https://media.lankaeats.fi'),
  R2_ENDPOINT: z.string().optional().default(''),
  // Zoho Mail SMTP Configurations
  ZOHO_SMTP_HOST: z.string().optional().default('smtp.zoho.eu'),
  ZOHO_SMTP_PORT: z.coerce.number().int().positive().default(465),
  ZOHO_SMTP_SECURE: z.coerce.boolean().default(true),
  ZOHO_SMTP_USER: z.string().optional().default(''),
  ZOHO_SMTP_PASS: z.string().optional().default(''),
  ZOHO_FROM_EMAIL: z.string().optional().default('support@lankaeats.fi'),
  CONTACT_RECEIVER_EMAIL: z.string().optional().default('support@lankaeats.fi'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function loadEnvConfig(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formattedErrors = result.error.format();
    console.error('Invalid environment configuration:', JSON.stringify(formattedErrors, null, 2));
    throw new Error('Environment validation failed. Check server log for details.');
  }

  return result.data;
}
