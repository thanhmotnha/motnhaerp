# Design: Đồng bộ Chi phí ↔ Công nợ ↔ Thanh toán (Phase B)

**Date:** 2026-04-21
**Status:** Approved

## Problem

Hệ thống đang có 3 bảng tracking cùng 1 khoản tiền NCC/Thầu phụ nhưng không đồng bộ:
- `ProjectExpense.paidAmount` (sổ chi phí dự án)
- `SupplierDebt.paidAmount` (sổ công nợ NCC)
- `SupplierPayment` (sổ thanh toán)

Trả qua đường này không update đường kia → số liệu lệch. Ngoài ra:
- DELETE ProjectExpense hard delete → mất audit trail (schema có `deletedAt` nhưng không dùng)
- DELETE GoodsReceipt không xóa ProjectExpense giao thẳng → orphan

## Requirements

1. Liên kết cứng `SupplierDebt.expenseId → ProjectExpense` (+ `ContractorDebt`)
2. Tạo ProjectExpense với `recipientType='NCC'/'Thầu phụ'` → auto-tạo SupplierDebt/ContractorDebt tương ứng
3. Trả qua ProjectExpense "Đã chi" → đồng bộ Debt (`SupplierDebtPayment`, `SupplierDebt.paidAmount/status`)
4. Trả qua Công nợ "Ghi nhận TT" → đồng bộ ProjectExpense (`paidAmount/status`)
5. ProjectExpense DELETE → soft-delete, cascade linked Debt nếu chưa trả
6. GoodsReceipt DELETE → cascade soft-delete ProjectExpense giao thẳng chưa chi

## Approach

Giữ 3 bảng riêng (không refactor to 1 source of truth — quá tốn), thêm FK 2 chiều + sync logic ở API layer. ExpenseAllocation auto-recalc out of scope (Phase C).

## Design

### 1. Schema

```prisma
model SupplierDebt {
  // ... existing fields
  expenseId  String?         @unique
  expense    ProjectExpense? @relation("SupplierDebtFromExpense", fields: [expenseId], references: [id], onDelete: SetNull)
}

model ContractorDebt {
  // ... existing fields
  expenseId  String?         @unique
  expense    ProjectExpense? @relation("ContractorDebtFromExpense", fields: [expenseId], references: [id], onDelete: SetNull)
}

model ProjectExpense {
  // ... existing fields
  supplierDebt    SupplierDebt?   @relation("SupplierDebtFromExpense")
  contractorDebt  ContractorDebt? @relation("ContractorDebtFromExpense")
}
```

Migration SQL:
```sql
ALTER TABLE "SupplierDebt" ADD COLUMN "expenseId" TEXT;
CREATE UNIQUE INDEX "SupplierDebt_expenseId_key" ON "SupplierDebt"("expenseId");
ALTER TABLE "SupplierDebt" ADD CONSTRAINT "SupplierDebt_expenseId_fkey"
  FOREIGN KEY ("expenseId") REFERENCES "ProjectExpense"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ContractorDebt" ADD COLUMN "expenseId" TEXT;
CREATE UNIQUE INDEX "ContractorDebt_expenseId_key" ON "ContractorDebt"("expenseId");
ALTER TABLE "ContractorDebt" ADD CONSTRAINT "ContractorDebt_expenseId_fkey"
  FOREIGN KEY ("expenseId") REFERENCES "ProjectExpense"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
```

Không backfill — record cũ giữ `expenseId=null`.

### 2. Auto-create Debt từ ProjectExpense

**`POST /api/project-expenses`**:
- Sau khi tạo ProjectExpense: nếu `recipientType='NCC'` và `recipientId` → auto-create `SupplierDebt`:
  - `supplierId = recipientId`
  - `description = expense.description`
  - `totalAmount = expense.amount`
  - `paidAmount = 0`
  - `date = expense.date`
  - `projectId = expense.projectId || null`
  - `expenseId = expense.id`
  - `status = 'open'`
  - `code` generate via `withCodeRetry('supplierDebt', 'CN')`
- Nếu `recipientType='Thầu phụ'` và `recipientId` → auto-create `ContractorDebt` tương tự
- **Không auto-create** nếu: `expenseType='Xuất kho'` (đã thanh toán nội bộ), không có `recipientId`, không có `recipientType`

**`PUT /api/project-expenses`** (sửa):
- Nếu amount/description/date đổi → update linked Debt cùng value
- Nếu `recipientType/recipientId` đổi → xóa debt cũ (chỉ nếu paidAmount=0), tạo debt mới nếu type='NCC'/'Thầu phụ'

### 3. Payment Sync 2 chiều

