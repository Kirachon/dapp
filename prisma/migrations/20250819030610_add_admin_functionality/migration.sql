-- Admin & Moderation core (Reports, ModerationItem) per schema.prisma

-- Enums
DO $$ BEGIN
  CREATE TYPE "public"."ModerationStatus" AS ENUM ('PENDING','APPROVED','REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."ModerationPriority" AS ENUM ('LOW','MEDIUM','HIGH','URGENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."ReportStatus" AS ENUM ('PENDING','REVIEWED','RESOLVED','DISMISSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Report table
CREATE TABLE IF NOT EXISTS "public"."Report" (
  "id" TEXT NOT NULL,
  "reportedUserId" TEXT NOT NULL,
  "reportedById" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "description" TEXT,
  "status" "public"."ReportStatus" NOT NULL DEFAULT 'PENDING',
  "priority" "public"."ModerationPriority" NOT NULL DEFAULT 'MEDIUM',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "reviewedBy" TEXT,
  CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Report_status_idx" ON "public"."Report"("status");
CREATE INDEX IF NOT EXISTS "Report_priority_idx" ON "public"."Report"("priority");
CREATE INDEX IF NOT EXISTS "Report_createdAt_idx" ON "public"."Report"("createdAt");

ALTER TABLE "public"."Report"
  ADD CONSTRAINT "Report_reportedUserId_fkey"
  FOREIGN KEY ("reportedUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."Report"
  ADD CONSTRAINT "Report_reportedById_fkey"
  FOREIGN KEY ("reportedById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ModerationItem table
CREATE TABLE IF NOT EXISTS "public"."ModerationItem" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "priority" "public"."ModerationPriority" NOT NULL DEFAULT 'MEDIUM',
  "status" "public"."ModerationStatus" NOT NULL DEFAULT 'PENDING',
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reportedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewedBy" TEXT,
  CONSTRAINT "ModerationItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ModerationItem_status_idx" ON "public"."ModerationItem"("status");
CREATE INDEX IF NOT EXISTS "ModerationItem_priority_idx" ON "public"."ModerationItem"("priority");
CREATE INDEX IF NOT EXISTS "ModerationItem_submittedAt_idx" ON "public"."ModerationItem"("submittedAt");
CREATE INDEX IF NOT EXISTS "ModerationItem_type_idx" ON "public"."ModerationItem"("type");

ALTER TABLE "public"."ModerationItem"
  ADD CONSTRAINT "ModerationItem_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ModerationItem"
  ADD CONSTRAINT "ModerationItem_reportedById_fkey"
  FOREIGN KEY ("reportedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

