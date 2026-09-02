import type { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";

export async function withDbStatementTimeout<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  timeoutMs = env.DB_STATEMENT_TIMEOUT_MS,
) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL statement_timeout = ${timeoutMs}`);
    return operation(tx);
  });
}
