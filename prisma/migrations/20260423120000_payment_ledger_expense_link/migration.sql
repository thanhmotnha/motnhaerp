ALTER TABLE "ContractorPaymentLog" ADD COLUMN IF NOT EXISTS "expenseId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "ContractorPaymentLog_expenseId_key" ON "ContractorPaymentLog"("expenseId");
-- SupplierPayment.expenseId có thể đã tồn tại, idempotent
ALTER TABLE "SupplierPayment" ADD COLUMN IF NOT EXISTS "expenseId" TEXT;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'SupplierPayment_expenseId_key') THEN
        CREATE UNIQUE INDEX "SupplierPayment_expenseId_key" ON "SupplierPayment"("expenseId");
    END IF;
END $$;
