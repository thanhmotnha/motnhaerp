# Inventory GRN & Stock Issue Design

## Mục tiêu

Bổ sung luồng **nhập kho từ PO** (GoodsReceipt) và **phiếu xuất kho** (StockIssue) vào hệ thống kho hiện có. Đơn giản, dễ theo dõi cho công ty nhỏ — không có workflow duyệt phức tạp.

## Luồng nghiệp vụ

### Nhập kho (GRN)
1. Kế toán/quản lý tạo PO như bình thường
2. Khi hàng về: vào trang PO → bấm **"Nhận hàng"**
3. Hệ thống tạo phiếu nhập kho (GRN) tự điền sản phẩm từ PO
4. Người dùng nhập SL thực nhận từng mặt hàng (có thể < SL đặt)
5. Lưu GRN → tự động:
   - Cộng `product.stock` theo SL nhận
   - Tạo `InventoryTransaction` loại "Nhập" cho mỗi item
   - Cập nhật `PurchaseOrderItem.receivedQty`
6. 1 PO có thể có nhiều GRN (nhận nhiều đợt)
7. In phiếu nhập kho (mã GRN, ngày, NCC, danh sách hàng, kho nhập, người lập)

### Xuất kho (StockIssue)
1. Tab "Phiếu xuất" trong `/inventory` → bấm **"+ Tạo phiếu xuất"**
2. Chọn kho, gắn dự án, thêm danh sách vật tư + SL
3. Lưu → tự động:
   - Trừ `product.stock`
   - Tạo `InventoryTransaction` loại "Xuất" cho mỗi item
4. Không cần duyệt — xuất ngay, ghi lịch sử (người tạo, thời gian)
5. In phiếu xuất kho (mã, ngày, dự án, danh sách vật tư, người lập)

## Data Model

### GoodsReceipt (Phiếu nhập kho)
```prisma
model GoodsReceipt {
  id              String             @id @default(cuid())
  code            String             @unique   // PNK-001
  purchaseOrderId String
  warehouseId     String
  receivedDate    DateTime           @default(now())
  receivedBy      String             @default("")
  notes           String             @default("")
  createdById     String             @default("")
  createdAt       DateTime           @default(now())

  purchaseOrder   PurchaseOrder      @relation(fields: [purchaseOrderId], references: [id])
  warehouse       Warehouse          @relation(fields: [warehouseId], references: [id])
  items           GoodsReceiptItem[]
}

model GoodsReceiptItem {
  id              String       @id @default(cuid())
  receiptId       String
  productId       String?
  productName     String                        // snapshot tên sp
  unit            String       @default("")
  qtyOrdered      Float        @default(0)      // từ PO
  qtyReceived     Float        @default(0)      // thực nhận
  unitPrice       Float        @default(0)      // từ PO
  purchaseOrderItemId String?

  receipt         GoodsReceipt  @relation(fields: [receiptId], references: [id], onDelete: Cascade)
  product         Product?      @relation(fields: [productId], references: [id])
  purchaseOrderItem PurchaseOrderItem? @relation(fields: [purchaseOrderItemId], references: [id])
}
```

### StockIssue (Phiếu xuất kho)
```prisma
model StockIssue {
  id          String           @id @default(cuid())
  code        String           @unique   // PXK-001
  warehouseId String
  projectId   String?
  issuedDate  DateTime         @default(now())
  issuedBy    String           @default("")
  notes       String           @default("")
  createdById String           @default("")
  createdAt   DateTime         @default(now())

  warehouse   Warehouse        @relation(fields: [warehouseId], references: [id])
  project     Project?         @relation(fields: [projectId], references: [id])
  items       StockIssueItem[]
}

model StockIssueItem {
  id          String     @id @default(cuid())
  issueId     String
  productId   String?
  productName String                    // snapshot
  unit        String     @default("")
  qty         Float      @default(0)
  unitPrice   Float      @default(0)   // giá vốn tại thời điểm xuất

  issue       StockIssue @relation(fields: [issueId], references: [id], onDelete: Cascade)
  product     Product?   @relation(fields: [productId], references: [id])
}
```

