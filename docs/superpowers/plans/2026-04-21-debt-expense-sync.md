# Debt ↔ Expense Sync (Phase B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đồng bộ hai chiều ProjectExpense ↔ SupplierDebt/ContractorDebt: tạo expense tự tạo debt, pay ở bên nào cũng update bên kia, delete cascade đúng.

**Architecture:** Thêm `expenseId` FK trên SupplierDebt + ContractorDebt. Sync logic tập trung ở API layer: POST/PUT/DELETE `/api/project-expenses` và POST `/api/debts/*/[id]/pay`. Soft-delete ProjectExpense thay hard delete.

**Tech Stack:** Next.js 16 App Router, Prisma 6, PostgreSQL, Zod 4.

---

## File Map

| File | Trách nhiệm |
|---|---|
| `prisma/schema.prisma` | + `expenseId` trên SupplierDebt + ContractorDebt, back-relations trên ProjectExpense |
| `prisma/migrations/20260421100000_debt_expense_link/migration.sql` | ALTER + FK + unique index |
| `app/api/project-expenses/route.js` | POST auto-create debt · PUT sync payment 2 chiều · DELETE soft + cascade |
| `app/api/debts/supplier/[id]/pay/route.js` | Sync ProjectExpense.paidAmount/status khi trả công nợ NCC |
| `app/api/debts/contractor/[id]/pay/route.js` | Same với thầu phụ |
| `app/api/inventory/receipts/[id]/route.js` | DELETE cascade soft-delete ProjectExpense giao thẳng chưa chi |

---

## Task 1: Schema — thêm expenseId link

**Files:**
- Modify: `prisma/schema.prisma` (model `SupplierDebt` ~line 2356, `ContractorDebt` ~line 2401, `ProjectExpense` ~line 950)
- Create: `prisma/migrations/20260421100000_debt_expense_link/migration.sql`

- [ ] **Step 1: Thêm `expenseId` + relation vào `SupplierDebt`**

Tìm `model SupplierDebt`, thêm sau các field (trước các relations):

```prisma
  expenseId   String?  @unique
  expense     ProjectExpense? @relation("SupplierDebtFromExpense", fields: [expenseId], references: [id], onDelete: SetNull)
```

- [ ] **Step 2: Thêm `expenseId` + relation vào `ContractorDebt`**

Tương tự trong `model ContractorDebt`:

```prisma
  expenseId   String?  @unique
  expense     ProjectExpense? @relation("ContractorDebtFromExpense", fields: [expenseId], references: [id], onDelete: SetNull)
```

- [ ] **Step 3: Thêm back-relations vào `ProjectExpense`**

Trong `model ProjectExpense`, thêm sau `allocations`:

```prisma
  supplierDebt    SupplierDebt?   @relation("SupplierDebtFromExpense")
  contractorDebt  ContractorDebt? @relation("ContractorDebtFromExpense")
```

- [ ] **Step 4: Tạo migration SQL**

Tạo file `prisma/migrations/20260421100000_debt_expense_link/migration.sql`:

```sql
ALTER TABLE "SupplierDebt" ADD COLUMN "expenseId" TEXT;
CREATE UNIQUE INDEX "SupplierDebt_expenseId_key" ON "SupplierDebt"("expenseId");
ALTER TABLE "SupplierDebt"
  ADD CONSTRAINT "SupplierDebt_expenseId_fkey"
  FOREIGN KEY ("expenseId") REFERENCES "ProjectExpense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ContractorDebt" ADD COLUMN "expenseId" TEXT;
CREATE UNIQUE INDEX "ContractorDebt_expenseId_key" ON "ContractorDebt"("expenseId");
ALTER TABLE "ContractorDebt"
  ADD CONSTRAINT "ContractorDebt_expenseId_fkey"
  FOREIGN KEY ("expenseId") REFERENCES "ProjectExpense"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

- [ ] **Step 5: Apply migration + regen**

```bash
cd d:/Codeapp/motnha && npx prisma migrate deploy && npm run db:generate
```

Expected: migration applied, Prisma Client regenerated.

- [ ] **Step 6: Verify**

```bash
cd d:/Codeapp/motnha && node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();(async()=>{const s=await p.supplierDebt.findFirst({select:{id:true,expenseId:true}});const c=await p.contractorDebt.findFirst({select:{id:true,expenseId:true}});console.log('SupplierDebt sample:',s);console.log('ContractorDebt sample:',c);await p.\$disconnect();})();"
```

Expected: 2 dòng có `expenseId: null` (record cũ).

- [ ] **Step 7: Commit**

```bash
cd d:/Codeapp/motnha && git add prisma/schema.prisma prisma/migrations/20260421100000_debt_expense_link/
git commit -m "feat(schema): link SupplierDebt + ContractorDebt ↔ ProjectExpense qua expenseId"
```

---

## Task 2: POST ProjectExpense — auto-create SupplierDebt/ContractorDebt

**Files:**
- Modify: `app/api/project-expenses/route.js` (POST handler ~line 50-83)

- [ ] **Step 1: Đọc file để locate POST**

```bash
cd d:/Codeapp/motnha && grep -n "export const POST" app/api/project-expenses/route.js
```

- [ ] **Step 2: Thêm logic auto-create Debt sau khi tạo expense**

Tìm block `const expense = await prisma.$transaction(async (tx) => { ... })` hoặc tương tự trong POST handler. Ngay sau khi transaction trả về `expense`, thêm:

```javascript
// Auto-tạo Debt nếu expense là công nợ NCC/Thầu phụ
const SKIP_AUTO_DEBT_TYPES = new Set(['Xuất kho', 'Nội bộ']);
if (
    expense.recipientType &&
    expense.recipientId &&
    !SKIP_AUTO_DEBT_TYPES.has(expense.expenseType) &&
    (expense.recipientType === 'NCC' || expense.recipientType === 'Thầu phụ')
) {
    try {
        if (expense.recipientType === 'NCC') {
            const { withCodeRetry } = await import('@/lib/generateCode');
            await withCodeRetry('supplierDebt', 'CN', (code) =>
                prisma.supplierDebt.create({
                    data: {
                        code,
                        supplierId: expense.recipientId,
                        projectId: expense.projectId || null,
                        description: expense.description,
                        totalAmount: expense.amount,
                        paidAmount: 0,
                        status: 'open',
                        date: expense.date,
                        notes: expense.notes || '',
                        proofUrl: expense.proofUrl || '',
                        createdById: session.user.id,
                        expenseId: expense.id,
                    },
                })
            );
        } else if (expense.recipientType === 'Thầu phụ') {
            const { withCodeRetry } = await import('@/lib/generateCode');
            // ContractorDebt yêu cầu projectId bắt buộc — skip nếu không có
            if (expense.projectId) {
                await withCodeRetry('contractorDebt', 'CNT', (code) =>
                    prisma.contractorDebt.create({
                        data: {
                            code,
                            contractorId: expense.recipientId,
                            projectId: expense.projectId,
                            description: expense.description,
                            totalAmount: expense.amount,
                            paidAmount: 0,
                            status: 'open',
                            date: expense.date,
                            notes: expense.notes || '',
                            proofUrl: expense.proofUrl || '',
                            createdById: session.user.id,
                            expenseId: expense.id,
                        },
                    })
                );
            }
        }
    } catch (e) {
        // Không fail expense nếu auto-debt lỗi (log để debug)
        console.warn('Auto-create debt failed:', e.message);
    }
}
```

- [ ] **Step 3: Thêm `supplierDebt` / `contractorDebt` vào `TABLE_MAP`** (nếu chưa có)

Check `lib/generateCode.js`. Nếu `supplierDebt` và `contractorDebt` đã có trong `TABLE_MAP` — skip. Nếu chưa — thêm. Kiểm tra:

```bash
cd d:/Codeapp/motnha && grep "supplierDebt\|contractorDebt" lib/generateCode.js
```

Expected: cả 2 keys đã có.

- [ ] **Step 4: Build check**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | grep -E "error|Error|✓ Compiled"
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 5: Manual test**

```bash
cd d:/Codeapp/motnha && npm run dev
```

Tạo expense mới qua UI `/finance` → Chi phí → + New:
- recipientType='NCC', recipientId=<supplier>, amount=100000
- Save → vào `/cong-no` tab NCC → thấy debt mới tự tạo với `code=CN###` và `expenseId` link với expense vừa tạo

Verify qua DB:
```bash
node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();(async()=>{const d=await p.supplierDebt.findFirst({where:{expenseId:{not:null}},orderBy:{createdAt:'desc'},include:{expense:{select:{code:true,description:true}}}});console.log(d);await p.\$disconnect();})();"
```

- [ ] **Step 6: Commit**

