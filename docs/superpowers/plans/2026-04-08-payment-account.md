# Payment Account Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `paymentAccount` field ("Tiền mặt" or "Ngân hàng") to all payment vouchers and receipts so the accountant knows which cash/bank account each transaction uses.

**Architecture:** Add `paymentAccount String @default("")` to 6 existing Prisma models with a single migration. Update 3 Zod validation schemas to accept the field. Update 3 API routes that use inline (non-Zod) validation. Add a dropdown and badge to 4 UI forms/lists. No new tables, no CRUD for accounts.

**Tech Stack:** Next.js 16 App Router, Prisma 6, Zod 4, React 19, Vitest

---

## File Map

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `paymentAccount` to 6 models |
| `lib/validations/expense.js` | Add `paymentAccount` to create + update schemas |
| `lib/validations/overhead.js` | Add `paymentAccount` to expense create + update schemas |
| `lib/validations/transaction.js` | Add `paymentAccount` to create + update schemas |
| `__tests__/lib/validations.test.ts` | Add tests for paymentAccount in 3 schemas |
| `app/api/contractor-payments/route.js` | Destructure + pass `paymentAccount` |
| `app/api/contracts/[id]/payments/[paymentId]/route.js` | Accept `paymentAccount` in PUT |
| `app/api/debt/ncc/route.js` | Pass `paymentAccount` to SupplierPayment.create |
| `components/finance/ExpensesTab.js` | Dropdown in form + badge in list |
| `components/finance/ReceivablesTab.js` | Dropdown in confirmModal + include in PUT |
| `app/projects/[id]/tabs/ContractorTab.js` | Dropdown in create modal |
| `app/finance/page.js` | Dropdown in quick entry form |

---

## Task 1: Prisma Schema Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `paymentAccount` to 6 models in `prisma/schema.prisma`**

Find each model and add the field. The models are: `ProjectExpense`, `OverheadExpense`, `ContractorPayment`, `SupplierPayment`, `ContractPayment`, `Transaction`.

For `ProjectExpense` — add after `notes String @default("")`:
```prisma
  paymentAccount String @default("")
```

For `OverheadExpense` — add after `notes String @default("")`:
```prisma
  paymentAccount String @default("")
```

For `ContractorPayment` — add after `approvedBy String @default("")`:
```prisma
  paymentAccount String @default("")
```

For `SupplierPayment` — add after `notes String @default("")`:
```prisma
  paymentAccount String @default("")
```

For `ContractPayment` — add after `notes String @default("")`:
```prisma
  paymentAccount String @default("")
```

For `Transaction` — add after `projectId String?`:
```prisma
  paymentAccount String @default("")
```

- [ ] **Step 2: Run migration**

```bash
npm run db:migrate
```

Expected: Prisma creates a migration adding `paymentAccount` column to 6 tables. No errors.

- [ ] **Step 3: Regenerate Prisma client**

```bash
npm run db:generate
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/
git commit -m "feat(schema): add paymentAccount field to 6 payment models"
```

---

## Task 2: Validation Schema Updates + Tests

**Files:**
- Modify: `lib/validations/expense.js`
- Modify: `lib/validations/overhead.js`
- Modify: `lib/validations/transaction.js`
- Modify: `__tests__/lib/validations.test.ts`

- [ ] **Step 1: Write failing tests in `__tests__/lib/validations.test.ts`**

Add at the end of the file:

```typescript
import { expenseCreateSchema } from '@/lib/validations/expense';
import { overheadExpenseCreateSchema } from '@/lib/validations/overhead';
import { transactionCreateSchema } from '@/lib/validations/transaction';

describe('paymentAccount field', () => {
    it('expenseCreateSchema accepts Tiền mặt', () => {
        const result = expenseCreateSchema.parse({
            description: 'Test',
            amount: 100000,
            paymentAccount: 'Tiền mặt',
        });
        expect(result.paymentAccount).toBe('Tiền mặt');
    });

    it('expenseCreateSchema defaults to empty string', () => {
        const result = expenseCreateSchema.parse({
            description: 'Test',
            amount: 100000,
        });
        expect(result.paymentAccount).toBe('');
    });

    it('overheadExpenseCreateSchema accepts Ngân hàng', () => {
        const result = overheadExpenseCreateSchema.parse({
            description: 'Test',
            amount: 100000,
            paymentAccount: 'Ngân hàng',
        });
        expect(result.paymentAccount).toBe('Ngân hàng');
    });

    it('transactionCreateSchema accepts paymentAccount', () => {
        const result = transactionCreateSchema.parse({
            type: 'Thu',
            description: 'Test',
            amount: 100000,
            paymentAccount: 'Tiền mặt',
        });
        expect(result.paymentAccount).toBe('Tiền mặt');
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --reporter=verbose 2>&1 | tail -30
```

