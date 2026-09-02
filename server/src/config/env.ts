import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // Hostinger's managed Node runtime routes traffic to port 3000 by default.
  // Local development can still override this with PORT=4000.
  PORT: z.coerce.number().int().positive().default(3000),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15000).transform((value) => Math.min(value, 60000)),
  DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().positive().default(5000).transform((value) => Math.min(value, 15000)),
  OUTBOUND_HTTP_TIMEOUT_MS: z.coerce.number().int().positive().default(8000).transform((value) => Math.min(value, 15000)),
  DATABASE_URL: z
    .string()
    .min(1)
    .default("postgresql://postgres:postgres@localhost:5432/sshh_koi_hai"),
  CLIENT_ORIGIN: z.string().url().optional(),
  APP_URL: z.string().url().optional(),
  FRONTEND_URL: z.string().url().optional(),
  CORS_ORIGINS: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(1).default("change-me-access-secret"),
  JWT_REFRESH_SECRET: z.string().min(1).default("change-me-refresh-secret"),
  ACCESS_TOKEN_TTL: z.string().min(1).default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  EMAIL_VERIFICATION_TTL_HOURS: z.coerce.number().int().positive().default(24),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(60),
  CLIENT_APP_URL: z.string().url().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  SMTP_FROM_NAME: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});

export const env = envSchema.parse(process.env);

function normalizeDatabaseUrl(url: string) {
  const normalized = new URL(url);
  normalized.searchParams.set("connect_timeout", "5");
  normalized.searchParams.set("pool_timeout", "10");
  return normalized.toString();
}

export const databaseUrl = normalizeDatabaseUrl(env.DATABASE_URL);
process.env.DATABASE_URL = databaseUrl;

if (env.NODE_ENV === "production") {
  const weakDefaults = ["change-me-access-secret", "change-me-refresh-secret"];
  if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET || weakDefaults.includes(env.JWT_ACCESS_SECRET) || weakDefaults.includes(env.JWT_REFRESH_SECRET)) throw new Error("Production JWT secrets must be explicitly configured");
  if (!process.env.DATABASE_URL || env.DATABASE_URL.includes("localhost") || env.DATABASE_URL.includes("postgres:postgres")) throw new Error("Production DATABASE_URL must be explicitly configured");
}

export const corsOrigins = Array.from(
  new Set(
    [env.CLIENT_ORIGIN, ...(env.CORS_ORIGINS?.split(",") ?? [])]
      .filter((origin): origin is string => Boolean(origin))
      .map((origin) => origin.trim())
      .filter(Boolean),
  ),
);

export const publicAppUrl = env.APP_URL ?? env.FRONTEND_URL ?? env.CLIENT_APP_URL ?? env.CLIENT_ORIGIN ?? `http://localhost:${env.PORT}`;
