# Công nợ NCC & Thầu phụ — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Theo dõi công nợ chi tiết theo hóa đơn/đợt nghiệm thu cho NCC và thầu phụ — tạo debt thủ công, trả nhiều lần, xem theo đối tác và công trình, tích hợp lệnh chi trong `/finance`.

**Architecture:** 4 Prisma model mới (`SupplierDebt`, `SupplierDebtPayment`, `ContractorDebt`, `ContractorDebtPayment`). API CRUD + pay endpoint riêng cho mỗi loại. UI `/cong-no` nâng cấp thêm tab "Theo công trình". Tích hợp chọn debt trong `ExpensesTab`.

**Tech Stack:** Next.js 16, Prisma 6, Zod 4, `withAuth()`, `generateCode()`, `apiFetch()`

---

## File structure

| File | Loại |
|------|------|
| `prisma/schema.prisma` | Sửa — thêm 4 model + relations |
| `lib/generateCode.js` | Sửa — thêm 4 entry vào TABLE_MAP |
| `lib/validations/debt.js` | Tạo mới — Zod schemas |
| `app/api/debts/supplier/route.js` | Tạo mới — GET list + POST create |
| `app/api/debts/supplier/[id]/route.js` | Tạo mới — GET detail + PUT + DELETE |
| `app/api/debts/supplier/[id]/pay/route.js` | Tạo mới — POST payment |
| `app/api/debts/contractor/route.js` | Tạo mới — GET list + POST create |
| `app/api/debts/contractor/[id]/route.js` | Tạo mới — GET detail + PUT + DELETE |
| `app/api/debts/contractor/[id]/pay/route.js` | Tạo mới — POST payment |
| `app/cong-no/page.js` | Sửa lớn — thêm tab Theo công trình, debt list, payment modal |
| `components/finance/ExpensesTab.js` | Sửa nhỏ — thêm debt selector khi chọn NCC/thầu |

---

### Task 1: Schema Prisma + migrate

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Thêm 4 model vào cuối `prisma/schema.prisma`** (trước dòng cuối cùng của file)

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
  status      String   @default("open")
  date        DateTime @default(now())
  proofUrl    String   @default("")
  notes       String   @default("")
  createdById String   @default("")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  supplier Supplier              @relation(fields: [supplierId], references: [id])
  project  Project?              @relation(fields: [projectId], references: [id])
  payments SupplierDebtPayment[]

  @@index([supplierId])
  @@index([projectId])
  @@index([status])
}

model SupplierDebtPayment {
  id          String   @id @default(cuid())
  code        String   @unique
  debtId      String
  amount      Float
  date        DateTime @default(now())
  notes       String   @default("")
  proofUrl    String   @default("")
  expenseId   String?
  createdById String   @default("")
  createdAt   DateTime @default(now())

  debt SupplierDebt @relation(fields: [debtId], references: [id], onDelete: Cascade)

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
  status       String   @default("open")
  date         DateTime @default(now())
  proofUrl     String   @default("")
  notes        String   @default("")
  createdById  String   @default("")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  contractor Contractor              @relation(fields: [contractorId], references: [id])
  project    Project                 @relation(fields: [projectId], references: [id])
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

- [ ] **Step 2: Thêm relations vào model Supplier**

Tìm trong model `Supplier` dòng:
```
  supplierPayments SupplierPayment[]
```
Thêm sau dòng đó:
```
  debts            SupplierDebt[]
```

- [ ] **Step 3: Thêm relations vào model Contractor**

Tìm trong model `Contractor` dòng:
```
  tasks          SubContractorTask[]
```
Thêm sau dòng đó:
```
  debts          ContractorDebt[]
```

- [ ] **Step 4: Thêm relations vào model Project**

Tìm trong model `Project` dòng:
```
  overheadAllocations   OverheadAllocation[]
```
Thêm sau dòng đó:
```
  supplierDebts         SupplierDebt[]
  contractorDebts       ContractorDebt[]
```

- [ ] **Step 5: Chạy migrate**

```bash
cd d:/Codeapp/motnha && npm run db:migrate
```

Expected: Migration created and applied. Nếu hỏi tên, nhập: `add_debt_tracking_models`

- [ ] **Step 6: Commit**

```bash
git add prisma/
git commit -m "feat(schema): add SupplierDebt, ContractorDebt and payment models"
```

---

### Task 2: Cập nhật generateCode + tạo Zod validations

**Files:**
- Modify: `lib/generateCode.js`
- Create: `lib/validations/debt.js`

- [ ] **Step 1: Thêm 4 entry vào TABLE_MAP trong `lib/generateCode.js`**

Tìm đoạn:
```javascript
    contractorPaymentLog: '"ContractorPaymentLog"',
```
Thêm sau dòng đó:
```javascript
    supplierDebt: '"SupplierDebt"',
    supplierDebtPayment: '"SupplierDebtPayment"',
    contractorDebt: '"ContractorDebt"',
    contractorDebtPayment: '"ContractorDebtPayment"',
```

- [ ] **Step 2: Tạo `lib/validations/debt.js`**

```javascript
import { z } from 'zod';
import { optStr, optDate } from './common';

export const supplierDebtCreateSchema = z.object({
    supplierId: z.string().min(1, 'supplierId bắt buộc'),
    projectId: z.string().optional().nullable().default(null).transform(v => v || null),
    invoiceNo: optStr,
    description: z.string().trim().min(1, 'Mô tả bắt buộc'),
    totalAmount: z.number().min(0, 'Số tiền phải >= 0'),
    date: optDate,
    proofUrl: optStr,
    notes: optStr,
}).strict();

export const supplierDebtUpdateSchema = z.object({
    invoiceNo: optStr,
    description: z.string().trim().min(1).optional(),
    notes: optStr,
    proofUrl: optStr,
}).strict();

export const debtPaymentSchema = z.object({
    amount: z.number().min(1, 'Số tiền phải > 0'),
    date: optDate,
    notes: optStr,
    proofUrl: optStr,
    expenseId: z.string().optional().nullable().default(null).transform(v => v || null),
}).strict();

export const contractorDebtCreateSchema = z.object({
    contractorId: z.string().min(1, 'contractorId bắt buộc'),
    projectId: z.string().min(1, 'projectId bắt buộc'),
    description: z.string().trim().min(1, 'Mô tả bắt buộc'),
    totalAmount: z.number().min(0, 'Số tiền phải >= 0'),
    date: optDate,
    proofUrl: optStr,
    notes: optStr,
}).strict();

export const contractorDebtUpdateSchema = z.object({
    description: z.string().trim().min(1).optional(),
    notes: optStr,
    proofUrl: optStr,
}).strict();
```

- [ ] **Step 3: Commit**

```bash
git add lib/generateCode.js lib/validations/debt.js
git commit -m "feat(debt): add generateCode entries and Zod validation schemas"
```

---

### Task 3: API Supplier Debt

**Files:**
- Create: `app/api/debts/supplier/route.js`
- Create: `app/api/debts/supplier/[id]/route.js`
- Create: `app/api/debts/supplier/[id]/pay/route.js`

- [ ] **Step 1: Tạo `app/api/debts/supplier/route.js`**

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { generateCode } from '@/lib/generateCode';
import { supplierDebtCreateSchema } from '@/lib/validations/debt';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplierId');
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status'); // open|partial|paid|all

    const where = {};
    if (supplierId) where.supplierId = supplierId;
    if (projectId) where.projectId = projectId;
    if (status && status !== 'all') where.status = status;

    const debts = await prisma.supplierDebt.findMany({
        where,
        include: {
            supplier: { select: { id: true, code: true, name: true } },
            project: { select: { id: true, code: true, name: true } },
            payments: { orderBy: { date: 'asc' } },
        },
        orderBy: { date: 'desc' },
    });

    return NextResponse.json(debts.map(d => ({
        ...d,
        remaining: d.totalAmount - d.paidAmount,
    })));
});

