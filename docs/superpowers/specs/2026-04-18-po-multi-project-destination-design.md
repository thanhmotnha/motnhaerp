# Design: PO — Giao Nhiều Dự Án & Báo Cáo Vật Tư Dự Án

**Date:** 2026-04-18
**Status:** Approved

## Problem

Một Purchase Order có thể chia nhiều dự án/công trình khác nhau ngay từ lúc đặt. Hệ thống hiện tại chỉ cho 1 destination cho cả PO (toggle "Giao dự án / Nhập kho" ở PO-level, `PO.projectId` là 1 dự án duy nhất).

Hệ quả:
- Form "Nhận hàng" vẫn bắt chọn "Kho nhập" kể cả với PO giao thẳng dự án (bug: frontend bỏ qua `deliveryType`, luôn gọi `/api/inventory/receipts`).
- Không xem được tổng hợp vật tư ở cấp dự án (đã đặt bao nhiêu, đã nhận, đã xuất kho, còn thiếu).
- Không thể chia 1 PO thành: "ván này vào kho, ván kia giao thẳng DA-001, ván nọ giao DA-002".

## Requirements

1. **Mỗi dòng PO có destination riêng** — mỗi `PurchaseOrderItem` đi 1 nơi duy nhất (kho hoặc 1 dự án cụ thể), không chia 1 dòng cho nhiều nơi.
2. **3 mode tạo PO**:
   - `🏭 Nhập kho` — tất cả items vào kho
   - `📍 Giao 1 dự án` — tất cả items về cùng 1 dự án (mode mặc định, nhanh)
   - `⚙️ Chia nhiều dự án` — per-item destination
3. **Form Nhận hàng tự nhóm theo đích** — section "Vào kho" + các section "Giao DA-XXX". Không bắt chọn kho toàn cục.
4. **Tab "Vật tư" dự án** hiển thị báo cáo tổng hợp 4 cột: Dự toán / Đã đặt / Đã nhận / Đã dùng / Còn thiếu, gộp data từ giao thẳng + xuất kho.
5. **Backward compatible** — PO cũ với `deliveryType='Giao thẳng dự án'` không bị hỏng; migration backfill `PurchaseOrderItem.projectId`.

## Approach

**Frontend-first mindset:** mode toggle giữ nhanh cho case thường (99% PO về 1 đích), mode "chia" mở khi cần.

**Backend:** thêm 1 field `projectId` trên `PurchaseOrderItem`. Giữ `PurchaseOrder.projectId` làm "dự án chính/nhãn" (vẫn dùng cho badge PO). Giữ `PurchaseOrder.deliveryType` column để không break dữ liệu cũ, nhưng deprecate khỏi UI.

**Receive:** refactor `/api/purchase-orders/[id]/receive` để handle mixed payload (items có và không có projectId) trong 1 transaction.

**Report:** API mới `/api/projects/[id]/materials-report` gộp 4 nguồn, xử lý server-side để tránh nhiều round-trips.

## Design

### 1. Data Model

Thay đổi schema:

```prisma
model PurchaseOrderItem {
  // ... các field hiện có
  projectId   String?    // null = vào kho, set = giao thẳng dự án
  project     Project?   @relation(fields: [projectId], references: [id])
  @@index([projectId])
}
```

PO-level fields:
- `PurchaseOrder.projectId` — **giữ**, vai trò "dự án chính/dominant" (hiển thị badge PO). Không còn là source of truth cho destination.
- `PurchaseOrder.deliveryType` — **deprecate**, giữ column để không break data cũ, ẩn khỏi UI.

Migration:
```sql
ALTER TABLE "PurchaseOrderItem" ADD COLUMN "projectId" TEXT;
CREATE INDEX "PurchaseOrderItem_projectId_idx" ON "PurchaseOrderItem"("projectId");

-- Backfill: PO "Giao thẳng dự án" cũ → copy xuống items
UPDATE "PurchaseOrderItem" poi
SET "projectId" = po."projectId"
FROM "PurchaseOrder" po
WHERE poi."purchaseOrderId" = po.id
  AND po."deliveryType" = 'Giao thẳng dự án'
  AND po."projectId" IS NOT NULL;
```

Không đụng: `Warehouse`, `GoodsReceipt`, `MaterialPlan`, `StockIssue`, `Product`.

### 2. UX — Tạo PO

Toggle 3 mode ở đầu form:

```
Loại giao:  [ 🏭 Nhập kho ]  [ 📍 Giao 1 dự án ]  [ ⚙️ Chia nhiều dự án ]
```

**Mode 1 — 🏭 Nhập kho:** không show cột "Giao đến"; tất cả items lưu với `projectId = null`.

**Mode 2 — 📍 Giao 1 dự án (mặc định):** show dropdown "Dự án:" dưới toggle; tất cả items tự động set `projectId = dự án đã chọn` khi lưu.

