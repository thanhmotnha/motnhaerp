# Overhead Cost Allocation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a system for tracking company-wide overhead expenses and allocating them to active projects by revenue ratio, with a dedicated `/overhead` page and a P&L tab in `/reports`.

**Architecture:** 4 new Prisma models (`OverheadExpense`, `OverheadBatch`, `OverheadBatchItem`, `OverheadAllocation`) back a REST API under `/api/overhead/`. The frontend at `/overhead` has two tabs: expense entry and batch allocation. Reports page gains a Company P&L tab aggregating direct + overhead costs per project.

**Tech Stack:** Next.js 15 App Router, Prisma 6, PostgreSQL, Zod 4, `withAuth` from `lib/apiHandler`, `apiFetch` from `lib/fetchClient`, `useToast` from `components/ui/Toast`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `prisma/schema.prisma` | Add 4 models + Project.overheadAllocations relation |
| Modify | `lib/generateCode.js` | Add overheadExpense to TABLE_MAP |
| Create | `lib/validations/overhead.js` | Zod schemas for all overhead models |
| Create | `app/api/overhead/expenses/route.js` | GET list + POST create |
| Create | `app/api/overhead/expenses/[id]/route.js` | PUT update + DELETE |
| Create | `app/api/overhead/expenses/[id]/approve/route.js` | PATCH approve |
| Create | `app/api/overhead/batches/route.js` | GET list + POST create |
| Create | `app/api/overhead/batches/[id]/route.js` | GET detail + PUT + DELETE |
| Create | `app/api/overhead/batches/[id]/calculate/route.js` | POST auto-calculate ratios |
| Create | `app/api/overhead/batches/[id]/confirm/route.js` | POST confirm batch |
| Create | `app/api/overhead/pl/route.js` | GET company P&L data |
| Create | `app/overhead/page.js` | Main UI: 2 tabs (expenses + batches) |
| Modify | `components/Sidebar.js` | Add Chi phí chung menu item |
| Modify | `components/Header.js` | Add /overhead page title |
| Modify | `app/reports/page.js` | Add P&L Công ty tab |

---

## Task 1: Database Schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add Project relation (line 140, before `@@index`)**

Open `prisma/schema.prisma`. Find line 140 which has `workOrders WorkOrder[]`. Add `overheadAllocations` BEFORE the `@@index([customerId])` line at 142:

```prisma
  overheadAllocations   OverheadAllocation[]
```

So the end of the Project model (lines 138-143) becomes:
```prisma
  transactions          Transaction[]
  warrantyTickets       WarrantyTicket[]
  workOrders            WorkOrder[]
  overheadAllocations   OverheadAllocation[]

  @@index([customerId])
}
```

- [ ] **Step 2: Add 4 new models at end of schema (after line 2033)**

Append to the very end of `prisma/schema.prisma`:

```prisma
model OverheadExpense {
  id          String    @id @default(cuid())
  code        String    @unique
  categoryId  String?
  description String
  amount      Float     @default(0)
  date        DateTime  @default(now())
  proofUrl    String    @default("")
  status      String    @default("draft")
  notes       String    @default("")
  createdById String    @default("")
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?

  category   ExpenseCategory?    @relation(fields: [categoryId], references: [id])
  batchItems OverheadBatchItem[]

  @@index([categoryId])
  @@index([date])
}

model OverheadBatch {
  id          String    @id @default(cuid())
  code        String    @unique
  name        String
  period      String    @default("")
  totalAmount Float     @default(0)
  status      String    @default("draft")
  notes       String    @default("")
  createdById String    @default("")
  confirmedAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  items       OverheadBatchItem[]
  allocations OverheadAllocation[]

  @@index([period])
}

model OverheadBatchItem {
  id        String @id @default(cuid())
  batchId   String
  expenseId String
  amount    Float  @default(0)

  batch   OverheadBatch   @relation(fields: [batchId], references: [id], onDelete: Cascade)
  expense OverheadExpense @relation(fields: [expenseId], references: [id])

  @@unique([batchId, expenseId])
  @@index([batchId])
  @@index([expenseId])
}

model OverheadAllocation {
  id         String   @id @default(cuid())
  batchId    String
  projectId  String
  ratio      Float    @default(0)
  amount     Float    @default(0)
  isOverride Boolean  @default(false)
  notes      String   @default("")
  createdAt  DateTime @default(now())

  batch   OverheadBatch @relation(fields: [batchId], references: [id], onDelete: Cascade)
  project Project       @relation(fields: [projectId], references: [id])

  @@unique([batchId, projectId])
  @@index([batchId])
  @@index([projectId])
}
```

- [ ] **Step 3: Run migration**

```bash
npm run db:migrate
```

Expected: Prisma creates migration file and applies it. Output ends with "Your database is now in sync with your Prisma schema."

- [ ] **Step 4: Verify schema compiles**

```bash
npm run db:generate
```

Expected: "Generated Prisma Client" with no errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(schema): add OverheadExpense, OverheadBatch, OverheadBatchItem, OverheadAllocation models"
```

---

## Task 2: Code Generation + Validation Schemas

**Files:**
- Modify: `lib/generateCode.js` (TABLE_MAP section, ~lines 5-18)
- Create: `lib/validations/overhead.js`

- [ ] **Step 1: Add overheadExpense to TABLE_MAP in `lib/generateCode.js`**

Find the TABLE_MAP object (around line 5-18). Add entry after `projectExpense`:

```javascript
const TABLE_MAP = {
    customer: '"Customer"',
    project: '"Project"',
    product: '"Product"',
    quotation: '"Quotation"',
    contract: '"Contract"',
    contractor: '"Contractor"',
    supplier: '"Supplier"',
    employee: '"Employee"',
    workOrder: '"WorkOrder"',
    projectExpense: '"ProjectExpense"',
    overheadExpense: '"OverheadExpense"',
    inventoryTransaction: '"InventoryTransaction"',
    transaction: '"Transaction"',
    purchaseOrder: '"PurchaseOrder"',
    materialRequisition: '"MaterialRequisition"',
    warrantyTicket: '"WarrantyTicket"',
    supplierPayment: '"SupplierPayment"',
    contractorPaymentLog: '"ContractorPaymentLog"',
};
```

- [ ] **Step 2: Create `lib/validations/overhead.js`**

```javascript
import { z } from 'zod';
import { optStr, optFloat, optDate } from './common';

export const overheadExpenseCreateSchema = z.object({
    categoryId: z.string().optional().nullable().default(null).transform(v => v || null),
    description: z.string().trim().min(1, 'Mô tả bắt buộc'),
    amount: z.number().min(0, 'Số tiền phải >= 0'),
    date: optDate,
    proofUrl: optStr,
    notes: optStr,
}).strict();

