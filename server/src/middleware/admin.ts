import type { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/appError.js";
import { requireAuth } from "./auth.js";
import { env } from "../config/env.js";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  return requireAuth(req, res, (error) => {
    if (error) return next(error);
    // Keep compatibility with the existing seed/deployment variable while
    // allowing production to use the clearer ADMIN_LOGIN_EMAIL name.
    const configuredAdminEmail = (env.ADMIN_LOGIN_EMAIL ?? process.env.ADMIN_EMAIL)?.trim().toLowerCase();
    const emailAllowed = configuredAdminEmail ? req.authUser?.email.toLowerCase() === configuredAdminEmail : env.NODE_ENV !== "production";
    if (req.authUser?.role !== "ADMIN" || !emailAllowed) return next(new AppError("Admin access required", 403, "ADMIN_REQUIRED"));
    return next();
  });
}
