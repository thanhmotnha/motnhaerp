# Hệ thống Công nợ NCC & Thầu phụ — Design Spec

**Date:** 2026-04-08
**Status:** Approved

---

## Mục tiêu

Theo dõi công nợ chi tiết theo hóa đơn/đợt nghiệm thu cho NCC và thầu phụ. Mỗi lần nhận hàng hoặc nghiệm thu → tạo 1 debt record thủ công (kèm chứng từ). Thanh toán từ `/cong-no` trực tiếp hoặc qua lệnh chi trong `/finance`.

---

## Phạm vi

- **Thêm mới:** 4 Prisma model, 6 API route group, nâng cấp `/cong-no` UI, tích hợp `/finance`
- **Không thay đổi:** `SupplierPayment`, `ContractorPayment`, `openingBalance` logic cũ (giữ nguyên để backward compat)
- **Không thêm:** auto-create debt từ PO, hạn thanh toán

---

## 1. Data model

### 1.1 Thêm vào `prisma/schema.prisma`

```prisma
model SupplierDebt {
  id          String   @id @default(cuid())
  code        String   @unique
  supplierId  String
  projectId   String?
  invoiceNo   String   @default("")
  description String
  totalAmount Float    @default(0)
  paidAmount  Float    @default(0)
  status      String   @default("open")   // open | partial | paid
  date        DateTime @default(now())
  proofUrl    String   @default("")
  notes       String   @default("")
  createdById String   @default("")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  supplier  Supplier               @relation(fields: [supplierId], references: [id])
  project   Project?               @relation(fields: [projectId], references: [id])
  payments  SupplierDebtPayment[]

  @@index([supplierId])
  @@index([projectId])
  @@index([status])
}

model SupplierDebtPayment {
  id        String   @id @default(cuid())
  code      String   @unique
  debtId    String
  amount    Float
  date      DateTime @default(now())
  notes     String   @default("")
  proofUrl  String   @default("")
  expenseId String?  // link tới ProjectExpense nếu trả qua /finance
  createdById String @default("")
  createdAt DateTime @default(now())

  debt    SupplierDebt    @relation(fields: [debtId], references: [id], onDelete: Cascade)

  @@index([debtId])
}

model ContractorDebt {
  id           String   @id @default(cuid())
  code         String   @unique
  contractorId String
  projectId    String
  description  String
  totalAmount  Float    @default(0)
  paidAmount   Float    @default(0)
  status       String   @default("open")   // open | partial | paid
  date         DateTime @default(now())
  proofUrl     String   @default("")
  notes        String   @default("")
  createdById  String   @default("")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  contractor Contractor               @relation(fields: [contractorId], references: [id])
  project    Project                  @relation(fields: [projectId], references: [id])
  payments   ContractorDebtPayment[]

  @@index([contractorId])
  @@index([projectId])
  @@index([status])
}

model ContractorDebtPayment {
  id           String   @id @default(cuid())
  code         String   @unique
  debtId       String
  amount       Float
  date         DateTime @default(now())
  notes        String   @default("")
  proofUrl     String   @default("")
  expenseId    String?
  createdById  String   @default("")
  createdAt    DateTime @default(now())

  debt ContractorDebt @relation(fields: [debtId], references: [id], onDelete: Cascade)

  @@index([debtId])
}
```

### 1.2 Thêm relations vào model có sẵn

Trong `Supplier`: thêm `debts SupplierDebt[]`
Trong `Contractor`: thêm `debts ContractorDebt[]`
Trong `Project`: thêm `supplierDebts SupplierDebt[]` và `contractorDebts ContractorDebt[]`

---

## 2. API Routes

### 2.1 `GET/POST /api/debts/supplier`

**GET** — Danh sách SupplierDebt với filter:
- `supplierId` (required hoặc optional)
- `projectId`
- `status` (open|partial|paid|all)

Response:
```json
[{
  "id": "...", "code": "CNCC-001",
  "supplierId": "...", "supplierName": "...", "supplierCode": "...",
  "projectId": "...", "projectCode": "...", "projectName": "...",
  "invoiceNo": "INV-001", "description": "Xi măng tháng 3",
  "totalAmount": 10000000, "paidAmount": 4000000, "remaining": 6000000,
  "status": "partial", "date": "2026-03-15T...",
  "proofUrl": "...", "notes": "..."
}]
```

**POST** — Tạo SupplierDebt mới:
```json
{
  "supplierId": "...", "projectId": "...",
  "invoiceNo": "INV-001", "description": "...",
  "totalAmount": 10000000, "date": "2026-03-15",
  "proofUrl": "...", "notes": "..."
}
```
Auto-generate code `CNCC-xxx`. Status = `open`.

### 2.2 `GET/PUT/DELETE /api/debts/supplier/[id]`

