import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";
import { AppError } from "../lib/appError.js";
import { sendSuccess } from "../lib/apiResponse.js";
import { clearAuthCookies, createOpaqueToken, hashToken, publicUser, setAuthCookies } from "../lib/auth.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../lib/mail.js";
import { requireAuth } from "../middleware/auth.js";
import { authRateLimit } from "../middleware/security.js";

const router = Router();
const CURRENT_TERMS_VERSION = "2026-08-31";
const emailSchema = z.string().trim().email().transform((value) => value.toLowerCase());
const registerSchema = z.object({
  displayName: z.string().trim().min(2).max(80), email: emailSchema, password: z.string().min(10).max(128), confirmPassword: z.string(),
  dateOfBirth: z.coerce.date(), gender: z.enum(["MALE", "FEMALE", "NON_BINARY", "OTHER", "PREFER_NOT_TO_SAY"]), city: z.string().trim().min(2).max(100),
  maritalStatus: z.enum(["SINGLE", "MARRIED", "DIVORCED", "SEPARATED", "WIDOWED", "PREFER_NOT_TO_SAY"]), lookingFor: z.enum(["CHAT", "DATING", "RELATIONSHIP", "MARRIAGE", "FRIENDSHIP"]),
  acceptedTerms: z.literal(true), confirmedAdult: z.literal(true),
}).superRefine((data, ctx) => {
  if (data.password !== data.confirmPassword) ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords do not match" });
  if (!isAdult(data.dateOfBirth)) ctx.addIssue({ code: "custom", path: ["dateOfBirth"], message: "You must be at least 18 to join" });
  if (data.dateOfBirth > new Date()) ctx.addIssue({ code: "custom", path: ["dateOfBirth"], message: "Enter a valid date of birth" });
});

router.post("/register", authRateLimit, async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new AppError("Unable to create an account with those details", 400, "REGISTRATION_UNAVAILABLE");
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({ data: { email: input.email, passwordHash, displayName: input.displayName, dateOfBirth: input.dateOfBirth, gender: input.gender, city: input.city, maritalStatus: input.maritalStatus, lookingFor: input.lookingFor, termsVersion: CURRENT_TERMS_VERSION, acceptedAt: new Date(), profile: { create: {} } } });
    const token = await createAuthToken(user.id, "EMAIL_VERIFICATION", env.EMAIL_VERIFICATION_TTL_HOURS * 3600000);
    await sendVerificationEmail(user.email, user.displayName, token);
    return sendSuccess(res, { user: publicUser(user), verificationRequired: true }, 201);
  } catch (error) { return next(error); }
});

router.post("/login", authRateLimit, async (req, res, next) => {
  try {
    const input = z.object({ email: emailSchema, password: z.string().min(1) }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash)) || !user.isEmailVerified || ["SUSPENDED", "BANNED", "DELETED"].includes(user.status)) throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    const updated = await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), status: "ACTIVE" } });
    await setAuthCookies(res, updated);
    return sendSuccess(res, { user: publicUser(updated) });
  } catch (error) { return next(error); }
});

router.post("/logout", async (req, res, next) => {
  try { const token = req.cookies?.sshh_refresh; if (token) await prisma.authToken.updateMany({ where: { tokenHash: hashToken(token), type: "REFRESH_SESSION", consumedAt: null }, data: { consumedAt: new Date() } }); clearAuthCookies(res); return sendSuccess(res, { loggedOut: true }); } catch (error) { return next(error); }
});

router.get("/me", requireAuth, (req, res) => sendSuccess(res, { user: req.authUser }));

router.post("/change-password", requireAuth, async (req, res, next) => {
  try {
    const input = z.object({ currentPassword: z.string().min(1), password: z.string().min(10).max(128), confirmPassword: z.string() }).refine((data) => data.password === data.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.authUser!.id } });
    if (!user || !(await bcrypt.compare(input.currentPassword, user.passwordHash))) throw new AppError("Current password is incorrect", 400, "INVALID_CURRENT_PASSWORD");
    await prisma.$transaction([prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(input.password, 12) } }), prisma.authToken.updateMany({ where: { userId: user.id, type: "REFRESH_SESSION", consumedAt: null }, data: { consumedAt: new Date() } })]);
    clearAuthCookies(res);
    return sendSuccess(res, { changed: true, loggedOut: true });
  } catch (error) { return next(error); }
});

