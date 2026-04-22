ALTER TABLE "SupplierDebt" ADD COLUMN "serviceCategory" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SupplierDebt" ADD COLUMN "allocationPlan" JSONB;
ALTER TABLE "ContractorDebt" ADD COLUMN "serviceCategory" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ContractorDebt" ADD COLUMN "allocationPlan" JSONB;