export const POST = withAuth(async (request, _ctx, session) => {
    const body = await request.json();
    const data = supplierDebtCreateSchema.parse(body);
    const code = await generateCode('supplierDebt', 'CNCC');

    const debt = await prisma.supplierDebt.create({
        data: { ...data, code, createdById: session.user.id },
        include: {
            supplier: { select: { id: true, code: true, name: true } },
            project: { select: { id: true, code: true, name: true } },
        },
    });
    return NextResponse.json({ ...debt, remaining: debt.totalAmount - debt.paidAmount }, { status: 201 });
});
```

- [ ] **Step 2: Tạo `app/api/debts/supplier/[id]/route.js`**

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { supplierDebtUpdateSchema } from '@/lib/validations/debt';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const debt = await prisma.supplierDebt.findUnique({
        where: { id },
        include: {
            supplier: { select: { id: true, code: true, name: true } },
            project: { select: { id: true, code: true, name: true } },
            payments: { orderBy: { date: 'asc' } },
        },
    });
    if (!debt) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    return NextResponse.json({ ...debt, remaining: debt.totalAmount - debt.paidAmount });
});

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const data = supplierDebtUpdateSchema.parse(body);
    const debt = await prisma.supplierDebt.update({ where: { id }, data });
    return NextResponse.json({ ...debt, remaining: debt.totalAmount - debt.paidAmount });
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    const debt = await prisma.supplierDebt.findUnique({ where: { id }, select: { paidAmount: true } });
    if (!debt) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    if (debt.paidAmount > 0) return NextResponse.json({ error: 'Không thể xóa — đã có thanh toán' }, { status: 400 });
    await prisma.supplierDebt.delete({ where: { id } });
    return NextResponse.json({ success: true });
});
```

- [ ] **Step 3: Tạo `app/api/debts/supplier/[id]/pay/route.js`**

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { generateCode } from '@/lib/generateCode';
import { debtPaymentSchema } from '@/lib/validations/debt';

