# Design: Product Home Warehouse (Stock per Kho)

**Date:** 2026-04-18
**Status:** Approved

## Problem

Hệ thống có 2 kho (Kho Ngô Hùng + Kho Xưởng) nhưng `Product.stock` là số global duy nhất. Không biết SP đang nằm ở kho nào, không nhóm được tồn kho theo kho, xuất/nhập kho không biết chọn kho nào cho đúng.

**Thực tế vận hành:** mỗi SP chỉ ở 1 kho cố định (không split giữa 2 kho). Phụ kiện/nội thất ở Kho Ngô Hùng, ván (MDF/Acrylic/Sàn gỗ) ở Kho Xưởng. Hiện tất cả SKU đang ngầm hiểu là Kho Ngô Hùng.

## Requirements

1. Mỗi `Product` có 1 "kho mặc định" (`warehouseId`) — là kho duy nhất chứa SP đó
2. Tồn kho hiển thị nhóm theo **Kho → Danh mục → SP** với filter chọn kho
3. Form Nhập/Xuất kho tự fill kho theo SP, không cho đổi thủ công
4. Nếu 1 phiếu có SP từ 2 kho khác nhau → cảnh báo tách phiếu
5. Tạo SP mới: mặc định Kho Ngô Hùng; auto-switch sang Kho Xưởng nếu category thuộc "ván"
6. Chuyển kho (WarehouseTransfer) phải update `Product.warehouseId` khi approve
7. Backfill tất cả SP hiện có → Kho Ngô Hùng

## Approach

Giữ `Product.stock` là global (1 SP = 1 kho → stock tổng = stock kho đó). Thêm field `warehouseId` làm "home warehouse" pointer. Không tạo bảng `WarehouseStock` vì overkill với use case này.

Logic business: xuất/nhập luôn qua kho của SP; không có SP lưu ở nhiều kho.

## Design

### 1. Data Model

```prisma
model Product {
  // ... existing fields
  warehouseId  String?
  warehouse    Warehouse?  @relation(fields: [warehouseId], references: [id])
  @@index([warehouseId])
}

model Warehouse {
  // thêm back-relation
  products     Product[]
}
```

**Migration:**
```sql
ALTER TABLE "Product" ADD COLUMN "warehouseId" TEXT;
CREATE INDEX "Product_warehouseId_idx" ON "Product"("warehouseId");
ALTER TABLE "Product"
  ADD CONSTRAINT "Product_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: tất cả SP hiện có → Kho Ngô Hùng (assumed code='KHO01')
UPDATE "Product" SET "warehouseId" = (SELECT id FROM "Warehouse" WHERE code = 'KHO01' LIMIT 1)
WHERE "warehouseId" IS NULL;
```

### 2. Tạo / Sửa SP (Products form)

Thêm dropdown **"Kho"** trong form (Products page — modal edit/create):
- Options: "Kho Ngô Hùng", "Kho Xưởng"
- Default khi create: Kho Ngô Hùng
- **Auto-switch logic** (client-side): khi user chọn `category` thuộc set `['MDF AC', 'MDF Thái', 'Acrylic', 'Sàn gỗ AC']` → auto-set dropdown Kho sang Kho Xưởng (nhưng vẫn cho user override)
- Required: không cho submit nếu chưa chọn Kho

API validation: `Product.warehouseId` không optional khi create/update (reject null).

### 3. Tồn kho hiện tại (app/inventory/page.js — TAB stock)

API `/api/inventory/stock` trả thêm `warehouseId + warehouseName` trong `products[]`.

UI:
- **Filter bar thêm dropdown "Kho"**: `Tất cả kho | Kho Ngô Hùng | Kho Xưởng`
- **Group 2 cấp**: ngoài cùng là Kho, trong là Danh mục
- Header mỗi kho: `🏭 {tên kho}` + số mã + tổng giá trị (`fmt(sum stock*importPrice)`)
- Cấu trúc render: `Object.entries(stockByWarehouse).map(([whName, products]) => { ... Object.entries(byCategory).map(...) })`