export const overheadExpenseUpdateSchema = z.object({
    categoryId: z.string().optional().nullable().transform(v => v || null),
    description: z.string().trim().min(1).optional(),
    amount: z.number().min(0).optional(),
    date: optDate,
    proofUrl: optStr,
    notes: optStr,
    status: optStr,
}).strict();

const allocationInputSchema = z.object({
    projectId: z.string().min(1),
    ratio: z.number().min(0).max(100),
    amount: z.number().min(0),
    isOverride: z.boolean().default(false),
    notes: optStr,
});

export const overheadBatchCreateSchema = z.object({
    name: z.string().trim().min(1, 'Tên đợt bắt buộc'),
    period: optStr,
    notes: optStr,
    expenseIds: z.array(z.string()).min(1, 'Chọn ít nhất 1 khoản chi phí'),
}).strict();

export const overheadBatchUpdateSchema = z.object({
    name: z.string().trim().min(1).optional(),
    notes: optStr,
    expenseIds: z.array(z.string()).optional(),
}).strict();

export const overheadBatchConfirmSchema = z.object({
    allocations: z.array(allocationInputSchema).min(1, 'Cần có phân bổ cho ít nhất 1 dự án'),
}).strict();
```

- [ ] **Step 3: Commit**

```bash
git add lib/generateCode.js lib/validations/overhead.js
git commit -m "feat(overhead): add code generator entry and Zod validation schemas"
```

---

## Task 3: API — Overhead Expenses CRUD

**Files:**
- Create: `app/api/overhead/expenses/route.js`
- Create: `app/api/overhead/expenses/[id]/route.js`
- Create: `app/api/overhead/expenses/[id]/approve/route.js`

- [ ] **Step 1: Create `app/api/overhead/expenses/route.js`**

```javascript
import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import { generateCode } from '@/lib/generateCode';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { overheadExpenseCreateSchema } from '@/lib/validations/overhead';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const month = searchParams.get('month'); // "2026-03"
    const status = searchParams.get('status');
    const categoryId = searchParams.get('categoryId');

    const where = {};
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;
    if (month) {
        const [y, m] = month.split('-').map(Number);
        const start = new Date(y, m - 1, 1);
        const end = new Date(y, m, 0, 23, 59, 59, 999);
        where.date = { gte: start, lte: end };
    }

    const [data, total] = await Promise.all([
        prisma.overheadExpense.findMany({
            where,
            include: { category: { select: { id: true, name: true } } },
            skip,
            take: limit,
            orderBy: { date: 'desc' },
        }),
        prisma.overheadExpense.count({ where }),
    ]);
    return NextResponse.json(paginatedResponse(data, total, { page, limit }));
});

export const POST = withAuth(async (request, _ctx, session) => {
    const body = await request.json();
    const data = overheadExpenseCreateSchema.parse(body);
    const code = await generateCode('overheadExpense', 'CPG');
    const expense = await prisma.overheadExpense.create({
        data: { code, ...data, createdById: session.user.id },
        include: { category: { select: { id: true, name: true } } },
    });
    return NextResponse.json(expense, { status: 201 });
});
```

- [ ] **Step 2: Create `app/api/overhead/expenses/[id]/route.js`**

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { overheadExpenseUpdateSchema } from '@/lib/validations/overhead';

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const existing = await prisma.overheadExpense.findFirst({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    if (existing.status === 'approved') {
        return NextResponse.json({ error: 'Không thể sửa khoản đã duyệt' }, { status: 400 });
    }
    const data = overheadExpenseUpdateSchema.parse(await request.json());
    const updated = await prisma.overheadExpense.update({
        where: { id },
        data,
        include: { category: { select: { id: true, name: true } } },
    });
    return NextResponse.json(updated);
});

export const DELETE = withAuth(async (_request, { params }) => {
    const { id } = await params;
    const existing = await prisma.overheadExpense.findFirst({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    if (existing.status === 'approved') {
        return NextResponse.json({ error: 'Không thể xóa khoản đã duyệt' }, { status: 400 });
    }
    await prisma.overheadExpense.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ success: true });
});
```

- [ ] **Step 3: Create `app/api/overhead/expenses/[id]/approve/route.js`**

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const FINANCE_ROLES = ['giam_doc', 'pho_gd', 'ke_toan'];

export const PATCH = withAuth(async (_request, { params }, session) => {
    if (!FINANCE_ROLES.includes(session.user.role)) {
        return NextResponse.json({ error: 'Không có quyền duyệt' }, { status: 403 });
    }
    const { id } = await params;
    const updated = await prisma.overheadExpense.update({
        where: { id },
        data: { status: 'approved' },
    });
    return NextResponse.json(updated);
});
```

- [ ] **Step 4: Commit**

```bash
git add app/api/overhead/
git commit -m "feat(api): add overhead expense CRUD and approve endpoints"
```

---

## Task 4: API — Overhead Batches

**Files:**
- Create: `app/api/overhead/batches/route.js`
- Create: `app/api/overhead/batches/[id]/route.js`
- Create: `app/api/overhead/batches/[id]/calculate/route.js`
- Create: `app/api/overhead/batches/[id]/confirm/route.js`

- [ ] **Step 1: Create `app/api/overhead/batches/route.js`**

```javascript
import { withAuth } from '@/lib/apiHandler';
import { parsePagination, paginatedResponse } from '@/lib/pagination';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { overheadBatchCreateSchema } from '@/lib/validations/overhead';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const [data, total] = await Promise.all([
        prisma.overheadBatch.findMany({
            include: {
                _count: { select: { items: true, allocations: true } },
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
        }),
        prisma.overheadBatch.count(),
    ]);
    return NextResponse.json(paginatedResponse(data, total, { page, limit }));
});

