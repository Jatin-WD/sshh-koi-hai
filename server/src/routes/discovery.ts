import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { requireDiscoveryAccess } from "../lib/membership.js";
import { getAge, profileCompletion, publicProfile } from "../lib/profile.js";
import { sortRecommendations } from "../lib/recommendations.js";
import { sendSuccess } from "../lib/apiResponse.js";

const router = Router();
const filterSchema = z.object({ gender: z.enum(["MALE", "FEMALE", "NON_BINARY", "OTHER", "PREFER_NOT_TO_SAY"]).optional(), minAge: z.coerce.number().int().min(18).max(100).optional(), maxAge: z.coerce.number().int().min(18).max(100).optional(), city: z.string().trim().max(100).optional(), maritalStatus: z.enum(["SINGLE", "MARRIED", "DIVORCED", "SEPARATED", "WIDOWED", "PREFER_NOT_TO_SAY"]).optional(), lookingFor: z.enum(["CHAT", "DATING", "RELATIONSHIP", "MARRIAGE", "FRIENDSHIP"]).optional(), interests: z.string().trim().max(500).optional(), online: z.coerce.boolean().optional(), newMembers: z.coerce.boolean().optional(), page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(50).default(12) }).refine((input) => !input.minAge || !input.maxAge || input.minAge <= input.maxAge, { message: "Minimum age cannot exceed maximum age", path: ["maxAge"] });

router.get("/", requireDiscoveryAccess, async (req, res, next) => {
  try {
    const input = filterSchema.parse(req.query); const userId = req.authUser!.id;
    const blocks = await prisma.block.findMany({ where: { OR: [{ blockerId: userId }, { blockedUserId: userId }] }, select: { blockerId: true, blockedUserId: true } });
    const excludedIds = new Set(blocks.flatMap((block) => [block.blockerId, block.blockedUserId])); excludedIds.add(userId);
    const profileWhere: Prisma.ProfileWhereInput = { visibility: "VISIBLE", profileImageUrls: { isEmpty: false }, ...(input.online ? { onlineStatus: true, showOnlineStatus: true } : {}) };
    if (input.interests) { const interests = input.interests.split(",").map((interest) => interest.trim()).filter(Boolean); if (interests.length) profileWhere.interests = { hasSome: interests }; }
    const where: Prisma.UserWhereInput = { id: { notIn: [...excludedIds] }, status: "ACTIVE", isEmailVerified: true, profile: { is: profileWhere } };
    if (input.gender) where.gender = input.gender; if (input.city) where.city = { contains: input.city, mode: "insensitive" }; if (input.maritalStatus) where.maritalStatus = input.maritalStatus; if (input.lookingFor) where.lookingFor = input.lookingFor;
    if (input.minAge || input.maxAge) { const dateOfBirth: Prisma.DateTimeFilter = {}; if (input.maxAge) dateOfBirth.gte = dateForAge(input.maxAge); if (input.minAge) dateOfBirth.lte = dateForAge(input.minAge); where.dateOfBirth = dateOfBirth; }
    if (input.newMembers) where.createdAt = { gte: new Date(Date.now() - 30 * 86400000) };
    const current = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { profile: true } }); if (!current.profile) throw new Error("Profile not found");
    const candidates = await prisma.user.findMany({ where, include: { profile: true }, orderBy: { createdAt: "desc" } });
    const candidatesWithProfile = candidates.filter((candidate): candidate is typeof candidate & { profile: NonNullable<typeof candidate.profile> } => Boolean(candidate.profile));
    const eligible = candidatesWithProfile.filter((candidate) => profileCompletion(candidate, candidate.profile) >= 60);
    const scored = sortRecommendations({ ...current, ...current.profile }, eligible); const start = (input.page - 1) * input.pageSize; const page = scored.slice(start, start + input.pageSize);
    return sendSuccess(res, { profiles: page.map(({ candidate, score }) => ({ ...publicProfile(candidate, candidate.profile), recommendationScore: score })), pagination: { page: input.page, pageSize: input.pageSize, total: scored.length, hasMore: start + input.pageSize < scored.length } });
  } catch (error) { return next(error); }
});

function dateForAge(age: number) { const date = new Date(); date.setFullYear(date.getFullYear() - age); return date; }
export default router;