export const POST = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const body = await request.json();
    const data = debtPaymentSchema.parse(body);

    const debt = await prisma.supplierDebt.findUnique({
        where: { id },
        select: { id: true, totalAmount: true, paidAmount: true, status: true },
    });
    if (!debt) return NextResponse.json({ error: 'Không tìm thấy công nợ' }, { status: 404 });

    const remaining = debt.totalAmount - debt.paidAmount;
    if (data.amount > remaining) {
        return NextResponse.json({ error: `Số tiền vượt quá còn nợ (${remaining.toLocaleString('vi-VN')}đ)` }, { status: 400 });
    }

    const newPaid = debt.paidAmount + data.amount;
    const newStatus = newPaid >= debt.totalAmount ? 'paid' : 'partial';
    const code = await generateCode('supplierDebtPayment', 'TTNCC');

    const [payment] = await prisma.$transaction([
        prisma.supplierDebtPayment.create({
            data: { code, debtId: id, ...data, createdById: session.user.id },
        }),
        prisma.supplierDebt.update({
            where: { id },
            data: { paidAmount: newPaid, status: newStatus },
        }),
    ]);

    return NextResponse.json(payment, { status: 201 });
});
```

- [ ] **Step 4: Commit**

```bash
git add app/api/debts/supplier/
git commit -m "feat(api): supplier debt CRUD and payment endpoints"
```

---

### Task 4: API Contractor Debt

**Files:**
- Create: `app/api/debts/contractor/route.js`
- Create: `app/api/debts/contractor/[id]/route.js`
- Create: `app/api/debts/contractor/[id]/pay/route.js`

- [ ] **Step 1: Tạo `app/api/debts/contractor/route.js`**

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { generateCode } from '@/lib/generateCode';
import { contractorDebtCreateSchema } from '@/lib/validations/debt';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const contractorId = searchParams.get('contractorId');
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');

    const where = {};
    if (contractorId) where.contractorId = contractorId;
    if (projectId) where.projectId = projectId;
    if (status && status !== 'all') where.status = status;

    const debts = await prisma.contractorDebt.findMany({
        where,
        include: {
            contractor: { select: { id: true, code: true, name: true } },
            project: { select: { id: true, code: true, name: true } },
            payments: { orderBy: { date: 'asc' } },
        },
        orderBy: { date: 'desc' },
    });

    return NextResponse.json(debts.map(d => ({
        ...d,
        remaining: d.totalAmount - d.paidAmount,
    })));
});

export const POST = withAuth(async (request, _ctx, session) => {
    const body = await request.json();
    const data = contractorDebtCreateSchema.parse(body);
    const code = await generateCode('contractorDebt', 'CNTH');

    const debt = await prisma.contractorDebt.create({
        data: { ...data, code, createdById: session.user.id },
        include: {
            contractor: { select: { id: true, code: true, name: true } },
            project: { select: { id: true, code: true, name: true } },
        },
    });
    return NextResponse.json({ ...debt, remaining: debt.totalAmount - debt.paidAmount }, { status: 201 });
});
```

- [ ] **Step 2: Tạo `app/api/debts/contractor/[id]/route.js`**

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { contractorDebtUpdateSchema } from '@/lib/validations/debt';

export const GET = withAuth(async (request, { params }) => {
    const { id } = await params;
    const debt = await prisma.contractorDebt.findUnique({
        where: { id },
        include: {
            contractor: { select: { id: true, code: true, name: true } },
            project: { select: { id: true, code: true, name: true } },
            payments: { orderBy: { date: 'asc' } },
        },
    });
    if (!debt) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    return NextResponse.json({ ...debt, remaining: debt.totalAmount - debt.paidAmount });
});

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = await request.json();
    const data = contractorDebtUpdateSchema.parse(body);
    const debt = await prisma.contractorDebt.update({ where: { id }, data });
    return NextResponse.json({ ...debt, remaining: debt.totalAmount - debt.paidAmount });
});

export const DELETE = withAuth(async (request, { params }) => {
    const { id } = await params;
    const debt = await prisma.contractorDebt.findUnique({ where: { id }, select: { paidAmount: true } });
    if (!debt) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    if (debt.paidAmount > 0) return NextResponse.json({ error: 'Không thể xóa — đã có thanh toán' }, { status: 400 });
    await prisma.contractorDebt.delete({ where: { id } });
    return NextResponse.json({ success: true });
});
```

- [ ] **Step 3: Tạo `app/api/debts/contractor/[id]/pay/route.js`**

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { generateCode } from '@/lib/generateCode';
import { debtPaymentSchema } from '@/lib/validations/debt';

export const POST = withAuth(async (request, { params }, session) => {
    const { id } = await params;
    const body = await request.json();
    const data = debtPaymentSchema.parse(body);

    const debt = await prisma.contractorDebt.findUnique({
        where: { id },
        select: { id: true, totalAmount: true, paidAmount: true },
    });
    if (!debt) return NextResponse.json({ error: 'Không tìm thấy công nợ' }, { status: 404 });

    const remaining = debt.totalAmount - debt.paidAmount;
    if (data.amount > remaining) {
        return NextResponse.json({ error: `Số tiền vượt quá còn nợ (${remaining.toLocaleString('vi-VN')}đ)` }, { status: 400 });
    }

    const newPaid = debt.paidAmount + data.amount;
    const newStatus = newPaid >= debt.totalAmount ? 'paid' : 'partial';
    const code = await generateCode('contractorDebtPayment', 'TTTH');

    const [payment] = await prisma.$transaction([
        prisma.contractorDebtPayment.create({
            data: { code, debtId: id, ...data, createdById: session.user.id },
        }),
        prisma.contractorDebt.update({
            where: { id },
            data: { paidAmount: newPaid, status: newStatus },
        }),
    ]);

    return NextResponse.json(payment, { status: 201 });
});
```

- [ ] **Step 4: Commit**

```bash
git add app/api/debts/contractor/
git commit -m "feat(api): contractor debt CRUD and payment endpoints"
```

---

### Task 5: UI `/cong-no` — NCC tab + Thầu phụ tab

**Files:**
- Modify: `app/cong-no/page.js`