```bash
cd d:/Codeapp/motnha && git add app/api/project-expenses/route.js
git commit -m "feat(project-expenses): auto-create Debt khi recipientType=NCC/Thầu phụ"
```

---

## Task 3: PUT ProjectExpense — sync Debt + payment 2 chiều

**Files:**
- Modify: `app/api/project-expenses/route.js` (PUT handler ~line 88-156)

- [ ] **Step 1: Sync Debt khi sửa amount/description/date**

Trong PUT handler, sau khi update expense (`const updated = await tx.projectExpense.update(...)` hoặc tương tự), trước khi return, thêm:

```javascript
// Sync với Debt liên kết nếu có
const linkedSupplierDebt = await prisma.supplierDebt.findUnique({ where: { expenseId: id } });
const linkedContractorDebt = await prisma.contractorDebt.findUnique({ where: { expenseId: id } });

if (linkedSupplierDebt) {
    const newTotal = updateData.amount ?? existing.amount;
    if (newTotal < linkedSupplierDebt.paidAmount) {
        return NextResponse.json({
            error: `Không thể giảm số tiền (${newTotal}) xuống dưới số đã trả (${linkedSupplierDebt.paidAmount})`,
        }, { status: 422 });
    }
    await prisma.supplierDebt.update({
        where: { id: linkedSupplierDebt.id },
        data: {
            totalAmount: newTotal,
            description: updateData.description ?? existing.description,
            date: updateData.date ? new Date(updateData.date) : existing.date,
        },
    });
}
if (linkedContractorDebt) {
    const newTotal = updateData.amount ?? existing.amount;
    if (newTotal < linkedContractorDebt.paidAmount) {
        return NextResponse.json({
            error: `Không thể giảm số tiền xuống dưới số đã trả thầu phụ`,
        }, { status: 422 });
    }
    await prisma.contractorDebt.update({
        where: { id: linkedContractorDebt.id },
        data: {
            totalAmount: newTotal,
            description: updateData.description ?? existing.description,
            date: updateData.date ? new Date(updateData.date) : existing.date,
        },
    });
}
```

> Note: đặt block này sau phần tạo SupplierPayment (block `if (updateData.status === 'Đã chi' && ...)`), không trong transaction của allocations.

- [ ] **Step 2: Sync Debt payment khi expense → 'Đã chi'**

Tìm block hiện tại (line ~134-153) tạo `SupplierPayment`. Sau khi tạo SupplierPayment thành công, thêm:

```javascript
// Đồng bộ SupplierDebtPayment nếu có linked supplierDebt
if (linkedSupplierDebt) {
    const payAmount = updateData.amount ?? existing.amount;
    const { generateCode } = await import('@/lib/generateCode');
    const paymentCode = await generateCode('supplierDebtPayment', 'TTNCC');
    await prisma.supplierDebtPayment.create({
        data: {
            code: paymentCode,
            debtId: linkedSupplierDebt.id,
            amount: payAmount,
            date: updateData.date ? new Date(updateData.date) : existing.date,
            notes: existing.description || '',
            proofUrl: updateData.proofUrl ?? existing.proofUrl ?? '',
            paymentAccount: updateData.paymentAccount ?? existing.paymentAccount ?? '',
            createdById: session.user.id,
        },
    });
    const newPaid = (linkedSupplierDebt.paidAmount || 0) + payAmount;
    const newStatus = newPaid >= linkedSupplierDebt.totalAmount ? 'paid'
        : newPaid > 0 ? 'partial' : 'open';
    await prisma.supplierDebt.update({
        where: { id: linkedSupplierDebt.id },
        data: { paidAmount: newPaid, status: newStatus },
    });
}
```

Tương tự cho `linkedContractorDebt` với model `contractorDebtPayment` (code prefix `TTTP`):

```javascript
if (linkedContractorDebt) {
    const payAmount = updateData.amount ?? existing.amount;
    const { generateCode } = await import('@/lib/generateCode');
    const paymentCode = await generateCode('contractorDebtPayment', 'TTTP');
    await prisma.contractorDebtPayment.create({
        data: {
            code: paymentCode,
            debtId: linkedContractorDebt.id,
            amount: payAmount,
            date: updateData.date ? new Date(updateData.date) : existing.date,
            notes: existing.description || '',
            proofUrl: updateData.proofUrl ?? existing.proofUrl ?? '',
            paymentAccount: updateData.paymentAccount ?? existing.paymentAccount ?? '',
            createdById: session.user.id,
        },
    });
    const newPaid = (linkedContractorDebt.paidAmount || 0) + payAmount;
    const newStatus = newPaid >= linkedContractorDebt.totalAmount ? 'paid'
        : newPaid > 0 ? 'partial' : 'open';
    await prisma.contractorDebt.update({
        where: { id: linkedContractorDebt.id },
        data: { paidAmount: newPaid, status: newStatus },
    });
}
```

