import { z } from "zod";

const clientEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().min(1).default("/api"),
  VITE_APP_NAME: z.string().min(1).default("Sshh... Koi Hai?"),
  VITE_RAZORPAY_KEY_ID: z.string().optional(),
});

// A single Hostinger process serves both client and API; never ship a local API
// URL in a production bundle even if an old panel variable is still present.
const apiBaseUrl = import.meta.env.PROD ? "/api" : (import.meta.env.VITE_API_BASE_URL || "/api");
export const clientEnv = clientEnvSchema.parse({ ...import.meta.env, VITE_API_BASE_URL: apiBaseUrl });
