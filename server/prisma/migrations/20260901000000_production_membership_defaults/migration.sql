-- Align initial commercial defaults without replacing an existing admin setting.
UPDATE "SubscriptionPlan" SET "price" = 499.00, "featured" = false, "sortOrder" = 1 WHERE "code" = 'monthly';
UPDATE "SubscriptionPlan" SET "price" = 999.00, "featured" = true, "sortOrder" = 2 WHERE "code" = 'quarterly';
UPDATE "SubscriptionPlan" SET "price" = 2499.00, "featured" = false, "sortOrder" = 3 WHERE "code" = 'yearly';
INSERT INTO "SiteSetting" ("id", "key", "value", "description", "createdAt", "updatedAt")
VALUES ('setting_business_model_production', 'business_model', '"MEN_PAID_WOMEN_FREE"'::jsonb, 'Controls which members require paid access.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