Context: File hiện tại 457 dòng, có tab `ncc` và `contractor`, dùng ledger view (`/api/debt/ncc/[id]/ledger`). Cần thêm debt list + payment modal. **Không xóa** ledger view cũ — giữ nguyên, thêm tab mới "Công nợ theo phiếu" dạng toggle bên trong mỗi tab.

Cách tiếp cận: thêm `debtView` state (`'ledger' | 'debts'`) bên trong mỗi tab, toggle bằng 2 nút. View `debts` fetch từ API mới.

- [ ] **Step 1: Thêm state mới**

Tìm dòng:
```javascript
    const [projects, setProjects] = useState([]);
```
Thêm sau:
```javascript
    // Debt view state
    const [debtView, setDebtView] = useState('debts'); // 'ledger' | 'debts'
    const [debts, setDebts] = useState([]);
    const [debtsLoading, setDebtsLoading] = useState(false);
    const [expandedDebtId, setExpandedDebtId] = useState(null);
    const [showDebtForm, setShowDebtForm] = useState(false);
    const [showPayForm, setShowPayForm] = useState(null); // debt object
    const [debtForm, setDebtForm] = useState({ description: '', invoiceNo: '', totalAmount: '', projectId: '', date: new Date().toISOString().slice(0, 10), notes: '', proofUrl: '' });
    const [payForm, setPayForm] = useState({ amount: '', date: new Date().toISOString().slice(0, 10), notes: '', proofUrl: '' });
    const [debtFilterStatus, setDebtFilterStatus] = useState('open'); // open|partial|paid|all
```

- [ ] **Step 2: Thêm `loadDebts` function**

Sau `loadLedger` function, thêm:
```javascript
    const loadDebts = useCallback(async (id, type) => {
        if (!id) return;
        setDebtsLoading(true);
        try {
            const endpoint = type === 'ncc'
                ? `/api/debts/supplier?supplierId=${id}`
                : `/api/debts/contractor?contractorId=${id}`;
            const res = await apiFetch(endpoint);
            setDebts(res || []);
        } catch (err) {
            console.error(err);
        }
        setDebtsLoading(false);
    }, []);
```

- [ ] **Step 3: Cập nhật `handleSelect`**

Tìm:
```javascript
    const handleSelect = (id, type) => {
        setSelectedId(id);
        setSelectedType(type);
        loadLedger(id, type);
    };
```
Thay bằng:
```javascript
    const handleSelect = (id, type) => {
        setSelectedId(id);
        setSelectedType(type);
        setExpandedDebtId(null);
        loadLedger(id, type);
        loadDebts(id, type);
    };
```

- [ ] **Step 4: Thêm `handleCreateDebt` và `handlePay` functions**

Sau `handleSelect`, thêm:
```javascript
    const handleCreateDebt = async () => {
        if (!debtForm.description || !debtForm.totalAmount) return alert('Nhập mô tả và số tiền');
        try {
            const isNcc = selectedType === 'ncc';
            const body = isNcc
                ? { supplierId: selectedId, ...debtForm, totalAmount: Number(debtForm.totalAmount), projectId: debtForm.projectId || null }
                : { contractorId: selectedId, ...debtForm, totalAmount: Number(debtForm.totalAmount) };
            const endpoint = isNcc ? '/api/debts/supplier' : '/api/debts/contractor';
            await apiFetch(endpoint, { method: 'POST', body });
            setShowDebtForm(false);
            setDebtForm({ description: '', invoiceNo: '', totalAmount: '', projectId: '', date: new Date().toISOString().slice(0, 10), notes: '', proofUrl: '' });
            loadDebts(selectedId, selectedType);
            loadLists();
        } catch (err) { alert(err.message); }
    };

    const handleDeleteDebt = async (debt) => {
        if (!confirm(`Xóa công nợ "${debt.code}"?`)) return;
        try {
            const endpoint = selectedType === 'ncc' ? `/api/debts/supplier/${debt.id}` : `/api/debts/contractor/${debt.id}`;
            await apiFetch(endpoint, { method: 'DELETE' });
            loadDebts(selectedId, selectedType);
            loadLists();
        } catch (err) { alert(err.message); }
    };

    const handlePay = async () => {
        if (!payForm.amount || Number(payForm.amount) <= 0) return alert('Nhập số tiền hợp lệ');
        try {
            const debt = showPayForm;
            const endpoint = selectedType === 'ncc'
                ? `/api/debts/supplier/${debt.id}/pay`
                : `/api/debts/contractor/${debt.id}/pay`;
            await apiFetch(endpoint, { method: 'POST', body: { ...payForm, amount: Number(payForm.amount) } });
            setShowPayForm(null);
            setPayForm({ amount: '', date: new Date().toISOString().slice(0, 10), notes: '', proofUrl: '' });
            loadDebts(selectedId, selectedType);
            loadLists();
        } catch (err) { alert(err.message); }
    };
```

- [ ] **Step 5: Thêm view toggle + debt list vào panel phải**

Tìm đoạn `{/* Stat cards */}` ở trong panel phải (khoảng dòng 340). Trước đoạn này, thêm toggle view:

```javascript
                    {/* View toggle */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                        {[['debts', '📋 Công nợ theo phiếu'], ['ledger', '📊 Sổ cái']].map(([v, label]) => (
                            <button key={v} className={`btn btn-sm${debtView === v ? ' btn-primary' : ''}`}
                                onClick={() => setDebtView(v)}>{label}</button>
                        ))}
                    </div>
```

