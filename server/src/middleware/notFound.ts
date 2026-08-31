import type { Request, Response, NextFunction } from "express";
import { sendError } from "../lib/apiResponse.js";

export function notFoundHandler(_req: Request, res: Response, _next: NextFunction) {
  return sendError(res, 404, "Route not found", "NOT_FOUND");
}

