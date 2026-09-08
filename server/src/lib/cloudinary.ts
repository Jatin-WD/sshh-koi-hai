import crypto from "node:crypto";
import { env } from "../config/env.js";
import { AppError } from "./appError.js";
import { fetchWithTimeout } from "./http.js";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 8 * 1024 * 1024;

export async function uploadProfileImage(dataUrl: string) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  const mime = match?.[1];
  const base64 = match?.[2];
  if (!mime || !base64 || !allowedTypes.has(mime)) throw new AppError("Use a JPG, PNG, or WebP image", 400, "INVALID_IMAGE_TYPE");
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length > maxBytes) throw new AppError("Images must be 8MB or smaller", 400, "IMAGE_TOO_LARGE");
  if (!hasImageSignature(bytes, mime)) throw new AppError("The image file could not be validated", 400, "INVALID_IMAGE_FILE");
  const config = cloudinaryConfig();
  if (!config.cloudName || !config.apiKey || !config.apiSecret) {
    if (env.NODE_ENV === "production") throw new AppError("Image uploads are not configured", 503, "UPLOADS_UNAVAILABLE");
    return dataUrl;
  }
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const folder = "sshh-koi-hai/profiles";
  const signature = crypto.createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${config.apiSecret}`).digest("hex");
  const form = new FormData(); form.append("file", new Blob([bytes], { type: mime })); form.append("api_key", config.apiKey); form.append("timestamp", timestamp); form.append("folder", folder); form.append("signature", signature);
  let response: Response;
  try {
    response = await fetchWithTimeout(`https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/image/upload`, { method: "POST", body: form });
  } catch {
    throw new AppError("Image storage service is unavailable. Please try again.", 502, "UPLOAD_PROVIDER_UNAVAILABLE");
  }
  const result = await response.json().catch(() => null) as { secure_url?: string; error?: { message?: string } } | null;
  if (!response.ok) {
    const providerMessage = result?.error?.message || "Image upload failed";
    if (providerMessage.toLowerCase().includes("invalid cloud_name")) throw new AppError("Cloudinary cloud name is invalid. Set CLOUDINARY_CLOUD_NAME to the Cloud name shown in your Cloudinary dashboard.", 503, "UPLOAD_PROVIDER_CONFIG_ERROR");
    throw new AppError(providerMessage, 502, "UPLOAD_PROVIDER_ERROR");
  }
  if (!result?.secure_url) throw new AppError("Image upload failed", 502, "UPLOAD_PROVIDER_ERROR");
  return result.secure_url;
}

function cloudinaryConfig() {
  const rawCloudName = env.CLOUDINARY_CLOUD_NAME?.trim().replace(/^['"]|['"]$/g, "");
  const urlConfig = env.CLOUDINARY_URL ? parseCloudinaryUrl(env.CLOUDINARY_URL) : null;
  return {
    cloudName: rawCloudName?.startsWith("cloudinary://") ? parseCloudinaryUrl(rawCloudName)?.cloudName : rawCloudName || urlConfig?.cloudName,
    apiKey: env.CLOUDINARY_API_KEY?.trim() || urlConfig?.apiKey,
    apiSecret: env.CLOUDINARY_API_SECRET?.trim() || urlConfig?.apiSecret,
  };
}

function parseCloudinaryUrl(value: string) {
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "cloudinary:") return null;
    return { cloudName: parsed.hostname, apiKey: decodeURIComponent(parsed.username), apiSecret: decodeURIComponent(parsed.password) };
  } catch {
    return null;
  }
}

function hasImageSignature(bytes: Buffer, mime: string) {
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
}
