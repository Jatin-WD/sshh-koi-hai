import type { Request, Response, NextFunction } from "express";
import { prisma } from "../db/prisma.js";
import { AppError } from "./appError.js";
import { requireAuth } from "../middleware/auth.js";
import { minimumDiscoveryCompletion, profileCompletion } from "./profile.js";
import { ensureSubscriptionNotification } from "./notifications.js";
import { withDbStatementTimeout } from "./dbTimeout.js";

export async function getCurrentSubscription(userId: string) {
  const subscription = await withDbStatementTimeout((tx) => tx.subscription.findFirst({ where: { userId, status: "ACTIVE" }, include: { plan: true }, orderBy: { endDate: "desc" } }));
  if (subscription && (!subscription.endDate || subscription.endDate > new Date())) {
    await ensureSubscriptionNotification(userId, subscription.endDate);
    return subscription;
  }
  if (subscription) {
    await withDbStatementTimeout((tx) => tx.subscription.update({ where: { id: subscription.id }, data: { status: "EXPIRED" } }));
    await ensureSubscriptionNotification(userId, subscription.endDate);
  }
  return null;
}

export async function membershipIsRequired(userId: string) {
  const setting = await withDbStatementTimeout((tx) => tx.siteSetting.findUnique({ where: { key: "business_model" } }));
  const model = typeof setting?.value === "string" ? setting.value : undefined;
  if (model === "FREE_REGISTRATION_PAID_MESSAGING") return false;
  if (model === "MEN_PAID_WOMEN_FREE") return true;
  return true;
}

export async function requireMessagingMembership(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, async (error) => {
    if (error) return next(error);
    try {
      if (!req.authUser) throw new AppError("Authentication required", 401, "AUTH_REQUIRED");
      await assertMessagingMembership(req.authUser.id);
      next();
    } catch (membershipError) { next(membershipError); }
  });
}

export async function assertMessagingMembership(userId: string) {
  if (!await getCurrentSubscription(userId)) throw new AppError("Choose at least a Basic membership to chat with this person", 402, "MEMBERSHIP_REQUIRED");
}

export async function requireMembership(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, async (error) => {
    if (error) return next(error);
    try {
      if (!req.authUser || await membershipIsRequired(req.authUser.id) && !await getCurrentSubscription(req.authUser.id)) throw new AppError("An active membership is required", 402, "MEMBERSHIP_REQUIRED");
      next();
    } catch (membershipError) { next(membershipError); }
  });
}

export function requireDiscoveryAccess(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, async (error) => {
    if (error) return next(error);
    try {
      if (!req.authUser?.isEmailVerified) throw new AppError("Email verification is required", 403, "EMAIL_VERIFICATION_REQUIRED");
      const user = await prisma.user.findUnique({ where: { id: req.authUser.id }, include: { profile: true } });
      if (!user?.profile || profileCompletion(user, user.profile) < minimumDiscoveryCompletion) throw new AppError("Complete the essential parts of your profile before discovering members", 403, "PROFILE_INCOMPLETE");
      next();
    } catch (discoveryError) { next(discoveryError); }
  });
}