- [ ] **Step 3: Verify TABLE_MAP có `contractorDebtPayment`**

```bash
cd d:/Codeapp/motnha && grep "contractorDebtPayment\|supplierDebtPayment" lib/generateCode.js
```

Expected: cả 2 đã có.

- [ ] **Step 4: Build + manual test**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | grep -E "error|Error|✓ Compiled"
```

Test: tạo expense NCC → có debt linked → đổi status expense → 'Đã chi' → refresh /cong-no → debt phải có `paidAmount=full`, `status='paid'`, trong lịch sử TT có payment mới code `TTNCC###`.

- [ ] **Step 5: Commit**

```bash
cd d:/Codeapp/motnha && git add app/api/project-expenses/route.js
git commit -m "feat(project-expenses): PUT sync debt totalAmount + auto-tạo DebtPayment khi Đã chi"
```

---

## Task 4: DELETE ProjectExpense — soft-delete + cascade

**Files:**
- Modify: `app/api/project-expenses/route.js` (DELETE handler ~line 158-164)

- [ ] **Step 1: Đọc DELETE hiện tại + thay bằng soft-delete**

Tìm `export const DELETE = ...`. Thay toàn bộ handler bằng:

```javascript
export const DELETE = withAuth(async (request, _ctx, session) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const expense = await prisma.projectExpense.findUnique({
        where: { id },
        include: { supplierDebt: true, contractorDebt: true },
    });
    if (!expense) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

    // Chặn nếu linked debt đã có thanh toán
    if (expense.supplierDebt && expense.supplierDebt.paidAmount > 0) {
        return NextResponse.json({
            error: `Công nợ NCC ${expense.supplierDebt.code} đã có thanh toán ${expense.supplierDebt.paidAmount}. Hủy thanh toán trước khi xóa.`,
        }, { status: 422 });
    }
    if (expense.contractorDebt && expense.contractorDebt.paidAmount > 0) {
        return NextResponse.json({
            error: `Công nợ thầu phụ ${expense.contractorDebt.code} đã có thanh toán. Hủy thanh toán trước khi xóa.`,
        }, { status: 422 });
    }

    await prisma.$transaction(async (tx) => {
        // Xóa linked debt (chưa trả) — hard delete vì không có deletedAt field
        if (expense.supplierDebt) {
            await tx.supplierDebt.delete({ where: { id: expense.supplierDebt.id } });
        }
        if (expense.contractorDebt) {
            await tx.contractorDebt.delete({ where: { id: expense.contractorDebt.id } });
        }

        // Xóa linked InventoryTransaction (nếu expense từ xuất kho)
        if (expense.expenseType === 'Xuất kho') {
            await tx.inventoryTransaction.deleteMany({
                where: { note: { contains: `Phiếu xuất kho ${expense.code}` } },
            });
        }

        // Soft-delete expense
        await tx.projectExpense.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    });

    return NextResponse.json({ ok: true });
}, { roles: ['giam_doc', 'ke_toan'] });
```

> **Quan trọng**: Sau khi chuyển sang soft-delete, cần đảm bảo các GET endpoints filter `deletedAt: null`. Kiểm tra:

```bash
cd d:/Codeapp/motnha && grep -n "projectExpense.findMany\|projectExpense.findUnique" app/api/project-expenses/route.js
```

Nếu findMany không filter `deletedAt: null` → thêm vào WHERE.

- [ ] **Step 2: Verify GET filter deletedAt**

Ở GET handler trong cùng file, đảm bảo `where` có `deletedAt: null`:

```javascript
const where = { deletedAt: null };
// ... các filter khác
```

Nếu chưa có, thêm vào.

