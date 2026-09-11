import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { databaseUrl, env } from "../config/env.js";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: databaseUrl,
      ...(env.DATABASE_SSL_ACCEPT_INVALID_CERTS ? { ssl: { rejectUnauthorized: false } } : {}),
    }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

let reconnectPromise: Promise<void> | null = null;
export async function reconnectDatabase() {
  if (!reconnectPromise) {
    reconnectPromise = prisma.$disconnect().then(() => prisma.$connect()).finally(() => { reconnectPromise = null; });
  }
  await reconnectPromise;
}

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
