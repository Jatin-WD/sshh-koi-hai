import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { requireMembership } from "../lib/membership.js";
import { assertChatEligibility } from "../lib/matching.js";
import { publicProfile } from "../lib/profile.js";
import { sendSuccess } from "../lib/apiResponse.js";
import { AppError } from "../lib/appError.js";

const router = Router();
const paging = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(50).default(30) });

router.get("/", requireMembership, async (req, res, next) => { try { const userId = req.authUser!.id; const conversations = await prisma.conversation.findMany({ where: { members: { some: { id: userId } } }, include: { match: true, members: { include: { profile: true } }, messages: { orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { lastMessageAt: "desc" } }); const visible = []; for (const conversation of conversations) { const other = conversation.members.find((member) => member.id !== userId); if (!other?.profile) continue; try { await assertChatEligibility(userId, other.id); } catch { continue; } const unreadCount = await prisma.message.count({ where: { conversationId: conversation.id, senderId: { not: userId }, readAt: null } }); visible.push({ id: conversation.id, matchId: conversation.matchId, lastMessageAt: conversation.lastMessageAt, unreadCount, latestMessage: conversation.messages[0] ? serializeMessage(conversation.messages[0]) : null, participant: publicProfile(other, other.profile) }); } return sendSuccess(res, { conversations: visible }); } catch (error) { return next(error); } });

router.get("/:conversationId/messages", requireMembership, async (req, res, next) => { try { const conversationId = req.params.conversationId; if (!conversationId) throw new AppError("Conversation not found", 404, "CONVERSATION_NOT_FOUND"); const conversation = await prisma.conversation.findUnique({ where: { id: conversationId }, include: { members: { select: { id: true } } } }); if (!conversation || !conversation.members.some((member) => member.id === req.authUser!.id)) throw new AppError("Conversation not found", 404, "CONVERSATION_NOT_FOUND"); const otherId = conversation.members.find((member) => member.id !== req.authUser!.id)?.id; if (!otherId) throw new AppError("Conversation is invalid", 403, "INVALID_CONVERSATION"); await assertChatEligibility(req.authUser!.id, otherId); const input = paging.parse(req.query); const skip = (input.page - 1) * input.pageSize; const messages = await prisma.message.findMany({ where: { conversationId }, orderBy: { createdAt: "desc" }, skip, take: input.pageSize }); await prisma.message.updateMany({ where: { conversationId, senderId: { not: req.authUser!.id }, deliveredAt: null }, data: { deliveredAt: new Date() } }); return sendSuccess(res, { messages: messages.reverse().map(serializeMessage), pagination: { page: input.page, pageSize: input.pageSize, hasMore: messages.length === input.pageSize } }); } catch (error) { return next(error); } });

function serializeMessage(message: { id: string; conversationId: string; senderId: string; content: string; type: string; createdAt: Date; deliveredAt: Date | null; readAt: Date | null }) { return { id: message.id, conversationId: message.conversationId, senderId: message.senderId, content: message.content, type: message.type, createdAt: message.createdAt.toISOString(), deliveredAt: message.deliveredAt?.toISOString() ?? null, readAt: message.readAt?.toISOString() ?? null }; }
export default router;
