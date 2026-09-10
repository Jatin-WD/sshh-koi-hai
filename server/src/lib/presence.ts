import { prisma } from "../db/prisma.js";

const touchIntervalMs = 60_000;
const lastTouched = new Map<string, number>();

export function markOnline(userId: string) {
  const now = Date.now();
  if ((lastTouched.get(userId) ?? 0) + touchIntervalMs > now) return;
  lastTouched.set(userId, now);
  void prisma.profile.update({ where: { userId }, data: { onlineStatus: true, lastSeenAt: new Date(now) } }).catch(() => undefined);
}

export function markOffline(userId: string) {
  lastTouched.delete(userId);
  void prisma.profile.update({ where: { userId }, data: { onlineStatus: false, lastSeenAt: new Date() } }).catch(() => undefined);
}
