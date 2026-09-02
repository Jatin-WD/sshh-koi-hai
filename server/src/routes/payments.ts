import { Router } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";
import { AppError } from "../lib/appError.js";
import { sendSuccess } from "../lib/apiResponse.js";
import { requireAuth } from "../middleware/auth.js";
import { createNotification } from "../lib/notifications.js";
import { fetchWithTimeout } from "../lib/http.js";

const router = Router();
const orderSchema = z.object({ planCode: z.string().trim().min(1).max(40) });

function isValidSignature(payload: string | Buffer, signature: string, secret: string) {
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return expected.length === signature.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

async function activatePayment(paymentId: string, razorpayPaymentId: string, signature?: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { subscription: { include: { plan: true } } } });
  if (!payment?.subscription) throw new AppError("Payment order not found", 404, "PAYMENT_NOT_FOUND");
  if (payment.status === "SUCCESS" && payment.subscription.status === "ACTIVE") return payment.subscription;
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + payment.subscription.plan.durationMonths);
  const [, subscription] = await prisma.$transaction([
    prisma.payment.update({ where: { id: payment.id }, data: { status: "SUCCESS", razorpayPaymentId, ...(signature ? { razorpaySignature: signature } : {}), paidAt: payment.paidAt ?? startDate } }),
    prisma.subscription.update({ where: { id: payment.subscription.id }, data: { status: "ACTIVE", startDate: payment.subscription.startDate ?? startDate, endDate: payment.subscription.endDate ?? endDate, razorpayPaymentId } }),
  ]);
  return subscription;
}

router.post("/razorpay/order", requireAuth, async (req, res, next) => {
  try {
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) throw new AppError("Payments are not configured", 503, "PAYMENTS_UNAVAILABLE");
    const { planCode } = orderSchema.parse(req.body);
    const plan = await prisma.subscriptionPlan.findFirst({ where: { code: planCode, active: true } });
    if (!plan) throw new AppError("This membership plan is unavailable", 404, "PLAN_NOT_FOUND");
    if (!req.authUser) throw new AppError("Authentication required", 401, "AUTH_REQUIRED");
    const pending = await prisma.subscription.create({ data: { userId: req.authUser.id, planId: plan.id, status: "PENDING" } });
    const amount = Math.round(Number(plan.price) * 100);
    const response = await fetchWithTimeout("https://api.razorpay.com/v1/orders", { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64")}`, "Content-Type": "application/json" }, body: JSON.stringify({ amount, currency: plan.currency, receipt: pending.id, notes: { planCode: plan.code, userId: req.authUser.id } }) });
    if (!response.ok) { await prisma.subscription.update({ where: { id: pending.id }, data: { status: "CANCELLED", cancelReason: "Razorpay order creation failed" } }); throw new AppError("Unable to start payment", 502, "PAYMENT_PROVIDER_ERROR"); }
    const order = await response.json() as { id: string; amount: number; currency: string };
    const payment = await prisma.payment.create({ data: { userId: req.authUser.id, planId: plan.id, subscriptionId: pending.id, amount: plan.price, currency: plan.currency, status: "PENDING", razorpayOrderId: order.id, metadata: { providerAmount: order.amount } } });
    await prisma.subscription.update({ where: { id: pending.id }, data: { razorpayOrderId: order.id } });
    return sendSuccess(res, { orderId: order.id, amount: order.amount, currency: order.currency, paymentId: payment.id, plan: { code: plan.code, name: plan.name } }, 201);
  } catch (error) { return next(error); }
});

router.post("/razorpay/verify", requireAuth, async (req, res, next) => {
  try {
    if (!env.RAZORPAY_KEY_SECRET) throw new AppError("Payments are not configured", 503, "PAYMENTS_UNAVAILABLE");
    const input = z.object({ razorpayOrderId: z.string().min(1), razorpayPaymentId: z.string().min(1), razorpaySignature: z.string().min(1) }).parse(req.body);
    if (!req.authUser) throw new AppError("Authentication required", 401, "AUTH_REQUIRED");
    const valid = isValidSignature(`${input.razorpayOrderId}|${input.razorpayPaymentId}`, input.razorpaySignature, env.RAZORPAY_KEY_SECRET);
    if (!valid) throw new AppError("Payment verification failed", 400, "INVALID_PAYMENT_SIGNATURE");
    const alreadyPaid = await prisma.payment.findFirst({ where: { userId: req.authUser.id, razorpayOrderId: input.razorpayOrderId, status: "SUCCESS" }, include: { subscription: true } });
    if (alreadyPaid?.subscription) return sendSuccess(res, { verified: true, subscription: alreadyPaid.subscription });
    const payment = await prisma.payment.findFirst({ where: { userId: req.authUser.id, razorpayOrderId: input.razorpayOrderId, status: "PENDING" }, include: { subscription: { include: { plan: true } } } });
    if (!payment?.subscription || payment.subscription.planId !== payment.planId) throw new AppError("Payment order not found", 404, "PAYMENT_NOT_FOUND");
    if (payment.razorpayPaymentId && payment.razorpayPaymentId !== input.razorpayPaymentId) throw new AppError("Payment has already been recorded", 409, "PAYMENT_ALREADY_RECORDED");
    const subscription = await activatePayment(payment.id, input.razorpayPaymentId, input.razorpaySignature);
    await createNotification(req.authUser.id, "ACCOUNT_ALERT", "Membership activated", `Your ${payment.subscription.plan.name} membership is now active.`);
    return sendSuccess(res, { verified: true, subscription });
  } catch (error) { return next(error); }
});

router.post("/razorpay/webhook", async (req, res, next) => {
  try {
    if (!env.RAZORPAY_WEBHOOK_SECRET) throw new AppError("Webhook is not configured", 503, "WEBHOOK_UNAVAILABLE");
    const signature = req.header("x-razorpay-signature");
    if (!signature || !Buffer.isBuffer(req.body) || !isValidSignature(req.body, signature, env.RAZORPAY_WEBHOOK_SECRET)) throw new AppError("Webhook verification failed", 400, "INVALID_WEBHOOK_SIGNATURE");
    const payload = JSON.parse(req.body.toString("utf8")) as { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string } } } };
    const entity = payload.payload?.payment?.entity;
    const payment = entity?.id ? await prisma.payment.findFirst({ where: { OR: [{ razorpayPaymentId: entity.id }, ...(entity.order_id ? [{ razorpayOrderId: entity.order_id }] : [])] } }) : null;
    if (!payment) return res.status(200).json({ received: true });
    if (payload.event === "payment.captured" && payment.status !== "SUCCESS") await activatePayment(payment.id, entity?.id ?? "");
    if (payload.event === "payment.failed" && payment.status === "PENDING") await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    if (payload.event === "payment.refunded") await prisma.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED" } });
    return res.status(200).json({ received: true });
  } catch (error) { return next(error); }
});

export default router;
