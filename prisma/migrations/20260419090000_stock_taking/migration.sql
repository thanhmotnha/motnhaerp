-- CreateTable: StockTaking
CREATE TABLE "StockTaking" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Nháp',
    "note" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "StockTaking_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StockTaking_code_key" ON "StockTaking"("code");
CREATE INDEX "StockTaking_warehouseId_idx" ON "StockTaking"("warehouseId");
CREATE INDEX "StockTaking_status_idx" ON "StockTaking"("status");

ALTER TABLE "StockTaking"
  ADD CONSTRAINT "StockTaking_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: StockTakingItem
CREATE TABLE "StockTakingItem" (
    "id" TEXT NOT NULL,
    "stockTakingId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "systemStock" INTEGER NOT NULL DEFAULT 0,
    "countedStock" INTEGER,
    "note" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "StockTakingItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StockTakingItem_stockTakingId_idx" ON "StockTakingItem"("stockTakingId");
CREATE INDEX "StockTakingItem_productId_idx" ON "StockTakingItem"("productId");

ALTER TABLE "StockTakingItem"
  ADD CONSTRAINT "StockTakingItem_stockTakingId_fkey"
  FOREIGN KEY ("stockTakingId") REFERENCES "StockTaking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StockTakingItem"
  ADD CONSTRAINT "StockTakingItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
