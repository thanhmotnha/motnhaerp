-- AlterTable
ALTER TABLE "SupplierPayment" ADD COLUMN "expenseId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SupplierPayment_expenseId_key" ON "SupplierPayment"("expenseId");
