CREATE TYPE "ProductUpdateRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "ProductUpdateRequest" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "requestedById" INTEGER NOT NULL,
    "status" "ProductUpdateRequestStatus" NOT NULL DEFAULT 'PENDING',
    "proposedName" VARCHAR(160) NOT NULL,
    "proposedCostPrice" DECIMAL(10,2) NOT NULL,
    "proposedSellingPrice" DECIMAL(10,2) NOT NULL,
    "proposedLowStockLevel" INTEGER NOT NULL,
    "proposedCategoryId" INTEGER NOT NULL,
    "proposedDescription" TEXT,
    "proposedUnit" VARCHAR(40),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" INTEGER,
    "rejectionReason" VARCHAR(1000),

    CONSTRAINT "ProductUpdateRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductUpdateRequest_status_createdAt_id_idx"
ON "ProductUpdateRequest"("status", "createdAt", "id");
CREATE INDEX "ProductUpdateRequest_productId_status_idx"
ON "ProductUpdateRequest"("productId", "status");
CREATE UNIQUE INDEX "ProductUpdateRequest_one_pending_per_product_idx"
ON "ProductUpdateRequest"("productId")
WHERE "status" = 'PENDING';

ALTER TABLE "ProductUpdateRequest" ADD CONSTRAINT "ProductUpdateRequest_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductUpdateRequest" ADD CONSTRAINT "ProductUpdateRequest_requestedById_fkey"
FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductUpdateRequest" ADD CONSTRAINT "ProductUpdateRequest_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductUpdateRequest" ADD CONSTRAINT "ProductUpdateRequest_proposedCategoryId_fkey"
FOREIGN KEY ("proposedCategoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
