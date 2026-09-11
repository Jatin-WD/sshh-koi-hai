import { Router } from "express";
import { logger } from "../lib/logger.js";
import { withDbStatementTimeout } from "../lib/dbTimeout.js";

const healthRouter = Router();

healthRouter.get("/health/live", (_req, res) => {
  return res.status(200).set("Cache-Control", "no-store").json({ status: "ok" });
});

healthRouter.get("/health", (_req, res) => {
  return res.status(200).set("Cache-Control", "no-store").json({ success: true, status: "ok" });
});

healthRouter.get("/health/db", async (_req, res) => {
  try {
    // Health checks should fail fast and never create reconnect storms while
    // the database is unavailable.
    await withDbStatementTimeout((tx) => tx.$queryRaw`SELECT 1`, undefined, 0);
    return res.status(200).set("Cache-Control", "no-store").json({ success: true, status: "ok", database: "connected" });
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : undefined;
    const reason = code === "P1000" ? "credentials" : code === "GenericFailure" || code === "P1001" || code === "P1002" || code === "P1008" || code === "P2024" || message.includes("max clients") || message.includes("emaxconn") || message.includes("reach") || message.includes("timeout") ? "network" : message.includes("password authentication") || message.includes("authentication failed") ? "credentials" : message.includes("tls") || message.includes("ssl") ? "tls" : "database_error";
    logger.error({ err: error, reason, code }, "Database health check failed");
    res.set("Retry-After", "5");
    return res.status(503).set("Cache-Control", "no-store").json({ success: false, status: "degraded", database: "unavailable", reason, ...(code ? { code } : {}) });
  }
});

export default healthRouter;
