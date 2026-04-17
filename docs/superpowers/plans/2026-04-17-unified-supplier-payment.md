# Unified Supplier Payment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khi lệnh chi có recipientType="NCC" và status → "Đã chi", backend tự tạo SupplierPayment để cập nhật công nợ NCC; nút "Ghi nhận TT" trong tab Công nợ trở thành shortcut mở form lệnh chi pre-filled.

**Architecture:** Thêm `expenseId` vào `SupplierPayment` để idempotency. PUT `/api/project-expenses` auto-creates SupplierPayment khi status→"Đã chi". `finance/page.js` orchestrate state để DebtTab có thể trigger mở ExpensesTab với NCC pre-filled.

**Tech Stack:** Next.js 15 App Router, Prisma 6, React 19, existing `withAuth()`, `generateCode()`, `apiFetch()`.

---

## File Map

| File | Thay đổi |
|------|---------|
| `prisma/schema.prisma` | Thêm `expenseId String? @unique` vào `SupplierPayment` |
| `app/api/project-expenses/route.js` | Auto-create SupplierPayment trong PUT khi status→"Đã chi" + recipientType="NCC" |
| `app/finance/page.js` | Thêm state `prefilledExpense`, callback `handleGhiNhanTT`, truyền vào DebtTab + ExpensesTab |
| `app/finance/tabs/DebtTab.js` | Nhận prop `onGhiNhanTT`, đổi nút "Ghi nhận TT" NCC sang gọi callback thay vì mở payModal |
| `components/finance/ExpensesTab.js` | Nhận prop `defaultValues`, khi mounted với defaultValues thì auto-open form |

---

## Task 1: Schema — Thêm expenseId vào SupplierPayment

**Files:**
- Modify: `prisma/schema.prisma` (tìm model SupplierPayment ~line 632)

- [ ] **Step 1: Thêm field expenseId**

Tìm block `model SupplierPayment` và thêm field:

```prisma
model SupplierPayment {
  id             String   @id @default(cuid())
  code           String   @unique
  supplierId     String
  amount         Float
  date           DateTime @default(now())
  notes          String   @default("")
  paymentAccount String   @default("")
  createdById    String?
  createdAt      DateTime @default(now())
  expenseId      String?  @unique
  supplier       Supplier @relation(fields: [supplierId], references: [id])
}
```

- [ ] **Step 2: Chạy migration**

```bash
npm run db:migrate
```

Expected: Migration thành công, không có lỗi.

- [ ] **Step 3: Verify schema**

```bash
npm run db:generate
```

Expected: Prisma Client regenerated, không lỗi.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(schema): add expenseId to SupplierPayment for idempotent link"
```

---

## Task 2: Backend — Auto-create SupplierPayment khi "Đã chi"

**Files:**
- Modify: `app/api/project-expenses/route.js` (PUT handler, line 88–127)

- [ ] **Step 1: Đọc expense hiện tại trước khi update**

Trong PUT handler, trước khi gọi `prisma.$transaction`, đọc expense để lấy `recipientType` và `recipientId`:

Thay đoạn hiện tại:
```javascript
const expense = await prisma.$transaction(async (tx) => {
    if (allocations !== undefined) {
        await tx.expenseAllocation.deleteMany({ where: { expenseId: id } });
        if (allocations.length > 0) {
            await tx.expenseAllocation.createMany({
                data: allocations.map(a => ({
                    expenseId: id,
                    projectId: a.projectId,
                    amount: a.amount || 0,
                    ratio: a.ratio || 0,
                    notes: a.notes || '',
                })),
            });
        }
    }
    return tx.projectExpense.update({ where: { id }, data: updateData });
});
return NextResponse.json(expense);
```

Bằng:
```javascript
const existing = await prisma.projectExpense.findUnique({ where: { id }, select: { recipientType: true, recipientId: true, amount: true, date: true, description: true } });

