import { Prisma, type Prisma as PrismaTypes } from "@prisma/client";
import { prisma, reconnectDatabase } from "../db/prisma.js";
import { env } from "../config/env.js";

export async function withDbStatementTimeout<T>(
  operation: (tx: PrismaTypes.TransactionClient) => Promise<T>,
  timeoutMs = env.DB_STATEMENT_TIMEOUT_MS,
  retries = 0,
) {
  const statementTimeout = Math.max(1, Math.floor(timeoutMs));
  const maxRetries = Math.max(0, Math.min(3, Math.floor(retries)));
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        // PostgreSQL does not accept a bind parameter in SET statements. The
        // value is already clamped to a positive integer above, so interpolate
        // that validated value as SQL instead of sending it as $1.
        await tx.$executeRaw(Prisma.sql`SET LOCAL statement_timeout = ${Prisma.raw(String(statementTimeout))}`);
        return operation(tx);
      });
    } catch (error) {
      if (attempt >= maxRetries || !isTransientDatabaseError(error)) throw error;
      try { await reconnectDatabase(); } catch { /* The next bounded attempt reports the original failure. */ }
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
}

function isTransientDatabaseError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : "";
  return code === "GenericFailure" || /tls|ssl|econnreset|econnrefused|timed out|timeout|connection.*closed|server has gone away/.test(message);
}
