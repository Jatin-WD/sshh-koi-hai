CREATE TYPE "NotificationType" AS ENUM ('INTEREST_RECEIVED', 'INTEREST_ACCEPTED', 'NEW_MATCH', 'NEW_MESSAGE', 'SUBSCRIPTION_EXPIRING', 'SUBSCRIPTION_EXPIRED', 'PROFILE_MODERATED', 'ACCOUNT_ALERT');

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "body" VARCHAR(500) NOT NULL,
    "readAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");
CREATE INDEX "Notification_userId_type_createdAt_idx" ON "Notification"("userId", "type", "createdAt");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "interestReceived" BOOLEAN NOT NULL DEFAULT true,
    "interestAccepted" BOOLEAN NOT NULL DEFAULT true,
    "newMatch" BOOLEAN NOT NULL DEFAULT true,
    "newMessage" BOOLEAN NOT NULL DEFAULT true,
    "subscriptionUpdates" BOOLEAN NOT NULL DEFAULT true,
    "accountAlerts" BOOLEAN NOT NULL DEFAULT true,
    "emailImportant" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
