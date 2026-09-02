import { Router } from "express";

const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  return res.status(200).set("Cache-Control", "no-store").json({ success: true, status: "ok" });
});

export default healthRouter;
