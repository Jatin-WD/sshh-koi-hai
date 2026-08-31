import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { clearAuthCookies } from "../lib/auth.js";
import { sendSuccess } from "../lib/apiResponse.js";
import { AppError } from "../lib/appError.js";
import { profileCompletion, publicProfile } from "../lib/profile.js";
import { uploadProfileImage } from "../lib/cloudinary.js";

const router = Router();
const gender = z.enum(["MALE", "FEMALE", "NON_BINARY", "OTHER", "PREFER_NOT_TO_SAY"]);
const maritalStatus = z.enum(["SINGLE", "MARRIED", "DIVORCED", "SEPARATED", "WIDOWED", "PREFER_NOT_TO_SAY"]);
const lookingFor = z.enum(["CHAT", "DATING", "RELATIONSHIP", "MARRIAGE", "FRIENDSHIP"]);
const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(80).optional(), gender: gender.optional(), city: z.string().trim().max(100).nullable().optional(), maritalStatus: maritalStatus.nullable().optional(), lookingFor: lookingFor.nullable().optional(), bio: z.string().trim().max(1000).nullable().optional(), interests: z.array(z.string().trim().min(1).max(40)).max(30).optional(), occupation: z.string().trim().max(120).nullable().optional(), education: z.string().trim().max(160).nullable().optional(), languages: z.array(z.string().trim().min(1).max(40)).max(10).optional(), relationshipIntent: z.string().trim().max(160).nullable().optional(), genderPreference: gender.nullable().optional(), agePreferenceMin: z.number().int().min(18).max(100).nullable().optional(), agePreferenceMax: z.number().int().min(18).max(100).nullable().optional(), locationPreference: z.string().trim().max(100).nullable().optional(), visibility: z.enum(["VISIBLE", "HIDDEN"]).optional(), showOnlineStatus: z.boolean().optional(), showCity: z.boolean().optional(), allowInterests: z.boolean().optional(),
}).refine((data) => !data.agePreferenceMin || !data.agePreferenceMax || data.agePreferenceMin <= data.agePreferenceMax, { message: "Minimum preferred age cannot exceed maximum", path: ["agePreferenceMax"] });

router.get("/me", requireAuth, async (req, res, next) => { try { return sendSuccess(res, await loadOwnProfile(req.authUser!.id)); } catch (error) { return next(error); } });

router.put("/me", requireAuth, async (req, res, next) => {
  try {
    const input = profileSchema.parse(req.body); const userId = req.authUser!.id;
    const userData = pick(input, ["displayName", "gender", "city", "maritalStatus", "lookingFor"]);
    const profileData = pick(input, ["bio", "interests", "occupation", "education", "languages", "relationshipIntent", "genderPreference", "agePreferenceMin", "agePreferenceMax", "locationPreference", "visibility", "showOnlineStatus", "showCity", "allowInterests"]);
    const updatedUser = await prisma.user.update({ where: { id: userId }, data: userData }); const updatedProfile = await prisma.profile.update({ where: { userId }, data: profileData }); const completion = profileCompletion(updatedUser, updatedProfile);
    let visibilityNotice: string | undefined;
    if (updatedProfile.visibility === "VISIBLE" && completion < 60) { await prisma.profile.update({ where: { id: updatedProfile.id }, data: { visibility: "HIDDEN" } }); updatedProfile.visibility = "HIDDEN"; visibilityNotice = "Complete at least 60% of your profile before making it visible."; }
    return sendSuccess(res, { profile: publicProfile(updatedUser, updatedProfile), completion, visibilityNotice });
  } catch (error) { return next(error); }
});

router.post("/images", requireAuth, async (req, res, next) => { try { const { imageData } = z.object({ imageData: z.string().min(20) }).parse(req.body); const profile = await prisma.profile.findUnique({ where: { userId: req.authUser!.id } }); if (!profile) throw new AppError("Profile not found", 404, "PROFILE_NOT_FOUND"); const setting = await prisma.siteSetting.findUnique({ where: { key: "profile_image_max_count" } }); const maxImages = Number(setting?.value ?? 6); if (profile.profileImageUrls.length >= (Number.isFinite(maxImages) ? maxImages : 6)) throw new AppError("You have reached the profile image limit", 400, "IMAGE_LIMIT_REACHED"); const imageUrl = await uploadProfileImage(imageData); const urls = [...profile.profileImageUrls, imageUrl]; const updated = await prisma.profile.update({ where: { id: profile.id }, data: { profileImageUrls: urls, ...(urls.length === 1 ? { primaryImageIndex: 0 } : {}) } }); return sendSuccess(res, { profileImages: updated.profileImageUrls, primaryImageIndex: updated.primaryImageIndex }, 201); } catch (error) { return next(error); } });

