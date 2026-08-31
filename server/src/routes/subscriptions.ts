import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { sendSuccess } from "../lib/apiResponse.js";
import { requireAuth } from "../middleware/auth.js";
import { getCurrentSubscription, membershipIsRequired } from "../lib/membership.js";

const router = Router();

router.get("/plans", async (_req, res, next) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
    return sendSuccess(res, { plans: plans.map((plan) => ({ ...plan, price: plan.price.toString() })) });
  } catch (error) { return next(error); }
});

router.get("/current", requireAuth, async (req, res, next) => {
  try {
    const subscription = req.authUser ? await getCurrentSubscription(req.authUser.id) : null;
    const membershipRequired = req.authUser ? await membershipIsRequired(req.authUser.id) : true;
    return sendSuccess(res, { membershipRequired, subscription: subscription ? { ...subscription, plan: { ...subscription.plan, price: subscription.plan.price.toString() } } : null });
  } catch (error) { return next(error); }
});

export default router;
