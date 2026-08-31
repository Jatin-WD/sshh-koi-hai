import type { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";

const preferenceFor: Record<NotificationType, string> = {
  INTEREST_RECEIVED: "interestReceived",
  INTEREST_ACCEPTED: "interestAccepted",
  NEW_MATCH: "newMatch",
  NEW_MESSAGE: "newMessage",
  SUBSCRIPTION_EXPIRING: "subscriptionUpdates",
  SUBSCRIPTION_EXPIRED: "subscriptionUpdates",
  PROFILE_MODERATED: "accountAlerts",
  ACCOUNT_ALERT: "accountAlerts",
};

export async function createNotification(userId: string, type: NotificationType, title: string, body: string, metadata?: Prisma.InputJsonValue) {
  const preference = await prisma.notificationPreference.findUnique({ where: { userId } });
  const enabled = preference?.[preferenceFor[type] as keyof typeof preference] ?? true;
  if (!enabled) return null;
  return prisma.notification.create({ data: { userId, type, title, body, ...(metadata ? { metadata } : {}) } });
}

export async function ensureSubscriptionNotification(userId: string, endDate: Date | null) {
  if (!endDate) return;
  const now = Date.now();
  const remaining = endDate.getTime() - now;
  const type: NotificationType | null = remaining <= 0 ? "SUBSCRIPTION_EXPIRED" : remaining <= 7 * 86400000 ? "SUBSCRIPTION_EXPIRING" : null;
  if (!type) return;
  const recent = await prisma.notification.findFirst({ where: { userId, type, createdAt: { gte: new Date(now - 24 * 3600000) } } });
  if (recent) return;
  return createNotification(userId, type, type === "SUBSCRIPTION_EXPIRED" ? "Membership expired" : "Membership expiring soon", type === "SUBSCRIPTION_EXPIRED" ? "Your membership has expired. Renew to keep discovering and chatting privately." : "Your membership expires within 7 days. Renew to keep your private space open.");
}