Expected: FAIL — `paymentAccount` is not a known field.

- [ ] **Step 3: Update `lib/validations/expense.js`**

In `expenseCreateSchema`, add after `proofUrl: optStr,`:
```javascript
paymentAccount: z.string().optional().default(''),
```

In `expenseUpdateSchema`, add after `recipientName: updStr,`:
```javascript
paymentAccount: updStr,
```

- [ ] **Step 4: Update `lib/validations/overhead.js`**

In `overheadExpenseCreateSchema`, add after `notes: optStr,`:
```javascript
paymentAccount: z.string().optional().default(''),
```

In `overheadExpenseUpdateSchema`, add after `notes: updStr,`:
```javascript
paymentAccount: updStr,
```

- [ ] **Step 5: Update `lib/validations/transaction.js`**

Replace the full file:
```javascript
import { z } from 'zod';
import { optStr, optDate, safePartial } from './common';

export const transactionCreateSchema = z.object({
    type: z.enum(['Thu', 'Chi']).default('Thu'),
    description: z.string().trim().min(1, 'Mô tả bắt buộc'),
    amount: z.number().min(0, 'Số tiền phải >= 0'),
    category: optStr,
    date: optDate,
    projectId: z.string().optional().nullable().default(null),
    paymentAccount: z.string().optional().default(''),
}).strict();

export const transactionUpdateSchema = safePartial(transactionCreateSchema);
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm test -- --reporter=verbose 2>&1 | tail -30
```

Expected: All `paymentAccount field` tests PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/validations/expense.js lib/validations/overhead.js lib/validations/transaction.js __tests__/lib/validations.test.ts
git commit -m "feat(validation): add paymentAccount to expense, overhead, transaction schemas"
```

---

## Task 3: API Route Updates (Non-Zod Routes)

The `project-expenses` and `overhead/expenses` APIs use Zod schemas directly (`expenseCreateSchema.parse(body)` and `overheadExpenseCreateSchema.parse(body)`) — once Task 2 is done, `paymentAccount` flows through automatically. Same for `app/api/finance` (Transaction). **No changes needed to those 3 routes.**

The 3 routes below use inline validation and need manual updates.

**Files:**
- Modify: `app/api/contractor-payments/route.js`
- Modify: `app/api/contracts/[id]/payments/[paymentId]/route.js`
- Modify: `app/api/debt/ncc/route.js`

- [ ] **Step 1: Update `app/api/contractor-payments/route.js` POST handler**

Find the destructuring line in POST:
```javascript
const { contractorId, projectId, contractAmount, paidAmount, description, dueDate, status,
    phase, netAmount, retentionRate, retentionAmount, items } = body;
```

Replace with:
```javascript
const { contractorId, projectId, contractAmount, paidAmount, description, dueDate, status,
    phase, netAmount, retentionRate, retentionAmount, items, paymentAccount } = body;
```

Then in `tx.contractorPayment.create({ data: { ... } })`, add after `status: status || 'pending_technical',`:
```javascript
paymentAccount: paymentAccount || '',
```

- [ ] **Step 2: Update `app/api/contracts/[id]/payments/[paymentId]/route.js` PUT handler**

Find the `updateData` block (around line 10-15). Add after `if (data.paidDate !== undefined)...`:
```javascript
if (data.paymentAccount !== undefined) updateData.paymentAccount = data.paymentAccount;
```

- [ ] **Step 3: Update `app/api/debt/ncc/route.js` SupplierPayment.create**

Find:
```javascript
const body = await request.json();
const { supplierId, amount, date, notes } = body;
```
(Note: the actual destructuring may vary — check around the `SupplierPayment.create` call at line ~85-104)

Find the `SupplierPayment.create` data object and add `paymentAccount` alongside the other fields:
```javascript
const payment = await prisma.supplierPayment.create({
    data: {
        code,
        supplierId,
        amount: Number(amount),
        date: date ? new Date(date) : new Date(),
        notes: notes ?? '',
        createdById: session.user.id,
        paymentAccount: body.paymentAccount || '',
    },
});
```

- [ ] **Step 4: Commit**

```bash
git add app/api/contractor-payments/route.js app/api/contracts/[id]/payments/[paymentId]/route.js app/api/debt/ncc/route.js
git commit -m "feat(api): pass paymentAccount through contractor, contract, supplier payment routes"
```

---

## Task 4: UI — ExpensesTab (Lệnh chi dự án)

**Files:**
- Modify: `components/finance/ExpensesTab.js`

- [ ] **Step 1: Add `paymentAccount` to initial form state**

Find the initial state (the `useState` for the form object — it has `description`, `amount`, `category`, etc.). Add `paymentAccount: ''` to the object.

The initial state looks like:
```javascript
const [form, setForm] = useState({
    description: '', amount: '', category: 'Khác', projectId: '',
    expenseType: 'Dự án', submittedBy: '', notes: '', date: new Date().toISOString().slice(0, 10),
    recipientType: '', recipientId: '', proofUrl: '',
});
```

Add `paymentAccount: ''` to this object:
```javascript
const [form, setForm] = useState({
    description: '', amount: '', category: 'Khác', projectId: '',
    expenseType: 'Dự án', submittedBy: '', notes: '', date: new Date().toISOString().slice(0, 10),
    recipientType: '', recipientId: '', proofUrl: '', paymentAccount: '',
});
```

Also find the reset call (after successful save, where form is reset) and add `paymentAccount: ''` there too.

- [ ] **Step 2: Add dropdown to the form modal**

In the form modal body, find the date field:
```jsx
<div>
    <label ...>Ngày</label>
    <input type="date" ... />
