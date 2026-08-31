import { Router } from "express";
import { prisma } from "../db/prisma.js";

const healthRouter = Router();

healthRouter.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({ success: true, status: "ok" });
  } catch {
    return res.status(503).json({ success: false, status: "unavailable" });
  }
});

export default healthRouter;
