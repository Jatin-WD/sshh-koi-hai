import type { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/appError.js";
import { requireAuth } from "./auth.js";
import { env } from "../config/env.js";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  return requireAuth(req, res, (error) => {
    if (error) return next(error);
    const emailAllowed = env.ADMIN_LOGIN_EMAIL ? req.authUser?.email === env.ADMIN_LOGIN_EMAIL : env.NODE_ENV !== "production";
    if (req.authUser?.role !== "ADMIN" || !emailAllowed) return next(new AppError("Admin access required", 403, "ADMIN_REQUIRED"));
    return next();
  });
}