**GET** — Chi tiết 1 debt kèm `payments[]`
**PUT** — Cập nhật description, invoiceNo, notes, proofUrl (không sửa amount nếu đã có payment)
**DELETE** — Xóa nếu `paidAmount === 0`

### 2.3 `POST /api/debts/supplier/[id]/pay`

Tạo SupplierDebtPayment + cập nhật `paidAmount` và `status` của debt.

Body:
```json
{ "amount": 4000000, "date": "2026-04-01", "notes": "...", "proofUrl": "...", "expenseId": null }
```

Logic:
```javascript
const debt = await prisma.supplierDebt.findUnique({ where: { id } });
if (amount > debt.totalAmount - debt.paidAmount) throw error('Vượt quá số còn nợ');
const code = await generateCode('supplierDebtPayment', 'TTNCC');
await prisma.$transaction([
  prisma.supplierDebtPayment.create({ data: { code, debtId: id, amount, date, notes, proofUrl, expenseId, createdById } }),
  prisma.supplierDebt.update({
    where: { id },
    data: {
      paidAmount: { increment: amount },
      status: debt.paidAmount + amount >= debt.totalAmount ? 'paid' : 'partial',
    },
  }),
]);
```

### 2.4 `GET/POST /api/debts/contractor`

Tương tự supplier nhưng `projectId` là **bắt buộc**.

### 2.5 `GET/PUT/DELETE /api/debts/contractor/[id]`

### 2.6 `POST /api/debts/contractor/[id]/pay`

Logic tương tự supplier. Code prefix: `TTTH`.

---

## 3. UI — `/cong-no/page.js`

### Tab NCC (cải tiến)

Layout 2 cột:
- **Cột trái** (320px): danh sách NCC + tổng còn nợ. Filter: Còn nợ / Tất cả. Search tên.
- **Cột phải**: khi click NCC → hiện danh sách `SupplierDebt` của họ

Mỗi debt row:
```
CNCC-001  INV-001  Xi măng tháng 3       DA-001     10.000.000đ  [4.000.000đ đã trả]  [partial]  [+ Trả] [Xem CT]
```

Expand debt row → hiện `payments[]` (lịch sử các lần trả).

Nút **"+ Tạo công nợ"** ở trên cột phải → modal tạo SupplierDebt mới cho NCC đang chọn.

Nút **"+ Trả tiền"** trên mỗi debt row → modal PaymentForm với:
- Số tiền (max = remaining)
- Ngày
- Ghi chú
- Upload chứng từ (paste/click/kéo thả)

### Tab Thầu phụ (cải tiến)

Tương tự nhưng dùng ContractorDebt. `projectId` bắt buộc khi tạo debt.

### Tab Theo công trình (mới)

- Dropdown chọn dự án
- Hiện 2 bảng: **Công nợ NCC** và **Công nợ Thầu phụ** trong dự án đó
- Tổng còn nợ theo từng đối tác

---

## 4. Tích hợp `/finance` — `ExpensesTab`

Khi `recipientType = 'NCC'` hoặc `'Thầu phụ'` → hiện thêm section:

```
Trả công nợ cụ thể?  □
  → [chọn công nợ: CNCC-001 — Xi măng T3 — còn 6.000.000đ ▼]
```

Khi tick checkbox và chọn debt → khi `handleSubmit` thành công:
- Tạo ProjectExpense bình thường (như hiện tại)
- Gọi thêm `POST /api/debts/supplier/[debtId]/pay` với `{ amount, date, expenseId: newExpense.id }`

Hiển thị trong payment history: badge nhỏ "📋 Lệnh chi [EXP-001]" khi `expenseId` có giá trị.

---

## 5. Files thay đổi

| File | Loại | Mô tả |
|------|------|-------|
| `prisma/schema.prisma` | Sửa | Thêm 4 model + relations |
| `app/api/debts/supplier/route.js` | Tạo mới | GET list + POST create |
| `app/api/debts/supplier/[id]/route.js` | Tạo mới | GET detail + PUT + DELETE |
| `app/api/debts/supplier/[id]/pay/route.js` | Tạo mới | POST payment |
| `app/api/debts/contractor/route.js` | Tạo mới | GET list + POST create |
| `app/api/debts/contractor/[id]/route.js` | Tạo mới | GET detail + PUT + DELETE |
| `app/api/debts/contractor/[id]/pay/route.js` | Tạo mới | POST payment |
| `lib/validations/debt.js` | Tạo mới | Zod schemas |
| `app/cong-no/page.js` | Sửa lớn | UI mới với 3 tab, debt list, payment modal |
| `components/finance/ExpensesTab.js` | Sửa nhỏ | Thêm link-to-debt khi chọn NCC/thầu |

---

## 6. Sidebar

Thêm menu item `/cong-no` nếu chưa có cho role `ke_toan`, `giam_doc`.
