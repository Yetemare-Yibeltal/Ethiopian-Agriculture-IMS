-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'FIELD_AGENT', 'NGO_PARTNER', 'VIEWER');

-- CreateEnum
CREATE TYPE "FarmerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'FLAGGED', 'PENDING');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "YieldStage" AS ENUM ('PRE_HARVEST', 'HARVEST', 'FINAL');

-- CreateEnum
CREATE TYPE "Season" AS ENUM ('Meher', 'Belg');

-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('NGO', 'GOVERNMENT', 'INTERNATIONAL', 'RESEARCH', 'OTHER');

-- CreateEnum
CREATE TYPE "InputCategory" AS ENUM ('FERTILIZER', 'SEED', 'PESTICIDE', 'TOOL', 'OTHER');

-- CreateEnum
CREATE TYPE "CropCategory" AS ENUM ('CEREAL', 'PULSE', 'OILSEED', 'VEGETABLE', 'FRUIT', 'CASH_CROP', 'FODDER', 'OTHER');

-- CreateEnum
CREATE TYPE "ZoneType" AS ENUM ('IRRIGATION', 'DROUGHT_RISK', 'NGO_COVERAGE', 'FLOOD_RISK', 'CUSTOM');

-- CreateEnum
CREATE TYPE "DuplicateStatus" AS ENUM ('PENDING', 'REVIEWED', 'MERGED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ExportFormat" AS ENUM ('EXCEL', 'PDF');

-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT', 'APPROVE', 'REJECT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('FOOD_SECURITY_ALERT', 'DUPLICATE_BLOCKED', 'EXPORT_READY', 'NEW_USER', 'SYSTEM', 'AID_REMINDER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "language" TEXT NOT NULL DEFAULT 'en',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrgType" NOT NULL,
    "description" TEXT,
    "website" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "focusAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "activeRegions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amharicName" TEXT,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amharicName" TEXT,
    "regionId" TEXT NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "woredas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amharicName" TEXT,
    "zoneId" TEXT NOT NULL,

    CONSTRAINT "woredas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kebeles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amharicName" TEXT,
    "geoLat" DOUBLE PRECISION,
    "geoLng" DOUBLE PRECISION,
    "woredaId" TEXT NOT NULL,

    CONSTRAINT "kebeles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crops" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amharicName" TEXT,
    "category" "CropCategory" NOT NULL DEFAULT 'CEREAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "crops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "input_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amharicName" TEXT,
    "category" "InputCategory" NOT NULL DEFAULT 'OTHER',
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "input_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farmers" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" "Gender",
    "photoUrl" TEXT,
    "landSizeTimad" DOUBLE PRECISION,
    "landSizeHectare" DOUBLE PRECISION,
    "gpsLat" DOUBLE PRECISION,
    "gpsLng" DOUBLE PRECISION,
    "notes" TEXT,
    "status" "FarmerStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "kebeleId" TEXT NOT NULL,
    "primaryCropId" TEXT,
    "registeredById" TEXT NOT NULL,

    CONSTRAINT "farmers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farmer_crops" (
    "id" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "farmerId" TEXT NOT NULL,
    "cropId" TEXT NOT NULL,

    CONSTRAINT "farmer_crops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "duplicate_flags" (
    "id" TEXT NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "DuplicateStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "farmerId1" TEXT NOT NULL,
    "farmerId2" TEXT NOT NULL,
    "reviewedById" TEXT,

    CONSTRAINT "duplicate_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "yield_reports" (
    "id" TEXT NOT NULL,
    "season" "Season" NOT NULL,
    "year" INTEGER NOT NULL,
    "stage" "YieldStage" NOT NULL,
    "quantityKg" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "farmerId" TEXT NOT NULL,
    "cropId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,

    CONSTRAINT "yield_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_security_alerts" (
    "id" TEXT NOT NULL,
    "season" "Season" NOT NULL,
    "year" INTEGER NOT NULL,
    "actualYield" DOUBLE PRECISION NOT NULL,
    "thresholdYield" DOUBLE PRECISION NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'MEDIUM',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "woredaId" TEXT NOT NULL,

    CONSTRAINT "food_security_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distributions" (
    "id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "season" "Season" NOT NULL,
    "year" INTEGER NOT NULL,
    "notes" TEXT,
    "receiptUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "farmerId" TEXT NOT NULL,
    "inputTypeId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "distributedById" TEXT NOT NULL,

    CONSTRAINT "distributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drawn_zones" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ZoneType" NOT NULL,
    "geoJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "drawn_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "tableName" TEXT NOT NULL,
    "recordId" TEXT,
    "beforeState" JSONB,
    "afterState" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_jobs" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "format" "ExportFormat" NOT NULL,
    "status" "ExportStatus" NOT NULL DEFAULT 'QUEUED',
    "fileUrl" TEXT,
    "filters" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,

    CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_orgId_idx" ON "users"("orgId");

-- CreateIndex
CREATE INDEX "users_isActive_idx" ON "users"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_name_key" ON "organizations"("name");

-- CreateIndex
CREATE INDEX "organizations_type_idx" ON "organizations"("type");

-- CreateIndex
CREATE INDEX "organizations_isActive_idx" ON "organizations"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "regions_name_key" ON "regions"("name");

-- CreateIndex
CREATE INDEX "regions_name_idx" ON "regions"("name");

-- CreateIndex
CREATE INDEX "zones_regionId_idx" ON "zones"("regionId");

-- CreateIndex
CREATE UNIQUE INDEX "zones_name_regionId_key" ON "zones"("name", "regionId");

-- CreateIndex
CREATE INDEX "woredas_zoneId_idx" ON "woredas"("zoneId");

-- CreateIndex
CREATE UNIQUE INDEX "woredas_name_zoneId_key" ON "woredas"("name", "zoneId");

-- CreateIndex
CREATE INDEX "kebeles_woredaId_idx" ON "kebeles"("woredaId");

-- CreateIndex
CREATE INDEX "kebeles_geoLat_geoLng_idx" ON "kebeles"("geoLat", "geoLng");

-- CreateIndex
CREATE UNIQUE INDEX "kebeles_name_woredaId_key" ON "kebeles"("name", "woredaId");

-- CreateIndex
CREATE UNIQUE INDEX "crops_name_key" ON "crops"("name");

-- CreateIndex
CREATE INDEX "crops_category_idx" ON "crops"("category");

-- CreateIndex
CREATE UNIQUE INDEX "input_types_name_key" ON "input_types"("name");

-- CreateIndex
CREATE INDEX "input_types_category_idx" ON "input_types"("category");

-- CreateIndex
CREATE UNIQUE INDEX "farmers_farmerId_key" ON "farmers"("farmerId");

-- CreateIndex
CREATE INDEX "farmers_farmerId_idx" ON "farmers"("farmerId");

-- CreateIndex
CREATE INDEX "farmers_kebeleId_idx" ON "farmers"("kebeleId");

-- CreateIndex
CREATE INDEX "farmers_status_idx" ON "farmers"("status");

-- CreateIndex
CREATE INDEX "farmers_registeredById_idx" ON "farmers"("registeredById");

-- CreateIndex
CREATE INDEX "farmers_primaryCropId_idx" ON "farmers"("primaryCropId");

-- CreateIndex
CREATE INDEX "farmers_gpsLat_gpsLng_idx" ON "farmers"("gpsLat", "gpsLng");

-- CreateIndex
CREATE INDEX "farmers_firstName_lastName_idx" ON "farmers"("firstName", "lastName");

-- CreateIndex
CREATE INDEX "farmers_phone_idx" ON "farmers"("phone");

-- CreateIndex
CREATE INDEX "farmers_createdAt_idx" ON "farmers"("createdAt");

-- CreateIndex
CREATE INDEX "farmer_crops_farmerId_idx" ON "farmer_crops"("farmerId");

-- CreateIndex
CREATE INDEX "farmer_crops_cropId_idx" ON "farmer_crops"("cropId");

-- CreateIndex
CREATE UNIQUE INDEX "farmer_crops_farmerId_cropId_season_key" ON "farmer_crops"("farmerId", "cropId", "season");

-- CreateIndex
CREATE INDEX "duplicate_flags_farmerId1_idx" ON "duplicate_flags"("farmerId1");

-- CreateIndex
CREATE INDEX "duplicate_flags_farmerId2_idx" ON "duplicate_flags"("farmerId2");

-- CreateIndex
CREATE INDEX "duplicate_flags_status_idx" ON "duplicate_flags"("status");

-- CreateIndex
CREATE INDEX "yield_reports_farmerId_idx" ON "yield_reports"("farmerId");

-- CreateIndex
CREATE INDEX "yield_reports_cropId_idx" ON "yield_reports"("cropId");

-- CreateIndex
CREATE INDEX "yield_reports_season_year_idx" ON "yield_reports"("season", "year");

-- CreateIndex
CREATE INDEX "yield_reports_stage_idx" ON "yield_reports"("stage");

-- CreateIndex
CREATE INDEX "yield_reports_submittedById_idx" ON "yield_reports"("submittedById");

-- CreateIndex
CREATE INDEX "yield_reports_createdAt_idx" ON "yield_reports"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "yield_reports_farmerId_cropId_season_year_stage_key" ON "yield_reports"("farmerId", "cropId", "season", "year", "stage");

-- CreateIndex
CREATE INDEX "food_security_alerts_woredaId_idx" ON "food_security_alerts"("woredaId");

-- CreateIndex
CREATE INDEX "food_security_alerts_season_year_idx" ON "food_security_alerts"("season", "year");

-- CreateIndex
CREATE INDEX "food_security_alerts_severity_idx" ON "food_security_alerts"("severity");

-- CreateIndex
CREATE INDEX "food_security_alerts_resolvedAt_idx" ON "food_security_alerts"("resolvedAt");

-- CreateIndex
CREATE INDEX "distributions_farmerId_idx" ON "distributions"("farmerId");

-- CreateIndex
CREATE INDEX "distributions_inputTypeId_idx" ON "distributions"("inputTypeId");

-- CreateIndex
CREATE INDEX "distributions_orgId_idx" ON "distributions"("orgId");

-- CreateIndex
CREATE INDEX "distributions_season_year_idx" ON "distributions"("season", "year");

-- CreateIndex
CREATE INDEX "distributions_distributedById_idx" ON "distributions"("distributedById");

-- CreateIndex
CREATE INDEX "distributions_createdAt_idx" ON "distributions"("createdAt");

-- CreateIndex
CREATE INDEX "drawn_zones_type_idx" ON "drawn_zones"("type");

-- CreateIndex
CREATE INDEX "drawn_zones_createdById_idx" ON "drawn_zones"("createdById");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_isRead_idx" ON "notifications"("isRead");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_tableName_idx" ON "audit_logs"("tableName");

-- CreateIndex
CREATE INDEX "audit_logs_recordId_idx" ON "audit_logs"("recordId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "export_jobs_userId_idx" ON "export_jobs"("userId");

-- CreateIndex
CREATE INDEX "export_jobs_status_idx" ON "export_jobs"("status");

-- CreateIndex
CREATE INDEX "export_jobs_createdAt_idx" ON "export_jobs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- CreateIndex
CREATE INDEX "system_settings_key_idx" ON "system_settings"("key");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zones" ADD CONSTRAINT "zones_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "woredas" ADD CONSTRAINT "woredas_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kebeles" ADD CONSTRAINT "kebeles_woredaId_fkey" FOREIGN KEY ("woredaId") REFERENCES "woredas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmers" ADD CONSTRAINT "farmers_kebeleId_fkey" FOREIGN KEY ("kebeleId") REFERENCES "kebeles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmers" ADD CONSTRAINT "farmers_primaryCropId_fkey" FOREIGN KEY ("primaryCropId") REFERENCES "crops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmers" ADD CONSTRAINT "farmers_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmer_crops" ADD CONSTRAINT "farmer_crops_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "farmers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farmer_crops" ADD CONSTRAINT "farmer_crops_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "crops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duplicate_flags" ADD CONSTRAINT "duplicate_flags_farmerId1_fkey" FOREIGN KEY ("farmerId1") REFERENCES "farmers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duplicate_flags" ADD CONSTRAINT "duplicate_flags_farmerId2_fkey" FOREIGN KEY ("farmerId2") REFERENCES "farmers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duplicate_flags" ADD CONSTRAINT "duplicate_flags_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yield_reports" ADD CONSTRAINT "yield_reports_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "farmers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yield_reports" ADD CONSTRAINT "yield_reports_cropId_fkey" FOREIGN KEY ("cropId") REFERENCES "crops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "yield_reports" ADD CONSTRAINT "yield_reports_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_security_alerts" ADD CONSTRAINT "food_security_alerts_woredaId_fkey" FOREIGN KEY ("woredaId") REFERENCES "woredas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distributions" ADD CONSTRAINT "distributions_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "farmers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distributions" ADD CONSTRAINT "distributions_inputTypeId_fkey" FOREIGN KEY ("inputTypeId") REFERENCES "input_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distributions" ADD CONSTRAINT "distributions_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distributions" ADD CONSTRAINT "distributions_distributedById_fkey" FOREIGN KEY ("distributedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drawn_zones" ADD CONSTRAINT "drawn_zones_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