export const POST = withAuth(async (request, _ctx, session) => {
    const body = await request.json();
    const { expenseIds, ...batchData } = overheadBatchCreateSchema.parse(body);

    // Auto-generate batch code
    const period = batchData.period || '';
    let code;
    if (period) {
        code = `CPGB-${period}`;
        // Check uniqueness; if taken add suffix
        const exists = await prisma.overheadBatch.findFirst({ where: { code } });
        if (exists) code = `CPGB-${period}-2`;
    } else {
        const count = await prisma.overheadBatch.count();
        code = `CPGB-${String(count + 1).padStart(3, '0')}`;
    }

    // Fetch selected expenses to calculate totalAmount
    const expenses = await prisma.overheadExpense.findMany({
        where: { id: { in: expenseIds }, status: 'approved' },
        select: { id: true, amount: true },
    });
    const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);

    const batch = await prisma.$transaction(async (tx) => {
        const b = await tx.overheadBatch.create({
            data: {
                code,
                ...batchData,
                totalAmount,
                createdById: session.user.id,
            },
        });
        await tx.overheadBatchItem.createMany({
            data: expenses.map(e => ({
                batchId: b.id,
                expenseId: e.id,
                amount: e.amount,
            })),
        });
        return tx.overheadBatch.findFirst({
            where: { id: b.id },
            include: { items: { include: { expense: true } }, _count: { select: { allocations: true } } },
        });
    });
    return NextResponse.json(batch, { status: 201 });
});
```

- [ ] **Step 2: Create `app/api/overhead/batches/[id]/route.js`**

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { overheadBatchUpdateSchema } from '@/lib/validations/overhead';

export const GET = withAuth(async (_request, { params }) => {
    const { id } = await params;
    const batch = await prisma.overheadBatch.findFirst({
        where: { id },
        include: {
            items: {
                include: { expense: { include: { category: { select: { name: true } } } } },
            },
            allocations: {
                include: { project: { select: { id: true, name: true, code: true } } },
            },
        },
    });
    if (!batch) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    return NextResponse.json(batch);
});

export const PUT = withAuth(async (request, { params }) => {
    const { id } = await params;
    const existing = await prisma.overheadBatch.findFirst({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    if (existing.status === 'confirmed') {
        return NextResponse.json({ error: 'Không thể sửa đợt đã xác nhận' }, { status: 400 });
    }
    const { expenseIds, ...data } = overheadBatchUpdateSchema.parse(await request.json());

    const batch = await prisma.$transaction(async (tx) => {
        if (expenseIds !== undefined) {
            const expenses = await tx.overheadExpense.findMany({
                where: { id: { in: expenseIds }, status: 'approved' },
                select: { id: true, amount: true },
            });
            const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
            await tx.overheadBatchItem.deleteMany({ where: { batchId: id } });
            await tx.overheadBatchItem.createMany({
                data: expenses.map(e => ({ batchId: id, expenseId: e.id, amount: e.amount })),
            });
            data.totalAmount = totalAmount;
        }
        return tx.overheadBatch.update({ where: { id }, data });
    });
    return NextResponse.json(batch);
});

export const DELETE = withAuth(async (_request, { params }) => {
    const { id } = await params;
    const existing = await prisma.overheadBatch.findFirst({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    if (existing.status === 'confirmed') {
        return NextResponse.json({ error: 'Không thể xóa đợt đã xác nhận' }, { status: 400 });
    }
    await prisma.overheadBatch.delete({ where: { id } });
    return NextResponse.json({ success: true });
});
```

- [ ] **Step 3: Create `app/api/overhead/batches/[id]/calculate/route.js`**

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const POST = withAuth(async (_request, { params }) => {
    const { id } = await params;
    const batch = await prisma.overheadBatch.findFirst({
        where: { id },
        select: { id: true, totalAmount: true, period: true, status: true },
    });
    if (!batch) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    if (batch.status === 'confirmed') {
        return NextResponse.json({ error: 'Đợt đã xác nhận' }, { status: 400 });
    }

    // Get active projects
    const projects = await prisma.project.findMany({
        where: {
            deletedAt: null,
            status: { notIn: ['Hủy'] },
        },
        select: { id: true, name: true, code: true, contractValue: true },
    });

    // If period set, use transactions in that period as revenue base
    // Otherwise fall back to contractValue
    let revenueMap = {}; // projectId → revenue
    if (batch.period && batch.period.match(/^\d{4}-\d{2}$/)) {
        const [y, m] = batch.period.split('-').map(Number);
        const start = new Date(y, m - 1, 1);
        const end = new Date(y, m, 0, 23, 59, 59, 999);

        const txns = await prisma.transaction.findMany({
            where: {
                projectId: { not: null },
                date: { gte: start, lte: end },
                amount: { gt: 0 },
            },
            select: { projectId: true, amount: true },
        });

        txns.forEach(t => {
            revenueMap[t.projectId] = (revenueMap[t.projectId] || 0) + t.amount;
        });
    }

    // Fall back to contractValue for projects with no period transactions
    const projectsWithRevenue = projects.map(p => ({
        ...p,
        revenue: revenueMap[p.id] ?? p.contractValue,
    })).filter(p => p.revenue > 0);

    const totalRevenue = projectsWithRevenue.reduce((s, p) => s + p.revenue, 0);
    if (totalRevenue === 0) {
        return NextResponse.json({ error: 'Không có dự án nào có doanh thu để phân bổ' }, { status: 400 });
    }

    const suggestions = projectsWithRevenue.map(p => ({
        projectId: p.id,
        projectName: p.name,
        projectCode: p.code,
        revenue: p.revenue,
        ratio: parseFloat(((p.revenue / totalRevenue) * 100).toFixed(4)),
        amount: parseFloat(((p.revenue / totalRevenue) * batch.totalAmount).toFixed(0)),
        isOverride: false,
        notes: '',
    }));

    return NextResponse.json({ totalAmount: batch.totalAmount, totalRevenue, suggestions });
});
```

- [ ] **Step 4: Create `app/api/overhead/batches/[id]/confirm/route.js`**

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { overheadBatchConfirmSchema } from '@/lib/validations/overhead';

const CONFIRM_ROLES = ['giam_doc', 'pho_gd', 'ke_toan'];

export const POST = withAuth(async (request, { params }, session) => {
    if (!CONFIRM_ROLES.includes(session.user.role)) {
        return NextResponse.json({ error: 'Không có quyền xác nhận' }, { status: 403 });
    }
    const { id } = await params;
    const existing = await prisma.overheadBatch.findFirst({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    if (existing.status === 'confirmed') {
        return NextResponse.json({ error: 'Đợt đã được xác nhận' }, { status: 400 });
    }

    const { allocations } = overheadBatchConfirmSchema.parse(await request.json());

    const batch = await prisma.$transaction(async (tx) => {
        // Delete existing allocations (re-confirm case)
        await tx.overheadAllocation.deleteMany({ where: { batchId: id } });
        await tx.overheadAllocation.createMany({
            data: allocations.map(a => ({
                batchId: id,
                projectId: a.projectId,
                ratio: a.ratio,
                amount: a.amount,
                isOverride: a.isOverride,
                notes: a.notes || '',
            })),
        });
        return tx.overheadBatch.update({
            where: { id },
            data: { status: 'confirmed', confirmedAt: new Date() },
        });
    });
    return NextResponse.json(batch);
});
```

