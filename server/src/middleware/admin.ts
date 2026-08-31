import type { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/appError.js";
import { requireAuth } from "./auth.js";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  return requireAuth(req, res, (error) => {
    if (error) return next(error);
    if (req.authUser?.role !== "ADMIN") return next(new AppError("Admin access required", 403, "ADMIN_REQUIRED"));
    return next();
  });
}
