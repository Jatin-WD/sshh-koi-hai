import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { sendSuccess } from "../lib/apiResponse.js";
import { AppError } from "../lib/appError.js";

const router = Router();
router.use(requireAuth);
const preferences = z.object({ interestReceived: z.boolean(), interestAccepted: z.boolean(), newMatch: z.boolean(), newMessage: z.boolean(), subscriptionUpdates: z.boolean(), accountAlerts: z.boolean(), emailImportant: z.boolean() });

router.get("", async (req, res, next) => { try { const userId = req.authUser!.id; const page = z.coerce.number().int().min(1).default(1).parse(req.query.page); const pageSize = z.coerce.number().int().min(1).max(50).default(20).parse(req.query.pageSize); const [notifications, total, unreadCount] = await Promise.all([prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }), prisma.notification.count({ where: { userId } }), prisma.notification.count({ where: { userId, readAt: null } })]); return sendSuccess(res, { notifications, unreadCount, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } }); } catch (error) { return next(error); } });
router.get("/preferences", async (req, res, next) => { try { const preference = await prisma.notificationPreference.upsert({ where: { userId: req.authUser!.id }, update: {}, create: { userId: req.authUser!.id } }); return sendSuccess(res, { preferences: preference }); } catch (error) { return next(error); } });
router.put("/preferences", async (req, res, next) => { try { const input = preferences.parse(req.body); const preference = await prisma.notificationPreference.upsert({ where: { userId: req.authUser!.id }, update: input, create: { userId: req.authUser!.id, ...input } }); return sendSuccess(res, { preferences: preference }); } catch (error) { return next(error); } });
router.patch("/:notificationId/read", async (req, res, next) => { try { const notification = await prisma.notification.updateMany({ where: { id: req.params.notificationId, userId: req.authUser!.id, readAt: null }, data: { readAt: new Date() } }); if (!notification.count) throw new AppError("Notification not found", 404, "NOTIFICATION_NOT_FOUND"); return sendSuccess(res, { read: true }); } catch (error) { return next(error); } });
router.post("/read-all", async (req, res, next) => { try { await prisma.notification.updateMany({ where: { userId: req.authUser!.id, readAt: null }, data: { readAt: new Date() } }); return sendSuccess(res, { read: true }); } catch (error) { return next(error); } });

export default router;
