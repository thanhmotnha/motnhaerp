# Furniture Production Module Design

**Date:** 2026-04-10  
**Status:** Approved

## Overview

Module quản lý đơn hàng sản xuất nội thất (ván/nẹp/acrylic) song song với dự án xây dựng. Một FurnitureOrder thuộc một Project (optional), đi qua vòng đời từ xác nhận → CNC → đặt vật liệu → sản xuất → nghiệm thu → bàn giao.

---

## 1. Data Model

### FurnitureOrder

Đơn hàng sản xuất nội thất, có thể link hoặc không link Project.

```
FurnitureOrder {
  id            String   @id @default(cuid())
  code          String   @unique   // NT-001
  name          String
  projectId     String?            // optional FK → Project
  quotationId   String?            // optional FK → Quotation
  status        String   @default("draft")
  notes         String?
  cncUploadedAt DateTime?
  cncPieceCount Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  deletedAt     DateTime?          // soft delete

  project       Project?  @relation(...)
  quotation     Quotation? @relation(...)
  cncFiles      FurnitureCncFile[]
  materialSelections FurnitureMaterialSelection[]
  acceptanceCertificates AcceptanceCertificate[]
  purchaseOrders PurchaseOrder[]
}
```

**Workflow states:**
```
draft → confirmed → cnc_ready → material_ordered → in_production → installing → completed
```

---

### FurnitureCncFile

File CNC (DXF/PDF) upload lên R2.

```
FurnitureCncFile {
  id               String   @id @default(cuid())
  furnitureOrderId String
  fileName         String
  fileUrl          String   // R2 URL
  pieceCount       Int      @default(0)
  notes            String?
  uploadedAt       DateTime @default(now())

  furnitureOrder   FurnitureOrder @relation(...)
}
```

---

### FurnitureMaterialSelection

Một selection per material type per FurnitureOrder. Status tự cập nhật khi GRN nhận hàng.

```
FurnitureMaterialSelection {
  id               String   @id @default(cuid())
  furnitureOrderId String
  materialType     String   // VAN | NEP | ACRYLIC
  purchaseOrderId  String?  // FK → PurchaseOrder khi đã tạo PO
  status           String   @default("DRAFT")  // DRAFT | ORDERED | RECEIVED
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  furnitureOrder   FurnitureOrder @relation(...)
  purchaseOrder    PurchaseOrder? @relation(...)
  items            FurnitureMaterialItem[]
}
```

---

### FurnitureMaterialItem

Dòng vật liệu trong một selection (nhập tay, ước lượng chỉ tham khảo).

```
FurnitureMaterialItem {
  id                  String   @id @default(cuid())
  materialSelectionId String
  name                String
  colorCode           String?
  imageUrl            String?  // R2 URL
  thickness           Float?   // mm
  quantity            Float    @default(0)
  unit                String?  // tờ / mét
  unitPrice           Float    @default(0)
  notes               String?

  materialSelection   FurnitureMaterialSelection @relation(...)
}
```

---

### AcceptanceCertificate

Biên bản nghiệm thu, có thể import items từ Quotation hoặc nhập tay.

```
AcceptanceCertificate {
  id               String   @id @default(cuid())
  code             String   @unique   // BB-001
  furnitureOrderId String
  quotationId      String?
  status           String   @default("DRAFT")  // DRAFT | SENT | SIGNED
  publicToken      String?  @unique            // UUID for customer URL
  customerName     String?
  customerSignatureUrl String?
  signedAt         DateTime?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  furnitureOrder   FurnitureOrder @relation(...)
  quotation        Quotation? @relation(...)
  items            AcceptanceCertificateItem[]
}
```

---

### AcceptanceCertificateItem

```
AcceptanceCertificateItem {
  id            String   @id @default(cuid())
  certificateId String
  itemName      String
  quantity      Float
  unit          String?
  amount        Float    @default(0)
  acceptedAt    DateTime?
  notes         String?

  certificate   AcceptanceCertificate @relation(...)
}
```

---

### PurchaseOrder — 2 field mới

```
// Thêm vào model PurchaseOrder hiện có:
furnitureOrderId  String?   // FK → FurnitureOrder
materialType      String?   // VAN | NEP | ACRYLIC
```

---

## 2. UI / Pages

### `/noi-that` — Danh sách FurnitureOrder

- Bảng: code, tên, project, status badge, ngày tạo
- Filter theo project, status
- Nút "Tạo đơn hàng mới"

### Project tab "🪵 Nội thất"

Thêm tab vào `/projects/[id]` — danh sách FurnitureOrder của project đó, nút "Tạo đơn nội thất".

### `/noi-that/[id]` — Detail (4 tab)

**Tab 1: Tổng quan**
- Step indicator workflow (7 bước)
- Thông tin: tên, project, báo giá link, ghi chú
- Action button động theo status hiện tại:
  - `draft` → "Xác nhận đơn hàng"
  - `confirmed` → "Đã có file CNC" (→ cnc_ready)
  - `cnc_ready` → disabled (chờ tạo PO vật liệu)
  - `material_ordered` → disabled (chờ nhận hàng tự động)
  - `in_production` → "Bắt đầu lắp đặt"
  - `installing` → "Tạo biên bản nghiệm thu"
  - `completed` → readonly

