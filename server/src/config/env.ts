import dotenv from "dotenv";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { z } from "zod";

// The workspace dev script runs from `server/`, while the shared .env lives
// at the repository root. Load the current directory first, then fall back to
// the repository-level file for local development.
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // Hostinger's managed Node runtime routes traffic to port 3000 by default.
  // Local development can still override this with PORT=4000.
  PORT: z.coerce.number().int().positive().default(3000),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15000).transform((value) => Math.min(value, 60000)),
  DB_STATEMENT_TIMEOUT_MS: z.coerce.number().int().positive().default(5000).transform((value) => Math.min(value, 15000)),
  OUTBOUND_HTTP_TIMEOUT_MS: z.coerce.number().int().positive().default(8000).transform((value) => Math.min(value, 15000)),
  // Keep the in-process ceiling below Hostinger's 120-process limit. This
  // prevents a database outage or traffic burst from exhausting the app.
  // Hard-cap these values so a stale hosting-panel variable cannot exhaust
  // Hostinger's process quota again.
  TRAFFIC_MAX_CONCURRENT_REQUESTS: z.coerce.number().int().positive().default(40).transform((value) => Math.min(value, 40)),
  TRAFFIC_MAX_QUEUE_SIZE: z.coerce.number().int().nonnegative().default(100).transform((value) => Math.min(value, 100)),
  TRAFFIC_QUEUE_TIMEOUT_MS: z.coerce.number().int().positive().default(5000).transform((value) => Math.min(value, 60000)),
  REDIS_URL: z.string().url().optional(),
  REDIS_KEY_PREFIX: z.string().trim().min(1).max(80).default("sshh:traffic"),
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
  ADMIN_ACTIVITY_EMAIL: z.string().email().default("contact.sshhkoihai@gmail.com"),
  // Optional in development; required for production admin access.
  ADMIN_LOGIN_EMAIL: z.string().email().optional(),
  DATABASE_SSL_ACCEPT_INVALID_CERTS: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  DATABASE_SSL_CA_BASE64: z.string().min(20).optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_URL: z.string().optional(),
});

export const env = envSchema.parse(process.env);

function normalizeDatabaseUrl(url: string) {
  const normalized = new URL(url);
  normalized.searchParams.set("connect_timeout", "5");
  normalized.searchParams.set("pool_timeout", "10");
  // Supabase pooler connections require TLS. Keeping this in code also
  // prevents a deployment env without an explicit query string from falling
  // back to the platform's incompatible default TLS behavior.
  if (env.NODE_ENV === "production" || normalized.hostname.endsWith("supabase.com")) normalized.searchParams.set("sslmode", "require");
  if (normalized.hostname.endsWith("supabase.com")) {
    normalized.searchParams.set("connection_limit", "5");
    if (env.DATABASE_SSL_CA_BASE64) {
      const ca = Buffer.from(env.DATABASE_SSL_CA_BASE64, "base64").toString("utf8");
      if (ca.includes("-----BEGIN CERTIFICATE-----") && ca.includes("-----END CERTIFICATE-----")) {
        const caPath = path.join(os.tmpdir(), "sshh-supabase-prod-ca.crt");
        fs.writeFileSync(caPath, ca, { mode: 0o600 });
        normalized.searchParams.set("sslmode", "verify-full");
        normalized.searchParams.set("sslrootcert", caPath);
      }
    }
  }
  if (env.DATABASE_SSL_ACCEPT_INVALID_CERTS) normalized.searchParams.set("sslaccept", "accept_invalid_certs");
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
