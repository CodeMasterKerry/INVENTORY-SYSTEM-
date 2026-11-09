BEGIN;

ALTER TABLE "Product"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "unit" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3),
  ADD COLUMN "rejectedAt" TIMESTAMP(3),
  ADD COLUMN "rejectionReason" TEXT,
  ADD COLUMN "rejectedById" INTEGER;

UPDATE "Product" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
ALTER TABLE "Product"
  ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "updatedAt" SET NOT NULL;

ALTER TABLE "InventoryTransaction"
  ADD COLUMN "createdById" INTEGER,
  ADD COLUMN "quantityBefore" INTEGER,
  ADD COLUMN "quantityAfter" INTEGER;

ALTER TABLE "Product"
  ADD CONSTRAINT "Product_rejectedById_fkey"
  FOREIGN KEY ("rejectedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InventoryTransaction"
  ADD CONSTRAINT "InventoryTransaction_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "InventoryTransaction_stockLevels_check"
  CHECK (
    ("quantityBefore" IS NULL AND "quantityAfter" IS NULL)
    OR (
      "quantityBefore" IS NOT NULL AND "quantityAfter" IS NOT NULL
      AND (("type" = 'IN' AND "quantityAfter" = "quantityBefore" + "quantity")
        OR ("type" = 'OUT' AND "quantityBefore" = "quantityAfter" + "quantity"))
    )
  );

CREATE INDEX "InventoryTransaction_createdAt_id_idx"
  ON "InventoryTransaction"("createdAt", "id");

COMMIT;
