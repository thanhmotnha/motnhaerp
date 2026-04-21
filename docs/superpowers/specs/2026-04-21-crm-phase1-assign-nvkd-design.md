# Design: CRM Phase 1 — Assign khách hàng cho NVKD

**Date:** 2026-04-21
**Status:** Approved

## Problem

Module CRM hiện có foundation tốt (pipelineStage, score, CustomerInteraction, TrackingLog) nhưng thiếu "ownership" — `Customer.salesPerson` chỉ là string không FK, nên:
- Không biết khách của NVKD nào → không kiểm soát được
- NVKD không có danh sách "khách của mình"
- Không filter được khách để assign/reassign
- Quản lý không có dashboard theo NVKD (phụ thuộc field này)

## Requirements

1. **1 khách → 1 NVKD** (chủ khách); có pool "Chưa chủ" (salesPersonId = null)
2. **NVKD tạo khách mới → auto-assign chính mình**
3. **Chỉ Giám đốc reassign** (NVKD không được đổi chủ)
4. **NVKD thấy**: khách của mình + pool chưa chủ; **không thấy** khách của NVKD khác
5. **Giám đốc/Kế toán** thấy tất cả; **Kỹ thuật/Kho** thấy read-only
6. **Nút "Claim"** cho NVKD khi khách chưa chủ
7. Backward compat: backfill từ field `salesPerson` string; data không khớp → null, giám đốc fix sau

## Approach

FK đến `User` (không phải Employee) vì auth dùng User với field `role`. Rename field cũ `salesPerson: String` thành `salesPersonNote` để giữ text tự do legacy. Filter API theo session role.

## Design

### 1. Data Model

```prisma
model Customer {
  // ... existing fields (giữ nguyên)
  salesPersonId   String?
  salesPerson     User?     @relation("CustomerSalesPerson", fields: [salesPersonId], references: [id])
  salesPersonNote String    @default("")  // legacy field cũ, giữ text tự do
  @@index([salesPersonId])
}

model User {
  // back-relation
  salesCustomers  Customer[]  @relation("CustomerSalesPerson")
}
```

**Migration SQL:**
```sql
-- Rename old column
ALTER TABLE "Customer" RENAME COLUMN "salesPerson" TO "salesPersonNote";

-- Add new FK column
ALTER TABLE "Customer" ADD COLUMN "salesPersonId" TEXT;
CREATE INDEX "Customer_salesPersonId_idx" ON "Customer"("salesPersonId");
ALTER TABLE "Customer"
  ADD CONSTRAINT "Customer_salesPersonId_fkey"
  FOREIGN KEY ("salesPersonId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: match unique User by name
UPDATE "Customer" c
SET "salesPersonId" = u.id
FROM "User" u
WHERE u.name = c."salesPersonNote"
  AND c."salesPersonNote" != ''
  AND c."salesPersonId" IS NULL
  AND (SELECT COUNT(*) FROM "User" WHERE name = c."salesPersonNote") = 1;
```

Không match → giữ null. Log danh sách qua script riêng để giám đốc fix thủ công.

### 2. API Changes

**POST `/api/customers`** (tạo khách):
- Nếu `session.user.role === 'kinh_doanh'` → auto-set `salesPersonId = session.user.id`, ignore body.salesPersonId
- Nếu `giam_doc`/`ke_toan` → nhận `salesPersonId` từ body (optional, có thể null)
- Nếu `ky_thuat`/`kho` → không được tạo (reject 403)

**PUT `/api/customers/[id]`** (sửa khách):
- Nếu body có `salesPersonId` và user role !== `giam_doc` → reject 403 "Chỉ giám đốc được đổi chủ khách"
- Các field khác: NVKD chỉ sửa được khách của mình

**GET `/api/customers`** (list + filter):
- `giam_doc`, `ke_toan`, `ky_thuat`, `kho`: không filter theo ownership
- `kinh_doanh`: `where: { OR: [{ salesPersonId: session.user.id }, { salesPersonId: null }] }`
- Response include `salesPerson: { id, name, email }` để UI hiện tên