- [ ] **Step 5: Commit**

```bash
git add app/api/overhead/batches/
git commit -m "feat(api): add overhead batch CRUD, calculate ratios, and confirm endpoints"
```

---

## Task 5: API — Company P&L Report

**Files:**
- Create: `app/api/overhead/pl/route.js`

- [ ] **Step 1: Create `app/api/overhead/pl/route.js`**

```javascript
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear());
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59, 999);

    // Active projects
    const projects = await prisma.project.findMany({
        where: { deletedAt: null, status: { notIn: ['Hủy'] } },
        select: {
            id: true, name: true, code: true, contractValue: true, paidAmount: true,
            expenses: {
                where: { deletedAt: null, status: { in: ['Đã duyệt', 'Đã chi', 'Hoàn thành'] } },
                select: { amount: true },
            },
            overheadAllocations: {
                where: { batch: { status: 'confirmed', confirmedAt: { gte: start, lte: end } } },
                select: { amount: true },
            },
        },
    });

    // Company-wide overhead (confirmed batches in year)
    const batches = await prisma.overheadBatch.findMany({
        where: { status: 'confirmed', confirmedAt: { gte: start, lte: end } },
        select: { id: true, code: true, name: true, period: true, totalAmount: true, confirmedAt: true },
    });

    const projectPL = projects.map(p => {
        const directCost = p.expenses.reduce((s, e) => s + e.amount, 0);
        const overheadCost = p.overheadAllocations.reduce((s, a) => s + a.amount, 0);
        const revenue = p.paidAmount; // collected revenue
        const grossProfit = revenue - directCost - overheadCost;
        return {
            id: p.id,
            name: p.name,
            code: p.code,
            contractValue: p.contractValue,
            revenue,
            directCost,
            overheadCost,
            grossProfit,
            margin: revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(1) : '0.0',
        };
    });

    const totalRevenue = projectPL.reduce((s, p) => s + p.revenue, 0);
    const totalDirectCost = projectPL.reduce((s, p) => s + p.directCost, 0);
    const totalOverheadCost = projectPL.reduce((s, p) => s + p.overheadCost, 0);
    const totalGrossProfit = totalRevenue - totalDirectCost - totalOverheadCost;

    return NextResponse.json({
        year,
        summary: { totalRevenue, totalDirectCost, totalOverheadCost, totalGrossProfit },
        projects: projectPL,
        batches,
    });
});
```

- [ ] **Step 2: Commit**

```bash
git add app/api/overhead/pl/
git commit -m "feat(api): add company P&L report endpoint"
```

---

## Task 6: Frontend — `/overhead` Page

**Files:**
- Create: `app/overhead/page.js`

- [ ] **Step 1: Create `app/overhead/page.js`**

