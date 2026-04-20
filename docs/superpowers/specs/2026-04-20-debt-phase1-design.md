# Design: Công nợ chi tiết — Phase 1 (Aging + Detail Drawer)

**Date:** 2026-04-20
**Status:** Approved

## Problem

Trang `/cong-no` hiện có 3 tab (NCC, Thầu phụ, Theo công trình) + 2 view mode (Sổ cái, Theo phiếu) nhưng user thao tác mệt:
- Không biết phiếu nào quá hạn → không priority được
- Click nhiều tab + modal để xem chi tiết 1 NCC → context switching nặng
- Ghi nhận thanh toán phải mở modal to dù chỉ trả 1 phiếu

Phase 1 tập trung giải quyết 2 pain lớn nhất: **aging visibility** + **detail drawer gộp** để xem và thao tác nhanh.

## Requirements

1. Mỗi phiếu công nợ có thể có `dueDate` (hạn trả) — optional, user deal với NCC
2. UI hiển thị "tình trạng" của phiếu: quá hạn / sắp đến hạn / còn hạn, với màu cảnh báo
3. Filter list theo aging status
4. Click 1 NCC/Thầu → mở detail drawer gộp 3 phần: phiếu công nợ, sổ cái, lịch sử TT — không cần navigate
5. Ghi nhận thanh toán inline trong drawer (popover nhỏ, không full modal)
6. Phiếu cũ không có dueDate vẫn hoạt động (fallback gracefully)

## Approach

Thêm field `dueDate` vào `SupplierDebt` + `ContractorDebt`. Aging tính client-side từ dueDate (đơn giản, realtime). Detail drawer dùng right-panel pattern ~60% width. Payment inline bằng popover component để đỡ phải mở modal nặng.

## Design

### 1. Data Model

```prisma
model SupplierDebt {
  // ...existing fields
  dueDate DateTime?
}

model ContractorDebt {
  // ...existing fields
  dueDate DateTime?
}
```

**Migration:** ALTER TABLE ADD COLUMN (nullable, no backfill cần).

### 2. Aging Computation (client-side)

```javascript
function agingStatus(debt) {
  const balance = (debt.totalAmount || 0) - (debt.paidAmount || 0);
  if (balance <= 0) return { label: 'Đã trả', color: 'success', days: 0 };

  const today = new Date();
  if (debt.dueDate) {
    const due = new Date(debt.dueDate);
    const diffDays = Math.floor((today - due) / (1000 * 60 * 60 * 24));
    if (diffDays > 30) return { label: `Quá hạn ${diffDays} ngày`, color: 'danger', days: diffDays };
    if (diffDays > 0) return { label: `Quá hạn ${diffDays} ngày`, color: 'warning', days: diffDays };
    if (diffDays >= -7) return { label: `Sắp đến hạn (còn ${-diffDays}d)`, color: 'warning-light', days: diffDays };
    return { label: `Còn ${-diffDays} ngày`, color: 'neutral', days: diffDays };
  }

  // Fallback: no dueDate — use createdAt for sort only
  const created = new Date(debt.createdAt);
  const ageDays = Math.floor((today - created) / (1000 * 60 * 60 * 24));
  return { label: `${ageDays} ngày tồn dư`, color: 'neutral', days: ageDays };
}
```

**Màu badge:**
- `danger`: > 30 ngày quá hạn — 🔴 đỏ đậm, row background `rgba(239,68,68,0.05)`
- `warning`: 1-30 ngày quá hạn — 🟠 cam
- `warning-light`: còn 0-7 ngày đến hạn — 🟡 vàng
- `neutral`: còn > 7 ngày hoặc không có dueDate — ⚪ xám

### 3. Form tạo công nợ

Modal "Tạo công nợ" thêm input:
```
Ngày phát sinh: [____]    Hạn trả: [____] (tuỳ chọn)
```

Date picker optional. Nếu trống → null.

### 4. List view (tab NCC / Thầu phụ — Theo phiếu)

**Thêm cột "Tình trạng"** giữa "Còn nợ" và "Action":
```
| Mã | Mô tả | Dự án | Ngày | Hạn trả | Tổng | Đã trả | Còn nợ | Tình trạng | [Action] |
```

**Filter dropdown mới** ở toolbar:
```
[Tất cả ▼]
  Tất cả
  🔴 Quá hạn > 30 ngày
  🟠 Quá hạn 1-30 ngày
  🟡 Sắp đến hạn (< 7 ngày)
  ⚪ Còn hạn / Chưa có hạn
```