**Mode 3 — ⚙️ Chia nhiều dự án:** show cột "Giao đến" trong bảng items. Dropdown mỗi dòng:
- `🏭 Kho chính` (default)
- `🏭 Kho phụ` (nếu có >1 kho)
- separator
- `📍 DA-001 — Nhà anh A` (chỉ dự án status ≠ "Hoàn thành")
- ...

Nút **"↓ Áp dụng xuống"** cạnh dropdown dòng đầu: copy lựa chọn xuống các dòng dưới.

Validation: không bắt buộc dòng nào phải có dự án. Tất cả trống = PO vào kho hết (tương đương mode 1).

**Switch mode giữa chừng:**
- 1 → 2: giữ items, mở dropdown dự án
- 2 → 3: tất cả dòng đang là dự án đó, user sửa từng dòng nếu cần
- 3 → 1/2: cảnh báo "Các dự án đã chọn theo dòng sẽ bị thay đổi", yêu cầu xác nhận

### 3. UX — Nhận hàng

Form "Nhận hàng — PO###" tự động nhóm items theo `projectId`:

**Case A — PO thuần 1 đích (tất cả cùng projectId hoặc cùng vào kho):**

```
┌─ Nhận hàng — PO012 ─────────────────────────┐
│ NCC: Ván Bích Ngũ  |  Dự án: DA-011         │
│                                              │
│ 📍 Giao thẳng công trình DA-011             │
│ (không qua kho)                              │
│                                              │
│ | Sản phẩm    | ĐVT | Đặt | Đã nhận | Nhận lần này |
│ | Ván 6mm    | Tấm | 2  |   0    | [  0  ]       |
│                                              │
│ Người nhận: [___]  Ngày: [___]               │
│                            [Hủy] [Nhận hàng] │
└──────────────────────────────────────────────┘
```

- Nếu tất cả vào kho → header "🏭 Vào kho" + dropdown Kho (Kho chính/phụ)
- Nếu tất cả 1 dự án → header "📍 Giao thẳng công trình DA-xxx", không có field kho

**Case B — PO mixed (mode 3):**

```
┌─ Nhận hàng — PO012 ──────────────────────────┐
│                                               │
│ 🏭 Vào kho                [Kho chính    ▼]   │
│ | Ván 6mm  | Tấm | 10 | 0 | [ 0 ]           │
│                                               │
│ 📍 Giao DA-001 — Nhà A                       │
│ | Ván 17mm | Tấm | 20 | 0 | [ 0 ]           │
│                                               │
│ 📍 Giao DA-002 — Biệt thự B                  │
│ | Ván MS   | Tấm |  5 | 0 | [ 0 ]           │
│                                               │
│ Người nhận: [___]  Ngày: [___]                │
│                            [Hủy] [Nhận hàng] │
└───────────────────────────────────────────────┘
```

Mỗi nhóm là 1 section có header riêng. Kho: dropdown chọn kho; Dự án: không cần chọn, đã biết từ `POItem.projectId`.

Submit 1 nhát → backend routing trong 1 transaction:
- Items có `projectId = null` + warehouseId đã chọn → tạo `GoodsReceipt` + `GoodsReceiptItem` + update `Product.stock` (như flow cũ)
- Items có `projectId` → update `MaterialPlan.receivedQty` + tạo `ProjectExpense` (như flow `deliveryType='Giao thẳng dự án'` cũ)

Cho phép nhận từng phần — mỗi section tự theo dõi `receivedQty`, lần sau mở lại "Đã nhận" update đúng.

### 4. Báo cáo Vật tư ở trang Dự án

Tab "Vật tư" ([app/projects/[id]/tabs/MaterialTab.js](app/projects/[id]/tabs/MaterialTab.js)) rewrite thành báo cáo tổng hợp.

**Top stat cards** (5 card):
- 📋 Dự toán (tổng từ MaterialPlan / Quotation BOM)
- 🛒 Đã đặt (POItem cho dự án này)
- 📦 Đã nhận (GT + XK)
- 🔧 Đã dùng (StockIssue + GT coi như đã dùng)
- 💰 Chi phí (ProjectExpense)

**Filter:**
- Danh mục SP (Ván / Đinh / Sơn...)
- Nguồn: Tất cả / Chỉ giao thẳng / Chỉ xuất kho

**Table:**

| Cột | Data source |
|---|---|
| Sản phẩm | `Product.name` |
| ĐVT | `Product.unit` |
| Dự toán | `MaterialPlan.quantity` (hoặc Quotation BOM) |
| Đã đặt | `PurchaseOrderItem.quantity` WHERE `projectId = this` (giao thẳng) — **lưu ý**: PO "Nhập kho" không tính vào đây |
| Đã nhận | `MaterialPlan.receivedQty` + SUM(`StockIssueItem.qty`) WHERE issue.projectId = this |
| Đã dùng | SUM(`StockIssueItem.qty`) (xuất kho = đã dùng) + `MaterialPlan.receivedQty` (giao thẳng mặc định coi là đã dùng ngay vì không qua kho) |
| Còn thiếu | Dự toán - Đã nhận (âm = dư) |
| Nguồn | Badge: `📍 GT` / `🏭 XK` / `📍+🏭` |