```javascript
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRole } from '@/contexts/RoleContext';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';

const fmt = v => new Intl.NumberFormat('vi-VN').format(v || 0);
const MONTHS = ['01','02','03','04','05','06','07','08','09','10','11','12'];

function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function OverheadPage() {
    const { role } = useRole();
    const toast = useToast();
    const [activeTab, setActiveTab] = useState('expenses');
    const canManage = ['giam_doc', 'pho_gd', 'ke_toan'].includes(role);
    const canConfirm = ['giam_doc', 'pho_gd', 'ke_toan'].includes(role);

    // ── Expenses state ──
    const [expenses, setExpenses] = useState([]);
    const [categories, setCategories] = useState([]);
    const [expLoading, setExpLoading] = useState(true);
    const [expMonth, setExpMonth] = useState(getCurrentMonth());
    const [showExpForm, setShowExpForm] = useState(false);
    const [editExpense, setEditExpense] = useState(null);

    // ── Batches state ──
    const [batches, setBatches] = useState([]);
    const [batchLoading, setBatchLoading] = useState(false);
    const [showBatchForm, setShowBatchForm] = useState(false);
    const [viewBatch, setViewBatch] = useState(null);

    const fetchExpenses = useCallback(async () => {
        setExpLoading(true);
        try {
            const [res, cats] = await Promise.all([
                apiFetch(`/api/overhead/expenses?month=${expMonth}&limit=200`),
                apiFetch('/api/expense-categories'),
            ]);
            setExpenses(res.data || []);
            setCategories(cats || []);
        } catch (e) { toast.error(e.message); }
        setExpLoading(false);
    }, [expMonth]);

    const fetchBatches = useCallback(async () => {
        setBatchLoading(true);
        try {
            const res = await apiFetch('/api/overhead/batches?limit=50');
            setBatches(res.data || []);
        } catch (e) { toast.error(e.message); }
        setBatchLoading(false);
    }, []);

    useEffect(() => { fetchExpenses(); }, [fetchExpenses]);
    useEffect(() => { if (activeTab === 'batches') fetchBatches(); }, [activeTab, fetchBatches]);

    const approveExpense = async (id) => {
        try {
            await apiFetch(`/api/overhead/expenses/${id}/approve`, { method: 'PATCH' });
            toast.success('Đã duyệt');
            fetchExpenses();
        } catch (e) { toast.error(e.message); }
    };

    const deleteExpense = async (id) => {
        if (!confirm('Xóa khoản chi phí này?')) return;
        try {
            await apiFetch(`/api/overhead/expenses/${id}`, { method: 'DELETE' });
            toast.success('Đã xóa');
            fetchExpenses();
        } catch (e) { toast.error(e.message); }
    };

    const deleteBatch = async (id) => {
        if (!confirm('Xóa đợt phân bổ này?')) return;
        try {
            await apiFetch(`/api/overhead/batches/${id}`, { method: 'DELETE' });
            toast.success('Đã xóa');
            fetchBatches();
        } catch (e) { toast.error(e.message); }
    };

    const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
    const approved = expenses.filter(e => e.status === 'approved');
    const totalApproved = approved.reduce((s, e) => s + e.amount, 0);
    const pending = expenses.filter(e => e.status === 'draft');

    const statusBadge = (s) => ({
        draft: { label: 'Chờ duyệt', color: '#f59e0b' },
        approved: { label: 'Đã duyệt', color: '#22c55e' },
        confirmed: { label: 'Đã xác nhận', color: '#3b82f6' },
    }[s] || { label: s, color: '#6b7280' });

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h2 style={{ margin: 0 }}>Chi phí chung</h2>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Ghi nhận & phân bổ chi phí vận hành công ty vào dự án</div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--border)', marginBottom: 24 }}>
                {[['expenses', '📋 Chi phí'], ['batches', '📊 Đợt phân bổ']].map(([key, label]) => (
                    <button key={key} onClick={() => setActiveTab(key)} style={{
                        padding: '8px 20px', border: 'none', background: 'none', cursor: 'pointer',
                        borderBottom: activeTab === key ? '2px solid var(--primary)' : '2px solid transparent',
                        color: activeTab === key ? 'var(--primary)' : 'var(--text-muted)',
                        fontWeight: activeTab === key ? 600 : 400, marginBottom: -2,
                    }}>{label}</button>
                ))}
            </div>

            {/* ── Tab 1: Expenses ── */}
            {activeTab === 'expenses' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <select className="form-select" value={expMonth} onChange={e => setExpMonth(e.target.value)} style={{ width: 160 }}>
                                {[...Array(12)].map((_, i) => {
                                    const y = new Date().getFullYear();
                                    const m = String(i + 1).padStart(2, '0');
                                    const val = `${y}-${m}`;
                                    return <option key={val} value={val}>Tháng {i + 1}/{y}</option>;
                                })}
                            </select>
                        </div>
                        {canManage && (
                            <button className="btn btn-primary" onClick={() => { setEditExpense(null); setShowExpForm(true); }}>+ Thêm chi phí</button>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
                        {[
                            { label: 'Tổng tháng', value: fmt(totalAmount) + 'đ', color: 'var(--primary)' },
                            { label: 'Đã duyệt', value: fmt(totalApproved) + 'đ', color: '#22c55e' },
                            { label: 'Chờ duyệt', value: pending.length + ' khoản', color: '#f59e0b' },
                        ].map(k => (
                            <div key={k.label} className="card" style={{ padding: '12px 16px', textAlign: 'center' }}>
                                <div style={{ fontSize: 18, fontWeight: 700, color: k.color }}>{k.value}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k.label}</div>
                            </div>
                        ))}
                    </div>

                    {expLoading ? (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                    ) : (
                        <div className="card" style={{ overflow: 'auto' }}>
                            <table className="data-table">
                                <thead>
                                    <tr><th>Mã</th><th>Mô tả</th><th>Danh mục</th><th>Ngày</th><th style={{ textAlign: 'right' }}>Số tiền</th><th>Trạng thái</th><th>Chứng từ</th><th></th></tr>
                                </thead>
                                <tbody>
                                    {expenses.map(e => {
                                        const s = statusBadge(e.status);
                                        return (
                                            <tr key={e.id}>
                                                <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{e.code}</td>
                                                <td>{e.description}</td>
                                                <td>{e.category?.name || '—'}</td>
                                                <td>{new Date(e.date).toLocaleDateString('vi-VN')}</td>
                                                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(e.amount)}</td>
                                                <td><span className="badge" style={{ background: s.color + '20', color: s.color }}>{s.label}</span></td>
                                                <td>{e.proofUrl ? <a href={e.proofUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontSize: 12 }}>📎 Xem</a> : '—'}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                        {canManage && e.status === 'draft' && (
                                                            <>
                                                                <button className="btn btn-sm btn-ghost" onClick={() => { setEditExpense(e); setShowExpForm(true); }}>Sửa</button>
                                                                <button className="btn btn-sm" style={{ color: '#22c55e' }} onClick={() => approveExpense(e.id)}>Duyệt</button>
                                                                <button className="btn btn-sm" style={{ color: '#ef4444' }} onClick={() => deleteExpense(e.id)}>Xóa</button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {expenses.length === 0 && (
                                        <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>Chưa có chi phí chung trong tháng này</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── Tab 2: Batches ── */}
            {activeTab === 'batches' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                        {canManage && (
                            <button className="btn btn-primary" onClick={() => setShowBatchForm(true)}>+ Tạo đợt phân bổ</button>
                        )}
                    </div>
                    {batchLoading ? (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                    ) : (
                        <div className="card" style={{ overflow: 'auto' }}>
                            <table className="data-table">
                                <thead>
                                    <tr><th>Mã</th><th>Tên</th><th>Kỳ</th><th style={{ textAlign: 'right' }}>Tổng CP</th><th>Trạng thái</th><th>Ngày xác nhận</th><th></th></tr>
                                </thead>
                                <tbody>
                                    {batches.map(b => {
                                        const s = statusBadge(b.status);
                                        return (
                                            <tr key={b.id}>
                                                <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{b.code}</td>
                                                <td>{b.name}</td>
                                                <td>{b.period || '—'}</td>
                                                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(b.totalAmount)}</td>
                                                <td><span className="badge" style={{ background: s.color + '20', color: s.color }}>{s.label}</span></td>
                                                <td>{b.confirmedAt ? new Date(b.confirmedAt).toLocaleDateString('vi-VN') : '—'}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                        <button className="btn btn-sm btn-ghost" onClick={() => setViewBatch(b.id)}>Xem</button>
                                                        {canManage && b.status === 'draft' && (
                                                            <button className="btn btn-sm" style={{ color: '#ef4444' }} onClick={() => deleteBatch(b.id)}>Xóa</button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {batches.length === 0 && (
                                        <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>Chưa có đợt phân bổ</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {showExpForm && (
                <ExpenseForm
                    expense={editExpense}
                    categories={categories}
                    onClose={() => { setShowExpForm(false); setEditExpense(null); }}
                    onSuccess={() => { setShowExpForm(false); setEditExpense(null); fetchExpenses(); }}
                    toast={toast}
                />
            )}

            {showBatchForm && (
                <BatchCreateForm
                    onClose={() => setShowBatchForm(false)}
                    onSuccess={() => { setShowBatchForm(false); fetchBatches(); }}
                    toast={toast}
                    canConfirm={canConfirm}
                />
            )}

            {viewBatch && (
                <BatchDetailModal
                    batchId={viewBatch}
                    onClose={() => { setViewBatch(null); fetchBatches(); }}
                    toast={toast}
                    canConfirm={canConfirm}
                />
            )}
        </div>
    );
}

// ── Expense Form Modal ──
function ExpenseForm({ expense, categories, onClose, onSuccess, toast }) {
    const [form, setForm] = useState({
        description: expense?.description || '',
        amount: expense?.amount || '',
        categoryId: expense?.categoryId || '',
        date: expense?.date ? new Date(expense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        proofUrl: expense?.proofUrl || '',
        notes: expense?.notes || '',
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.description || !form.amount) return toast.error('Vui lòng điền đủ thông tin');
        setSaving(true);
        try {
            const body = { ...form, amount: parseFloat(form.amount), categoryId: form.categoryId || null };
            if (expense) {
                await apiFetch(`/api/overhead/expenses/${expense.id}`, { method: 'PUT', body: JSON.stringify(body) });
                toast.success('Đã cập nhật');
            } else {
                await apiFetch('/api/overhead/expenses', { method: 'POST', body: JSON.stringify(body) });
                toast.success('Đã thêm chi phí');
            }
            onSuccess();
        } catch (e) { toast.error(e.message); }
        setSaving(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                <h3 style={{ marginTop: 0 }}>{expense ? 'Sửa chi phí' : 'Thêm chi phí chung'}</h3>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Mô tả *</label>
                        <input className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">Số tiền *</label>
                            <input className="form-input" type="number" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Ngày</label>
                            <input className="form-input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Danh mục</label>
                        <select className="form-select" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                            <option value="">-- Không chọn --</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Link chứng từ (URL)</label>
                        <input className="form-input" placeholder="https://..." value={form.proofUrl} onChange={e => setForm({ ...form, proofUrl: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Ghi chú</label>
                        <input className="form-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                        <button type="button" className="btn" onClick={onClose}>Hủy</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : (expense ? 'Cập nhật' : 'Thêm')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Batch Create Form Modal ──
function BatchCreateForm({ onClose, onSuccess, toast }) {
    const [step, setStep] = useState(1); // 1=select expenses, 2=review allocations
    const [form, setForm] = useState({ name: '', period: getCurrentMonth(), notes: '' });
    const [approvedExpenses, setApprovedExpenses] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [loadingExp, setLoadingExp] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [allocations, setAllocations] = useState([]);
    const [calculating, setCalculating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [createdBatchId, setCreatedBatchId] = useState(null);

    const loadApproved = useCallback(async () => {
        setLoadingExp(true);
        try {
            const res = await apiFetch(`/api/overhead/expenses?status=approved&month=${form.period}&limit=200`);
            setApprovedExpenses(res.data || []);
        } catch (e) { toast.error(e.message); }
        setLoadingExp(false);
    }, [form.period]);

    useEffect(() => { loadApproved(); }, [loadApproved]);

    const selectedTotal = approvedExpenses.filter(e => selectedIds.includes(e.id)).reduce((s, e) => s + e.amount, 0);

    const toggleAll = () => {
        if (selectedIds.length === approvedExpenses.length) setSelectedIds([]);
        else setSelectedIds(approvedExpenses.map(e => e.id));
    };

    const createAndCalculate = async () => {
        if (!form.name || selectedIds.length === 0) return toast.error('Chọn ít nhất 1 khoản và nhập tên đợt');
        setSaving(true);
        try {
            const batch = await apiFetch('/api/overhead/batches', {
                method: 'POST',
                body: JSON.stringify({ ...form, expenseIds: selectedIds }),
            });
            setCreatedBatchId(batch.id);
            // Calculate ratios
            setCalculating(true);
            const calc = await apiFetch(`/api/overhead/batches/${batch.id}/calculate`, { method: 'POST' });
            setSuggestions(calc.suggestions || []);
            setAllocations(calc.suggestions || []);
            setStep(2);
        } catch (e) { toast.error(e.message); }
        setSaving(false);
        setCalculating(false);
    };

    const updateAllocation = (projectId, field, value) => {
        setAllocations(prev => prev.map(a => a.projectId === projectId ? { ...a, [field]: parseFloat(value) || 0, isOverride: true } : a));
    };

    const confirmBatch = async () => {
        if (!createdBatchId) return;
        setSaving(true);
        try {
            await apiFetch(`/api/overhead/batches/${createdBatchId}/confirm`, {
                method: 'POST',
                body: JSON.stringify({ allocations }),
            });
            toast.success('Đã xác nhận đợt phân bổ');
            onSuccess();
        } catch (e) { toast.error(e.message); }
        setSaving(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
                <h3 style={{ marginTop: 0 }}>Tạo đợt phân bổ — Bước {step}/2</h3>

                {step === 1 && (
                    <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                            <div className="form-group">
                                <label className="form-label">Tên đợt *</label>
                                <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Chi phí chung tháng 3/2026" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Kỳ (tháng)</label>
                                <input className="form-input" type="month" value={form.period} onChange={e => setForm({ ...form, period: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-group" style={{ marginBottom: 12 }}>
                            <label className="form-label">Ghi chú</label>
                            <input className="form-input" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                        </div>

                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Chọn chi phí đã duyệt trong kỳ ({approvedExpenses.length} khoản):</div>
                        {loadingExp ? (
                            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                        ) : (
                            <div style={{ maxHeight: 280, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 12 }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th><input type="checkbox" checked={selectedIds.length === approvedExpenses.length && approvedExpenses.length > 0} onChange={toggleAll} /></th>
                                            <th>Mã</th><th>Mô tả</th><th>Danh mục</th><th style={{ textAlign: 'right' }}>Số tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {approvedExpenses.map(e => (
                                            <tr key={e.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedIds(prev => prev.includes(e.id) ? prev.filter(i => i !== e.id) : [...prev, e.id])}>
                                                <td><input type="checkbox" checked={selectedIds.includes(e.id)} onChange={() => {}} /></td>
                                                <td style={{ fontFamily: 'monospace' }}>{e.code}</td>
                                                <td>{e.description}</td>
                                                <td>{e.category?.name || '—'}</td>
                                                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(e.amount)}</td>
                                            </tr>
                                        ))}
                                        {approvedExpenses.length === 0 && (
                                            <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Không có chi phí đã duyệt trong kỳ này</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 600 }}>Đã chọn: {fmt(selectedTotal)}đ ({selectedIds.length} khoản)</div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn" onClick={onClose}>Hủy</button>
                                <button className="btn btn-primary" onClick={createAndCalculate} disabled={saving || selectedIds.length === 0}>
                                    {saving ? 'Đang xử lý...' : 'Tiếp theo → Phân bổ'}
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {step === 2 && (
                    <>
                        <div style={{ marginBottom: 12, color: 'var(--text-muted)', fontSize: 13 }}>
                            Tổng phân bổ: <strong style={{ color: 'var(--text-primary)' }}>{fmt(selectedTotal)}đ</strong>. Tỷ lệ tính theo doanh thu/hợp đồng dự án. Chỉnh sửa nếu cần.
                        </div>
                        {calculating ? (
                            <div style={{ padding: 20, textAlign: 'center' }}>Đang tính tỷ lệ...</div>
                        ) : (
                            <div style={{ maxHeight: 320, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 16 }}>
                                <table className="data-table">
                                    <thead>
                                        <tr><th>Dự án</th><th style={{ textAlign: 'right' }}>Doanh thu kỳ</th><th style={{ textAlign: 'right' }}>Tỷ lệ %</th><th style={{ textAlign: 'right' }}>Phân bổ (đ)</th></tr>
                                    </thead>
                                    <tbody>
                                        {allocations.map(a => (
                                            <tr key={a.projectId}>
                                                <td>{a.projectCode} — {a.projectName}</td>
                                                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(a.revenue)}</td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <input
                                                        type="number" min="0" max="100" step="0.01"
                                                        value={a.ratio}
                                                        onChange={e => updateAllocation(a.projectId, 'ratio', e.target.value)}
                                                        style={{ width: 70, textAlign: 'right', padding: '2px 6px', border: '1px solid var(--border)', borderRadius: 4 }}
                                                    />
                                                    {a.isOverride && <span style={{ color: '#f59e0b', fontSize: 11, marginLeft: 4 }}>*</span>}
                                                </td>
                                                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(a.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <button className="btn" onClick={() => setStep(1)}>← Quay lại</button>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn" onClick={onClose}>Lưu nháp & đóng</button>
                                <button className="btn btn-primary" onClick={confirmBatch} disabled={saving}>
                                    {saving ? 'Đang xác nhận...' : '✓ Xác nhận phân bổ'}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ── Batch Detail Modal ──
function BatchDetailModal({ batchId, onClose, toast, canConfirm }) {
    const [batch, setBatch] = useState(null);
    const [loading, setLoading] = useState(true);
    const [allocations, setAllocations] = useState([]);
    const [recalculating, setRecalculating] = useState(false);
    const [confirming, setConfirming] = useState(false);

    useEffect(() => {
        apiFetch(`/api/overhead/batches/${batchId}`)
            .then(b => { setBatch(b); setAllocations(b.allocations || []); setLoading(false); })
            .catch(e => { toast.error(e.message); setLoading(false); });
    }, [batchId]);

    const recalculate = async () => {
        setRecalculating(true);
        try {
            const calc = await apiFetch(`/api/overhead/batches/${batchId}/calculate`, { method: 'POST' });
            setAllocations(calc.suggestions || []);
        } catch (e) { toast.error(e.message); }
        setRecalculating(false);
    };

    const confirmBatch = async () => {
        if (!confirm('Xác nhận đợt phân bổ? Sau khi xác nhận sẽ không sửa được.')) return;
        setConfirming(true);
        try {
            await apiFetch(`/api/overhead/batches/${batchId}/confirm`, {
                method: 'POST',
                body: JSON.stringify({ allocations }),
            });
            toast.success('Đã xác nhận');
            onClose();
        } catch (e) { toast.error(e.message); }
        setConfirming(false);
    };

    const updateAllocation = (projectId, field, value) => {
        setAllocations(prev => prev.map(a =>
            (a.projectId || a.project?.id) === projectId ? { ...a, [field]: parseFloat(value) || 0, isOverride: true } : a
        ));
    };

    if (loading) return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div>
        </div>
    );

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 720 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                        <h3 style={{ margin: 0 }}>{batch?.code} — {batch?.name}</h3>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Kỳ: {batch?.period || 'Thủ công'} | Tổng: {fmt(batch?.totalAmount)}đ</div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
                </div>

                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Chi phí trong đợt ({batch?.items?.length}):</div>
                <div style={{ maxHeight: 160, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 16 }}>
                    <table className="data-table">
                        <thead><tr><th>Mã</th><th>Mô tả</th><th>Danh mục</th><th style={{ textAlign: 'right' }}>Số tiền</th></tr></thead>
                        <tbody>
                            {batch?.items?.map(item => (
                                <tr key={item.id}>
                                    <td style={{ fontFamily: 'monospace' }}>{item.expense.code}</td>
                                    <td>{item.expense.description}</td>
                                    <td>{item.expense.category?.name || '—'}</td>
                                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(item.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>Phân bổ dự án ({allocations.length}):</div>
                    {batch?.status === 'draft' && (
                        <button className="btn btn-ghost btn-sm" onClick={recalculate} disabled={recalculating}>
                            {recalculating ? 'Đang tính...' : '↺ Tính lại tỷ lệ'}
                        </button>
                    )}
                </div>
                <div style={{ maxHeight: 220, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 16 }}>
                    <table className="data-table">
                        <thead><tr><th>Dự án</th><th style={{ textAlign: 'right' }}>Tỷ lệ %</th><th style={{ textAlign: 'right' }}>Phân bổ (đ)</th><th></th></tr></thead>
                        <tbody>
                            {allocations.map(a => {
                                const pid = a.projectId || a.project?.id;
                                const pname = a.projectName || `${a.project?.code} — ${a.project?.name}`;
                                return (
                                    <tr key={pid}>
                                        <td>{pname}</td>
                                        <td style={{ textAlign: 'right' }}>
                                            {batch?.status === 'draft' ? (
                                                <input
                                                    type="number" min="0" max="100" step="0.01"
                                                    value={a.ratio}
                                                    onChange={e => updateAllocation(pid, 'ratio', e.target.value)}
                                                    style={{ width: 70, textAlign: 'right', padding: '2px 6px', border: '1px solid var(--border)', borderRadius: 4 }}
                                                />
                                            ) : `${a.ratio}%`}
                                            {a.isOverride && <span style={{ color: '#f59e0b', fontSize: 11, marginLeft: 4 }}>*</span>}
                                        </td>
                                        <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(a.amount)}</td>
                                        <td>{a.isOverride ? '✏️' : ''}</td>
                                    </tr>
                                );
                            })}
                            {allocations.length === 0 && (
                                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)' }}>Chưa có phân bổ — bấm "Tính lại tỷ lệ"</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button className="btn" onClick={onClose}>Đóng</button>
                    {canConfirm && batch?.status === 'draft' && allocations.length > 0 && (
                        <button className="btn btn-primary" onClick={confirmBatch} disabled={confirming}>
                            {confirming ? 'Đang xác nhận...' : '✓ Xác nhận phân bổ'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/overhead/
git commit -m "feat(ui): add /overhead page with expense entry and batch allocation tabs"
```