**Hướng A — Trả qua ProjectExpense** (`PUT /api/project-expenses` status → 'Đã chi'):
- Code hiện tại: tạo `SupplierPayment` với `expenseId`
- **Thêm**: nếu expense có linked `supplierDebt`:
  - Tạo `SupplierDebtPayment` với `debtId = supplierDebt.id`, `amount = paidAmount`, `proofUrl` đồng bộ
  - Update `SupplierDebt.paidAmount += amount`, recalc `status` (open/partial/paid)
- Tương tự với `contractorDebt` → tạo `ContractorDebtPayment` + update `ContractorDebt`

**Hướng B — Trả qua Debt** (`POST /api/debts/supplier/[id]/pay` hoặc `/contractor/[id]/pay`):
- Code hiện tại: tạo `SupplierDebtPayment` + `SupplierPayment`, update `SupplierDebt.paidAmount/status`
- **Thêm**: nếu `SupplierDebt.expenseId` tồn tại và linked expense chưa soft-delete:
  - Update `ProjectExpense.paidAmount += amount`
  - Nếu `paidAmount >= amount` → `status = 'Đã chi'`
  - `proofUrl` đồng bộ nếu payment có
  - Skip update nếu expense `status='Hoàn thành'` hoặc `deletedAt` set

**Edge cases:**
- Trả thừa (amount > remaining) → reject với `422` + message rõ
- Pay idempotency: mỗi payment tạo 1 bản ghi mới, không trùng

### 4. Cascade Delete

**ProjectExpense DELETE (soft-delete):**
- Thay `prisma.projectExpense.delete()` → `update({ deletedAt: new Date() })`
- Nếu linked SupplierDebt/ContractorDebt có `paidAmount > 0` → chặn với `422` "Debt đã có thanh toán, hủy thanh toán trước"
- Nếu debt chưa trả → soft-delete debt luôn (set `deletedAt` — cần thêm field? hoặc dùng hard delete với paidAmount=0)
  - **Quyết định**: SupplierDebt chưa có `deletedAt` → dùng hard delete nếu `paidAmount=0`
- Xóa `InventoryTransaction` với `note` match `Xuất kho ${expense.code}` nếu expense từ xuất kho

**GoodsReceipt DELETE:**
- Code hiện tại rollback: Product.stock, PurchaseOrderItem.receivedQty, InventoryTransaction
- **Thêm**: soft-delete `ProjectExpense` có `description LIKE '[GRN] % — ${po.code}'` và `status='Chờ thanh toán'`
- Nếu có CP matching nhưng đã `status='Đã chi'`/'Hoàn thành'` → không xóa, **cảnh báo qua response** nhưng không block

**SupplierDebt / ContractorDebt DELETE:**
- Nếu `expenseId` set → block "Phải xóa ProjectExpense gốc, debt sẽ tự xóa"
- Nếu độc lập + `paidAmount=0` → cho xóa

**SupplierPayment / ContractorDebtPayment DELETE** (Phase B bonus nếu dễ, không bắt buộc):
- Out of scope Phase B — giữ hiện tại

### 5. Files to Change

| File | Nội dung |
|---|---|
| `prisma/schema.prisma` | + `expenseId` trên SupplierDebt/ContractorDebt + back-relations |
| `prisma/migrations/20260421100000_debt_expense_link/migration.sql` | ALTER + FK + unique index |
| `app/api/project-expenses/route.js` | POST auto-create debt · DELETE soft-delete + cascade |
| `app/api/project-expenses/[id]/route.js` (nếu có) hoặc PUT trong route.js | Update linked debt + sync payment 2 chiều khi status → 'Đã chi' |
| `app/api/debts/supplier/[id]/pay/route.js` | Sync ProjectExpense.paidAmount/status |
| `app/api/debts/contractor/[id]/pay/route.js` | Same |
| `app/api/inventory/receipts/[id]/route.js` | DELETE cascade ProjectExpense giao thẳng chưa chi |

### 6. Error Handling

1. **Tạo ProjectExpense với recipientId không tồn tại**: API reject tại Zod validation hoặc 404 khi check Supplier/Contractor
2. **Supplier/Contractor đã soft-delete**: auto-create debt skip, log warning (không fail expense creation)
3. **Payment sync thất bại** (network/DB): rollback toàn bộ transaction — 2 bên không lệch
4. **Debt có trước khi link expense** (data cũ): expenseId=null, sync 2 chiều tự nhiên không chạm các record này
5. **Edit expense amount sau khi đã trả một phần**: cho phép nhưng re-calc debt.totalAmount và check paidAmount không vượt → nếu vượt, chặn

## Out of Scope (Phase C)

- Hủy SupplierPayment/ContractorPayment riêng lẻ với rollback
- Backfill expenseId cho SupplierDebt cũ (khớp theo description/amount/date?)
- ExpenseAllocation auto re-calc khi amount đổi
- 1 ProjectExpense link nhiều SupplierDebt (hiện chỉ 1-1 qua unique)
- Refactor toàn bộ sang 1 source-of-truth (Phase C)
