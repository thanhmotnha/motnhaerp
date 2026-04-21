ALTER TABLE "SupplierDebt" ADD COLUMN "expenseId" TEXT;
CREATE UNIQUE INDEX "SupplierDebt_expenseId_key" ON "SupplierDebt"("expenseId");
ALTER TABLE "SupplierDebt"
  ADD CONSTRAINT "SupplierDebt_expenseId_fkey"
  FOREIGN KEY ("expenseId") REFERENCES "ProjectExpense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ContractorDebt" ADD COLUMN "expenseId" TEXT;
CREATE UNIQUE INDEX "ContractorDebt_expenseId_key" ON "ContractorDebt"("expenseId");
ALTER TABLE "ContractorDebt"
  ADD CONSTRAINT "ContractorDebt_expenseId_fkey"
  FOREIGN KEY ("expenseId") REFERENCES "ProjectExpense"("id") ON DELETE SET NULL ON UPDATE CASCADE;
