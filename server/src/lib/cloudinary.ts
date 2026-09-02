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
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    if (env.NODE_ENV === "production") throw new AppError("Image uploads are not configured", 503, "UPLOADS_UNAVAILABLE");
    return dataUrl;
  }
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const folder = "sshh-koi-hai/profiles";
  const signature = crypto.createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`).digest("hex");
  const form = new FormData(); form.append("file", new Blob([bytes], { type: mime })); form.append("api_key", env.CLOUDINARY_API_KEY); form.append("timestamp", timestamp); form.append("folder", folder); form.append("signature", signature);
  const response = await fetchWithTimeout(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: form });
  if (!response.ok) throw new AppError("Image upload failed", 502, "UPLOAD_PROVIDER_ERROR");
  const result = await response.json() as { secure_url?: string };
  if (!result.secure_url) throw new AppError("Image upload failed", 502, "UPLOAD_PROVIDER_ERROR");
  return result.secure_url;
}

function hasImageSignature(bytes: Buffer, mime: string) {
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
}
