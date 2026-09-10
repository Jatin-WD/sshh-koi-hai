import { PrismaClient } from "@prisma/client";
import { databaseUrl } from "../config/env.js";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

const retryableReadActions = new Set(["findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow", "findMany", "count", "aggregate", "groupBy", "queryRaw"]);
const transientDatabaseError = (error: unknown) => { const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase(); return /tls|ssl|econnreset|econnrefused|timed out|timeout|connection.*closed|server has gone away/.test(message); };
const pause = (duration: number) => new Promise((resolve) => setTimeout(resolve, duration));

prisma.$use(async (params, next) => {
  if (!retryableReadActions.has(params.action)) return next(params);
  for (let attempt = 0; ; attempt += 1) {
    try { return await next(params); }
    catch (error) { if (attempt >= 2 || !transientDatabaseError(error)) throw error; await pause(150 * (attempt + 1)); }
  }
});

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
