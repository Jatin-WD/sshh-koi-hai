import { Router } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import subscriptionsRouter from "./subscriptions.js";
import paymentsRouter from "./payments.js";
import profileRouter from "./profile.js";
import discoveryRouter from "./discovery.js";
import interestsRouter from "./interests.js";
import matchesRouter from "./matches.js";
import conversationsRouter from "./conversations.js";
import usersRouter from "./users.js";
import accountRouter from "./account.js";
import adminRouter from "./admin.js";
import notificationsRouter from "./notifications.js";
import settingsRouter from "./settings.js";

const router = Router();

router.use("/", healthRouter);
router.use("/auth", authRouter);
router.use("/subscriptions", subscriptionsRouter);
router.use("/payments", paymentsRouter);
router.use("/profile", profileRouter);
router.use("/discover", discoveryRouter);
router.use("/interests", interestsRouter);
router.use("/matches", matchesRouter);
router.use("/conversations", conversationsRouter);
router.use("/users", usersRouter);
router.use("/account", accountRouter);
router.use("/admin", adminRouter);
router.use("/notifications", notificationsRouter);
router.use("/settings", settingsRouter);

export default router;
