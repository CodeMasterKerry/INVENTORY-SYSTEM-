BEGIN;

ALTER TYPE "PaymentMethod" ADD VALUE 'MOBILE';

ALTER TABLE "Sale"
  ADD COLUMN "subtotalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

UPDATE "Sale"
SET "subtotalAmount" = "totalAmount";

ALTER TABLE "Sale"
  ADD CONSTRAINT "Sale_discountPercent_check" CHECK ("discountPercent" >= 0 AND "discountPercent" <= 100),
  ADD CONSTRAINT "Sale_taxRate_check" CHECK ("taxRate" >= 0 AND "taxRate" <= 100),
  ADD CONSTRAINT "Sale_discountAmount_check" CHECK ("discountAmount" >= 0),
  ADD CONSTRAINT "Sale_taxAmount_check" CHECK ("taxAmount" >= 0);

ALTER TABLE "BusinessSettings"
  ALTER COLUMN "taxRate" SET DEFAULT 15;

COMMIT;
