import type { RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import { corsOrigins } from "../config/env.js";
import { AppError } from "../lib/appError.js";
import { logger } from "../lib/logger.js";

export const apiRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: "draft-7", legacyHeaders: false, message: { success: false, error: { message: "Too many requests. Please try again later.", code: "RATE_LIMITED" } } });
export const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: "draft-7", legacyHeaders: false, message: { success: false, error: { message: "Too many authentication attempts. Please try again later.", code: "AUTH_RATE_LIMITED" } } });
export const uploadRateLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false, message: { success: false, error: { message: "Too many uploads. Please try again later.", code: "UPLOAD_RATE_LIMITED" } } });

type CircuitState = { active: number; failures: number; failureWindowStartedAt: number; openedUntil: number; lastSeenAt: number };

const circuitStates = new Map<string, CircuitState>();
const maxTrackedIps = 2_000;
const maxConcurrentPerIp = 2;
const failureWindowMs = 30_000;
const openDurationMs = 15_000;

function pruneCircuitStates(now: number) {
  if (circuitStates.size < maxTrackedIps) return;
  for (const [ip, state] of circuitStates) {
    if (state.active === 0 && (now - state.lastSeenAt > failureWindowMs || state.openedUntil <= now)) circuitStates.delete(ip);
    if (circuitStates.size < maxTrackedIps) return;
  }
}

// This protects only expensive endpoints. It uses response lifecycle events so
// rejected or aborted requests never leave a slot permanently occupied.
export function perIpCircuitBreaker(endpoint: string): RequestHandler {
  return (req, _res, next) => {
    const now = Date.now();
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const stateKey = `${endpoint}:${ip}`;
    pruneCircuitStates(now);
    let state = circuitStates.get(stateKey);
    if (!state) {
      state = { active: 0, failures: 0, failureWindowStartedAt: now, openedUntil: 0, lastSeenAt: now };
      circuitStates.set(stateKey, state);
    }
    state.lastSeenAt = now;

    if (state.openedUntil > now) {
      _res.set("Retry-After", String(Math.ceil((state.openedUntil - now) / 1000)));
      return next(new AppError("Temporarily busy. Please retry shortly.", 503, "CIRCUIT_OPEN"));
    }
    if (state.active >= maxConcurrentPerIp) {
      _res.set("Retry-After", "2");
      return next(new AppError("Too many requests from this address. Please retry shortly.", 429, "BURST_LIMITED"));
    }

    state.active += 1;
    let completed = false;
    const complete = () => {
      if (completed) return;
      completed = true;
      state!.active = Math.max(0, state!.active - 1);
      state!.lastSeenAt = Date.now();
      const statusCode = _res.statusCode;
      if (statusCode >= 500 && statusCode < 600) {
        const completedAt = Date.now();
        if (completedAt - state!.failureWindowStartedAt > failureWindowMs) {
          state!.failures = 0;
          state!.failureWindowStartedAt = completedAt;
        }
        state!.failures += 1;
        if (state!.failures >= 3) {
          state!.openedUntil = completedAt + openDurationMs;
          state!.failures = 0;
          logger.warn({ endpoint, ip }, "Per-IP circuit opened after repeated endpoint failures");
        }
      }
    };
    _res.once("finish", complete);
    _res.once("close", complete);
    return next();
  };
}

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
