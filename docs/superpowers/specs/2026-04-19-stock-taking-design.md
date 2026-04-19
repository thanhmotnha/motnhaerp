# Design: Kiểm kê (Stock Taking)

**Date:** 2026-04-19
**Status:** Approved

## Problem

Hệ thống không có module kiểm kê vật lý. Không biết `Product.stock` có khớp tồn thực tế trên kệ hay không. Hiện tại sai số chỉ phát hiện khi xuất kho báo "không đủ" → lúc đó đã muộn.

## Requirements

1. Tạo phiếu kiểm kê linh hoạt: full kho / theo danh mục / spot-check vài SP
2. Snapshot số hệ thống lúc tạo phiếu để so sánh sau khi đếm
3. User nhập số thực, tự tính chênh lệch
4. Có thể save dở nháp, quay lại nhập tiếp
5. Chốt phiếu → auto-update `Product.stock` + tạo `InventoryTransaction` điều chỉnh
6. Chỉ role `ke_toan` hoặc `giam_doc` làm được (1 người làm hết, không 2-step)
7. Có nút in phiếu

## Approach

2 model mới (`StockTaking`, `StockTakingItem`), tab mới "Kiểm kê" trong trang inventory. Luồng 3 bước: tạo phiếu (snapshot) → đếm/nhập → chốt (adjust stock). Không block xuất/nhập trong lúc kiểm kê (cty nhỏ, ít concurrent). Chênh lệch log vào `InventoryTransaction` type "Điều chỉnh" để trace history.

## Design

### 1. Data Model

```prisma
model StockTaking {
  id             String              @id @default(cuid())
  code           String              @unique
  warehouseId    String
  status         String              @default("Nháp")  // Nháp | Hoàn thành
  note           String              @default("")
  createdById    String              @default("")
  createdAt      DateTime            @default(now())
  completedAt    DateTime?

  warehouse      Warehouse           @relation(fields: [warehouseId], references: [id])
  items          StockTakingItem[]

  @@index([warehouseId])
}

model StockTakingItem {
  id             String              @id @default(cuid())
  stockTakingId  String
  productId      String
  systemStock    Int                 // snapshot lúc tạo phiếu
  countedStock   Int?                // null = chưa đếm
  note           String              @default("")

  stockTaking    StockTaking         @relation(fields: [stockTakingId], references: [id], onDelete: Cascade)
  product        Product             @relation(fields: [productId], references: [id])

  @@index([stockTakingId])
  @@index([productId])
}
```

**Product + Warehouse thêm back-relations:**
```prisma
model Product {
  stockTakingItems  StockTakingItem[]
}
model Warehouse {
  stockTakings  StockTaking[]
}
```

**Migration:** ALTER + FK + INDEX tiêu chuẩn. Không backfill (bảng mới rỗng).

### 2. Code generation

Thêm prefix `KK` cho `StockTaking.code` qua `generateCode('stockTaking', 'KK')`.

### 3. API Endpoints

| Method | Path | Mô tả |
|---|---|---|
| `GET /api/stock-takings` | List phiếu kiểm kê (filter status, warehouse) |
| `POST /api/stock-takings` | Tạo phiếu mới. Body: `{ warehouseId, note?, productIds?: string[] }`. Nếu `productIds` rỗng/null → snapshot ALL SP trong kho. Nếu có → chỉ những SP đó. |
| `GET /api/stock-takings/[id]` | Chi tiết phiếu + items |
| `PUT /api/stock-takings/[id]` | Update countedStock + note per item. Body: `{ items: [{ id, countedStock, note }] }`. Lưu nháp. |
| `POST /api/stock-takings/[id]/complete` | Chốt phiếu: update Product.stock cho các item có countedStock, tạo InventoryTransaction type="Điều chỉnh" với code `DC###`, set status="Hoàn thành" |
| `DELETE /api/stock-takings/[id]` | Chỉ xóa được khi status="Nháp" |

Role: `ke_toan`, `giam_doc`.

### 4. UI — Tab "Kiểm kê" trong `/inventory`

**Tab bar thêm:** `📋 Kiểm kê` (cạnh các tab hiện có)

**Danh sách phiếu kiểm kê:**
- Table: Mã | Kho | Ngày tạo | Số SP | Đã đếm | Chênh lệch | Trạng thái | Actions
- Button "+ Tạo phiếu kiểm kê"
- Click row → mở drawer/modal chi tiết

