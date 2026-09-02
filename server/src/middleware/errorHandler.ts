import type { Request, Response, NextFunction } from "express";
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

  if (process.env.NODE_ENV !== "production" && error instanceof Error) {
    logger.error({ err: error, method: req.method, path: req.originalUrl }, "Unexpected server error");
    return sendError(res, 500, error.message, "INTERNAL_SERVER_ERROR");
  }

  logger.error({ err: error, method: req.method, path: req.originalUrl }, "Unexpected server error");
  return sendError(res, 500, "Unexpected server error", "INTERNAL_SERVER_ERROR");
}
