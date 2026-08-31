import jwt from "jsonwebtoken";
import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import type { Socket } from "socket.io";
import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { assertChatEligibility } from "../lib/matching.js";
import { AppError } from "../lib/appError.js";
import { corsOrigins } from "../config/env.js";
import { createNotification } from "../lib/notifications.js";

const conversationRoom = (id: string) => `conversation:${id}`;
const messageInput = z.object({ conversationId: z.string().min(1), content: z.string().trim().min(1).max(4000), type: z.literal("TEXT").default("TEXT") });
const connectionAttempts = new Map<string, { count: number; resetAt: number }>();

export function attachSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, { cors: { origin: corsOrigins, credentials: true }, maxHttpBufferSize: 64 * 1024 });
  io.use(async (socket, next) => {
    try {
      const address = socket.handshake.address;
      const now = Date.now();
      const attempt = connectionAttempts.get(address);
      if (!attempt || attempt.resetAt <= now) connectionAttempts.set(address, { count: 1, resetAt: now + 60_000 });
      else { attempt.count += 1; if (attempt.count > 30) throw new AppError("Too many connection attempts", 429, "SOCKET_RATE_LIMITED"); }
      const token = readCookie(socket.handshake.headers.cookie, "sshh_access"); if (!token) throw new AppError("Authentication required", 401, "AUTH_REQUIRED");
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ["HS256"] }) as jwt.JwtPayload; if (typeof payload.sub !== "string" || payload.type !== "access") throw new AppError("Invalid session", 401, "INVALID_SESSION");
      const user = await prisma.user.findUnique({ where: { id: payload.sub } }); if (!user || user.status !== "ACTIVE" || !user.isEmailVerified) throw new AppError("Account unavailable", 401, "ACCOUNT_UNAVAILABLE");
      socket.data.userId = user.id; next();
    } catch (error) { next(new Error(error instanceof AppError ? error.code ?? error.message : "Invalid session")); }
  });
  io.on("connection", (socket) => registerSocketHandlers(io, socket));
  return io;
}

function registerSocketHandlers(io: Server, socket: Socket) {
  const userId = () => socket.data.userId as string;
  socket.on("conversation:join", async ({ conversationId }: { conversationId?: string }) => { try { const access = await authorizeConversation(userId(), conversationId); await markDelivered(access.id, userId(), io); socket.join(conversationRoom(access.id)); socket.emit("conversation:joined", { conversationId: access.id }); } catch (error) { emitError(socket, error); } });
  socket.on("conversation:leave", ({ conversationId }: { conversationId?: string }) => { if (conversationId) socket.leave(conversationRoom(conversationId)); });
  socket.on("message:send", async (payload: unknown) => { try { const input = messageInput.parse(payload); const access = await authorizeConversation(userId(), input.conversationId); const message = await prisma.message.create({ data: { conversationId: access.id, senderId: userId(), content: input.content, type: input.type } }); await prisma.conversation.update({ where: { id: access.id }, data: { lastMessageAt: message.createdAt } }); const recipientId = access.members.find((member) => member.id !== userId())?.id; if (recipientId) await createNotification(recipientId, "NEW_MESSAGE", "New message", "You have a new private message.", { conversationId: access.id }); const sockets = await io.in(conversationRoom(access.id)).fetchSockets(); if (sockets.some((peer) => peer.id !== socket.id)) { const delivered = await prisma.message.update({ where: { id: message.id }, data: { deliveredAt: new Date() } }); io.to(conversationRoom(access.id)).emit("message:new", serializeMessage(delivered)); } else { socket.emit("message:new", serializeMessage(message)); } } catch (error) { emitError(socket, error); } });
  socket.on("conversation:typing", async (payload: unknown) => { try { const input = z.object({ conversationId: z.string().min(1), typing: z.boolean() }).parse(payload); const access = await authorizeConversation(userId(), input.conversationId); socket.to(conversationRoom(access.id)).emit("conversation:typing", { conversationId: access.id, userId: userId(), typing: input.typing }); } catch (error) { emitError(socket, error); } });
  socket.on("message:read", async (payload: unknown) => { try { const input = z.object({ conversationId: z.string().min(1), messageId: z.string().min(1) }).parse(payload); const access = await authorizeConversation(userId(), input.conversationId); const updated = await prisma.message.updateMany({ where: { id: input.messageId, conversationId: access.id, senderId: { not: userId() }, readAt: null }, data: { readAt: new Date(), deliveredAt: new Date() } }); if (updated.count) io.to(conversationRoom(access.id)).emit("message:read", { messageId: input.messageId, conversationId: access.id, readAt: new Date().toISOString() }); } catch (error) { emitError(socket, error); } });
  socket.on("disconnect", () => undefined);
}

async function authorizeConversation(userId: string, conversationId: string | undefined) {
  if (!conversationId) throw new AppError("Conversation is required", 400, "CONVERSATION_REQUIRED");
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId }, include: { match: true, members: { select: { id: true } } } });
  if (!conversation || !conversation.members.some((member) => member.id === userId)) throw new AppError("Conversation not found", 404, "CONVERSATION_NOT_FOUND");
  const otherUserId = conversation.members.find((member) => member.id !== userId)?.id; if (!otherUserId) throw new AppError("Conversation is invalid", 403, "INVALID_CONVERSATION");
  await assertChatEligibility(userId, otherUserId); return conversation;
}

async function markDelivered(conversationId: string, userId: string, io: Server) { const pending = await prisma.message.findMany({ where: { conversationId, senderId: { not: userId }, deliveredAt: null }, select: { id: true } }); if (!pending.length) return; const deliveredAt = new Date(); await prisma.message.updateMany({ where: { id: { in: pending.map((message) => message.id) } }, data: { deliveredAt } }); io.to(conversationRoom(conversationId)).emit("messages:delivered", { conversationId, messageIds: pending.map((message) => message.id), deliveredAt: deliveredAt.toISOString() }); }
function serializeMessage(message: { id: string; conversationId: string; senderId: string; content: string; type: string; createdAt: Date; deliveredAt: Date | null; readAt: Date | null }) { return { id: message.id, conversationId: message.conversationId, senderId: message.senderId, content: message.content, type: message.type, createdAt: message.createdAt.toISOString(), deliveredAt: message.deliveredAt?.toISOString() ?? null, readAt: message.readAt?.toISOString() ?? null }; }
function readCookie(cookieHeader: string | undefined, name: string) { return cookieHeader?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1); }
function emitError(socket: Socket, error: unknown) { socket.emit("chat:error", { message: error instanceof AppError ? error.message : "Chat action failed", code: error instanceof AppError ? error.code : "CHAT_ERROR" }); }
