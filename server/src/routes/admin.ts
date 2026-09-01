import { Router } from "express";
import { Prisma, UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { requireAdmin } from "../middleware/admin.js";
import { AppError } from "../lib/appError.js";
import { sendSuccess } from "../lib/apiResponse.js";

const router = Router();
router.use(requireAdmin);

const pageSchema = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20) });
const userSelect = { id: true, email: true, displayName: true, gender: true, city: true, maritalStatus: true, lookingFor: true, isEmailVerified: true, role: true, status: true, lastLoginAt: true, createdAt: true, updatedAt: true, profile: { select: { visibility: true, bio: true, profileImageUrls: true } } } as const;
const safeUser = <T,>(user: T) => user;
const amount = (value: Prisma.Decimal | null | undefined) => value?.toString() ?? "0.00";
const slug = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || `plan_${Date.now()}`;
const parseMembershipMode = (value: unknown): string => value === "FREE_REGISTRATION_PAID_MESSAGING" ? "FREE_SIGNUP_PAID_CHAT" : typeof value === "string" ? value : settingDefaults.membershipMode;

router.get("/stats", async (_req, res, next) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const [totalUsers, activeUsers, men, women, verifiedUsers, activeSubscriptions, monthlyRevenue, totalRevenue, newUsers, reports, activeMatches] = await Promise.all([
      prisma.user.count({ where: { status: { not: "DELETED" } } }),
      prisma.user.count({ where: { status: "ACTIVE" } }),
      prisma.user.count({ where: { gender: "MALE", status: { not: "DELETED" } } }),
      prisma.user.count({ where: { gender: "FEMALE", status: { not: "DELETED" } } }),
      prisma.user.count({ where: { isEmailVerified: true, status: { not: "DELETED" } } }),
      prisma.subscription.findMany({ where: { status: "ACTIVE", OR: [{ endDate: null }, { endDate: { gt: now } }] }, select: { userId: true }, distinct: ["userId"] }),
      prisma.payment.aggregate({ where: { status: "SUCCESS", paidAt: { gte: monthStart, lte: now } }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { status: "SUCCESS" }, _sum: { amount: true } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo }, status: { not: "DELETED" } } }),
      prisma.report.count({ where: { status: { in: ["PENDING", "REVIEWED"] } } }),
      prisma.match.count(),
    ]);
    return sendSuccess(res, { totalUsers, activeUsers, men, women, verifiedUsers, activeSubscribers: activeSubscriptions.length, monthlyRevenue: amount(monthlyRevenue._sum.amount), totalRevenue: amount(totalRevenue._sum.amount), newUsers, reports, activeMatches });
  } catch (error) { return next(error); }
});

router.get("/users", async (req, res, next) => {
  try {
    const query = pageSchema.extend({ search: z.string().trim().optional(), status: z.enum(["PENDING", "ACTIVE", "SUSPENDED", "BANNED", "DELETED"]).optional(), gender: z.enum(["MALE", "FEMALE", "NON_BINARY", "OTHER", "PREFER_NOT_TO_SAY"]).optional(), verified: z.coerce.boolean().optional() }).parse(req.query);
    const where: Prisma.UserWhereInput = { ...(query.status ? { status: query.status } : {}), ...(query.gender ? { gender: query.gender } : {}), ...(query.verified === undefined ? {} : { isEmailVerified: query.verified }), ...(query.search ? { OR: [{ email: { contains: query.search, mode: "insensitive" } }, { displayName: { contains: query.search, mode: "insensitive" } }, { city: { contains: query.search, mode: "insensitive" } }] } : {}) };
    const [total, users] = await Promise.all([prisma.user.count({ where }), prisma.user.findMany({ where, select: userSelect, orderBy: { createdAt: "desc" }, skip: (query.page - 1) * query.pageSize, take: query.pageSize })]);
    return sendSuccess(res, { users: users.map(safeUser), pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) } });
  } catch (error) { return next(error); }
});

router.get("/users/:userId", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.userId }, select: userSelect });
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    const [subscriptions, payments] = await Promise.all([
      prisma.subscription.findMany({ where: { userId: user.id }, include: { plan: true }, orderBy: { createdAt: "desc" } }),
      prisma.payment.findMany({ where: { userId: user.id }, include: { plan: true }, orderBy: { createdAt: "desc" }, take: 20 }),
    ]);
    return sendSuccess(res, { user: safeUser(user), subscriptions: subscriptions.map((item) => ({ ...item, plan: { ...item.plan, price: amount(item.plan.price) } })), payments: payments.map((item) => ({ ...item, amount: amount(item.amount), plan: item.plan ? { ...item.plan, price: amount(item.plan.price) } : null })) });
  } catch (error) { return next(error); }
});

