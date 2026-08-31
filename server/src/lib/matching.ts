import { prisma } from "../db/prisma.js";
import type { Prisma } from "@prisma/client";
import { getCurrentSubscription, membershipIsRequired } from "./membership.js";
import { AppError } from "./appError.js";

export function canonicalPair(firstUserId: string, secondUserId: string) {
  return firstUserId < secondUserId ? { firstUserId, secondUserId } : { firstUserId: secondUserId, secondUserId: firstUserId };
}

export async function createMatchWithConversation(firstUserId: string, secondUserId: string, client: typeof prisma | Prisma.TransactionClient = prisma) {
  const pair = canonicalPair(firstUserId, secondUserId);
  const match = await client.match.upsert({ where: { firstUserId_secondUserId: pair }, create: pair, update: {} });
  const conversation = await client.conversation.upsert({ where: { matchId: match.id }, create: { matchId: match.id, members: { connect: [{ id: firstUserId }, { id: secondUserId }] } }, update: {} });
  return { match, conversation };
}

export async function assertChatEligibility(currentUserId: string, otherUserId: string) {
  if ((await membershipIsRequired(currentUserId) && !await getCurrentSubscription(currentUserId)) || (await membershipIsRequired(otherUserId) && !await getCurrentSubscription(otherUserId))) throw new AppError("Both members need eligible access for chat", 403, "MEMBERSHIP_REQUIRED");
  if (await prisma.block.findFirst({ where: { OR: [{ blockerId: currentUserId, blockedUserId: otherUserId }, { blockerId: otherUserId, blockedUserId: currentUserId }] } })) throw new AppError("Chat is unavailable for this match", 403, "BLOCKED_MEMBER");
  const match = await prisma.match.findFirst({ where: { OR: [{ firstUserId: currentUserId, secondUserId: otherUserId }, { firstUserId: otherUserId, secondUserId: currentUserId }] }, include: { firstUser: true, secondUser: true } });
  if (!match || match.firstUser.status !== "ACTIVE" || match.secondUser.status !== "ACTIVE" || !match.firstUser.isEmailVerified || !match.secondUser.isEmailVerified) throw new AppError("A mutual match is required for chat", 403, "MATCH_REQUIRED");
  return match;
}
