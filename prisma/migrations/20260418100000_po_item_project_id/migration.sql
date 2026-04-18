-- Add projectId column
ALTER TABLE "PurchaseOrderItem" ADD COLUMN "projectId" TEXT;

-- Add foreign key
ALTER TABLE "PurchaseOrderItem"
  ADD CONSTRAINT "PurchaseOrderItem_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index
CREATE INDEX "PurchaseOrderItem_projectId_idx" ON "PurchaseOrderItem"("projectId");

-- Backfill: PO cũ "Giao thẳng dự án" → copy projectId xuống items
UPDATE "PurchaseOrderItem" poi
SET "projectId" = po."projectId"
FROM "PurchaseOrder" po
WHERE poi."purchaseOrderId" = po.id
  AND po."deliveryType" = 'Giao thẳng dự án'
  AND po."projectId" IS NOT NULL;