### 4. Nhập / Xuất kho modal (app/inventory/page.js)

**Form "+ Nhập/Xuất kho"** (top button):
- Dropdown "Kho" vẫn có nhưng:
  - Khi user pick SP đầu tiên → auto-fill Kho theo `product.warehouseId` + disable dropdown
  - Validate: tất cả SP trong form phải cùng `warehouseId`; nếu khác → cảnh báo đỏ "SP phải cùng kho — tách thành 2 phiếu riêng"

**Form "+ Tạo phiếu xuất"** (StockIssue):
- Tương tự: pick SP → auto-fill Kho

**Form Nhận hàng PO** (Task 7 đã làm): vẫn hoạt động, vì receive API nhận `warehouseId` từ client. Sẽ để như cũ — user chọn kho thủ công ở tab "🏭 Vào kho".

### 5. API `/api/inventory/stock`

Thêm `warehouse: { select: { id: true, name: true } }` vào include. Trả về `products[]` có `warehouseId` + `warehouseName`.

### 6. Chuyển kho (WarehouseTransfer approve)

File: `app/api/warehouses/transfers/[id]/approve/route.js`

Sau khi tạo 2 InventoryTransaction (OUT + IN), thêm:
```javascript
await tx.product.update({
    where: { id: productId },
    data: { warehouseId: toWarehouseId }
});
```

Vì 1 SP chỉ ở 1 kho, chuyển kho = đổi `Product.warehouseId`.

### 7. Ra validation server-side

- `POST /api/inventory` (Nhập/Xuất kho): items[] phải cùng `warehouseId` với `data.warehouseId`. Nếu lệch → 400.
- `POST /api/inventory/issues` (StockIssue): same.
- `POST /api/inventory/receipts` (GRN từ PO): giữ linh hoạt, không bắt buộc (vì đang support nhận về kho bất kỳ).

## Files to Change

| File | Nội dung |
|---|---|
| `prisma/schema.prisma` | + `warehouseId` + relation trên Product, + back-relation trên Warehouse |
| `prisma/migrations/YYYYMMDDHHMMSS_product_home_warehouse/migration.sql` | ALTER + FK + index + backfill UPDATE |
| `lib/validations/product.js` | `warehouseId` required trong createSchema |
| `app/api/products/route.js` + `[id]/route.js` | Persist warehouseId |
| `app/products/page.js` | Dropdown Kho trong form create/edit, auto-switch theo category |
| `app/api/inventory/stock/route.js` | Include warehouse |
| `app/inventory/page.js` | Filter kho + group 2 cấp + auto-fill kho trong Nhập/Xuất modal |
| `app/api/inventory/route.js` | Validate items cùng kho |
| `app/api/inventory/issues/route.js` | Validate items cùng kho |
| `app/api/warehouses/transfers/[id]/approve/route.js` | Update Product.warehouseId khi approve |

## Error Handling & Edge Cases

1. **SP không có warehouseId** sau backfill (race với SP mới tạo song song lúc migration): fallback UI hiện "Chưa gán kho" badge đỏ, cho phép edit
2. **Form Nhập/Xuất pick SP từ 2 kho**: cảnh báo UI + block submit
3. **Import SP hàng loạt qua Excel/seed script**: schema cần có warehouseId → nhóm default logic trong validations
4. **Chuyển kho approve**: transaction tính cả update `Product.warehouseId` để rollback nếu fail
5. **PO Giao thẳng dự án**: không đụng kho (đã làm đúng trong Task 5), giữ nguyên
6. **Kho xóa** (hiếm): FK `ON DELETE SET NULL` — SP bị orphan warehouseId, UI hiện badge "Chưa gán kho"

## Out of Scope

- Split 1 SP cho nhiều kho (không có trong thực tế user)
- Bảng `WarehouseStock` riêng
- Per-warehouse pricing / cost
- Mobile barcode scan để xuất nhanh
- Kiểm kê (đợt 3 brainstorm riêng)
