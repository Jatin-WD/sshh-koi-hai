CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE');
ALTER TABLE "Message" RENAME COLUMN "body" TO "content";
ALTER TABLE "Message" ADD COLUMN "type" "MessageType" NOT NULL DEFAULT 'TEXT';
ALTER TABLE "Message" ADD COLUMN "deliveredAt" TIMESTAMP(3);
CREATE INDEX "Message_conversationId_readAt_idx" ON "Message"("conversationId", "readAt");
