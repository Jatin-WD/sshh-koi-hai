import { z } from "zod";

const clientEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().min(1).default("/api"),
  VITE_APP_NAME: z.string().min(1).default("Sshh... Koi Hai?"),
  VITE_RAZORPAY_KEY_ID: z.string().optional(),
});

export const clientEnv = clientEnvSchema.parse(import.meta.env);
