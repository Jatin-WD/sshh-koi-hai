import { Router } from "express";
import { prisma } from "../db/prisma.js";

const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  return res.status(200).set("Cache-Control", "no-store").json({ success: true, status: "ok" });
});

healthRouter.get("/health/db", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).set("Cache-Control", "no-store").json({ success: true, status: "ok", database: "connected" });
  } catch {
    return res.status(503).set("Cache-Control", "no-store").json({ success: false, status: "degraded", database: "unavailable" });
  }
});

export default healthRouter;
