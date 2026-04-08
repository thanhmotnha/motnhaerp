# Hệ thống Tài khoản Thanh toán (Payment Account) — Design Spec

**Date:** 2026-04-08
**Status:** Approved

---

## Mục tiêu

Ghi nhận tài khoản thanh toán (tiền mặt hoặc ngân hàng) trên mọi phiếu chi và phiếu thu trong hệ thống. Giúp kế toán biết mỗi giao dịch đi qua nguồn tiền nào.

---

## Phạm vi

- **Thêm field** `paymentAccount` vào 8 Prisma model
- **Cập nhật UI** thêm dropdown chọn tài khoản ở các form liên quan
- **Hiển thị badge** `[TM]` / `[NH]` trên danh sách
- **Không tạo bảng mới** — giá trị cố định 2 lựa chọn (YAGNI)
- **Không thay đổi** logic nghiệp vụ hiện tại

---

## 1. Data Model

### 1.1 Giá trị hợp lệ

```
"Tiền mặt"   — tiền mặt tại quỹ
"Ngân hàng"  — tài khoản ngân hàng
""            — chưa chọn (legacy records)
```

### 1.2 Thêm field vào các model

Mỗi model sau thêm dòng:
```prisma
paymentAccount String @default("")
```

| Model | Bảng | Loại giao dịch |
|-------|------|----------------|
| `ProjectExpense` | `ProjectExpense` | Phiếu chi dự án |
| `OverheadExpense` | `OverheadExpense` | Chi phí văn phòng/chung |
| `ContractorPayment` | `ContractorPayment` | Thanh toán thầu phụ |
| `SupplierPayment` | `SupplierPayment` | Thanh toán NCC (luồng cũ) |
| `SupplierDebtPayment` | `SupplierDebtPayment` | Trả công nợ NCC (mới) |
| `ContractorDebtPayment` | `ContractorDebtPayment` | Trả công nợ thầu phụ (mới) |
| `ContractPayment` | `ContractPayment` | Thu tiến độ từ khách hàng |
| `Transaction` | `Transaction` | Thu/chi thủ công |

**Lưu ý:** `SupplierDebtPayment` và `ContractorDebtPayment` là 2 model mới trong plan công nợ (chưa implement) — thêm field này ngay từ đầu khi tạo migration.

### 1.3 Zod validation

Các schema liên quan trong `lib/validations/` thêm:
```javascript
paymentAccount: z.enum(['Tiền mặt', 'Ngân hàng', '']).default(''),
```

---

## 2. API

Các API route tương ứng với 8 model trên nhận thêm field `paymentAccount` trong body POST/PUT và trả về trong response GET. Không có logic đặc biệt — chỉ lưu/đọc.

Các route cần cập nhật:
- `app/api/project-expenses/route.js` + `[id]/route.js`
- `app/api/overhead/expenses/route.js` + `[id]/route.js`
- `app/api/contractor-payments/route.js` + `[id]/route.js`
- `app/api/supplier-payments/route.js` (nếu có) hoặc qua `SupplierPayment` create
- `app/api/debts/supplier/[id]/pay/route.js` (plan công nợ — thêm khi implement)
- `app/api/debts/contractor/[id]/pay/route.js` (plan công nợ — thêm khi implement)
- `app/api/contracts/[id]/payments/route.js` (ContractPayment)
- `app/api/accounting/route.js` (Transaction)

---

## 3. UI

### 3.1 Dropdown chung

Mọi form có field `paymentAccount` dùng cùng pattern:

```jsx
<select
  className="form-input"
  value={form.paymentAccount}
  onChange={e => setForm({ ...form, paymentAccount: e.target.value })}
>
  <option value="">-- Tài khoản --</option>
  <option value="Tiền mặt">Tiền mặt</option>
  <option value="Ngân hàng">Ngân hàng</option>
</select>
```

Field là **tùy chọn** (không required) để không ảnh hưởng legacy records.

### 3.2 Badge hiển thị trên danh sách

```jsx
{item.paymentAccount && (
  <span className="badge muted" style={{ fontSize: 10 }}>
    {item.paymentAccount === 'Tiền mặt' ? 'TM' : 'NH'}
  </span>
)}
```

### 3.3 Các form cần cập nhật

| Form | File | Vị trí thêm dropdown |
|------|------|----------------------|
| Lệnh chi dự án | `components/finance/ExpensesTab.js` | Cạnh field ngày |
| Chi phí văn phòng | `components/finance/OverheadExpenseModal.js` (mới trong plan overhead) | Cạnh field ngày |
| Thanh toán thầu phụ | Modal trong `app/finance/page.js` hoặc `ContractorPaymentsTab` | Cạnh field số tiền |
| Thu tiến độ KH | `components/finance/ReceivablesTab.js` | Form đánh dấu đã thu |
| Thu/chi nhanh | Form Transaction trong `/finance` | Cạnh field ngày |
| Trả công nợ NCC | Modal pay trong `/cong-no` (plan công nợ) | Thêm khi implement plan |
| Trả công nợ thầu phụ | Modal pay trong `/cong-no` (plan công nợ) | Thêm khi implement plan |

---

## 4. Files thay đổi

| File | Loại | Mô tả |
|------|------|-------|
| `prisma/schema.prisma` | Sửa | Thêm `paymentAccount` vào 6 model hiện có (2 model công nợ chưa có) |
| `lib/validations/projectExpense.js` | Sửa | Thêm paymentAccount vào schema |
| `lib/validations/overheadExpense.js` | Sửa | Thêm paymentAccount |
| `lib/validations/contractorPayment.js` | Sửa | Thêm paymentAccount |
| `lib/validations/transaction.js` | Sửa | Thêm paymentAccount (hoặc tạo mới nếu chưa có) |
| `app/api/project-expenses/route.js` | Sửa nhỏ | Pass paymentAccount qua |
| `app/api/contractor-payments/route.js` | Sửa nhỏ | Pass paymentAccount qua |
| `app/api/contracts/[id]/payments/route.js` | Sửa nhỏ | Pass paymentAccount qua |
| `app/api/accounting/route.js` | Sửa nhỏ | Pass paymentAccount qua |
| `components/finance/ExpensesTab.js` | Sửa | Thêm dropdown + badge |
| `components/finance/ReceivablesTab.js` | Sửa | Thêm dropdown + badge |
| Form ContractorPayment | Sửa | Thêm dropdown + badge |
| Form Transaction | Sửa | Thêm dropdown + badge |

---

## 5. Không làm

- Không tạo module quản lý tài khoản
- Không validate bắt buộc chọn tài khoản (backward compat)
- Không hiển thị báo cáo tổng hợp theo tài khoản (out of scope)
- Không ảnh hưởng SupplierPayment cũ (luồng thanh toán NCC từ trước khi có công nợ)