**Click row** → drawer/modal expand hiện chi tiết:
- List PO đã đặt (link)
- List GoodsReceipt (link)
- List StockIssue (link)
- Timeline: đặt → nhận → dùng

**Export:** nút "📤 Xuất Excel" (CSV/XLSX). Nút "🖨 In" in HTML friendly.

### 5. API

| Endpoint | Thay đổi |
|---|---|
| `POST /api/purchase-orders` | Accept `items[].projectId` (optional); validate projectId exists + not deleted |
| `PUT /api/purchase-orders/[id]` | Same. Block nếu `PO.status !== 'Chờ duyệt'` và có items đã có GRN |
| `POST /api/purchase-orders/[id]/receive` | Refactor: accept `{ items: [{ itemId, qty, warehouseId? }], receivedBy, receivedDate, notes }`. Branch theo `item.projectId` trong 1 `$transaction`. Auto-create `MaterialPlan` nếu chưa có (fallback). |
| `GET /api/projects/[id]/materials-report` | **Mới**. Return `{ summary: { planned, ordered, received, used, cost }, items: [{ productId, name, unit, planned, ordered, receivedDirect, receivedFromStock, used, sources: ['GT'/'XK'/'GT+XK'] }] }` |

Old `POST /api/inventory/receipts` (warehouse-only flow) — giữ lại cho compatibility, nhưng frontend form Nhận hàng không còn gọi trực tiếp. Backend `/receive` có thể gọi nội bộ.

### 6. Error Handling & Edge Cases

1. **Đổi mode PO sau khi đã có GRN** → disable toggle mode khi `PO.status !== 'Chờ duyệt'`
2. **Xóa PO có items đã nhận** → block, yêu cầu xóa GRN/receipt trước (existing behavior)
3. **Dự án đã xóa** sau khi PO đã tạo:
   - Dropdown list dự án filter `deletedAt: null`
   - Badge hiển thị tên DA vẫn work (query include soft-deleted cho read-only)
4. **Nhận quá số lượng đặt** — giữ behavior hiện tại (warning, không block)
5. **`MaterialPlan` chưa tồn tại khi nhận giao thẳng** — auto-create MaterialPlan với `quantity = 0, receivedQty = qty nhận` để không lỗi
6. **Concurrent receive** — dùng `$transaction` + row-level lock qua Prisma
7. **Mode switch data loss** — confirm dialog trước khi clear per-item projectId

### 7. Testing

**Manual test path:**
1. Tạo PO mode 3: 3 dòng — 1 vào kho, 1 DA-001, 1 DA-002. Lưu → kiểm data: `POItem.projectId` đúng
2. Mở form Nhận hàng → thấy 3 section riêng biệt
3. Nhập số nhận từng section → submit → kiểm:
   - Product.stock của dòng kho += số nhận
   - MaterialPlan.receivedQty của DA-001/DA-002 += số nhận
   - 3 ProjectExpense được tạo cho giao thẳng
4. Vào trang DA-001 tab "Vật tư" → thấy ván 17mm với nguồn `📍 GT`, số "Đã nhận" = số nhận
5. Tạo StockIssue xuất ván từ kho cho DA-001 → tab "Vật tư" DA-001 thấy ván đó với nguồn `🏭 XK`
6. Migration backfill: kiểm PO cũ `deliveryType='Giao thẳng dự án'` → `items.projectId` đã được set

## Files to Change

| File | Nội dung |
|---|---|
| `prisma/schema.prisma` | + `projectId` + relation + index trên `PurchaseOrderItem` |
| `prisma/migrations/YYYYMMDDHHMMSS_po_item_project_id/migration.sql` | ALTER + backfill |
| `lib/validations/purchaseOrder.js` | items[].projectId optional |
| `app/purchasing/page.js` | Toggle 3 mode + cột "Giao đến" + nút "↓ Áp dụng xuống" + form Nhận hàng nhóm theo đích |
| `app/api/purchase-orders/route.js` | POST accept projectId per item |
| `app/api/purchase-orders/[id]/route.js` | PUT accept projectId per item, block khi có GRN |
| `app/api/purchase-orders/[id]/receive/route.js` | Refactor mixed receive |
| `app/projects/[id]/tabs/MaterialTab.js` | Rewrite thành báo cáo tổng hợp |
| `app/api/projects/[id]/materials-report/route.js` | **Mới** |

## Out of Scope

- Sản xuất nội bộ cho dự án (`Product.supplyType='Sản xuất nội bộ'`) — spec riêng
- Export PDF báo cáo vật tư (chỉ Excel trước)
- Mobile UX cho form nhận hàng
- 1 dòng PO chia cho nhiều dự án (`PurchaseOrderItemAllocation` — user đã xác nhận không cần)
- Transfer giữa kho ↔ kho (không liên quan)
