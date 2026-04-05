# Tạo PO từ Báo giá — Design Spec

## Mục tiêu

Cho phép kế toán/quản lý tạo nhiều PO cùng lúc từ danh sách sản phẩm trong báo giá, chia theo nhà cung cấp (Hà Nội / Trung Quốc / ...), rồi in phiếu yêu cầu mua hàng cho từng bộ phận.

## Điểm truy cập

1. `/purchasing` → nút **"Tạo PO từ Báo giá"** (cạnh nút "+ Tạo PO")
2. `/projects/[id]` tab Mua hàng → nút tương tự (projectId được prefill)

## Luồng 2 bước (modal)

### Bước 1: Chọn báo giá & điều chỉnh số lượng

- Dropdown chọn **Dự án** (tuỳ chọn, nếu vào từ project thì prefill)
- Dropdown chọn **Báo giá** (lọc theo dự án, chỉ hiện báo giá có `projectId` và có QuotationItem gắn `productId`)
- Bảng sản phẩm từ báo giá:
  - Checkbox chọn | Tên SP | ĐVT | **SL** (pre-fill từ BG, chỉnh được) | Đơn giá (từ BG)
  - Checkbox "Chọn tất cả"
- Chỉ hiện sp có `productId` (sp gắn với product trong hệ thống)
- Nút **Tiếp theo →** (phải chọn ≥1 sp)

### Bước 2: Gán NCC & preview

- Bảng: Tên SP | Dropdown **NCC** (chọn từ `Supplier`)
- NCC được nhớ lại theo `productId` trong session (nếu sp trước đã chọn cùng NCC thì auto-fill)
- **Ngày giao hàng chung** (date input, optional)
- **Preview tự động** nhóm theo NCC:
  ```
  📦 NCC Hà Nội ABC  →  2 sản phẩm  →  tổng 3.200.000
  📦 Cty TQ XYZ      →  1 sản phẩm  →  tổng 1.440.000
  ```
- Nút **← Quay lại** | **Tạo N PO ✓**

### Sau khi tạo

- Toast "Đã tạo N PO thành công"
- Hiện danh sách PO vừa tạo (mã PO, NCC, tổng)
- Nút **In từng PO** (mở print popup từng PO) | **In tổng hợp** (1 tờ gộp tất cả)

## Data Model

Thêm 1 field vào `PurchaseOrder`:
```prisma
quotationId  String?
quotation    Quotation? @relation(fields: [quotationId], references: [id])
```

Thêm back-relation vào `Quotation`:
```prisma
purchaseOrders PurchaseOrder[]
```

## API

### GET /api/quotations/[id]/po-items
Trả về QuotationItem gắn `productId` kèm thông tin product:
```json
[{
  "id": "...",
  "name": "Tủ bếp dưới",
  "productId": "...",
  "unit": "m²",
  "quantity": 2.5,
  "volume": 2.5,
  "unitPrice": 850000
}]
```
Logic: lấy `quantity` nếu > 0, fallback về `volume`. Trả về flat list (không phân category).

### POST /api/purchase-orders/bulk-from-quotation
Body:
```json
{
  "quotationId": "...",
  "projectId": "...",
  "deliveryDate": "2026-04-20",
  "groups": [
    {
      "supplierId": "...",
      "supplierName": "NCC Hà Nội ABC",
      "items": [
        { "productId": "...", "productName": "Tủ bếp dưới", "unit": "m²", "quantity": 2.5, "unitPrice": 850000 }
      ]
    }
  ]
}
```
Logic (trong `prisma.$transaction`):
1. Với mỗi group → `generateCode('purchaseOrder', 'PO')` → tạo `PurchaseOrder` với `supplierId`, `supplier = supplierName`, `quotationId`, `projectId`, `deliveryDate`, `status = 'Nháp'`
2. Tạo `PurchaseOrderItem[]` cho PO đó
3. Tính `totalAmount = sum(quantity * unitPrice)` → update PO
4. Trả về mảng PO vừa tạo (kèm items)

## Giao diện in

### In từng PO
Reuse print popup hiện có của PO (window.open + CSS print).

### In tổng hợp
Popup mới:
- Header: **YÊU CẦU MUA HÀNG**
- Dự án: DA-001 | Báo giá: BG-001 | Ngày: ...
- Chia theo từng NCC (mỗi NCC 1 bảng):
  - Bảng: # | Tên SP | ĐVT | SL | Đơn giá | Thành tiền
  - Tổng tiền NCC đó
- Tổng cộng tất cả
- Footer ký tên: Người lập | Kế toán | Giám đốc

## Phân quyền
- Tạo PO từ BG: `ke_toan`, `pho_gd`, `giam_doc` (giống tạo PO thường)
- Xem: tất cả

## Không làm (out of scope)
- Nhớ NCC theo sp qua các session (chỉ nhớ trong session hiện tại)
- Workflow duyệt riêng cho PO tạo từ BG (dùng flow duyệt PO hiện có)
- Cho chọn sp không có productId (sp tự do)
