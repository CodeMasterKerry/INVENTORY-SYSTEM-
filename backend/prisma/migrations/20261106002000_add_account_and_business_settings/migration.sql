BEGIN;

ALTER TABLE "User"
  ADD COLUMN "notificationPreferences" JSONB NOT NULL
  DEFAULT '{"pendingSales":true,"productRequests":true,"lowStock":true,"rejectedSales":true}'::jsonb;

CREATE TABLE "BusinessSettings" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "businessName" TEXT NOT NULL DEFAULT 'E-SIMS',
  "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 15,
  "defaultLowStockLevel" INTEGER NOT NULL DEFAULT 5,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedById" INTEGER,
  CONSTRAINT "BusinessSettings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BusinessSettings_singleton_check" CHECK ("id" = 1),
  CONSTRAINT "BusinessSettings_taxRate_check" CHECK ("taxRate" >= 0 AND "taxRate" <= 100),
  CONSTRAINT "BusinessSettings_defaultLowStockLevel_check" CHECK ("defaultLowStockLevel" >= 0)
);

ALTER TABLE "BusinessSettings"
  ADD CONSTRAINT "BusinessSettings_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "BusinessSettings" ("id", "businessName", "taxRate", "defaultLowStockLevel")
VALUES (1, 'E-SIMS', 15, 5);

COMMIT;