- [ ] **Step 3: Build + manual test**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | grep -E "error|Error|✓ Compiled"
```

Test:
1. Tạo expense NCC → có debt linked
2. Xóa expense → debt tự xóa, expense `deletedAt` set
3. List chi phí không thấy expense đã xóa

- [ ] **Step 4: Commit**

```bash
cd d:/Codeapp/motnha && git add app/api/project-expenses/route.js
git commit -m "feat(project-expenses): DELETE soft-delete + cascade debt + inventoryTransaction"
```

---

## Task 5: SupplierDebt pay → sync ProjectExpense

**Files:**
- Modify: `app/api/debts/supplier/[id]/pay/route.js` (POST handler)

- [ ] **Step 1: Thêm sync ProjectExpense sau khi pay xong**

Trong transaction, sau khi đã tạo SupplierDebtPayment + update SupplierDebt + tạo SupplierPayment, trước return, thêm:

```javascript
// Sync với ProjectExpense nếu debt có link
const debt = await tx.supplierDebt.findUnique({
    where: { id: params_id }, // dùng biến id local
    select: { expenseId: true, paidAmount: true, totalAmount: true },
});
if (debt?.expenseId) {
    const expense = await tx.projectExpense.findUnique({
        where: { id: debt.expenseId },
        select: { status: true, paidAmount: true, amount: true, deletedAt: true },
    });
    // Skip nếu expense đã deleted hoặc hoàn thành
    if (expense && !expense.deletedAt && expense.status !== 'Hoàn thành') {
        const newExpensePaid = (expense.paidAmount || 0) + payAmount; // payAmount là số vừa trả
        const newExpenseStatus = newExpensePaid >= expense.amount ? 'Đã chi' : expense.status;
        await tx.projectExpense.update({
            where: { id: debt.expenseId },
            data: {
                paidAmount: newExpensePaid,
                status: newExpenseStatus,
            },
        });
    }
}
```

> Đọc code hiện tại để hiểu biến name. Thay `payAmount` bằng tên biến số tiền trả trong scope, `params_id` bằng `id` hoặc `(await params).id`.

- [ ] **Step 2: Build + manual test**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | grep -E "error|Error|✓ Compiled"
```

Test: tạo expense NCC → debt linked. Không đổi status expense. Vào `/cong-no` → Ghi nhận TT cho debt đó (trả full) → verify:
- Debt `paidAmount=full, status=paid`
- Expense `paidAmount=full, status='Đã chi'`

- [ ] **Step 3: Commit**

```bash
cd d:/Codeapp/motnha && git add "app/api/debts/supplier/[id]/pay/route.js"
git commit -m "feat(debt-supplier): sync ProjectExpense.paidAmount/status khi pay debt"
```

---

## Task 6: ContractorDebt pay → sync ProjectExpense

**Files:**
- Modify: `app/api/debts/contractor/[id]/pay/route.js`

- [ ] **Step 1: Thêm sync tương tự Task 5**

Code giống hệt Task 5 Step 1 nhưng đổi model `supplierDebt` → `contractorDebt`:

```javascript
const debt = await tx.contractorDebt.findUnique({
    where: { id },
    select: { expenseId: true, paidAmount: true, totalAmount: true },
});
if (debt?.expenseId) {
    const expense = await tx.projectExpense.findUnique({
        where: { id: debt.expenseId },
        select: { status: true, paidAmount: true, amount: true, deletedAt: true },
    });
    if (expense && !expense.deletedAt && expense.status !== 'Hoàn thành') {
        const newExpensePaid = (expense.paidAmount || 0) + payAmount;
        const newExpenseStatus = newExpensePaid >= expense.amount ? 'Đã chi' : expense.status;
        await tx.projectExpense.update({
            where: { id: debt.expenseId },
            data: { paidAmount: newExpensePaid, status: newExpenseStatus },
        });
    }
}
```

