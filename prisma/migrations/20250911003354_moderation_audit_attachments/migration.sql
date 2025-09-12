-- Moderation attachments & audits per schema.prisma

-- ModerationAttachment
CREATE TABLE IF NOT EXISTS "public"."ModerationAttachment" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ModerationAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ModerationAttachment_itemId_idx" ON "public"."ModerationAttachment"("itemId");

ALTER TABLE "public"."ModerationAttachment"
  ADD CONSTRAINT IF NOT EXISTS "ModerationAttachment_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "public"."ModerationItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ModerationAudit
CREATE TABLE IF NOT EXISTS "public"."ModerationAudit" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "reviewerId" TEXT,
  "action" TEXT NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ModerationAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ModerationAudit_itemId_idx" ON "public"."ModerationAudit"("itemId");
CREATE INDEX IF NOT EXISTS "ModerationAudit_createdAt_idx" ON "public"."ModerationAudit"("createdAt");

ALTER TABLE "public"."ModerationAudit"
  ADD CONSTRAINT IF NOT EXISTS "ModerationAudit_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "public"."ModerationItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ModerationAudit"
  ADD CONSTRAINT IF NOT EXISTS "ModerationAudit_reviewerId_fkey"
  FOREIGN KEY ("reviewerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

