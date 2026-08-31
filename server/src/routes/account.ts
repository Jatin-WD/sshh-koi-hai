import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { publicProfile } from "../lib/profile.js";
import { sendSuccess } from "../lib/apiResponse.js";

const router = Router();
router.get("/blocked", requireAuth, async (req, res, next) => { try { const blocks = await prisma.block.findMany({ where: { blockerId: req.authUser!.id }, include: { blockedUser: { include: { profile: true } } }, orderBy: { createdAt: "desc" } }); return sendSuccess(res, { blocked: blocks.map((block) => ({ id: block.id, createdAt: block.createdAt, profile: block.blockedUser.profile ? publicProfile(block.blockedUser, block.blockedUser.profile) : null })) }); } catch (error) { return next(error); } });
export default router;