**Tab 2: File CNC**
- Upload DXF/PDF → R2
- Bảng: tên file, số tấm, ghi chú, download link
- Tổng số tấm cộng tự động
- Nút "Xác nhận CNC hoàn tất" → `POST /api/furniture-orders/[id]/confirm-cnc` → status `cnc_ready`

**Tab 3: Vật liệu & Đặt hàng**
- 3 section accordion: Ván sản xuất / Nẹp chỉ / Cánh Acrylic
- Mỗi section:
  - Bảng nhập tay: tên, mã màu, ảnh (upload), độ dày, SL, ĐVT, đơn giá, thành tiền
  - Add/delete dòng
  - Nút "Tạo PO đặt hàng" → mở modal PO thường prefill items, save với `furnitureOrderId` + `materialType`
  - Badge trạng thái: DRAFT / ORDERED / RECEIVED
- Khi tất cả 3 section = ORDERED → status tự thành `material_ordered`
- Khi tất cả 3 section = RECEIVED → status tự thành `in_production`

**Tab 4: Nghiệm thu & Bàn giao**
- Tạo biên bản mới (import từ báo giá hoặc nhập tay)
- Bảng items: hạng mục, SL, ĐVT, thành tiền, ngày nghiệm thu
- Nút "In biên bản" → PDF
- Nút "In bảng quyết toán" → PDF tổng hợp
- Nút "Gửi link cho khách" → tạo publicToken → URL `/public/acceptance/[token]`
- Hiển thị trạng thái: DRAFT / SENT / SIGNED + ngày ký

### `/public/acceptance/[token]` — Trang public cho khách

- Không cần đăng nhập
- Hiển thị: tên công trình, danh sách hạng mục với checkbox nghiệm thu
- Signature pad hoặc upload ảnh chữ ký
- Nút "Xác nhận và ký tên" → `POST /api/public/acceptance/[token]/sign`
- Sau ký: hiển thị confirmation + ngày ký

---

## 3. API Routes

```
# FurnitureOrder CRUD
GET    /api/furniture-orders                           danh sách, filter projectId/status
POST   /api/furniture-orders                           tạo mới
GET    /api/furniture-orders/[id]                      detail với relations
PUT    /api/furniture-orders/[id]                      update
DELETE /api/furniture-orders/[id]                      soft delete

# CNC Files
POST   /api/furniture-orders/[id]/cnc-files            upload file R2 + tạo FurnitureCncFile
DELETE /api/furniture-orders/[id]/cnc-files/[fid]      xóa file R2 + record
POST   /api/furniture-orders/[id]/confirm-cnc          status → cnc_ready, set cncUploadedAt + cncPieceCount

# Materials
GET    /api/furniture-orders/[id]/materials            get 3 selections + items
PUT    /api/furniture-orders/[id]/materials/[type]     upsert selection items (VAN|NEP|ACRYLIC)
POST   /api/furniture-orders/[id]/materials/[type]/create-po
       → tạo PO thường với items prefilled, furnitureOrderId + materialType set
       → update FurnitureMaterialSelection.purchaseOrderId + status = ORDERED
       → check nếu cả 3 ORDERED → FurnitureOrder.status = material_ordered

# Acceptance Certificate
GET    /api/furniture-orders/[id]/acceptance           get certificates
POST   /api/furniture-orders/[id]/acceptance           tạo certificate mới
PUT    /api/furniture-orders/[id]/acceptance/[aid]     update items/status
POST   /api/furniture-orders/[id]/acceptance/[aid]/send
       → generate publicToken (UUID) → status = SENT

# Public (no auth)
GET    /api/public/acceptance/[token]                  get certificate data
POST   /api/public/acceptance/[token]/sign             save signature + signedAt → status = SIGNED

# Sidebar item
/noi-that → menu "🪵 Nội thất" (roles: giam_doc, ky_thuat, kho)
```

**GRN auto-update hook** (trong `/api/purchase-orders/[id]/receive` khi tạo GRN):
```
IF PurchaseOrder.furnitureOrderId IS NOT NULL:
  → FurnitureMaterialSelection WHERE purchaseOrderId = PO.id → status = RECEIVED
  → IF all 3 selections of that FurnitureOrder = RECEIVED:
      → FurnitureOrder.status = in_production
```

---

## 4. Code Generation

| Entity | Prefix | Example |
|--------|--------|---------|
| FurnitureOrder | NT | NT-001 |
| AcceptanceCertificate | BB | BB-001 |

---

## 5. Roles & Permissions

| Action | Roles |
|--------|-------|
| Xem danh sách | tất cả |
| Tạo/sửa FurnitureOrder | giam_doc, ky_thuat |
| Upload CNC, tạo PO vật liệu | giam_doc, ky_thuat, kho |
| Tạo/gửi biên bản nghiệm thu | giam_doc, ky_thuat |
| Public signing page | public (no auth) |

---

## 6. Out of Scope

- Tính toán chi phí nhân công sản xuất (phân bổ sau)
- Quản lý máy CNC / lịch sản xuất
- Tự động ước lượng số lượng vật liệu (chỉ tham khảo, không bắt buộc)
- App mobile cho thợ
