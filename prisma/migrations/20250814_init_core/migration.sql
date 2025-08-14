-- Enable PostGIS extension for geospatial (required by SSOT)
CREATE EXTENSION IF NOT EXISTS postgis;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- Enums
CREATE TYPE "public"."VerificationLevel" AS ENUM ('UNVERIFIED', 'BASIC', 'VERIFIED', 'HIGH');
CREATE TYPE "public"."SwipeDirection" AS ENUM ('LEFT', 'RIGHT', 'SUPER');
CREATE TYPE "public"."MatchStatus" AS ENUM ('ACTIVE', 'UNMATCHED', 'BLOCKED');
CREATE TYPE "public"."MessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'SYSTEM');
CREATE TYPE "public"."ProfileVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'MATCHES_ONLY');

-- Tables
CREATE TABLE "public"."User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "verificationLevel" "public"."VerificationLevel" NOT NULL DEFAULT 'UNVERIFIED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastActive" TIMESTAMP(3),
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."Profile" (
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "age" INTEGER NOT NULL,
  "gender" TEXT,
  "orientation" TEXT,
  "bio" TEXT,
  "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "lifestyle" JSONB,
  "education" TEXT,
  "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "videoIntroUrl" TEXT,
  "prompts" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "visibility" "public"."ProfileVisibility" NOT NULL DEFAULT 'PUBLIC',
  CONSTRAINT "Profile_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "public"."Preferences" (
  "userId" TEXT NOT NULL,
  "minAge" INTEGER NOT NULL DEFAULT 18,
  "maxAge" INTEGER NOT NULL DEFAULT 55,
  "distanceKm" INTEGER NOT NULL DEFAULT 50,
  "showMe" TEXT,
  "advancedFilters" JSONB,
  CONSTRAINT "Preferences_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "public"."Location" (
  "userId" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Location_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "public"."Swipe" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "targetUserId" TEXT NOT NULL,
  "direction" "public"."SwipeDirection" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Swipe_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."Match" (
  "id" TEXT NOT NULL,
  "userIdA" TEXT NOT NULL,
  "userIdB" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" "public"."MatchStatus" NOT NULL DEFAULT 'ACTIVE',
  "reason" TEXT,
  CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."Conversation" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastMessageAt" TIMESTAMP(3),
  CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."Message" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "type" "public"."MessageType" NOT NULL DEFAULT 'TEXT',
  "content" TEXT,
  "mediaUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");
CREATE INDEX "Location_latitude_longitude_idx" ON "public"."Location"("latitude", "longitude");
CREATE INDEX "Swipe_userId_targetUserId_createdAt_idx" ON "public"."Swipe"("userId", "targetUserId", "createdAt");
CREATE UNIQUE INDEX "Match_userIdA_userIdB_key" ON "public"."Match"("userIdA", "userIdB");
CREATE UNIQUE INDEX "Conversation_matchId_key" ON "public"."Conversation"("matchId");
CREATE INDEX "Message_conversationId_createdAt_idx" ON "public"."Message"("conversationId", "createdAt");

-- FKs
ALTER TABLE "public"."Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."Preferences" ADD CONSTRAINT "Preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."Location" ADD CONSTRAINT "Location_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."Swipe" ADD CONSTRAINT "Swipe_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."Swipe" ADD CONSTRAINT "Swipe_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."Match" ADD CONSTRAINT "Match_userIdA_fkey" FOREIGN KEY ("userIdA") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."Match" ADD CONSTRAINT "Match_userIdB_fkey" FOREIGN KEY ("userIdB") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."Conversation" ADD CONSTRAINT "Conversation_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "public"."Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

