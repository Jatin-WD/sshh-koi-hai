import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireMembership } from "../lib/membership.js";
import { assertChatEligibility } from "../lib/matching.js";
import { publicProfile } from "../lib/profile.js";
import { sendSuccess } from "../lib/apiResponse.js";
import { AppError } from "../lib/appError.js";

const router = Router();
router.get("/", requireMembership, async (req, res, next) => { try { const userId = req.authUser!.id; const matches = await prisma.match.findMany({ where: { OR: [{ firstUserId: userId }, { secondUserId: userId }] }, include: { firstUser: { include: { profile: true } }, secondUser: { include: { profile: true } }, conversation: true }, orderBy: { matchedAt: "desc" } }); return sendSuccess(res, { matches: matches.filter((match) => match.firstUser.profile && match.secondUser.profile).map((match) => { const person = match.firstUserId === userId ? match.secondUser : match.firstUser; return { id: match.id, matchedAt: match.matchedAt, conversationId: match.conversation?.id ?? null, profile: publicProfile(person, person.profile!) }; }) }); } catch (error) { return next(error); } });
router.get("/:matchId/chat-access", requireMembership, async (req, res, next) => { try { const matchId = req.params.matchId; if (!matchId) throw new AppError("Match not found", 404, "MATCH_NOT_FOUND"); const match = await prisma.match.findUnique({ where: { id: matchId } }); if (!match || !req.authUser || ![match.firstUserId, match.secondUserId].includes(req.authUser.id)) throw new AppError("Match not found", 404, "MATCH_NOT_FOUND"); await assertChatEligibility(req.authUser.id, match.firstUserId === req.authUser.id ? match.secondUserId : match.firstUserId); return sendSuccess(res, { allowed: true, conversationId: (await prisma.conversation.findUnique({ where: { matchId: match.id } }))?.id ?? null }); } catch (error) { return next(error); } });
export default router;