### Schema bổ sung
- `PurchaseOrder`: thêm `receipts GoodsReceipt[]`
- `Warehouse`: thêm `receipts GoodsReceipt[]`, `issues StockIssue[]`
- `Project`: thêm `stockIssues StockIssue[]`
- `Product`: thêm `receiptItems GoodsReceiptItem[]`, `issueItems StockIssueItem[]`
- `PurchaseOrderItem`: thêm `receiptItems GoodsReceiptItem[]`

## API Routes

### GoodsReceipt
- `GET /api/inventory/receipts?poId=&warehouseId=` — Danh sách phiếu nhập
- `POST /api/inventory/receipts` — Tạo GRN (body: purchaseOrderId, warehouseId, receivedDate, receivedBy, notes, items[])
  - Transaction: tạo GRN + GoodsReceiptItem + update product.stock + tạo InventoryTransaction[] + update PurchaseOrderItem.receivedQty
- `GET /api/inventory/receipts/[id]` — Chi tiết GRN

### StockIssue
- `GET /api/inventory/issues?warehouseId=&projectId=` — Danh sách phiếu xuất
- `POST /api/inventory/issues` — Tạo phiếu xuất (body: warehouseId, projectId, issuedDate, issuedBy, notes, items[])
  - Transaction: tạo StockIssue + StockIssueItem + trừ product.stock + tạo InventoryTransaction[] + validate tồn kho đủ
- `GET /api/inventory/issues/[id]` — Chi tiết phiếu xuất

### PO — Nhận hàng
- `GET /api/purchasing/[id]/receipt-info` — Trả về items PO kèm receivedQty để prefill GRN form

## Giao diện

### `/purchasing/[id]` — trang chi tiết PO
- Thêm section "Lịch sử nhận hàng": danh sách GRN đã tạo từ PO này
- Nút **"+ Nhận hàng"** (hiện khi PO status = "Đã duyệt" hoặc "Một phần")
- Modal nhận hàng:
  - Chọn kho nhập, ngày nhận, người nhận
  - Bảng: Tên SP | ĐVT | SL đặt | Đã nhận | SL nhận lần này (input)
  - Submit → tạo GRN

### `/inventory` — Tab mới

**Tab "Phiếu nhập (GRN)"**
- Filter: kho, tháng
- Bảng: Mã GRN | Ngày | PO | Kho | Số mặt hàng | Người nhận | [Xem] [In]
- Click xem: modal chi tiết danh sách item

**Tab "Phiếu xuất"**
- Nút "+ Tạo phiếu xuất"
- Filter: kho, dự án, tháng
- Bảng: Mã PXK | Ngày | Kho | Dự án | Số mặt hàng | Người lập | [Xem] [In]
- Modal tạo phiếu xuất:
  - Chọn kho, dự án, ngày, người lập
  - Thêm dòng vật tư: chọn sản phẩm (searchable), nhập SL, ĐVT tự điền
  - Hiện tồn kho hiện tại khi chọn sản phẩm
  - Validate: SL xuất ≤ tồn kho

### In phiếu
- Phiếu nhập kho: mã GRN, ngày, tên NCC, kho nhập, bảng hàng (tên, ĐVT, SL đặt, SL nhận, đơn giá), người lập, ký tên
- Phiếu xuất kho: mã PXK, ngày, kho, dự án, bảng hàng (tên, ĐVT, SL, đơn giá), người lập, ký tên
- In qua `window.print()` với CSS print-only, không cần PDF

## generateCode
- `goodsReceipt: '"GoodsReceipt"'` → prefix `PNK`
- `stockIssue: '"StockIssue"'` → prefix `PXK`

## Phân quyền
- Xem: tất cả
- Tạo GRN: `ke_toan`, `pho_gd`, `giam_doc`
- Tạo phiếu xuất: `ke_toan`, `pho_gd`, `giam_doc`, `ky_thuat`

## Không làm (out of scope)
- Workflow duyệt GRN/phiếu xuất
- Khu kiểm tra hàng hoá
- Nhập kho không qua PO (giữ tính năng cũ ở tab Lịch sử)
- Quản lý vị trí trong kho (shelf/bin)
