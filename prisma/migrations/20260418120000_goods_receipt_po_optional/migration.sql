-- Drop NOT NULL + existing FK, re-add FK with ON DELETE SET NULL
ALTER TABLE "GoodsReceipt" ALTER COLUMN "purchaseOrderId" DROP NOT NULL;
ALTER TABLE "GoodsReceipt" DROP CONSTRAINT "GoodsReceipt_purchaseOrderId_fkey";
ALTER TABLE "GoodsReceipt"
  ADD CONSTRAINT "GoodsReceipt_purchaseOrderId_fkey"
  FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
