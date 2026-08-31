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

const requestLogger = pinoHttp as unknown as (options: { logger: typeof logger }) => RequestHandler;

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
app.use(notFoundHandler);
app.use(errorHandler);
