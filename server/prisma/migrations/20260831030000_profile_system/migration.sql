ALTER TABLE "Profile" ADD COLUMN "primaryImageIndex" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Profile" ADD COLUMN "occupation" VARCHAR(120);
ALTER TABLE "Profile" ADD COLUMN "education" VARCHAR(160);
ALTER TABLE "Profile" ADD COLUMN "languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Profile" ADD COLUMN "relationshipIntent" VARCHAR(160);
ALTER TABLE "Profile" ADD COLUMN "showOnlineStatus" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Profile" ADD COLUMN "showCity" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Profile" ADD COLUMN "allowInterests" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Profile" ADD COLUMN "onlineStatus" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Profile" ADD COLUMN "lastSeenAt" TIMESTAMP(3);

INSERT INTO "SiteSetting" ("id", "key", "value", "description", "createdAt", "updatedAt") VALUES
  ('setting_profile_image_limit', 'profile_image_max_count', '6'::jsonb, 'Maximum profile images per member.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
