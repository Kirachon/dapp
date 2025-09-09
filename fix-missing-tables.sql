-- Create missing tables

-- Create SwipeDirection enum if not exists
DO $$ BEGIN
    CREATE TYPE "SwipeDirection" AS ENUM ('LEFT', 'RIGHT', 'SUPER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Location table
CREATE TABLE IF NOT EXISTS "Location" (
  "userId" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Location_pkey" PRIMARY KEY ("userId")
);

-- Create Swipe table
CREATE TABLE IF NOT EXISTS "Swipe" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "targetUserId" TEXT NOT NULL,
  "direction" "SwipeDirection" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Swipe_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "Location_latitude_longitude_idx" ON "Location"("latitude", "longitude");
CREATE INDEX IF NOT EXISTS "Swipe_userId_createdAt_idx" ON "Swipe"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Swipe_targetUserId_createdAt_idx" ON "Swipe"("targetUserId", "createdAt");

-- Add foreign keys
ALTER TABLE "Location" ADD CONSTRAINT "Location_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Swipe" ADD CONSTRAINT "Swipe_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Swipe" ADD CONSTRAINT "Swipe_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