**Form tạo phiếu kiểm kê (modal):**
- Dropdown Kho (bắt buộc)
- Input Ghi chú (tuỳ chọn)
- Section "Chọn SP":
  - Radio: ○ Tất cả SP trong kho / ○ Theo danh mục / ○ Chọn thủ công
  - Nếu "Theo danh mục": multi-select danh mục → auto-expand SP matched
  - Nếu "Chọn thủ công": search + checklist, hiện SP kho đã chọn
  - Hiện số "Sẽ kiểm kê: N SP"
- Nút "Tạo phiếu" → POST, redirect sang modal chi tiết

**Modal chi tiết phiếu kiểm kê (status="Nháp"):**
- Header: mã, kho, ngày, trạng thái
- Summary: `Đã đếm M/N · Chênh lệch: K mã` (K = số item có `countedStock != systemStock`)
- Filter trong phiếu: search SP, filter "Chưa đếm / Có chênh lệch / Tất cả"
- Table:
  - Cột: SP (+ code) | ĐVT | Số hệ thống | Số thực | Chênh lệch | Ghi chú | Clear
  - `Số thực` là input number
  - `Chênh lệch` auto tính: `countedStock - systemStock` (nếu null → "—")
  - Màu: chênh dương xanh, âm đỏ
- Nút "💾 Lưu nháp" — save không chốt (PUT)
- Nút "✅ Chốt phiếu" — confirm dialog "Cập nhật stock cho {K} SP có chênh lệch. SP chưa đếm sẽ bỏ qua. Tiếp tục?" → POST complete

**Modal chi tiết phiếu kiểm kê (status="Hoàn thành"):**
- Read-only
- Table hiện: SP | Hệ thống | Thực tế | Chênh | Delta đã áp dụng
- Nút 🖨️ In phiếu

### 5. In phiếu (print)

Helper `printStockTaking(st)` giống `printReceipt` / `printIssue`:
- Header: `PHIẾU KIỂM KÊ KHO {tên kho}`, mã, ngày
- Table: STT | Tên SP | ĐVT | Số hệ thống | Số thực | Chênh | Ghi chú
- Footer: chữ ký Người lập / Thủ kho / Kế toán

### 6. Error Handling & Edge Cases

1. **Tạo phiếu khi kho không có SP nào**: reject → "Kho không có SP nào để kiểm kê"
2. **Chốt phiếu khi chưa đếm SP nào**: reject → "Nhập ít nhất 1 SP trước khi chốt" (bảo vệ user lỡ tay)
3. **Xuất/nhập kho đang lúc phiếu nháp tồn tại**: không block — nhưng `systemStock` snapshot không đổi. Khi chốt, `Product.stock = countedStock` sẽ覆 số live. User biết tự loại trừ giao dịch phát sinh trong kỳ.
4. **Nhiều phiếu cùng kho cùng lúc**: cho phép (hiếm xảy ra ở cty nhỏ)
5. **SP bị xóa sau khi tạo phiếu**: phiếu giữ `stockTakingItem` với productId orphan — UI hiện tên "(Đã xóa)", không update stock cho item đó khi chốt
6. **Delete phiếu Nháp**: cascade xóa StockTakingItem. Phiếu Hoàn thành → block delete

### 7. Files to Change

| File | Nội dung |
|---|---|
| `prisma/schema.prisma` | + 2 model + back-relations Product/Warehouse |
| `prisma/migrations/YYYYMMDDHHMMSS_stock_taking/migration.sql` | ALTER tables + FK + INDEX |
| `lib/validations/stockTaking.js` | **Mới** — Zod schema cho create + update |
| `app/api/stock-takings/route.js` | **Mới** — GET list + POST create |
| `app/api/stock-takings/[id]/route.js` | **Mới** — GET chi tiết + PUT update + DELETE |
| `app/api/stock-takings/[id]/complete/route.js` | **Mới** — POST chốt phiếu |
| `app/inventory/page.js` | Thêm tab "Kiểm kê" + list + modal tạo + modal chi tiết + printStockTaking helper |

## Out of Scope (MVP)

- Không lock warehouse trong thời gian kiểm kê
- Không 2-step approval
- Không barcode/QR scan
- Không cyclic count scheduling tự động
- Không ABC classification
- Không import/export Excel (user nhập tay)
- Không snapshot cost/valuation của chênh lệch (chỉ quantity)