---

## Task 7: Navigation — Sidebar + Header

**Files:**
- Modify: `components/Sidebar.js`
- Modify: `components/Header.js`

- [ ] **Step 1: Add import in `components/Sidebar.js`**

Find the icon imports line (top of file with lucide-react). Add `Building2` to the import:
```javascript
import { ..., Building2 } from 'lucide-react';
```

- [ ] **Step 2: Add menu item in Sidebar Finance section**

Find the Finance section in the items array (has `href: '/finance'`, `href: '/accounting'`, etc.). Add after the `/cong-no` entry:

```javascript
{ href: '/overhead', icon: Building2, label: 'Chi phí chung', roles: ['giam_doc', 'pho_gd', 'ke_toan'] },
```

- [ ] **Step 3: Add page title in `components/Header.js`**

Find `pageTitles` object (line 8-29). Add entry after `/cong-no`:

```javascript
'/overhead': 'Chi phí chung',
```

- [ ] **Step 4: Commit**

```bash
git add components/Sidebar.js components/Header.js
git commit -m "feat(nav): add Chi phí chung menu item and page title"
```

---

## Task 8: Reports — Company P&L Tab

**Files:**
- Modify: `app/reports/page.js`

- [ ] **Step 1: Add P&L data state and fetch in `app/reports/page.js`**

