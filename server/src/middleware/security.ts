import type { RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import { corsOrigins } from "../config/env.js";
import { AppError } from "../lib/appError.js";

export const apiRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: "draft-7", legacyHeaders: false, message: { success: false, error: { message: "Too many requests. Please try again later.", code: "RATE_LIMITED" } } });
export const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: "draft-7", legacyHeaders: false, message: { success: false, error: { message: "Too many authentication attempts. Please try again later.", code: "AUTH_RATE_LIMITED" } } });
export const uploadRateLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false, message: { success: false, error: { message: "Too many uploads. Please try again later.", code: "UPLOAD_RATE_LIMITED" } } });

function getRequestOrigin(req: Parameters<RequestHandler>[0]) {
  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost ?? req.get("host")?.trim();
  if (!host) return null;
  const protocol = forwardedProto ?? req.protocol;
  return `${protocol}://${host}`;
}

export const requireTrustedOrigin: RequestHandler = (req, _res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  const referer = req.get("referer");
  if (!origin && !referer) return next();

  const requestOrigin = getRequestOrigin(req);
  const trustedOrigins = new Set(corsOrigins);

  const isTrusted = (candidate: string | null | undefined) => {
    if (!candidate) return false;
    if (trustedOrigins.has(candidate)) return true;
    return requestOrigin ? candidate === requestOrigin : false;
  };

  if (isTrusted(origin)) return next();

  if (referer) {
    try {
      if (isTrusted(new URL(referer).origin)) return next();
    } catch {
      // Ignore malformed referers and fall through to rejection.
    }
  }

  return next(new AppError("Request origin is not allowed", 403, "CSRF_ORIGIN_REJECTED"));
};
