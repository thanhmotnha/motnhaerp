-- Add warehouseId column
ALTER TABLE "Product" ADD COLUMN "warehouseId" TEXT;

-- Add foreign key
ALTER TABLE "Product"
  ADD CONSTRAINT "Product_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index
CREATE INDEX "Product_warehouseId_idx" ON "Product"("warehouseId");

-- Backfill: tất cả SP hiện có → Kho Ngô Hùng (code='KHO01')
UPDATE "Product"
SET "warehouseId" = (SELECT id FROM "Warehouse" WHERE code = 'KHO01' LIMIT 1)
WHERE "warehouseId" IS NULL;
