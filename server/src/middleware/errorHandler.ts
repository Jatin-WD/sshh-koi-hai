import type { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/appError.js";
import { sendError } from "../lib/apiResponse.js";
import { ZodError } from "zod";

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof AppError) {
    return sendError(res, error.statusCode, error.message, error.code);
  }

  if (error instanceof ZodError) {
    return sendError(res, 400, "Please check the submitted details", "VALIDATION_ERROR");
  }

  if (process.env.NODE_ENV !== "production" && error instanceof Error) {
    return sendError(res, 500, error.message, "INTERNAL_SERVER_ERROR");
  }

  return sendError(res, 500, "Unexpected server error", "INTERNAL_SERVER_ERROR");
}
