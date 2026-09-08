import type { RequestHandler } from "express";
import { rateLimit } from "express-rate-limit";
import { corsOrigins } from "../config/env.js";
import { AppError } from "../lib/appError.js";
import { logger } from "../lib/logger.js";
import { env } from "../config/env.js";
import { Redis } from "ioredis";

export const apiRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: "draft-7", legacyHeaders: false, message: { success: false, error: { message: "Too many requests. Please try again later.", code: "RATE_LIMITED" } } });
export const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: "draft-7", legacyHeaders: false, message: { success: false, error: { message: "Too many authentication attempts. Please try again later.", code: "AUTH_RATE_LIMITED" } } });
export const uploadRateLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false, message: { success: false, error: { message: "Too many uploads. Please try again later.", code: "UPLOAD_RATE_LIMITED" } } });

type QueuedRequest = { req: Parameters<RequestHandler>[0]; res: Parameters<RequestHandler>[1]; next: Parameters<RequestHandler>[2]; queuedAt: number; timer: ReturnType<typeof setTimeout> };
let activeRequests = 0;
const requestQueue: QueuedRequest[] = [];

function releaseNext() {
  const item = requestQueue.shift();
  if (!item) return;
  clearTimeout(item.timer);
  if (item.res.writableEnded || item.req.destroyed) { releaseNext(); return; }
  activeRequests += 1;
  attachTrafficRelease(item.res);
  item.next();
}

function attachTrafficRelease(res: Parameters<RequestHandler>[1]) {
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    activeRequests = Math.max(0, activeRequests - 1);
    releaseNext();
  };
  res.once("finish", release);
  res.once("close", release);
}

// A bounded FIFO queue prevents a traffic spike from exhausting the Node
// process. It deliberately skips health checks and Socket.IO handshakes.
export const trafficController: RequestHandler = (req, res, next) => {
  if (req.path === "/api" || req.path.startsWith("/socket.io")) return next();
  if (activeRequests < env.TRAFFIC_MAX_CONCURRENT_REQUESTS) {
    activeRequests += 1;
    attachTrafficRelease(res);
    return next();
  }
  if (requestQueue.length >= env.TRAFFIC_MAX_QUEUE_SIZE) {
    res.set("Retry-After", "5");
    return next(new AppError("The service is busy. Please retry shortly.", 503, "TRAFFIC_QUEUE_FULL"));
  }
  const timer = setTimeout(() => {
    const index = requestQueue.findIndex((item) => item.res === res);
    if (index === -1) return;
    requestQueue.splice(index, 1);
    res.set("Retry-After", "5");
    next(new AppError("The service is busy. Please retry shortly.", 503, "TRAFFIC_QUEUE_TIMEOUT"));
  }, env.TRAFFIC_QUEUE_TIMEOUT_MS);
  requestQueue.push({ req, res, next, queuedAt: Date.now(), timer });
};

let sharedRedis: Redis | null = null;
if (env.REDIS_URL) {
  sharedRedis = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false });
  sharedRedis.on("error", (error: unknown) => logger.warn({ err: error }, "Redis traffic limiter unavailable; using local protection"));
  void sharedRedis.connect().catch(() => undefined);
}

// Shared fixed-window limiter for multi-instance deployments. The local
// queue/rate limits remain authoritative when Redis is not configured.
export const sharedTrafficLimit: RequestHandler = (req, res, next) => {
  if (!sharedRedis || req.path === "/api" || req.path.startsWith("/socket.io")) return next();
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const key = `${env.REDIS_KEY_PREFIX}:ip:${ip}:10s`;
  void sharedRedis.multi().incr(key).expire(key, 10).exec().then((results: any) => {
    const count = Number(results?.[0]?.[1] ?? 0);
    if (count > 100) { res.set("Retry-After", "10"); next(new AppError("Too many requests. Please retry shortly.", 429, "SHARED_RATE_LIMITED")); return; }
    next();
  }).catch(() => next());
};

export function trafficSnapshot() { return { activeRequests, queuedRequests: requestQueue.length, maxConcurrentRequests: env.TRAFFIC_MAX_CONCURRENT_REQUESTS, maxQueueSize: env.TRAFFIC_MAX_QUEUE_SIZE }; }

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
