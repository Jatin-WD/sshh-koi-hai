import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../lib/appError.js";
import { sendSuccess } from "../lib/apiResponse.js";
import { publicProfile } from "../lib/profile.js";

const router = Router();
const categories = ["Harassment", "Fake Profile", "Spam", "Inappropriate Content", "Scam/Fraud", "Impersonation", "Other"] as const;

router.post("/:userId/block", requireAuth, async (req, res, next) => { try { const userId = req.params.userId; if (!userId || userId === req.authUser!.id) throw new AppError("You cannot block this account", 400, "INVALID_BLOCK_TARGET"); const target = await prisma.user.findUnique({ where: { id: userId } }); if (!target || target.status === "DELETED") throw new AppError("User not found", 404, "USER_NOT_FOUND"); const block = await prisma.block.upsert({ where: { blockerId_blockedUserId: { blockerId: req.authUser!.id, blockedUserId: userId } }, create: { blockerId: req.authUser!.id, blockedUserId: userId }, update: {} }); return sendSuccess(res, { blocked: true, blockId: block.id }); } catch (error) { return next(error); } });

router.delete("/:userId/block", requireAuth, async (req, res, next) => { try { const userId = req.params.userId; if (!userId) throw new AppError("User not found", 404, "USER_NOT_FOUND"); await prisma.block.deleteMany({ where: { blockerId: req.authUser!.id, blockedUserId: userId } }); return sendSuccess(res, { unblocked: true }); } catch (error) { return next(error); } });

router.post("/:userId/report", requireAuth, async (req, res, next) => { try { const userId = req.params.userId; if (!userId || userId === req.authUser!.id) throw new AppError("You cannot report this account", 400, "INVALID_REPORT_TARGET"); const target = await prisma.user.findUnique({ where: { id: userId } }); if (!target) throw new AppError("User not found", 404, "USER_NOT_FOUND"); const input = z.object({ category: z.enum(categories), details: z.string().trim().max(2000).optional() }).parse(req.body); const report = await prisma.report.create({ data: { reporterId: req.authUser!.id, reportedUserId: userId, reportedType: "USER", reason: input.category, ...(input.details !== undefined ? { details: input.details } : {}) } }); return sendSuccess(res, { reported: true, reportId: report.id }, 201); } catch (error) { return next(error); } });

export default router;