</div>
```

Add a new field after it:
```jsx
<div>
    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tài khoản</label>
    <select
        className="form-input"
        value={form.paymentAccount}
        onChange={e => setForm({ ...form, paymentAccount: e.target.value })}
    >
        <option value="">-- Chọn TK --</option>
        <option value="Tiền mặt">Tiền mặt</option>
        <option value="Ngân hàng">Ngân hàng</option>
    </select>
</div>
```

- [ ] **Step 3: Add badge to the expense list**

Find where each expense row is rendered (the table row or list item showing code, description, amount). After the amount cell or status badge, add:

```jsx
{item.paymentAccount && (
    <span className="badge muted" style={{ fontSize: 10, marginLeft: 4 }}>
        {item.paymentAccount === 'Tiền mặt' ? 'TM' : 'NH'}
    </span>
)}
```

Place this wherever the expense's amount/status badges are shown.

- [ ] **Step 4: Verify form submits paymentAccount**

The `handleSubmit` builds payload as `{ ...form, ... }`. Since `paymentAccount` is in form state, it will be included automatically. No change needed to handleSubmit.

- [ ] **Step 5: Commit**

```bash
git add components/finance/ExpensesTab.js
git commit -m "feat(ui): add paymentAccount dropdown and badge to ExpensesTab"
```

---

## Task 5: UI — ReceivablesTab (Thu tiền KH)

**Files:**
- Modify: `components/finance/ReceivablesTab.js`

- [ ] **Step 1: Add `paymentAccount` to confirmModal initial state**

Find `startCollect` (around line 150):
```javascript
const startCollect = (payment) => {
    setConfirmModal({ payment, file: null, amount: (payment.amount || 0) - (payment.paidAmount || 0) });
};
```

Replace with:
```javascript
const startCollect = (payment) => {
    setConfirmModal({ payment, file: null, amount: (payment.amount || 0) - (payment.paidAmount || 0), paymentAccount: '' });
};
```

- [ ] **Step 2: Add dropdown to confirmModal UI**

In the confirmModal JSX (around line 517-570), find the `form-group` for "Số tiền thu". Add a new `form-group` after it (before the proof upload section):

```jsx
<div className="form-group">
    <label className="form-label">Tài khoản thanh toán</label>
    <select
        className="form-input"
        value={confirmModal.paymentAccount}
        onChange={e => setConfirmModal(prev => ({ ...prev, paymentAccount: e.target.value }))}
    >
        <option value="">-- Chọn TK --</option>
        <option value="Tiền mặt">Tiền mặt</option>
        <option value="Ngân hàng">Ngân hàng</option>
    </select>
</div>
```

- [ ] **Step 3: Include `paymentAccount` in the PUT call**

Find `confirmCollect` (around line 200-219). The PUT body is:
```javascript
body: JSON.stringify({ paidAmount: newPaid, status: newPaid >= p.amount ? 'Đã thu' : 'Thu một phần', proofUrl: uploadJson.url, paidDate: new Date().toISOString() }),
```

Replace with:
```javascript
body: JSON.stringify({
    paidAmount: newPaid,
    status: newPaid >= p.amount ? 'Đã thu' : 'Thu một phần',
    proofUrl: uploadJson.url,
    paidDate: new Date().toISOString(),
    paymentAccount: confirmModal.paymentAccount || '',
}),
```

- [ ] **Step 4: Commit**

```bash
git add components/finance/ReceivablesTab.js
git commit -m "feat(ui): add paymentAccount to ReceivablesTab collect modal"
```

---

## Task 6: UI — ContractorTab (Thanh toán thầu phụ)

**Files:**
- Modify: `app/projects/[id]/tabs/ContractorTab.js`

- [ ] **Step 1: Add `paymentAccount` to form state**

Find the initial form state (around line 7):
```javascript
const [form, setForm] = useState({ contractorId: '', contractAmount: '', paidAmount: '0', description: '', dueDate: '', status: 'Chưa TT' });
```

Replace with:
```javascript
const [form, setForm] = useState({ contractorId: '', contractAmount: '', paidAmount: '0', description: '', dueDate: '', status: 'Chưa TT', paymentAccount: '' });
```

Also find where `setForm` is called to reset (around line 24):
```javascript
setForm({ contractorId: '', contractAmount: '', paidAmount: '0', description: '', dueDate: '', status: 'Chưa TT' });
```

Add `paymentAccount: ''` there too.

- [ ] **Step 2: Add dropdown to modal form**

In the modal form (around line 141+), find the date/status fields. Add a new field after the `dueDate` field:

```jsx
<div>
    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tài khoản TT</label>
    <select
        className="form-input"
        value={form.paymentAccount}
        onChange={e => setForm({ ...form, paymentAccount: e.target.value })}
    >
        <option value="">-- Chọn TK --</option>
        <option value="Tiền mặt">Tiền mặt</option>
        <option value="Ngân hàng">Ngân hàng</option>
    </select>