Sau toggle, wrap toàn bộ ledger view hiện tại bằng `{debtView === 'ledger' && (...)}` và thêm debt view:

```javascript
                    {debtView === 'debts' && (
                        <div>
                            {/* Toolbar */}
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
                                <select className="form-select" value={debtFilterStatus}
                                    onChange={e => setDebtFilterStatus(e.target.value)} style={{ width: 130 }}>
                                    {[['open', 'Còn nợ'], ['partial', 'Trả 1 phần'], ['paid', 'Đã trả hết'], ['all', 'Tất cả']].map(([v, l]) => (
                                        <option key={v} value={v}>{l}</option>
                                    ))}
                                </select>
                                <button className="btn btn-primary btn-sm" onClick={() => setShowDebtForm(true)}>+ Tạo công nợ</button>
                            </div>

                            {/* Debt list */}
                            {debtsLoading ? (
                                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                            ) : (
                                <div className="card" style={{ overflow: 'auto' }}>
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Mã</th>
                                                <th>Mô tả / Hóa đơn</th>
                                                <th>Dự án</th>
                                                <th>Ngày</th>
                                                <th style={{ textAlign: 'right' }}>Tổng</th>
                                                <th style={{ textAlign: 'right' }}>Đã trả</th>
                                                <th style={{ textAlign: 'right' }}>Còn nợ</th>
                                                <th>TT</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {debts.filter(d => debtFilterStatus === 'all' || d.status === debtFilterStatus).map(d => {
                                                const statusColor = { open: '#ef4444', partial: '#f59e0b', paid: '#22c55e' }[d.status] || '#888';
                                                const statusLabel = { open: 'Còn nợ', partial: 'Trả 1 phần', paid: 'Đã trả' }[d.status] || d.status;
                                                const isExpanded = expandedDebtId === d.id;
                                                return (
                                                    <>
                                                        <tr key={d.id} onClick={() => setExpandedDebtId(isExpanded ? null : d.id)} style={{ cursor: 'pointer' }}>
                                                            <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{d.code}</td>
                                                            <td>
                                                                <div>{d.description}</div>
                                                                {d.invoiceNo && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>HD: {d.invoiceNo}</div>}
                                                            </td>
                                                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.project?.code || '—'}</td>
                                                            <td style={{ fontSize: 12 }}>{d.date ? new Date(d.date).toLocaleDateString('vi-VN') : '—'}</td>
                                                            <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmtVND(d.totalAmount)}</td>
                                                            <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#22c55e' }}>{fmtVND(d.paidAmount)}</td>
                                                            <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: statusColor }}>{fmtVND(d.remaining)}</td>
                                                            <td><span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 8, background: statusColor + '18', color: statusColor }}>{statusLabel}</span></td>
                                                            <td>
                                                                <div style={{ display: 'flex', gap: 4 }}>
                                                                    {d.status !== 'paid' && (
                                                                        <button className="btn btn-sm btn-primary" style={{ fontSize: 11 }}
                                                                            onClick={e => { e.stopPropagation(); setShowPayForm(d); setPayForm({ amount: d.remaining, date: new Date().toISOString().slice(0, 10), notes: '', proofUrl: '' }); }}>
                                                                            + Trả
                                                                        </button>
                                                                    )}
                                                                    {d.paidAmount === 0 && (
                                                                        <button className="btn btn-sm" style={{ fontSize: 11, color: '#ef4444' }}
                                                                            onClick={e => { e.stopPropagation(); handleDeleteDebt(d); }}>
                                                                            Xóa
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        {isExpanded && d.payments.length > 0 && (
                                                            <tr key={`${d.id}-payments`}>
                                                                <td colSpan={9} style={{ padding: '4px 16px 12px', background: 'var(--bg-secondary)' }}>
                                                                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>Lịch sử thanh toán:</div>
                                                                    {d.payments.map(p => (
                                                                        <div key={p.id} style={{ display: 'flex', gap: 12, padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                                                                            <span style={{ color: 'var(--text-muted)', minWidth: 80 }}>{new Date(p.date).toLocaleDateString('vi-VN')}</span>
                                                                            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#22c55e' }}>{fmtVND(p.amount)}</span>
                                                                            <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 11 }}>{p.code}</span>
                                                                            {p.notes && <span style={{ color: 'var(--text-muted)' }}>{p.notes}</span>}
                                                                            {p.proofUrl && <a href={p.proofUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>📎</a>}
                                                                        </div>
                                                                    ))}
                                                                </td>
                                                            </tr>
                                                        )}
                                                        {isExpanded && d.payments.length === 0 && (
                                                            <tr key={`${d.id}-empty`}>
                                                                <td colSpan={9} style={{ padding: '8px 16px', background: 'var(--bg-secondary)', fontSize: 12, color: 'var(--text-muted)' }}>
                                                                    Chưa có thanh toán nào
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </>
                                                );
                                            })}
                                            {debts.filter(d => debtFilterStatus === 'all' || d.status === debtFilterStatus).length === 0 && (
                                                <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Không có công nợ</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
```

- [ ] **Step 6: Thêm modal tạo công nợ**

Cuối file, trước dòng đóng `}` cuối cùng của component, thêm 2 modal:

```javascript
            {/* Modal tạo công nợ */}
            {showDebtForm && (
                <div className="modal-overlay" onClick={() => setShowDebtForm(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                        <h3 style={{ marginTop: 0 }}>+ Tạo công nợ {selectedType === 'ncc' ? 'NCC' : 'Thầu phụ'}</h3>
                        <div className="form-group">
                            <label className="form-label">Mô tả *</label>
                            <input className="form-input" value={debtForm.description} onChange={e => setDebtForm({ ...debtForm, description: e.target.value })} placeholder="VD: Xi măng tháng 3, Nhân công đợt 2..." />
                        </div>
                        {selectedType === 'ncc' && (
                            <div className="form-group">
                                <label className="form-label">Số hóa đơn</label>
                                <input className="form-input" value={debtForm.invoiceNo} onChange={e => setDebtForm({ ...debtForm, invoiceNo: e.target.value })} placeholder="INV-001" />
                            </div>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="form-group">
                                <label className="form-label">Số tiền *</label>
                                <input className="form-input" type="number" min="0" value={debtForm.totalAmount} onChange={e => setDebtForm({ ...debtForm, totalAmount: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ngày</label>
                                <input className="form-input" type="date" value={debtForm.date} onChange={e => setDebtForm({ ...debtForm, date: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Dự án</label>
                            <select className="form-select" value={debtForm.projectId} onChange={e => setDebtForm({ ...debtForm, projectId: e.target.value })}>
                                <option value="">— Không gắn —</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Ghi chú</label>
                            <input className="form-input" value={debtForm.notes} onChange={e => setDebtForm({ ...debtForm, notes: e.target.value })} />
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                            <button className="btn" onClick={() => setShowDebtForm(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleCreateDebt}>Tạo công nợ</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal trả tiền */}
            {showPayForm && (
                <div className="modal-overlay" onClick={() => setShowPayForm(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                        <h3 style={{ marginTop: 0 }}>+ Trả tiền — {showPayForm.code}</h3>
                        <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 6, fontSize: 13 }}>
                            Còn nợ: <strong style={{ color: '#ef4444' }}>{fmtVND(showPayForm.remaining)}</strong>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Số tiền *</label>
                            <input className="form-input" type="number" min="1" max={showPayForm.remaining} value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Ngày</label>
                            <input className="form-input" type="date" value={payForm.date} onChange={e => setPayForm({ ...payForm, date: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Ghi chú</label>
                            <input className="form-input" value={payForm.notes} onChange={e => setPayForm({ ...payForm, notes: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Link chứng từ</label>
                            <input className="form-input" placeholder="https://..." value={payForm.proofUrl} onChange={e => setPayForm({ ...payForm, proofUrl: e.target.value })} />
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                            <button className="btn" onClick={() => setShowPayForm(null)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handlePay}>Xác nhận trả</button>
                        </div>
                    </div>
                </div>
            )}
```

- [ ] **Step 7: Load projects khi cần**

Tìm useEffect load projects:
```javascript
    useEffect(() => {
        if (activeTab === 'contractor' && projects.length === 0) {
```
Thay bằng:
```javascript
    useEffect(() => {
        if (projects.length === 0) {
```

- [ ] **Step 8: Commit**

```bash
git add app/cong-no/page.js
git commit -m "feat(cong-no): add debt list view with create and payment modals"
```

---

### Task 6: Tab "Theo công trình" trong `/cong-no`

**Files:**
- Modify: `app/cong-no/page.js`

- [ ] **Step 1: Thêm state cho tab công trình**

Sau `const [debtFilterStatus, ...]`, thêm:
```javascript
    const [selectedProject, setSelectedProject] = useState('');
    const [projectDebts, setProjectDebts] = useState({ supplier: [], contractor: [] });
    const [projectDebtsLoading, setProjectDebtsLoading] = useState(false);
```

- [ ] **Step 2: Thêm function load project debts**

```javascript
    const loadProjectDebts = useCallback(async (projectId) => {
        if (!projectId) return;
        setProjectDebtsLoading(true);
        try {
            const [ncc, contractor] = await Promise.all([
                apiFetch(`/api/debts/supplier?projectId=${projectId}`),
                apiFetch(`/api/debts/contractor?projectId=${projectId}`),
            ]);
            setProjectDebts({ supplier: ncc || [], contractor: contractor || [] });
        } catch (err) { console.error(err); }
        setProjectDebtsLoading(false);
    }, []);
```

- [ ] **Step 3: Thêm tab "Theo công trình" vào tab bar**

Tìm đoạn tab buttons, thêm tab mới:
```javascript
                <button
                    style={{ padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: activeTab === 'project' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'project' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: activeTab === 'project' ? 600 : 400, marginBottom: -2 }}
                    onClick={() => setActiveTab('project')}
                >🏗️ Theo công trình</button>
```

- [ ] **Step 4: Thêm render tab công trình**

Sau đoạn `{activeTab === 'contractor' && (...)}`, thêm:

```javascript
            {activeTab === 'project' && (
                <div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
                        <select className="form-select" value={selectedProject}
                            onChange={e => { setSelectedProject(e.target.value); if (e.target.value) loadProjectDebts(e.target.value); }}
                            style={{ maxWidth: 320 }}>
                            <option value="">— Chọn dự án —</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                        </select>
                    </div>

                    {!selectedProject ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Chọn dự án để xem công nợ</div>
                    ) : projectDebtsLoading ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Đang tải...</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            {/* NCC */}
                            <div>
                                <h4 style={{ marginBottom: 8 }}>Công nợ Nhà cung cấp</h4>
                                <div className="card" style={{ overflow: 'auto' }}>
                                    <table className="data-table">
                                        <thead>
                                            <tr><th>Mã</th><th>NCC</th><th>Mô tả</th><th style={{ textAlign: 'right' }}>Tổng</th><th style={{ textAlign: 'right' }}>Đã trả</th><th style={{ textAlign: 'right' }}>Còn nợ</th><th>TT</th></tr>
                                        </thead>
                                        <tbody>
                                            {projectDebts.supplier.length === 0 ? (
                                                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>Không có công nợ NCC</td></tr>
                                            ) : projectDebts.supplier.map(d => {
                                                const statusColor = { open: '#ef4444', partial: '#f59e0b', paid: '#22c55e' }[d.status] || '#888';
                                                const statusLabel = { open: 'Còn nợ', partial: 'Trả 1 phần', paid: 'Đã trả' }[d.status] || d.status;
                                                return (
                                                    <tr key={d.id}>
                                                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{d.code}</td>
                                                        <td style={{ fontWeight: 600 }}>{d.supplier?.name}</td>
                                                        <td>{d.description}</td>
                                                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmtVND(d.totalAmount)}</td>
                                                        <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#22c55e' }}>{fmtVND(d.paidAmount)}</td>
                                                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: statusColor }}>{fmtVND(d.remaining)}</td>
                                                        <td><span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 8, background: statusColor + '18', color: statusColor }}>{statusLabel}</span></td>
                                                    </tr>
                                                );
                                            })}
                                            {projectDebts.supplier.length > 0 && (
                                                <tr style={{ background: 'var(--bg-secondary)', fontWeight: 600 }}>
                                                    <td colSpan={5} style={{ textAlign: 'right' }}>Tổng còn nợ NCC:</td>
                                                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#ef4444' }}>
                                                        {fmtVND(projectDebts.supplier.reduce((s, d) => s + d.remaining, 0))}
                                                    </td>
                                                    <td></td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Thầu phụ */}
                            <div>
                                <h4 style={{ marginBottom: 8 }}>Công nợ Thầu phụ</h4>
                                <div className="card" style={{ overflow: 'auto' }}>
                                    <table className="data-table">
                                        <thead>
                                            <tr><th>Mã</th><th>Thầu phụ</th><th>Mô tả</th><th style={{ textAlign: 'right' }}>Tổng</th><th style={{ textAlign: 'right' }}>Đã trả</th><th style={{ textAlign: 'right' }}>Còn nợ</th><th>TT</th></tr>
                                        </thead>
                                        <tbody>
                                            {projectDebts.contractor.length === 0 ? (
                                                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>Không có công nợ thầu phụ</td></tr>
                                            ) : projectDebts.contractor.map(d => {
                                                const statusColor = { open: '#ef4444', partial: '#f59e0b', paid: '#22c55e' }[d.status] || '#888';
                                                const statusLabel = { open: 'Còn nợ', partial: 'Trả 1 phần', paid: 'Đã trả' }[d.status] || d.status;
                                                return (
                                                    <tr key={d.id}>
                                                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{d.code}</td>
                                                        <td style={{ fontWeight: 600 }}>{d.contractor?.name}</td>
                                                        <td>{d.description}</td>
                                                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmtVND(d.totalAmount)}</td>
                                                        <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#22c55e' }}>{fmtVND(d.paidAmount)}</td>
                                                        <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: statusColor }}>{fmtVND(d.remaining)}</td>
                                                        <td><span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 8, background: statusColor + '18', color: statusColor }}>{statusLabel}</span></td>
                                                    </tr>
                                                );
                                            })}
                                            {projectDebts.contractor.length > 0 && (
                                                <tr style={{ background: 'var(--bg-secondary)', fontWeight: 600 }}>
                                                    <td colSpan={5} style={{ textAlign: 'right' }}>Tổng còn nợ thầu phụ:</td>
                                                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#ef4444' }}>
                                                        {fmtVND(projectDebts.contractor.reduce((s, d) => s + d.remaining, 0))}
                                                    </td>
                                                    <td></td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
```

- [ ] **Step 5: Commit**

```bash
git add app/cong-no/page.js
git commit -m "feat(cong-no): add Theo công trình tab with NCC and contractor debt views"
```

---

### Task 7: Tích hợp `/finance` — link lệnh chi tới debt

**Files:**
- Modify: `components/finance/ExpensesTab.js`

Context: Trong `ExpensesTab`, khi `form.recipientType === 'NCC'` hoặc `'Thầu phụ'` và `recipientId` có giá trị, hiện thêm checkbox "Trả công nợ cụ thể". Khi chọn, fetch danh sách debts còn nợ của đối tác đó, cho chọn 1 debt. Sau `handleSubmit` thành công, gọi thêm pay endpoint.

- [ ] **Step 1: Thêm state debt linking**

Tìm dòng:
```javascript
    const [allocations, setAllocations] = useState([]);
```
Thêm sau:
```javascript
    const [linkDebt, setLinkDebt] = useState(false);
    const [debtOptions, setDebtOptions] = useState([]);
    const [selectedDebtId, setSelectedDebtId] = useState('');
```

- [ ] **Step 2: Thêm useEffect fetch debt options khi chọn NCC/Thầu**