router.patch("/users/:userId/status", async (req, res, next) => {
  try {
    const { status } = z.object({ status: z.enum(["ACTIVE", "SUSPENDED", "BANNED"]) }).parse(req.body);
    const target = await prisma.user.findUnique({ where: { id: req.params.userId }, select: { id: true, role: true } });
    if (!target) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    if (target.id === req.authUser!.id || target.role === UserRole.ADMIN) throw new AppError("This account cannot be changed here", 400, "ADMIN_ACCOUNT_PROTECTED");
    const user = await prisma.user.update({ where: { id: target.id }, data: { status }, select: userSelect });
    if (status !== "ACTIVE") await prisma.authToken.deleteMany({ where: { userId: target.id, type: "REFRESH_SESSION" } });
    return sendSuccess(res, { user: safeUser(user) });
  } catch (error) { return next(error); }
});

router.post("/users/:userId/verify-profile", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.userId }, include: { profile: true } });
    if (!user) throw new AppError("User not found", 404, "USER_NOT_FOUND");
    await prisma.user.update({ where: { id: user.id }, data: { isEmailVerified: true, ...(user.status === "PENDING" ? { status: "ACTIVE" as const } : {}) } });
    if (user.profile) await prisma.profile.update({ where: { userId: user.id }, data: { visibility: "VISIBLE" } });
    const updated = await prisma.user.findUnique({ where: { id: user.id }, select: userSelect });
    return sendSuccess(res, { user: safeUser(updated) });
  } catch (error) { return next(error); }
});

router.get("/subscriptions", async (req, res, next) => {
  try {
    const query = pageSchema.extend({ status: z.enum(["PENDING", "ACTIVE", "PAST_DUE", "CANCELLED", "EXPIRED"]).optional(), search: z.string().trim().optional() }).parse(req.query);
    const where: Prisma.SubscriptionWhereInput = { ...(query.status ? { status: query.status } : {}), ...(query.search ? { user: { OR: [{ email: { contains: query.search, mode: "insensitive" } }, { displayName: { contains: query.search, mode: "insensitive" } }] } } : {}) };
    const [total, subscriptions] = await Promise.all([prisma.subscription.count({ where }), prisma.subscription.findMany({ where, include: { plan: true, user: { select: userSelect } }, orderBy: { createdAt: "desc" }, skip: (query.page - 1) * query.pageSize, take: query.pageSize })]);
    return sendSuccess(res, { subscriptions: subscriptions.map((item) => ({ ...item, plan: { ...item.plan, price: amount(item.plan.price) } })), pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) } });
  } catch (error) { return next(error); }
});

router.patch("/subscriptions/:subscriptionId/extend", async (req, res, next) => {
  try {
    const { months } = z.object({ months: z.coerce.number().int().min(1).max(120) }).parse(req.body);
    const current = await prisma.subscription.findUnique({ where: { id: req.params.subscriptionId } });
    if (!current) throw new AppError("Subscription not found", 404, "SUBSCRIPTION_NOT_FOUND");
    const start = current.endDate && current.endDate > new Date() ? current.endDate : new Date();
    const end = new Date(start); end.setMonth(end.getMonth() + months);
    return sendSuccess(res, { subscription: await prisma.subscription.update({ where: { id: current.id }, data: { status: "ACTIVE", startDate: current.startDate ?? new Date(), endDate: end } }) });
  } catch (error) { return next(error); }
});

router.patch("/subscriptions/:subscriptionId/cancel", async (req, res, next) => {
  try { return sendSuccess(res, { subscription: await prisma.subscription.update({ where: { id: req.params.subscriptionId }, data: { status: "CANCELLED", autoRenew: false } }) }); } catch (error) { return next(error); }
});

router.get("/payments", async (req, res, next) => {
  try {
    const query = pageSchema.extend({ status: z.enum(["PENDING", "SUCCESS", "FAILED", "REFUNDED", "CANCELLED"]).optional(), search: z.string().trim().optional() }).parse(req.query);
    const where: Prisma.PaymentWhereInput = { ...(query.status ? { status: query.status } : {}), ...(query.search ? { user: { OR: [{ email: { contains: query.search, mode: "insensitive" } }, { displayName: { contains: query.search, mode: "insensitive" } }] } } : {}) };
    const [total, payments] = await Promise.all([prisma.payment.count({ where }), prisma.payment.findMany({ where, include: { user: { select: userSelect }, plan: true }, orderBy: { createdAt: "desc" }, skip: (query.page - 1) * query.pageSize, take: query.pageSize })]);
    return sendSuccess(res, { payments: payments.map((item) => ({ ...item, amount: amount(item.amount), plan: item.plan ? { ...item.plan, price: amount(item.plan.price) } : null })), pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) } });
  } catch (error) { return next(error); }
});