Find the state declarations at the top of `ReportsPage` component. Add:

```javascript
const [plData, setPlData] = useState(null);
const [plYear, setPlYear] = useState(new Date().getFullYear());
const [plLoading, setPlLoading] = useState(false);
```

- [ ] **Step 2: Add fetch function for P&L data**

Add this function inside the component (alongside other fetch functions):

```javascript
const fetchPL = useCallback(async () => {
    setPlLoading(true);
    try {
        const res = await apiFetch(`/api/overhead/pl?year=${plYear}`);
        setPlData(res);
    } catch (e) { toast.error(e.message); }
    setPlLoading(false);
}, [plYear]);
```

- [ ] **Step 3: Add useEffect for P&L tab**

Find where tab-specific useEffects are (or add near existing ones):

```javascript
useEffect(() => {
    if (activeTab === 'pl') fetchPL();
}, [activeTab, fetchPL]);
```

- [ ] **Step 4: Add "P&L Công ty" tab button**

Find the tab navigation buttons row (where other tabs like "Doanh thu", "Công nợ" etc. are). Add:

```javascript
<button
    onClick={() => setActiveTab('pl')}
    style={{
        padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer',
        borderBottom: activeTab === 'pl' ? '2px solid var(--primary)' : '2px solid transparent',
        color: activeTab === 'pl' ? 'var(--primary)' : 'var(--text-muted)',
        fontWeight: activeTab === 'pl' ? 600 : 400, marginBottom: -2,
    }}
>📊 P&L Công ty</button>
```