router.delete("/images/:imageIndex", requireAuth, async (req, res, next) => { try { const index = parseIndex(req.params.imageIndex); const profile = await prisma.profile.findUnique({ where: { userId: req.authUser!.id } }); if (!profile || index >= profile.profileImageUrls.length) throw new AppError("Image not found", 404, "IMAGE_NOT_FOUND"); const urls = profile.profileImageUrls.filter((_, position) => position !== index); const primaryImageIndex = urls.length === 0 ? 0 : Math.min(profile.primaryImageIndex === index ? 0 : profile.primaryImageIndex > index ? profile.primaryImageIndex - 1 : profile.primaryImageIndex, urls.length - 1); const updated = await prisma.profile.update({ where: { id: profile.id }, data: { profileImageUrls: urls, primaryImageIndex } }); return sendSuccess(res, { profileImages: updated.profileImageUrls, primaryImageIndex: updated.primaryImageIndex }); } catch (error) { return next(error); } });
router.patch("/images/:imageIndex/primary", requireAuth, async (req, res, next) => { try { const index = parseIndex(req.params.imageIndex); const profile = await prisma.profile.findUnique({ where: { userId: req.authUser!.id } }); if (!profile || index >= profile.profileImageUrls.length) throw new AppError("Image not found", 404, "IMAGE_NOT_FOUND"); const updated = await prisma.profile.update({ where: { id: profile.id }, data: { primaryImageIndex: index } }); return sendSuccess(res, { primaryImageIndex: updated.primaryImageIndex }); } catch (error) { return next(error); } });

router.get("/:userId", requireAuth, async (req, res, next) => { try { const userId = req.params.userId; if (!userId) throw new AppError("Profile not found", 404, "PROFILE_NOT_FOUND"); const blocked = await prisma.block.findFirst({ where: { OR: [{ blockerId: req.authUser!.id, blockedUserId: userId }, { blockerId: userId, blockedUserId: req.authUser!.id }] } }); if (blocked) throw new AppError("Profile not found", 404, "PROFILE_NOT_FOUND"); const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } }); if (!user?.profile || user.status !== "ACTIVE" || user.profile.visibility !== "VISIBLE") throw new AppError("Profile not found", 404, "PROFILE_NOT_FOUND"); return sendSuccess(res, { profile: publicProfile(user, user.profile) }); } catch (error) { return next(error); } });
router.delete("/me", requireAuth, async (req, res, next) => { try { z.object({ confirmation: z.literal("DELETE") }).parse(req.body); const userId = req.authUser!.id; await prisma.$transaction([prisma.authToken.deleteMany({ where: { userId } }), prisma.profile.deleteMany({ where: { userId } }), prisma.user.update({ where: { id: userId }, data: { email: `deleted-${userId}@deleted.local`, displayName: "Deleted member", city: null, status: "DELETED", isEmailVerified: false, passwordHash: await bcrypt.hash(Math.random().toString(), 12) } })]); clearAuthCookies(res); return sendSuccess(res, { deleted: true }); } catch (error) { return next(error); } });

async function loadOwnProfile(userId: string) { const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } }); if (!user?.profile) throw new AppError("Profile not found", 404, "PROFILE_NOT_FOUND"); return { profile: publicProfile(user, user.profile), completion: profileCompletion(user, user.profile), account: { emailVerified: user.isEmailVerified, status: user.status } }; }
function pick<T extends Record<string, unknown>, K extends keyof T>(source: T, keys: K[]) { return Object.fromEntries(keys.filter((key) => source[key] !== undefined).map((key) => [key, source[key]])); }
function parseIndex(value: string | undefined) { const index = Number(value); if (!value || !Number.isInteger(index) || index < 0) throw new AppError("Invalid image index", 400, "INVALID_IMAGE_INDEX"); return index; }
export default router;
