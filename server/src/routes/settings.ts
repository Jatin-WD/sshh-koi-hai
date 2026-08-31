import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { sendSuccess } from "../lib/apiResponse.js";
import { AppError } from "../lib/appError.js";

const router = Router();
router.use(requireAuth);

router.get("/account", async (req, res, next) => { try { const user = await prisma.user.findUnique({ where: { id: req.authUser!.id }, select: { id: true, email: true, displayName: true, isEmailVerified: true, createdAt: true, status: true } }); if (!user) throw new AppError("Account not found", 404, "ACCOUNT_NOT_FOUND"); return sendSuccess(res, { account: user }); } catch (error) { return next(error); } });
router.put("/account", async (req, res, next) => { try { const { displayName } = z.object({ displayName: z.string().trim().min(2).max(80) }).parse(req.body); const user = await prisma.user.update({ where: { id: req.authUser!.id }, data: { displayName }, select: { id: true, email: true, displayName: true, isEmailVerified: true, status: true } }); return sendSuccess(res, { account: user }); } catch (error) { return next(error); } });

router.get("/privacy", async (req, res, next) => { try { const profile = await prisma.profile.findUnique({ where: { userId: req.authUser!.id }, select: { visibility: true, showOnlineStatus: true, showCity: true } }); return sendSuccess(res, { privacy: profile }); } catch (error) { return next(error); } });
router.put("/privacy", async (req, res, next) => { try { const input = z.object({ visibility: z.enum(["VISIBLE", "HIDDEN"]), showOnlineStatus: z.boolean(), showCity: z.boolean() }).parse(req.body); const profile = await prisma.profile.update({ where: { userId: req.authUser!.id }, data: input, select: { visibility: true, showOnlineStatus: true, showCity: true } }); return sendSuccess(res, { privacy: profile }); } catch (error) { return next(error); } });

router.get("/security/sessions", async (req, res, next) => { try { const sessions = await prisma.authToken.findMany({ where: { userId: req.authUser!.id, type: "REFRESH_SESSION", consumedAt: null, expiresAt: { gt: new Date() } }, select: { id: true, createdAt: true, expiresAt: true }, orderBy: { createdAt: "desc" } }); return sendSuccess(res, { sessions }); } catch (error) { return next(error); } });

export default router;