- [ ] **Step 2: Build + commit**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | grep -E "error|Error|✓ Compiled"
cd d:/Codeapp/motnha && git add "app/api/debts/contractor/[id]/pay/route.js"
git commit -m "feat(debt-contractor): sync ProjectExpense khi pay debt"
```

---

## Task 7: GoodsReceipt DELETE → cascade soft-delete ProjectExpense giao thẳng

**Files:**
- Modify: `app/api/inventory/receipts/[id]/route.js` (DELETE handler ~line 140-177)

- [ ] **Step 1: Thêm cascade soft-delete ProjectExpense giao thẳng chưa chi**

Trong DELETE handler transaction, sau khi reverse stock + deleteMany InventoryTransaction, trước khi delete goodsReceipt, thêm:

```javascript
// Cascade soft-delete ProjectExpense "Giao thẳng" chưa chi liên quan PO này
if (receipt.purchaseOrderId) {
    const po = await tx.purchaseOrder.findUnique({
        where: { id: receipt.purchaseOrderId },
        select: { code: true },
    });
    if (po) {
        await tx.projectExpense.updateMany({
            where: {
                description: { startsWith: '[GRN]', endsWith: `— ${po.code}` },
                status: 'Chờ thanh toán',
                deletedAt: null,
            },
            data: { deletedAt: new Date() },
        });
        // Xóa SupplierDebt linked (chưa trả) để không trôi
        const expensesToCleanup = await tx.projectExpense.findMany({
            where: {
                description: { startsWith: '[GRN]', endsWith: `— ${po.code}` },
                deletedAt: { not: null },
            },
            select: { id: true, supplierDebt: { select: { id: true, paidAmount: true } } },
        });
        for (const exp of expensesToCleanup) {
            if (exp.supplierDebt && exp.supplierDebt.paidAmount === 0) {
                await tx.supplierDebt.delete({ where: { id: exp.supplierDebt.id } });
            }
        }
    }
}
```

- [ ] **Step 2: Build + manual test**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | grep -E "error|Error|✓ Compiled"
```

Test:
1. Tạo PO giao thẳng dự án 1 item, amount=1M → receive → có 1 ProjectExpense `[GRN] ... — PO###` + linked SupplierDebt
2. Xóa GRN → verify: ProjectExpense `deletedAt` set, SupplierDebt bị xóa

- [ ] **Step 3: Commit**

```bash
cd d:/Codeapp/motnha && git add "app/api/inventory/receipts/[id]/route.js"
git commit -m "feat(receipt-delete): cascade soft-delete ProjectExpense giao thẳng + SupplierDebt chưa trả"
```

---

## Task 8: E2E smoke test + push

- [ ] **Step 1: Full test flow**

```bash
cd d:/Codeapp/motnha && npm run dev
```

Mỗi case verify qua Prisma Studio hoặc node script:

**Case 1: Tạo expense NCC → pay qua Chi phí**
1. `/finance` → Chi phí → + New: recipientType=NCC, recipientId=<nhà bích ngũ>, amount=500000, status=Chờ duyệt → Save
2. Vào DB: ProjectExpense code CP###, SupplierDebt code CN### với expenseId link
3. Vào `/finance` → Chi phí → edit expense → status='Đã chi' → Save
4. DB: Expense `paidAmount=500000, status=Đã chi`. Debt `paidAmount=500000, status=paid`. Có SupplierPayment và SupplierDebtPayment mới.

**Case 2: Tạo expense NCC → pay qua Công nợ**
1. Tạo expense giống case 1 nhưng giữ status=Chờ duyệt
2. Vào `/cong-no` → NCC → click debt → Ghi nhận TT trả full
3. Sau pay: Debt `paidAmount=full, status=paid`. Expense `paidAmount=full, status='Đã chi'`.

**Case 3: Tạo expense Thầu phụ với projectId**
1. + New: recipientType='Thầu phụ', recipientId=<thầu>, projectId=<dự án>, amount=2M
2. DB: ProjectExpense + ContractorDebt với expenseId link
3. Trả qua debt → verify sync expense.

**Case 4: Edit amount sau khi pay partial**
1. Expense amount=1M, đã trả 500k qua debt
2. Edit expense → amount=800k → OK (vì >= paid)
3. Edit expense → amount=400k → reject 422

**Case 5: Xóa expense chưa trả**
1. Expense + debt, chưa trả
2. Delete → expense `deletedAt` set, debt hard-delete → List Chi phí không còn expense

**Case 6: Xóa expense đã trả partial**
1. Expense + debt đã trả 300k/1M
2. Delete → reject 422 "Hủy thanh toán trước"

**Case 7: Xóa GRN giao thẳng**
1. Tạo PO giao thẳng → receive → expense `[GRN] ...` + debt
2. Mở Nhận hàng modal → xóa GRN
3. Verify: expense `deletedAt` set, debt hard-delete

- [ ] **Step 2: Build final**

```bash
cd d:/Codeapp/motnha && npm run build
```

Expected: build success.

- [ ] **Step 3: Push**

```bash
cd d:/Codeapp/motnha && git push origin main
```

- [ ] **Step 4: Fixup nếu có bug**

Nếu smoke test phát hiện bug → fix + commit với prefix `fix(debt-sync): ...` → push.
