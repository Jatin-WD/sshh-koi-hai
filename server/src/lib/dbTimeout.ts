import { Prisma, type Prisma as PrismaTypes } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";

export async function withDbStatementTimeout<T>(
  operation: (tx: PrismaTypes.TransactionClient) => Promise<T>,
  timeoutMs = env.DB_STATEMENT_TIMEOUT_MS,
) {
  const statementTimeout = Math.max(1, Math.floor(timeoutMs));
  return prisma.$transaction(async (tx) => {
    // PostgreSQL does not accept a bind parameter in SET statements. The
    // value is already clamped to a positive integer above, so interpolate
    // that validated value as SQL instead of sending it as $1.
    await tx.$executeRaw(Prisma.sql`SET LOCAL statement_timeout = ${Prisma.raw(String(statementTimeout))}`);
    return operation(tx);
  });
}