**POST `/api/customers/[id]/claim`** (mới — NVKD nhận khách):
- Chỉ role `kinh_doanh`
- Điều kiện: customer hiện `salesPersonId === null`
- Update: set `salesPersonId = session.user.id`
- Reject 422 nếu đã có chủ: "Khách đã có chủ, không claim được"

### 3. UI Changes

**Trang `/customers`** (Kanban + Table):

**Cột "Chủ khách":**
- Hiện `customer.salesPerson?.name || '—'`
- Badge màu: mình (xanh success), chưa chủ (cam warning), khác (xám muted — chỉ giám đốc thấy)

**Filter dropdown:**
- Role `kinh_doanh`: 2 option — `Của tôi` (default) / `Chưa chủ`
- Role khác: 3 option — `Tất cả` (default) / `Của NVKD X` / `Chưa chủ`

**Nút "Claim":**
- NVKD thấy nút `🙋 Nhận khách` ở mỗi row có `salesPersonId === null`
- Click → POST `/claim` → refresh list

**Modal sửa khách:**
- Dropdown "Chủ khách":
  - Giám đốc/Kế toán: enabled, options = list User role='kinh_doanh'
  - NVKD: disabled, hiện read-only tên chủ hiện tại
- Thêm field "Ghi chú chủ khách (legacy)" = `salesPersonNote` — tự do text

### 4. Role Context update

`contexts/RoleContext.js` thêm permission:
```javascript
canReassignCustomer: role === 'giam_doc',
canClaimCustomer:    role === 'kinh_doanh',
canViewAllCustomers: ['giam_doc', 'ke_toan', 'ky_thuat', 'kho'].includes(role),
```

### 5. Files to Change

| File | Nội dung |
|---|---|
| `prisma/schema.prisma` | + `salesPersonId` + relation + index; rename `salesPerson` → `salesPersonNote` |
| `prisma/migrations/20260421120000_customer_salesperson_fk/migration.sql` | ALTER + FK + index + rename + backfill |
| `app/api/customers/route.js` | POST auto-assign kinh_doanh; GET filter theo role |
| `app/api/customers/[id]/route.js` | PUT reject salesPersonId nếu không phải giam_doc |
| `app/api/customers/[id]/claim/route.js` | **Mới** — POST claim cho NVKD |
| `app/customers/page.js` | Cột Chủ khách + filter + nút Claim + format badge |
| `contexts/RoleContext.js` | + permissions mới |
| `lib/validations/customer.js` | Accept `salesPersonId` optional |

### 6. Edge Cases

1. **Backfill không match**: log `console.warn` danh sách `salesPersonNote` chưa match; giám đốc fix sau qua UI
2. **NVKD nghỉ (User disabled/deleted)**: onDelete SET NULL → khách về pool chưa chủ
3. **Nhiều User cùng tên**: backfill skip (dùng COUNT=1), giám đốc assign thủ công
4. **Kinh_doanh cố đổi salesPersonId qua API bypass UI**: API reject 403
5. **Customer tạo qua bulk import/seed**: không auto-assign (không có session), giám đốc assign sau
6. **Khách cũ có salesPersonNote = tên không tồn tại trong User**: giữ null, badge "Chưa chủ"

### 7. Testing

**Manual test path:**
1. Đăng nhập NVKD → tạo khách mới → verify `salesPersonId` = user.id trong DB
2. Đăng nhập giám đốc → /customers → filter "Tất cả" → thấy khách vừa tạo
3. Login NVKD B → /customers → không thấy khách của NVKD A
4. NVKD B → filter "Chưa chủ" → thấy khách chưa có chủ → click "Nhận khách" → verify thành chủ
5. NVKD A → thử PUT đổi `salesPersonId` khác → API reject 403
6. Giám đốc → modal sửa → đổi chủ từ A sang B → update thành công

## Out of Scope (các Phase sau)

- **Phase 2**: GPS tracking, CustomerVisit model, photo check-in
- **Phase 3**: VisitPlan, lịch thăm khách hàng
- **Phase 4**: Dashboard NVKD cá nhân + dashboard quản lý + KPI targets
- Bulk reassign UI (chuyển toàn bộ khách từ NVKD A → B khi nghỉ)
- Customer lead source tracking (facebook, website, etc.)
- Pipeline stage permission per role
