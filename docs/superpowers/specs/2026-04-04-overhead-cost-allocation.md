# Overhead Cost Allocation Design

## Goal

Cho phép kế toán ghi nhận chi phí chung của công ty (văn phòng, nhân sự gián tiếp, thiết bị dùng chung, bảo hiểm/thuế, marketing) và phân bổ tự động vào các dự án theo tỷ lệ doanh thu kỳ. Kết quả hiển thị trên P&L từng dự án và P&L tổng công ty.

## Data Model

### OverheadExpense
Từng khoản chi phí chung, nhập liên tục trong tháng.

```prisma
model OverheadExpense {
  id          String   @id @default(cuid())
  code        String   @unique           // CPG-001, CPG-002...
  categoryId  String?
  description String
  amount      Float    @default(0)
  date        DateTime
  proofUrl    String   @default("")      // Hóa đơn chứng từ (R2)
  status      String   @default("draft") // draft | approved
  notes       String   @default("")
  createdById String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  deletedAt   DateTime?

  category    ExpenseCategory? @relation(fields: [categoryId], references: [id])
  batchItems  OverheadBatchItem[]
}
```

### OverheadBatch
Đợt phân bổ theo tháng (hoặc thủ công).

```prisma
model OverheadBatch {
  id          String   @id @default(cuid())
  code        String   @unique           // CPG-2026-03
  name        String                     // "Chi phí chung tháng 3/2026"
  period      String?                    // "2026-03" (YYYY-MM), null nếu thủ công
  totalAmount Float    @default(0)       // Tổng các khoản đưa vào đợt
  status      String   @default("draft") // draft | confirmed
  notes       String   @default("")
  createdById String
  confirmedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  items       OverheadBatchItem[]
  allocations OverheadAllocation[]
}
```

### OverheadBatchItem
Khoản chi phí được chọn đưa vào đợt (many-to-many).

```prisma
model OverheadBatchItem {
  id         String @id @default(cuid())
  batchId    String
  expenseId  String
  amount     Float  @default(0)  // Có thể khác OverheadExpense.amount nếu chỉ tính 1 phần

  batch      OverheadBatch   @relation(fields: [batchId], references: [id])
  expense    OverheadExpense @relation(fields: [expenseId], references: [id])

  @@unique([batchId, expenseId])
}
```

### OverheadAllocation
Kết quả phân bổ per-project sau khi confirmed.

```prisma
model OverheadAllocation {
  id         String  @id @default(cuid())
  batchId    String
  projectId  String
  ratio      Float                        // 0.35 = 35%
  amount     Float                        // totalAmount × ratio
  isOverride Boolean @default(false)      // Kế toán đã sửa tay?
  notes      String  @default("")
  createdAt  DateTime @default(now())

  batch      OverheadBatch @relation(fields: [batchId], references: [id])
  project    Project       @relation(fields: [projectId], references: [id])

  @@unique([batchId, projectId])
}
```

## API Routes

### Chi phí chung (OverheadExpense)
- `GET /api/overhead/expenses?month=2026-03&status=&categoryId=` — Danh sách, filter theo tháng/status/category
- `POST /api/overhead/expenses` — Tạo mới (auto-generate code CPG-001)
- `PUT /api/overhead/expenses/[id]` — Sửa (chỉ khi status=draft)
- `DELETE /api/overhead/expenses/[id]` — Xóa mềm (chỉ khi status=draft)
- `PATCH /api/overhead/expenses/[id]/approve` — Duyệt (ke_toan trở lên)

### Đợt phân bổ (OverheadBatch)
- `GET /api/overhead/batches` — Danh sách đợt phân bổ
- `POST /api/overhead/batches` — Tạo đợt mới (kèm danh sách expenseIds)
- `GET /api/overhead/batches/[id]` — Chi tiết đợt + items + allocations
- `PUT /api/overhead/batches/[id]` — Sửa đợt (chỉ draft)
- `DELETE /api/overhead/batches/[id]` — Xóa đợt (chỉ draft)
- `POST /api/overhead/batches/[id]/calculate` — Tính tỷ lệ tự động theo doanh thu dự án trong kỳ
- `POST /api/overhead/batches/[id]/confirm` — Xác nhận đợt → confirmed (không sửa được)

