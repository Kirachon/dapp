-- Content Management Tables per schema.prisma

-- FeatureFlag
CREATE TABLE IF NOT EXISTS "public"."FeatureFlag" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "targetAudience" TEXT NOT NULL DEFAULT 'all',
  "rolloutPercentage" INTEGER NOT NULL DEFAULT 100,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FeatureFlag_key_key" ON "public"."FeatureFlag"("key");
CREATE INDEX IF NOT EXISTS "FeatureFlag_enabled_idx" ON "public"."FeatureFlag"("enabled");
CREATE INDEX IF NOT EXISTS "FeatureFlag_targetAudience_idx" ON "public"."FeatureFlag"("targetAudience");

-- EmailTemplate
CREATE TABLE IF NOT EXISTS "public"."EmailTemplate" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "htmlContent" TEXT NOT NULL,
  "textContent" TEXT,
  "variables" JSONB DEFAULT '[]'::jsonb,
  "category" TEXT NOT NULL DEFAULT 'notification',
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmailTemplate_key_key" ON "public"."EmailTemplate"("key");
CREATE INDEX IF NOT EXISTS "EmailTemplate_category_idx" ON "public"."EmailTemplate"("category");
CREATE INDEX IF NOT EXISTS "EmailTemplate_enabled_idx" ON "public"."EmailTemplate"("enabled");

-- AppConfig
CREATE TABLE IF NOT EXISTS "public"."AppConfig" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL DEFAULT 'general',
  "isPublic" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AppConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AppConfig_key_key" ON "public"."AppConfig"("key");
CREATE INDEX IF NOT EXISTS "AppConfig_category_idx" ON "public"."AppConfig"("category");
CREATE INDEX IF NOT EXISTS "AppConfig_isPublic_idx" ON "public"."AppConfig"("isPublic");

-- ContentPage
CREATE TABLE IF NOT EXISTS "public"."ContentPage" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "metaDescription" TEXT,
  "published" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContentPage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ContentPage_slug_key" ON "public"."ContentPage"("slug");
CREATE INDEX IF NOT EXISTS "ContentPage_published_idx" ON "public"."ContentPage"("published");

