import type { CorsOptions } from "cors";
import { corsOrigins } from "./env.js";
import { AppError } from "../lib/appError.js";

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new AppError("CORS origin not allowed", 403, "CORS_ORIGIN_REJECTED"));
  },
  credentials: true,
};
