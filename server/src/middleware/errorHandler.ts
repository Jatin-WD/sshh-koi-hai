import type { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { AppError } from "../lib/appError.js";
import { sendError } from "../lib/apiResponse.js";
import { ZodError } from "zod";
import { logger } from "../lib/logger.js";

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof AppError) {
    logger.warn({ err: error, method: req.method, path: req.originalUrl, statusCode: error.statusCode }, "API request failed");
    return sendError(res, error.statusCode, error.message, error.code);
  }

  if (error instanceof ZodError) {
    logger.warn({ err: error, method: req.method, path: req.originalUrl }, "Validation failed");
    return sendError(res, 400, "Please check the submitted details", "VALIDATION_ERROR");
  }

  if (error instanceof Prisma.PrismaClientInitializationError || error instanceof Prisma.PrismaClientRustPanicError || isDatabaseConnectionError(error)) {
    logger.error({ err: error, method: req.method, path: req.originalUrl }, "Database unavailable during API request");
    res.set("Retry-After", "5");
    return sendError(res, 503, "The private space is temporarily unavailable. Please try again in a moment.", "DATABASE_UNAVAILABLE");
  }

  if (error && typeof error === "object" && "type" in error && error.type === "entity.too.large") {
    return sendError(res, 413, "Image or request is too large. Please choose an image under 8MB.", "PAYLOAD_TOO_LARGE");
  }

  if (process.env.NODE_ENV !== "production" && error instanceof Error) {
    logger.error({ err: error, method: req.method, path: req.originalUrl }, "Unexpected server error");
    return sendError(res, 500, error.message, "INTERNAL_SERVER_ERROR");
  }

  logger.error({ err: error, method: req.method, path: req.originalUrl }, "Unexpected server error");
  return sendError(res, 500, "Unexpected server error", "INTERNAL_SERVER_ERROR");
}

function isDatabaseConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Prisma emits these codes when the connector cannot establish or keep a
    // database connection. Treat them as infrastructure failures rather than
    // leaking a generic 500 to auth, plans, or member screens.
    if (["P1000", "P1001", "P1002", "P1008", "P1017"].includes(error.code)) return true;
  }
  if (error instanceof Prisma.PrismaClientUnknownRequestError) return /tls|ssl|connection|timeout|socket|connector/i.test(error.message);
  if (!(error instanceof Error)) return false;
  const cause = "cause" in error ? error.cause : undefined;
  return /tls|ssl|econnreset|econnrefused|timed out|timeout|connection.*closed|server has gone away|can't reach database server|connector error|transaction.*error/i.test(error.message) || (cause !== error && isDatabaseConnectionError(cause));
}