const expense = await prisma.$transaction(async (tx) => {
    if (allocations !== undefined) {
        await tx.expenseAllocation.deleteMany({ where: { expenseId: id } });
        if (allocations.length > 0) {
            await tx.expenseAllocation.createMany({
                data: allocations.map(a => ({
                    expenseId: id,
                    projectId: a.projectId,
                    amount: a.amount || 0,
                    ratio: a.ratio || 0,
                    notes: a.notes || '',
                })),
            });
        }
    }
    return tx.projectExpense.update({ where: { id }, data: updateData });
});

// Auto-create SupplierPayment khi status → "Đã chi" và là NCC
if (updateData.status === 'Đã chi' && existing?.recipientType === 'NCC' && existing?.recipientId) {
    const alreadyLinked = await prisma.supplierPayment.findUnique({ where: { expenseId: id } });
    if (!alreadyLinked) {
        const spCode = await generateCode('supplierPayment', 'SP');
        await prisma.supplierPayment.create({
            data: {
                code: spCode,
                supplierId: existing.recipientId,
                amount: updateData.amount ?? existing.amount,
                date: updateData.date ? new Date(updateData.date) : existing.date,
                notes: existing.description || '',
                expenseId: id,
                createdById: session.user.id,
            },
        });
    }
}

return NextResponse.json(expense);
```

- [ ] **Step 2: Verify generateCode import đã có**

Dòng 4 của file đã có: `import { generateCode } from '@/lib/generateCode';` — không cần thêm.

- [ ] **Step 3: Test thủ công**

1. Chạy `npm run dev`
2. Tạo lệnh chi với recipientType="NCC", chọn một NCC
3. Duyệt lệnh chi → Upload chứng từ → Chi (status → "Đã chi")
4. Vào tab Công nợ → kiểm tra "Đã trả" của NCC đó tăng lên đúng số tiền

- [ ] **Step 4: Commit**

```bash
git add app/api/project-expenses/route.js
git commit -m "feat(api): auto-create SupplierPayment when expense status→'Đã chi' for NCC"
```

---

## Task 3: Frontend — finance/page.js thêm pre-fill state

**Files:**
- Modify: `app/finance/page.js` (FinanceContent function)

- [ ] **Step 1: Thêm state và callback**

Trong `FinanceContent`, sau khai báo `[saving, setSaving]`, thêm:

```javascript
const [prefilledExpense, setPrefilledExpense] = useState(null);