router.post("/logout-all", requireAuth, async (req, res, next) => {
  try { await prisma.authToken.updateMany({ where: { userId: req.authUser!.id, type: "REFRESH_SESSION", consumedAt: null }, data: { consumedAt: new Date() } }); clearAuthCookies(res); return sendSuccess(res, { loggedOut: true }); } catch (error) { return next(error); }
});

router.post("/verify-email", async (req, res, next) => {
  try {
    const { token } = z.object({ token: z.string().min(32).max(128) }).parse(req.body);
    const record = await prisma.authToken.findFirst({ where: { tokenHash: hashToken(token), type: "EMAIL_VERIFICATION", consumedAt: null, expiresAt: { gt: new Date() } }, include: { user: true } });
    if (!record) throw new AppError("This verification link is invalid or expired", 400, "INVALID_VERIFICATION_TOKEN");
    const user = await prisma.user.update({ where: { id: record.userId }, data: { isEmailVerified: true, status: "ACTIVE" } });
    await prisma.authToken.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
    return sendSuccess(res, { user: publicUser(user), verified: true });
  } catch (error) { return next(error); }
});

router.post("/resend-verification", authRateLimit, async (req, res, next) => {
  try {
    const { email } = z.object({ email: emailSchema }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && !user.isEmailVerified) { await prisma.authToken.updateMany({ where: { userId: user.id, type: "EMAIL_VERIFICATION", consumedAt: null }, data: { consumedAt: new Date() } }); const token = await createAuthToken(user.id, "EMAIL_VERIFICATION", env.EMAIL_VERIFICATION_TTL_HOURS * 3600000); await sendVerificationEmail(user.email, user.displayName, token); }
    return sendSuccess(res, { message: "If an unverified account exists, a new verification email has been sent" });
  } catch (error) { return next(error); }
});

router.post("/forgot-password", authRateLimit, async (req, res, next) => {
  try {
    const { email } = z.object({ email: emailSchema }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && user.status !== "DELETED") { await prisma.authToken.updateMany({ where: { userId: user.id, type: "PASSWORD_RESET", consumedAt: null }, data: { consumedAt: new Date() } }); const token = await createAuthToken(user.id, "PASSWORD_RESET", env.PASSWORD_RESET_TTL_MINUTES * 60000); await sendPasswordResetEmail(user.email, user.displayName, token); }
    return sendSuccess(res, { message: "If an account exists, password reset instructions have been sent" });
  } catch (error) { return next(error); }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const input = z.object({ token: z.string().min(32).max(128), password: z.string().min(10).max(128), confirmPassword: z.string() }).refine((data) => data.password === data.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" }).parse(req.body);
    const record = await prisma.authToken.findFirst({ where: { tokenHash: hashToken(input.token), type: "PASSWORD_RESET", consumedAt: null, expiresAt: { gt: new Date() } } });
    if (!record) throw new AppError("This reset link is invalid or expired", 400, "INVALID_RESET_TOKEN");
    await prisma.$transaction([prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await bcrypt.hash(input.password, 12) } }), prisma.authToken.update({ where: { id: record.id }, data: { consumedAt: new Date() } }), prisma.authToken.updateMany({ where: { userId: record.userId, type: "REFRESH_SESSION", consumedAt: null }, data: { consumedAt: new Date() } })]);
    clearAuthCookies(res);
    return sendSuccess(res, { reset: true });
  } catch (error) { return next(error); }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const token = req.cookies?.sshh_refresh;
    if (!token) throw new AppError("Authentication required", 401, "AUTH_REQUIRED");
    const record = await prisma.authToken.findFirst({ where: { tokenHash: hashToken(token), type: "REFRESH_SESSION", consumedAt: null, expiresAt: { gt: new Date() } }, include: { user: true } });
    if (!record) throw new AppError("Invalid or expired session", 401, "INVALID_SESSION");
    await prisma.authToken.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
    await setAuthCookies(res, record.user);
    return sendSuccess(res, { user: publicUser(record.user) });
  } catch (error) { return next(error); }
});

async function createAuthToken(userId: string, type: "EMAIL_VERIFICATION" | "PASSWORD_RESET", durationMs: number) {
  const raw = createOpaqueToken();
  await prisma.authToken.create({ data: { userId, tokenHash: hashToken(raw), type, expiresAt: new Date(Date.now() + durationMs) } });
  return raw;
}

function isAdult(date: Date) {
  const now = new Date();
  const adultDate = new Date(date);
  adultDate.setFullYear(adultDate.getFullYear() + 18);
  return adultDate <= now;
}

export default router;