### Logic tính tỷ lệ tự động
1. Lấy `period` của batch (VD: "2026-03")
2. Query tất cả `ProjectPayment` có `paidDate` trong tháng đó, group by projectId → `projectRevenue`
3. Bỏ qua dự án có revenue = 0 (hoặc include tất cả dự án đang hoạt động nếu tháng đó không có thu)
4. `ratio = projectRevenue / totalRevenue`
5. `amount = batch.totalAmount × ratio`
6. Trả về mảng `{ projectId, projectName, projectCode, revenue, ratio, amount }` để kế toán review

## Giao diện — `/overhead`

### Tab 1: Chi phí chung
- Danh sách khoản chi, filter theo tháng (mặc định tháng hiện tại) và category
- Mỗi hàng: code, mô tả, category, ngày, số tiền, status badge, [📎 hóa đơn] nếu có, nút Sửa/Xóa (draft), nút Duyệt
- Nút **"+ Thêm chi phí"** → modal form:
  - Category (dropdown từ ExpenseCategory)
  - Mô tả
  - Số tiền
  - Ngày phát sinh
  - Upload hóa đơn (tùy chọn, lên R2)
  - Ghi chú
- Summary cards: Tổng tháng, Đã duyệt, Chưa duyệt

### Tab 2: Đợt phân bổ
- Danh sách đợt: code, tên, kỳ, tổng CP, số dự án, status, [Xem]/[Sửa]/[Xóa]
- Nút **"+ Tạo đợt phân bổ"** → flow 2 bước:

  **Bước 1 — Chọn chi phí:**
  - Chọn kỳ (tháng/năm)
  - Hiển thị danh sách OverheadExpense đã duyệt trong tháng (tick chọn)
  - Tổng số tiền đã chọn hiển thị realtime
  - Nhập tên đợt, ghi chú

  **Bước 2 — Phân bổ:**
  - Bấm "Tính tỷ lệ tự động" → gọi `/calculate`
  - Hiển thị bảng: Dự án | Doanh thu kỳ | Tỷ lệ% | Phân bổ (đ) | [✏️ Sửa]
  - Khi sửa tỷ lệ một dự án: phần còn lại (100% - tổng các dự án đã override) chia đều cho các dự án chưa override theo tỷ lệ doanh thu tương đối. Đánh dấu isOverride=true cho dự án đã sửa tay
  - Bấm **"Xác nhận phân bổ"** → gọi `/confirm` → readonly

## Báo cáo

### P&L Dự án (bổ sung vào project detail)
Thêm section "Chi phí chung phân bổ" vào tab tài chính của dự án:
```
Doanh thu hợp đồng:           500,000,000
Chi phí trực tiếp:           (320,000,000)
Chi phí chung phân bổ:        (18,945,000)   ← tổng OverheadAllocation.amount của dự án
─────────────────────────────────────────
Lợi nhuận gộp:                161,055,000  (32.2%)
```

### P&L Công ty (tab mới trong `/reports`)
- Tổng doanh thu tất cả dự án (theo kỳ chọn)
- Tổng chi phí trực tiếp (ProjectExpense)
- Tổng chi phí chung (OverheadAllocation confirmed trong kỳ)
- Lợi nhuận ròng = Doanh thu - CP trực tiếp - CP chung
- Breakdown per-project dạng bảng

## Phân quyền
- Xem: tất cả role
- Thêm/sửa OverheadExpense: `ke_toan`, `pho_gd`, `giam_doc`
- Duyệt OverheadExpense: `ke_toan`, `pho_gd`, `giam_doc`
- Tạo/sửa/xóa OverheadBatch: `ke_toan`, `pho_gd`, `giam_doc`
- Xác nhận batch: `pho_gd`, `giam_doc`

## Auto-generate Code
- `OverheadExpense.code`: `CPG-001`, `CPG-002`... (dùng `generateCode` pattern hiện có)
- `OverheadBatch.code`: `CPGB-2026-03` (tháng có period) hoặc `CPGB-001` (thủ công)

## Sidebar
Thêm mục "Chi phí chung" vào nhóm Finance trong `components/Sidebar.js`, icon 🏢, route `/overhead`, phân quyền `canViewFinance`.