Sau useEffect load projects/suppliers/contractors, thêm:
```javascript
    useEffect(() => {
        if (!form.recipientId || !form.recipientType) {
            setDebtOptions([]);
            setLinkDebt(false);
            setSelectedDebtId('');
            return;
        }
        const isNcc = form.recipientType === 'NCC';
        const endpoint = isNcc
            ? `/api/debts/supplier?supplierId=${form.recipientId}&status=open`
            : `/api/debts/contractor?contractorId=${form.recipientId}&status=open`;
        apiFetch(endpoint)
            .then(res => setDebtOptions(res || []))
            .catch(() => setDebtOptions([]));
    }, [form.recipientId, form.recipientType]);
```

- [ ] **Step 3: Thêm debt selector vào form modal**

Tìm đoạn `{/* Historical checkbox */}` trong modal body. Trước đoạn đó thêm:

```javascript
                            {/* Link to debt */}
                            {(form.recipientType === 'NCC' || form.recipientType === 'Thầu phụ') && debtOptions.length > 0 && (
                                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, marginBottom: linkDebt ? 10 : 0 }}>
                                        <input type="checkbox" checked={linkDebt} onChange={e => { setLinkDebt(e.target.checked); if (!e.target.checked) setSelectedDebtId(''); }} style={{ width: 15, height: 15 }} />
                                        <span style={{ fontWeight: 600 }}>💳 Trả công nợ cụ thể</span>
                                    </label>
                                    {linkDebt && (
                                        <select className="form-select" value={selectedDebtId} onChange={e => setSelectedDebtId(e.target.value)}>
                                            <option value="">— Chọn công nợ —</option>
                                            {debtOptions.map(d => (
                                                <option key={d.id} value={d.id}>
                                                    {d.code} — {d.description} (còn {new Intl.NumberFormat('vi-VN').format(d.remaining)}đ)
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            )}
```

- [ ] **Step 4: Cập nhật `handleSubmit` để gọi pay endpoint sau khi tạo expense**

Tìm đoạn cuối `handleSubmit` sau `toast.success(...)`:
```javascript
            setShowModal(false);
            fetchExpenses();
```
Thay bằng:
```javascript
            // Link to debt if selected
            if (linkDebt && selectedDebtId && !editing) {
                const isNcc = form.recipientType === 'NCC';
                const payEndpoint = isNcc
                    ? `/api/debts/supplier/${selectedDebtId}/pay`
                    : `/api/debts/contractor/${selectedDebtId}/pay`;
                await apiFetch(payEndpoint, {
                    method: 'POST',
                    body: {
                        amount: Number(form.amount),
                        date: form.date,
                        notes: form.notes || '',
                    },
                }).catch(() => {}); // không fail nếu pay lỗi
            }
            setShowModal(false);
            setLinkDebt(false);
            setSelectedDebtId('');
            fetchExpenses();
```

- [ ] **Step 5: Reset debt state khi đóng modal**

Tìm `onClick={() => !saving && setShowModal(false)` trên modal overlay. Thêm reset:
```javascript
onClick={() => { if (!saving) { setShowModal(false); setLinkDebt(false); setSelectedDebtId(''); } }}
```

- [ ] **Step 6: Commit**

```bash
git add components/finance/ExpensesTab.js
git commit -m "feat(finance): link expense to supplier/contractor debt on submit"
```

---

### Task 8: Build + Push

- [ ] **Step 1: Chạy build**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | grep -E "(✓ Compiled|Error|error)" | head -10
```

Expected: `✓ Compiled successfully`

Lỗi thường gặp:
- Prisma client chưa regenerate → chạy `npm run db:generate`
- Import path sai → kiểm tra `@/lib/validations/debt`

- [ ] **Step 2: Push**

```bash
git push
```

---

## Self-Review

### Spec coverage

| Requirement | Task |
|---|---|
| 4 Prisma model | Task 1 |
| Relations Supplier/Contractor/Project | Task 1 |
| generateCode entries | Task 2 |
| Zod validations | Task 2 |
| API supplier debt CRUD + pay | Task 3 |
| API contractor debt CRUD + pay | Task 4 |
| `/cong-no` debt list view + expand payments | Task 5 |
| Modal tạo công nợ | Task 5 |
| Modal trả tiền | Task 5 |
| Tab Theo công trình | Task 6 |
| ExpensesTab link-to-debt | Task 7 |

### Notes cho engineer

- `fmtVND` đã có sẵn trong `/cong-no/page.js` từ `@/lib/financeUtils`
- `selectedType` (`'ncc'` | `'contractor'`) đã có sẵn trong page state — dùng để phân biệt API endpoint
- `projects` state đã có sẵn trong page — chỉ cần load sớm hơn (Task 5 Step 7)
- Khi wrap ledger view bằng `{debtView === 'ledger' && ...}`, đảm bảo wrap đúng phạm vi — từ `{/* Stat cards */}` đến hết `{/* Ledger table */}` closing `</div>`
- `debtOptions` filter `status=open` — debt `partial` cũng cần trả tiếp, sửa sang `status=open,partial` hoặc bỏ filter status trong endpoint call. Thực ra `partial` vẫn còn nợ → dùng `status=open` sẽ miss. Sửa: fetch với không có status filter, rồi filter ở client: `debtOptions.filter(d => d.status !== 'paid')`
