CREATE TABLE "Expense" (
    "id" SERIAL NOT NULL,
    "category" VARCHAR(80) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "expenseDate" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" INTEGER,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Expense_expenseDate_id_idx" ON "Expense"("expenseDate", "id");

ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
