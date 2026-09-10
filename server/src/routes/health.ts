import { Router } from "express";
import { logger } from "../lib/logger.js";
import { withDbStatementTimeout } from "../lib/dbTimeout.js";

const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  return res.status(200).set("Cache-Control", "no-store").json({ success: true, status: "ok" });
});

healthRouter.get("/health/db", async (_req, res) => {
  try {
    await withDbStatementTimeout((tx) => tx.$queryRaw`SELECT 1`, undefined, 3);
    return res.status(200).set("Cache-Control", "no-store").json({ success: true, status: "ok", database: "connected" });
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    const reason = message.includes("max clients") || message.includes("emaxconn") ? "connection_limit" : message.includes("password authentication") || message.includes("authentication failed") ? "credentials" : message.includes("tls") || message.includes("ssl") ? "tls" : message.includes("reach") || message.includes("timeout") ? "network" : "database_error";
    logger.error({ err: error, reason }, "Database health check failed");
    res.set("Retry-After", "5");
    return res.status(503).set("Cache-Control", "no-store").json({ success: false, status: "degraded", database: "unavailable", reason });
  }
});

export default healthRouter;
