ALTER TABLE "SubscriptionPlan" RENAME COLUMN "isActive" TO "active";
ALTER TABLE "SubscriptionPlan" ADD COLUMN "code" TEXT;
ALTER TABLE "SubscriptionPlan" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;
UPDATE "SubscriptionPlan" SET "code" = lower(regexp_replace("name", '[^a-zA-Z0-9]+', '-', 'g')) WHERE "code" IS NULL;
ALTER TABLE "SubscriptionPlan" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "SubscriptionPlan_code_key" ON "SubscriptionPlan"("code");
ALTER TABLE "Subscription" RENAME COLUMN "startsAt" TO "startDate";
ALTER TABLE "Subscription" RENAME COLUMN "endsAt" TO "endDate";
ALTER TABLE "Payment" ADD COLUMN "planId" TEXT;
CREATE INDEX "Payment_planId_status_idx" ON "Payment"("planId", "status");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "SubscriptionPlan" ("id", "name", "code", "durationMonths", "price", "currency", "description", "active", "featured", "sortOrder", "createdAt", "updatedAt") VALUES
  ('plan_monthly', 'Monthly', 'monthly', 1, 499.00, 'INR', 'Flexible monthly access.', true, false, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('plan_quarterly', 'Quarterly', 'quarterly', 3, 1199.00, 'INR', 'A little more room to connect.', true, true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('plan_yearly', 'Yearly', 'yearly', 12, 3999.00, 'INR', 'Our best value for the long term.', true, false, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "SiteSetting" ("id", "key", "value", "description", "createdAt", "updatedAt") VALUES
  ('setting_business_model', 'business_model', '"EVERYONE_PAID"'::jsonb, 'Controls which members require paid access.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