const planInput = z.object({ name: z.string().trim().min(2).max(80), code: z.string().trim().min(2).max(40).optional(), durationMonths: z.coerce.number().int().min(1).max(120), price: z.coerce.number().nonnegative(), currency: z.string().trim().regex(/^[A-Z]{3}$/).default("INR"), description: z.string().trim().max(500).optional(), active: z.boolean().default(true), featured: z.boolean().default(false), sortOrder: z.coerce.number().int().min(0).default(0) });
router.get("/plans", async (_req, res, next) => { try { const plans = await prisma.subscriptionPlan.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }); return sendSuccess(res, { plans: plans.map((plan) => ({ ...plan, price: amount(plan.price) })) }); } catch (error) { return next(error); } });
router.post("/plans", async (req, res, next) => { try { const input = planInput.parse(req.body); const code = slug(input.code ?? input.name); if (await prisma.subscriptionPlan.findUnique({ where: { code } })) throw new AppError("Plan code already exists", 409, "PLAN_CODE_EXISTS"); const plan = await prisma.subscriptionPlan.create({ data: { name: input.name, code, durationMonths: input.durationMonths, price: input.price, currency: input.currency, ...(input.description ? { description: input.description } : {}), active: input.active, featured: input.featured, sortOrder: input.sortOrder } }); return sendSuccess(res, { plan: { ...plan, price: amount(plan.price) } }, 201); } catch (error) { return next(error); } });
router.patch("/plans/:planId", async (req, res, next) => { try { const input = planInput.partial().parse(req.body); const data: Prisma.SubscriptionPlanUpdateInput = {}; if (input.name !== undefined) data.name = input.name; if (input.code !== undefined) data.code = slug(input.code); if (input.durationMonths !== undefined) data.durationMonths = input.durationMonths; if (input.price !== undefined) data.price = input.price; if (input.currency !== undefined) data.currency = input.currency; if (input.description !== undefined) data.description = input.description; if (input.active !== undefined) data.active = input.active; if (input.featured !== undefined) data.featured = input.featured; if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder; const plan = await prisma.subscriptionPlan.update({ where: { id: req.params.planId }, data }); return sendSuccess(res, { plan: { ...plan, price: amount(plan.price) } }); } catch (error) { return next(error); } });

router.get("/reports", async (req, res, next) => { try { const query = pageSchema.extend({ status: z.enum(["PENDING", "REVIEWED", "RESOLVED", "DISMISSED"]).optional() }).parse(req.query); const where = query.status ? { status: query.status } : {}; const [total, reports] = await Promise.all([prisma.report.count({ where }), prisma.report.findMany({ where, include: { reporter: { select: userSelect }, reportedUser: { select: userSelect }, reviewedBy: { select: { id: true, displayName: true, email: true } } }, orderBy: { createdAt: "desc" }, skip: (query.page - 1) * query.pageSize, take: query.pageSize })]); return sendSuccess(res, { reports, pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) } }); } catch (error) { return next(error); } });
router.patch("/reports/:reportId", async (req, res, next) => { try { const { status } = z.object({ status: z.enum(["PENDING", "REVIEWED", "RESOLVED", "DISMISSED"]) }).parse(req.body); const report = await prisma.report.update({ where: { id: req.params.reportId }, data: { status, reviewedAt: status === "PENDING" ? null : new Date(), reviewedById: status === "PENDING" ? null : req.authUser!.id } }); return sendSuccess(res, { report }); } catch (error) { return next(error); } });

const settingDefaults = { membershipMode: "MEN_PAID_WOMEN_FREE", minimumAge: 18, maxProfileImages: 6, siteName: "Sshh... Koi Hai?", supportEmail: "hello@sshhkoihai.com", profileCompletionRequirement: 60 };
router.get("/settings", async (_req, res, next) => { try { const rows = await prisma.siteSetting.findMany({ where: { key: { in: ["membershipMode", "business_model", "minimumAge", "maxProfileImages", "profile_image_max_count", "siteName", "supportEmail", "profileCompletionRequirement"] } } }); const values: Record<string, string | number> = { ...settingDefaults }; for (const row of rows) { if (row.key === "business_model") values.membershipMode = parseMembershipMode(row.value); else if (row.key === "profile_image_max_count") values.maxProfileImages = Number(row.value); else if (row.key === "membershipMode") values.membershipMode = parseMembershipMode(row.value); else if (typeof row.value === "string" || typeof row.value === "number") values[row.key] = row.value; } return sendSuccess(res, { settings: values }); } catch (error) { return next(error); } });
router.put("/settings", async (req, res, next) => { try { const input = z.object({ membershipMode: z.enum(["EVERYONE_PAID", "MEN_PAID_WOMEN_FREE", "FREE_SIGNUP_PAID_CHAT"]), minimumAge: z.coerce.number().int().min(18).max(100), maxProfileImages: z.coerce.number().int().min(1).max(20), siteName: z.string().trim().min(2).max(120), supportEmail: z.string().email(), profileCompletionRequirement: z.coerce.number().int().min(0).max(100) }).parse(req.body); const writes = Object.entries({ ...input, business_model: input.membershipMode === "FREE_SIGNUP_PAID_CHAT" ? "FREE_REGISTRATION_PAID_MESSAGING" : input.membershipMode, profile_image_max_count: input.maxProfileImages }).map(([key, value]) => prisma.siteSetting.upsert({ where: { key }, update: { value, updatedById: req.authUser!.id }, create: { key, value, updatedById: req.authUser!.id } })); await prisma.$transaction(writes); return sendSuccess(res, { settings: input }); } catch (error) { return next(error); } });

export default router;