- [ ] **Step 5: Add P&L tab content panel**

Find where other tab panels are rendered (inside the activeTab conditional rendering). Add:

```javascript
{activeTab === 'pl' && (
    <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <select
                className="form-select"
                value={plYear}
                onChange={e => setPlYear(Number(e.target.value))}
                style={{ width: 120 }}
            >
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
        </div>

        {plLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
        ) : plData ? (
            <>
                {/* Summary cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
                    {[
                        { label: 'Tổng doanh thu', value: fmt(plData.summary.totalRevenue) + 'đ', color: '#22c55e' },
                        { label: 'Chi phí trực tiếp', value: fmt(plData.summary.totalDirectCost) + 'đ', color: '#ef4444' },
                        { label: 'Chi phí chung', value: fmt(plData.summary.totalOverheadCost) + 'đ', color: '#f59e0b' },
                        { label: 'Lợi nhuận gộp', value: fmt(plData.summary.totalGrossProfit) + 'đ', color: plData.summary.totalGrossProfit >= 0 ? '#3b82f6' : '#ef4444' },
                    ].map(k => (
                        <div key={k.label} className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: k.color }}>{k.value}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{k.label}</div>
                        </div>
                    ))}
                </div>

                {/* Per-project P&L table */}
                <div className="card" style={{ overflow: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Dự án</th>
                                <th style={{ textAlign: 'right' }}>Giá trị HĐ</th>
                                <th style={{ textAlign: 'right' }}>Đã thu</th>
                                <th style={{ textAlign: 'right' }}>CP trực tiếp</th>
                                <th style={{ textAlign: 'right' }}>CP chung</th>
                                <th style={{ textAlign: 'right' }}>LN gộp</th>
                                <th style={{ textAlign: 'right' }}>Biên LN</th>
                            </tr>
                        </thead>
                        <tbody>
                            {plData.projects.map(p => (
                                <tr key={p.id}>
                                    <td><span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>{p.code}</span> {p.name}</td>
                                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(p.contractValue)}</td>
                                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{fmt(p.revenue)}</td>
                                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#ef4444' }}>({fmt(p.directCost)})</td>
                                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#f59e0b' }}>({fmt(p.overheadCost)})</td>
                                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: p.grossProfit >= 0 ? '#22c55e' : '#ef4444' }}>{fmt(p.grossProfit)}</td>
                                    <td style={{ textAlign: 'right', color: parseFloat(p.margin) >= 0 ? '#22c55e' : '#ef4444' }}>{p.margin}%</td>
                                </tr>
                            ))}
                            {plData.projects.length === 0 && (
                                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 30 }}>Không có dữ liệu</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </>
        ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Chọn năm để xem báo cáo</div>
        )}
    </div>
)}
```

- [ ] **Step 6: Commit**

```bash
git add app/reports/page.js
git commit -m "feat(reports): add Company P&L tab with overhead cost breakdown"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ OverheadExpense model with categoryId, proofUrl, status draft/approved — Task 1+3
- ✅ OverheadBatch model with period, status draft/confirmed — Task 1+4
- ✅ OverheadBatchItem many-to-many — Task 1+4
- ✅ OverheadAllocation with ratio, isOverride — Task 1+4
- ✅ Auto-generate CPG-xxx code — Task 2
- ✅ GET/POST/PUT/DELETE overhead expenses — Task 3
- ✅ Approve endpoint — Task 3
- ✅ Batch CRUD — Task 4
- ✅ Calculate ratios by transaction revenue (fallback: contractValue) — Task 4
- ✅ Confirm batch (readonly after) — Task 4
- ✅ `/overhead` page Tab 1: expense list with filter, add/edit/approve/delete — Task 6
- ✅ `/overhead` page Tab 2: batch list, 2-step create (select→allocate), detail modal — Task 6
- ✅ Sidebar + Header navigation — Task 7
- ✅ Reports P&L tab: summary + per-project breakdown — Task 8

**No placeholders found.**

**Type consistency:** `OverheadAllocation` uses `projectId` and `batchId` consistently across schema, API, and frontend. `ratio` is always a Float (0-100 scale, not 0-1). `status` values: `'draft'` / `'approved'` for expenses, `'draft'` / `'confirmed'` for batches.
