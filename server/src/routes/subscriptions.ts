import { Router } from "express";
import { sendSuccess } from "../lib/apiResponse.js";
import { requireAuth } from "../middleware/auth.js";
import { getCurrentSubscription, membershipIsRequired } from "../lib/membership.js";
import { withDbStatementTimeout } from "../lib/dbTimeout.js";
import { logger } from "../lib/logger.js";
import { perIpCircuitBreaker } from "../middleware/security.js";

type SerializedPlan = {
  id: string;
  name: string;
  code: string;
  durationMonths: number;
  price: string;
  currency: string;
  description: string | null;
  active: boolean;
  featured: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

const planCacheTtlMs = 60_000;
let plansCache: { expiresAt: number; plans: SerializedPlan[] } | null = null;
let plansInFlight: Promise<SerializedPlan[]> | null = null;

function serializePlans(plans: Awaited<ReturnType<typeof fetchPlansFromDb>>) {
  return plans.map((plan) => ({ ...plan, price: plan.price.toString() }));
}

async function fetchPlansFromDb() {
  const plans = await withDbStatementTimeout((tx) =>
    tx.subscriptionPlan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  );
  return plans;
}

async function getPlans() {
  const now = Date.now();
  if (plansCache && plansCache.expiresAt > now) return plansCache.plans;
  if (plansInFlight) return plansInFlight;

  plansInFlight = (async () => {
    const plans = await fetchPlansFromDb();
    const serialized = serializePlans(plans);
    plansCache = { plans: serialized, expiresAt: Date.now() + planCacheTtlMs };
    return serialized;
  })().finally(() => {
    plansInFlight = null;
  });

  try {
    return await plansInFlight;
  } catch (error) {
    if (plansCache) {
      logger.warn({ err: error }, "Serving stale membership plans after database failure");
      return plansCache.plans;
    }
    throw error;
  }
}

const router = Router();

router.get("/plans", perIpCircuitBreaker("/api/subscriptions/plans"), async (_req, res, next) => {
  try {
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    const plans = await getPlans();
    return sendSuccess(res, { plans });
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
