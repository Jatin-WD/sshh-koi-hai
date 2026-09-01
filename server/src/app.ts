import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { corsOptions } from "./config/cors.js";
import routes from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFound.js";
import { apiRateLimit, requireTrustedOrigin, uploadRateLimit } from "./middleware/security.js";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger.js";
import type { RequestHandler } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadClientTemplate, renderSeoHtml } from "./lib/seo.js";

const requestLogger = pinoHttp as unknown as (options: { logger: typeof logger }) => RequestHandler;
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(moduleDir, "..", "..");
const clientDist = path.resolve(repoRoot, "client/dist");
let clientTemplate: string | undefined;

export const app = express();

if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet({ crossOriginResourcePolicy: { policy: "same-site" } }));
app.use(requestLogger({ logger }));
app.use(
  cors({
    ...corsOptions,
  }),
);
app.use(cookieParser());
// Razorpay signs the exact webhook bytes, so this route must bypass JSON parsing.
app.use("/api/payments/razorpay/webhook", express.raw({ type: "application/json", limit: "256kb" }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(apiRateLimit);
app.use(requireTrustedOrigin);
app.use("/api/profile/images", uploadRateLimit);

app.get("/api", (_req, res) => {
  res.json({
    success: true,
    service: "Sshh... Koi Hai? API",
  });
});

app.use("/api", routes);

// The managed Hostinger deployment runs one Node process, so serve the Vite
// build from Express while keeping API and Socket.IO paths untouched.
app.use(express.static(clientDist));
app.get("*", (req, res, next) => {
  if (req.path === "/api" || req.path.startsWith("/api/") || req.path.startsWith("/socket.io")) {
    next();
    return;
  }
  try {
    clientTemplate ??= loadClientTemplate(clientDist);
    res.type("html").send(renderSeoHtml(clientTemplate, req.path));
  } catch (error) {
    next(error);
  }
});
app.use(notFoundHandler);
app.use(errorHandler);
