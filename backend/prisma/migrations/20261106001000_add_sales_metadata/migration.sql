BEGIN;

CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER');

ALTER TABLE "Sale"
  ADD COLUMN "paymentMethod" "PaymentMethod",
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "rejectedAt" TIMESTAMP(3),
  ADD COLUMN "rejectionReason" TEXT,
  ADD COLUMN "rejectedById" INTEGER;

UPDATE "Sale"
SET "rejectedAt" = "approvedAt",
    "rejectedById" = "approvedById"
WHERE "status" = 'REJECTED'
  AND "rejectedAt" IS NULL;

ALTER TABLE "SaleItem"
  ADD COLUMN "unitCost" DECIMAL(10,2);

ALTER TABLE "Sale"
  ADD CONSTRAINT "Sale_rejectedById_fkey"
  FOREIGN KEY ("rejectedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