const handleGhiNhanTT = (supplier) => {
    setPrefilledExpense({ recipientType: 'NCC', recipientId: supplier.id, recipientName: supplier.name });
    handleTabChange('chi_phi');
};
```

- [ ] **Step 2: Truyền callback xuống DebtTab**

Dòng hiện tại:
```javascript
{activeTab === 'cong_no' && <DebtTab summary={summary} retentions={retentions} supplierDebt={supplierDebt} />}
```

Sửa thành:
```javascript
{activeTab === 'cong_no' && <DebtTab summary={summary} retentions={retentions} supplierDebt={supplierDebt} onGhiNhanTT={handleGhiNhanTT} />}
```

- [ ] **Step 3: Truyền defaultValues xuống ExpensesTab + clear sau khi dùng**

Dòng hiện tại:
```javascript
{activeTab === 'chi_phi' && <div style={{ padding: 20 }}><ExpensesTab /></div>}
```

Sửa thành:
```javascript
{activeTab === 'chi_phi' && (
    <div style={{ padding: 20 }}>
        <ExpensesTab
            defaultValues={prefilledExpense}
            onDefaultValuesUsed={() => setPrefilledExpense(null)}
        />
    </div>
)}
```

- [ ] **Step 4: Commit**

```bash
git add app/finance/page.js
git commit -m "feat(finance): wire pre-fill state for NCC shortcut from DebtTab"
```

---

## Task 4: Frontend — DebtTab: đổi nút "Ghi nhận TT" NCC

**Files:**
- Modify: `app/finance/tabs/DebtTab.js`

- [ ] **Step 1: Nhận prop onGhiNhanTT**

Dòng hiện tại (line 6):
```javascript
export default function DebtTab({ summary, retentions, supplierDebt }) {
```

Sửa thành:
```javascript
export default function DebtTab({ summary, retentions, supplierDebt, onGhiNhanTT }) {
```

- [ ] **Step 2: Đổi nút "Ghi nhận TT" của NCC**

Tìm button "Ghi nhận TT" trong phần NCC (line ~217–219):
```javascript
<button className="btn btn-primary" style={{ padding: '3px 10px', fontSize: 12 }} onClick={() => openPayModal('ncc', s)}>
    Ghi nhận TT
</button>
```

Sửa thành:
```javascript
<button
    className="btn btn-primary"
    style={{ padding: '3px 10px', fontSize: 12 }}
    onClick={() => onGhiNhanTT ? onGhiNhanTT(s) : openPayModal('ncc', s)}
>
    Ghi nhận TT
</button>
```

> Giữ fallback `openPayModal` phòng khi component dùng độc lập.

- [ ] **Step 3: Commit**

```bash
git add app/finance/tabs/DebtTab.js
git commit -m "feat(debt-tab): Ghi nhận TT NCC calls onGhiNhanTT callback"
```

---

## Task 5: Frontend — ExpensesTab: nhận defaultValues và auto-open

**Files:**
- Modify: `components/finance/ExpensesTab.js`

- [ ] **Step 1: Nhận props defaultValues và onDefaultValuesUsed**

Dòng hiện tại (line 43):
```javascript
export default function ExpensesTab() {
```

Sửa thành:
```javascript
export default function ExpensesTab({ defaultValues, onDefaultValuesUsed }) {
```

- [ ] **Step 2: Thêm useEffect auto-open khi có defaultValues**

Sau block `useEffect(() => { fetchExpenses(); ... }, []);` (khoảng line 121–129), thêm:

```javascript
useEffect(() => {
    if (!defaultValues) return;
    const firstCat = categoryList.find(c => c.isActive !== false)?.name || '';
    setEditing(null);
    setForm({ ...emptyForm(firstCat), ...defaultValues });
    setAllocations([]);
    setIsHistorical(false);
    setFormProofFiles([]);
    setShowModal(true);
    onDefaultValuesUsed?.();
}, [defaultValues]);
```

> `defaultValues` thay đổi khi user click "Ghi nhận TT". Effect này chạy sau khi suppliers đã load (vì `defaultValues` chỉ set sau khi user click, không phải lúc mount).

- [ ] **Step 3: Test end-to-end**

1. Vào tab Công nợ
2. Click "Ghi nhận TT" của một NCC (VD: Văn Bích Ngũ)
3. Expect: chuyển sang tab Chi phí, form tạo lệnh chi mở, NCC đã được chọn sẵn
4. Nhập số tiền, mô tả → Lưu → kiểm tra lệnh chi có recipientType="NCC" + recipientId đúng

- [ ] **Step 4: Commit**

```bash
git add components/finance/ExpensesTab.js
git commit -m "feat(expenses-tab): auto-open form with pre-filled NCC when defaultValues provided"
```

---

## Task 6: Smoke test toàn bộ flow

- [ ] **Step 1: Full flow test**

1. Vào Công nợ → "Ghi nhận TT" NCC "Văn Bích Ngũ" → form mở đúng, NCC pre-filled
2. Nhập mô tả + số tiền → Lưu → lệnh chi "Chờ duyệt" xuất hiện trong danh sách Chi phí
3. Duyệt lệnh chi → KT upload chứng từ + chi (status → "Đã chi")
4. Vào Công nợ NCC → "Đã trả" của Văn Bích Ngũ tăng đúng số tiền
5. Tạo thêm 1 lệnh chi NCC khác, mark "Đã chi" lại → DB không tạo trùng SupplierPayment (check bằng Prisma Studio)

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: Build thành công, không có lỗi TypeScript hoặc module.

- [ ] **Step 3: Commit final**

```bash
git add -A
git commit -m "feat: unified NCC payment via lệnh chi — smoke test passed"
```
