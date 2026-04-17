# Design: Unified Supplier Payment via Lệnh Chi

**Date:** 2026-04-17  
**Status:** Approved

## Problem

Hiện tại có 2 luồng tách biệt để ghi nhận thanh toán NCC:
1. Tab Chi phí → tạo `ProjectExpense` (lệnh chi)
2. Tab Công nợ → nút "Ghi nhận TT" → tạo `SupplierPayment` độc lập

User muốn 1 form duy nhất: lệnh chi NCC tự động cập nhật công nợ NCC.

## Decisions

- Khi lệnh chi có `recipientType = "NCC"` và status → **"Đã chi"** thì tự tạo `SupplierPayment`
- Trừ vào **tổng số dư chung** của NCC (không link phiếu công nợ cụ thể)
- Nút "Ghi nhận TT" giữ lại như **shortcut** mở form lệnh chi pre-filled

## Architecture

### 1. Database

Thêm 1 field vào `SupplierPayment`:

```prisma
model SupplierPayment {
  // ... existing fields
  expenseId String? @unique  // link to ProjectExpense, prevent duplicate
}
```

Migration: `npm run db:migrate`

### 2. Backend — `PUT /api/project-expenses`

Khi update status → "Đã chi":

```javascript
if (newStatus === 'Đã chi' && expense.recipientType === 'NCC' && expense.recipientId) {
  const existing = await prisma.supplierPayment.findUnique({
    where: { expenseId: expense.id }
  })
  if (!existing) {
    const code = await generateCode('SP')
    await prisma.supplierPayment.create({
      data: {
        code,
        supplierId: expense.recipientId,
        amount: expense.amount,
        date: expense.date,
        notes: expense.description,
        expenseId: expense.id,
        createdById: session.user.id,
      }
    })
  }
}
```

Logic idempotent: check `expenseId` trước khi tạo, tránh duplicate nếu API gọi 2 lần.

### 3. Frontend

#### 3a. Form tạo lệnh chi — Supplier Dropdown

File: `components/finance/ExpensesTab.js` (hoặc inline form trong finance page)

- Khi `recipientType = "NCC"` → hiện `<select>` danh sách supplier từ `/api/suppliers`
- Khi chọn supplier → auto-fill `recipientId` + `recipientName`
- Thay thế input text tự nhập hiện tại

#### 3b. Nút "Ghi nhận TT" — Shortcut

File: `app/finance/tabs/DebtTab.js`

- Xóa modal "Ghi nhận TT" cũ
- Nút onClick: switch tab sang "Chi phí" + set `defaultSupplier` state với supplier đang chọn
- Finance page truyền `defaultValues` vào form lệnh chi: `{ recipientType: "NCC", recipientId, recipientName }`

## Data Flow

```
User click "Ghi nhận TT" (NCC: Văn Bích Ngũ)
  → Switch tab → Chi phí
  → Form mở với NCC pre-filled
  → User nhập số tiền, ngày, mô tả → Submit
  → Tạo ProjectExpense (status: "Chờ duyệt")
  → Duyệt → KT upload chứng từ → status: "Đã chi"
  → Auto-create SupplierPayment (supplierId, amount, expenseId)
  → Công nợ NCC: số dư giảm
```

## Files to Change

| File | Thay đổi |
|------|---------|
| `prisma/schema.prisma` | Thêm `expenseId` vào SupplierPayment |
| `app/api/project-expenses/route.js` | Auto-create SupplierPayment khi status → "Đã chi" |
| `components/finance/ExpensesTab.js` | Supplier dropdown khi recipientType=NCC |
| `app/finance/tabs/DebtTab.js` | Shortcut: switch tab + pre-fill thay vì modal |
| `app/finance/page.js` | State cho tab switching + defaultValues |

## Out of Scope

- Không đổi SupplierDebt (phiếu công nợ cụ thể)
- Không migration data lịch sử SupplierPayment cũ
- Không thay đổi Contractor (nhà thầu phụ) — chỉ NCC