Row quá hạn > 30 ngày: background đỏ nhạt.

### 5. Detail Drawer

Click row NCC hoặc Thầu phụ ở tab theo phiếu → mở drawer bên phải.

**Layout:**
- Width: 60vw (min 700px), height full
- Overlay mờ bên trái
- Animation: slide-in right

**Header:**
```
👤 Văn Bích Ngũ                                         [×]
💰 Số dư: 250.000.000 ₫   |   🔴 Quá hạn 15 ngày (2 phiếu)
```

**3 section (tab nhỏ bên trong drawer):**

**📋 Phiếu công nợ** (mặc định active):
- Table: Mã | Mô tả | Ngày | Hạn trả | Tổng | Đã trả | Còn nợ | Tình trạng | Actions
- Row Actions: `💵 Trả` (nếu còn nợ), `✏️ Sửa`, `🗑️ Xóa`
- Click `💵 Trả` → popover nhỏ inline phía dưới row:
  ```
  Số tiền: [_________]  Ngày: [____]  Ghi chú: [____]
  [Hủy]  [✓ Xác nhận trả]
  ```
- Xác nhận → POST `/api/debts/supplier/[id]/pay` → refresh drawer
- Nếu "Số tiền" trống → default = số còn nợ

**📊 Sổ cái:**
- Giữ format hiện tại (Ngày | Loại | Chứng từ | Dự án | Phát sinh | TT | Số dư)
- Hiển thị sổ cái đầy đủ của NCC/Thầu này

**💳 Lịch sử TT:**
- List `SupplierPayment` / `ContractorPayment` đã tạo cho NCC này
- Mỗi entry: ngày, số tiền, người tạo, ghi chú, link chứng từ (nếu có)
- Không có hủy payment ở Phase 1 (để sau, phức tạp)

**Footer drawer:**
```
[💵 Trả hàng loạt (Phase 2)]  [📤 Xuất (Phase 3)]  [🖨️ In (Phase 3)]  [Đóng]
```

Phase 2 + 3 buttons disabled, tooltip "Sẽ có trong đợt sau".

### 6. Backend

**API changes:**
- `POST /api/debts/supplier`: accept `dueDate` optional
- `POST /api/debts/contractor`: accept `dueDate` optional
- `PUT /api/debts/supplier/[id]`: accept `dueDate` (để user sửa hạn khi deal lại)
- `GET /api/debts/supplier?supplierId=X`: trả full list phiếu của 1 NCC (cho drawer)
- `GET /api/debts/contractor?contractorId=X`: tương tự

### 7. Files to Change

| File | Nội dung |
|---|---|
| `prisma/schema.prisma` | + `dueDate DateTime?` vào SupplierDebt + ContractorDebt |
| `prisma/migrations/YYYYMMDD_debt_due_date/migration.sql` | ALTER TABLE ADD COLUMN |
| `lib/validations/debt.js` | + `dueDate` optional vào create + update schema |
| `app/api/debts/supplier/route.js` | Persist dueDate, support filter by supplierId |
| `app/api/debts/contractor/route.js` | Same |
| `app/api/debts/supplier/[id]/route.js` | PUT accept dueDate (create file nếu chưa có) |
| `app/api/debts/contractor/[id]/route.js` | Same |
| `app/cong-no/page.js` | Thêm cột Tình trạng, filter aging, detail drawer, inline payment popover |
| `lib/debtAging.js` | **Mới** — shared util `agingStatus(debt)` |

### 8. Error Handling & Edge Cases

1. **Phiếu cũ không có dueDate**: aging fallback dùng `createdAt` để sort, label "X ngày tồn dư", không coi là quá hạn → không cảnh báo đỏ.
2. **User sửa dueDate sang quá khứ**: hợp lệ, phiếu ngay lập tức chuyển sang "quá hạn" theo công thức.
3. **Inline payment popover**: đang mở mà user click row khác → đóng popover cũ, mở popover mới.
4. **Drawer mở khi list đang filter**: khi refresh sau payment, không reset filter list.
5. **Số tiền thanh toán > số còn nợ**: reject tại API, hiện lỗi trên popover.

## Out of Scope (Phase 2+3)

- Bulk payment (checkbox select multiple) — Phase 2
- Upload file chứng từ (hiện chỉ URL text) — Phase 2
- Filter by date range + tích hợp `/cong-no/bao-cao` — Phase 2
- Export Excel — Phase 3
- Print phiếu công nợ — Phase 3
- Hủy/rollback payment — sau
- Aging per-project (tab Theo công trình) — Phase 2 nếu cần