</div>
```

- [ ] **Step 3: Verify form submits paymentAccount**

The `create` function (line 32-36) sends `{ ...form, projectId, ... }`. Since `paymentAccount` is in form state, it is included automatically. No change needed.

- [ ] **Step 4: Commit**

```bash
git add "app/projects/[id]/tabs/ContractorTab.js"
git commit -m "feat(ui): add paymentAccount to ContractorTab payment form"
```

---

## Task 7: UI — Finance Quick Entry (Giao dịch nhanh)

**Files:**
- Modify: `app/finance/page.js`

- [ ] **Step 1: Add `paymentAccount` to `qForm` initial state**

Find (around line 38):
```javascript
const [qForm, setQForm] = useState({ type: 'Thu', description: '', amount: '', category: '', date: new Date().toISOString().slice(0, 10) });
```

Replace with:
```javascript
const [qForm, setQForm] = useState({ type: 'Thu', description: '', amount: '', category: '', date: new Date().toISOString().slice(0, 10), paymentAccount: '' });
```

Also find the reset after `saveQuickEntry` (around line 83):
```javascript
setQForm({ type: 'Thu', description: '', amount: '', category: '', date: new Date().toISOString().slice(0, 10) });
```

Add `paymentAccount: ''` there too.

- [ ] **Step 2: Add dropdown to quick entry form**

In the quick entry form grid (around line 111-136), add a new field after the date field:

```jsx
<div>
    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tài khoản</label>
    <select
        className="form-input"
        value={qForm.paymentAccount}
        onChange={e => setQForm({ ...qForm, paymentAccount: e.target.value })}
    >
        <option value="">-- Chọn TK --</option>
        <option value="Tiền mặt">Tiền mặt</option>
        <option value="Ngân hàng">Ngân hàng</option>
    </select>
</div>
```

- [ ] **Step 3: Verify POST includes paymentAccount**

The `saveQuickEntry` sends `{ ...qForm, type, amount: Number(qForm.amount), date: ... }`. Since `paymentAccount` is in `qForm`, it is included automatically. No change needed.

- [ ] **Step 4: Commit**

```bash
git add app/finance/page.js
git commit -m "feat(ui): add paymentAccount to finance quick entry form"
```

---

## Task 8: Build + Push

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: All tests pass (including the new paymentAccount tests from Task 2).

- [ ] **Step 2: Production build**

```bash
npm run build
```

Expected: Build completes with no errors.

- [ ] **Step 3: Push to deploy**

```bash
git push
```

Expected: GitHub Actions deploys successfully (~2-3 minutes).

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| Add paymentAccount to 6 models | Task 1 |
| Values: "Tiền mặt" / "Ngân hàng" / "" | Task 1 + Task 2 (default "") |
| Zod validation updated | Task 2 |
| project-expenses API | Automatic via Zod (Task 2) |
| overhead/expenses API | Automatic via Zod (Task 2) |
| contractor-payments API | Task 3 |
| contracts/payments/[id] API | Task 3 |
| debt/ncc (SupplierPayment) API | Task 3 |
| Transaction API | Automatic via Zod (Task 2) |
| ExpensesTab dropdown + badge | Task 4 |
| ReceivablesTab dropdown | Task 5 |
| ContractorTab dropdown | Task 6 |
| Finance quick entry dropdown | Task 7 |
| SupplierDebtPayment / ContractorDebtPayment | Note: these models are created in the cong-no plan — add paymentAccount there |

**SupplierDebtPayment / ContractorDebtPayment:** These 2 models are in `docs/superpowers/plans/2026-04-08-cong-no-debt-tracking.md`. When implementing that plan, add `paymentAccount String @default("")` to both model definitions and add the dropdown to the pay modals in `/cong-no`.
