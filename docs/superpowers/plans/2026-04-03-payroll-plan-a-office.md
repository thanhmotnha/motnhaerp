# Payroll Upgrade — Plan A: Schema + Bảng lương Văn phòng

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm 3 model Prisma mới + API + UI cho bảng lương nhân viên văn phòng với phụ cấp đầy đủ, tính lương theo ngày, và tab trong trang HR.

**Architecture:** Mở rộng Employee với `payrollType` và các field phụ cấp. Tạo `OfficePayrollRecord` (tách biệt với `PayrollRecord` cũ). API POST tự tạo records từ employee data, PATCH cho inline edit. UI dạng spreadsheet có thể chỉnh từng ô.

**Tech Stack:** Next.js App Router, Prisma 6, PostgreSQL, Zod 4, React 19

---

## File Structure

| File | Action | Trách nhiệm |
|------|--------|-------------|
| `prisma/schema.prisma` | Modify | Thêm fields vào Employee + 3 models mới |
| `lib/validations/officePayroll.js` | Create | Zod schema cho PATCH |
| `app/api/hr/office-payroll/route.js` | Create | GET danh sách + POST tạo bảng lương |
| `app/api/hr/office-payroll/[id]/route.js` | Create | PATCH sửa 1 record inline |
| `components/hr/OfficePayrollTab.js` | Create | UI bảng lương VP dạng spreadsheet |
| `app/hr/page.js` | Modify | Thêm tab Bảng lương VP |

---

## Task 1: Schema Prisma — Employee + 3 models mới

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Thêm fields vào Employee model** (sau dòng `leaveBalance`)

Mở `prisma/schema.prisma`, tìm model Employee (line ~380). Thêm các field sau vào **trước dòng** `attendances Attendance[]`:

```prisma
  payrollType        String   @default("office")   // "office" | "workshop"
  positionAllowance  Int      @default(0)
  phoneAllowance     Int      @default(0)
  transportAllowance Int      @default(0)
  diligenceAllowance Int      @default(0)
  mealAllowanceRate  Int      @default(0)           // tiền ăn/ngày cho xưởng
  dailyWage          Int      @default(0)           // lương ngày cho xưởng
  officePayrolls     OfficePayrollRecord[]
  workshopPayrolls   WorkshopPayrollRecord[]
  contractCommissions ContractCommission[]
```

- [ ] **Step 2: Thêm model OfficePayrollRecord** (sau model Employee, trước model ProjectEmployee)

```prisma
model OfficePayrollRecord {
  id                 String   @id @default(cuid())
  employeeId         String
  month              Int
  year               Int
  standardDays       Int      @default(26)
  actualDays         Float    @default(0)
  holidayDays        Float    @default(0)
  paidLeaveDays      Float    @default(0)
  baseSalary         Float    @default(0)
  proratedSalary     Float    @default(0)
  positionAllowance  Float    @default(0)
  phoneAllowance     Float    @default(0)
  transportAllowance Float    @default(0)
  diligenceAllowance Float    @default(0)
  commissionAmount   Float    @default(0)
  bonus              Float    @default(0)
  grossIncome        Float    @default(0)
  bhxhEmployee       Float    @default(0)
  bhytEmployee       Float    @default(0)
  bhtnEmployee       Float    @default(0)
  bhxhCompany        Float    @default(0)
  disciplinaryFine   Float    @default(0)
  salaryAdvance      Float    @default(0)
  totalDeductions    Float    @default(0)
  totalCompanyPays   Float    @default(0)
  netSalary          Float    @default(0)
  notes              String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  employee           Employee @relation(fields: [employeeId], references: [id])

  @@unique([employeeId, month, year])
}
```

- [ ] **Step 3: Thêm model WorkshopPayrollRecord** (ngay sau OfficePayrollRecord)

```prisma
model WorkshopPayrollRecord {
  id                 String   @id @default(cuid())
  employeeId         String
  month              Int
  year               Int
  dailyWage          Float    @default(0)
  actualDays         Float    @default(0)
  basePay            Float    @default(0)
  overtimeHours      Float    @default(0)
  overtimePay        Float    @default(0)
  mealAllowance      Float    @default(0)
  phoneAllowance     Float    @default(0)
  transportAllowance Float    @default(0)
  diligenceAllowance Float    @default(0)
  bonus              Float    @default(0)
  grossIncome        Float    @default(0)
  disciplinaryFine   Float    @default(0)
  salaryAdvance      Float    @default(0)
  totalDeductions    Float    @default(0)
  netSalary          Float    @default(0)
  notes              String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  employee           Employee @relation(fields: [employeeId], references: [id])

  @@unique([employeeId, month, year])
}
```

- [ ] **Step 4: Thêm model ContractCommission** (ngay sau WorkshopPayrollRecord)

Tìm model Contract trong schema, thêm relation vào cuối (trước dòng đóng `}`):
```prisma
  commissions ContractCommission[]
```

Thêm model mới:
```prisma
model ContractCommission {
  id         String   @id @default(cuid())
  employeeId String
  contractId String
  rate       Float
  createdAt  DateTime @default(now())
  employee   Employee @relation(fields: [employeeId], references: [id])
  contract   Contract @relation(fields: [contractId], references: [id])

  @@unique([employeeId, contractId])
}
```

- [ ] **Step 5: Chạy migration**

```bash
npm run db:migrate
```

Expected output: `Your database is now in sync with your schema.`

- [ ] **Step 6: Verify schema**

```bash
npm run db:generate
```

Expected: `Generated Prisma Client` — không có lỗi.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add office/workshop payroll models + ContractCommission"
```

---

## Task 2: Validation Schema

**Files:**
- Create: `lib/validations/officePayroll.js`

- [ ] **Step 1: Tạo file validation**

```javascript
// lib/validations/officePayroll.js
import { z } from 'zod';

export const officePayrollPatchSchema = z.object({
    actualDays:         z.number().min(0).max(31).optional(),
    positionAllowance:  z.number().min(0).optional(),
    phoneAllowance:     z.number().min(0).optional(),
    transportAllowance: z.number().min(0).optional(),
    diligenceAllowance: z.number().min(0).optional(),
    bonus:              z.number().min(0).optional(),
    disciplinaryFine:   z.number().min(0).optional(),
    salaryAdvance:      z.number().min(0).optional(),
    notes:              z.string().nullable().optional(),
}).strict();
```

- [ ] **Step 2: Commit**

```bash
git add lib/validations/officePayroll.js
git commit -m "feat(validation): add officePayroll patch schema"
```

---

## Task 3: API GET + POST `/api/hr/office-payroll`

**Files:**
- Create: `app/api/hr/office-payroll/route.js`

**Bối cảnh:** `withAuth` từ `@/lib/apiHandler` wrap mọi route. Prisma singleton từ `@/lib/prisma`. BHXH employee = 8%, BHYT = 1.5%, BHTN = 1%, BHXH công ty = 21.5%.

- [ ] **Step 1: Tạo file route**

```javascript
// app/api/hr/office-payroll/route.js
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

const BHXH_EMP  = 0.08;
const BHYT_EMP  = 0.015;
const BHTN_EMP  = 0.01;
const BHXH_COMP = 0.215;
const STD_DAYS  = 26;

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || new Date().getMonth() + 1);
    const year  = parseInt(searchParams.get('year')  || new Date().getFullYear());

    const records = await prisma.officePayrollRecord.findMany({
        where: { month, year },
        include: {
            employee: {
                select: {
                    name: true, code: true, position: true,
                    bankAccount: true, bankName: true,
                    department: { select: { name: true } },
                },
            },
        },
        orderBy: { employee: { name: 'asc' } },
    });

    const summary = {
        count: records.length,
        totalGross:       records.reduce((s, r) => s + r.grossIncome, 0),
        totalNet:         records.reduce((s, r) => s + r.netSalary, 0),
        totalCompanyPays: records.reduce((s, r) => s + r.totalCompanyPays, 0),
        totalBhxhComp:    records.reduce((s, r) => s + r.bhxhCompany, 0),
    };

    return NextResponse.json({ data: records, month, year, summary });
}, { roles: ['giam_doc', 'ke_toan'] });

export const POST = withAuth(async (request) => {
    const { month, year } = await request.json();
    if (!month || !year) {
        return NextResponse.json({ error: 'Thiếu tháng/năm' }, { status: 400 });
    }

    const employees = await prisma.employee.findMany({
        where: { status: 'Đang làm', deletedAt: null, payrollType: 'office' },
    });

    if (employees.length === 0) {
        return NextResponse.json({ data: [], count: 0, warning: 'Không có nhân viên văn phòng nào' });
    }

    // Commission assignments với contracts trong tháng này
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth   = new Date(year, month, 0, 23, 59, 59);

    const commissions = await prisma.contractCommission.findMany({
        where: { employeeId: { in: employees.map(e => e.id) } },
        include: {
            contract: {
                select: {
                    contractValue: true, variationAmount: true,
                    createdAt: true, deletedAt: true, status: true,
                },
            },
        },
    });

    const records = [];
    for (const emp of employees) {
        // Giữ lại giá trị thủ công đã nhập nếu record tồn tại
        const existing = await prisma.officePayrollRecord.findUnique({
            where: { employeeId_month_year: { employeeId: emp.id, month, year } },
        });

        const actualDays         = existing?.actualDays         ?? STD_DAYS;
        const bonus              = existing?.bonus              ?? 0;
        const disciplinaryFine   = existing?.disciplinaryFine   ?? 0;
        const salaryAdvance      = existing?.salaryAdvance      ?? 0;
        const positionAllowance  = existing?.positionAllowance  ?? emp.positionAllowance  ?? 0;
        const phoneAllowance     = existing?.phoneAllowance     ?? emp.phoneAllowance     ?? 0;
        const transportAllowance = existing?.transportAllowance ?? emp.transportAllowance ?? 0;
        const diligenceAllowance = existing?.diligenceAllowance ?? emp.diligenceAllowance ?? 0;

        // Tính hoa hồng từ HĐ được gán trong tháng
        const empCommissions = commissions.filter(c => c.employeeId === emp.id);
        const commissionAmount = empCommissions.reduce((s, c) => {
            if (!c.contract || c.contract.deletedAt) return s;
            const d = new Date(c.contract.createdAt);
            if (d < startOfMonth || d > endOfMonth) return s;
            return s + ((c.contract.contractValue || 0) + (c.contract.variationAmount || 0)) * c.rate / 100;
        }, 0);

        const insuranceSalary = emp.insuranceSalary || emp.salary || 0;
        const proratedSalary  = (emp.salary || 0) * actualDays / STD_DAYS;
        const grossIncome     = proratedSalary + positionAllowance + phoneAllowance
                              + transportAllowance + diligenceAllowance + commissionAmount + bonus;

        const bhxhEmployee   = insuranceSalary * BHXH_EMP;
        const bhytEmployee   = insuranceSalary * BHYT_EMP;
        const bhtnEmployee   = insuranceSalary * BHTN_EMP;
        const bhxhCompany    = insuranceSalary * BHXH_COMP;
        const totalDeductions = bhxhEmployee + bhytEmployee + bhtnEmployee + disciplinaryFine + salaryAdvance;
        const totalCompanyPays = grossIncome + bhxhCompany;
        const netSalary       = grossIncome - totalDeductions;

        const payload = {
            month, year,
            standardDays: STD_DAYS,
            actualDays,
            baseSalary:        emp.salary || 0,
            proratedSalary:    Math.round(proratedSalary),
            positionAllowance, phoneAllowance, transportAllowance, diligenceAllowance,
            commissionAmount:  Math.round(commissionAmount),
            bonus,
            grossIncome:       Math.round(grossIncome),
            bhxhEmployee:      Math.round(bhxhEmployee),
            bhytEmployee:      Math.round(bhytEmployee),
            bhtnEmployee:      Math.round(bhtnEmployee),
            bhxhCompany:       Math.round(bhxhCompany),
            disciplinaryFine,
            salaryAdvance,
            totalDeductions:   Math.round(totalDeductions),
            totalCompanyPays:  Math.round(totalCompanyPays),
            netSalary:         Math.round(netSalary),
            notes:             existing?.notes ?? null,
        };

        const record = await prisma.officePayrollRecord.upsert({
            where: { employeeId_month_year: { employeeId: emp.id, month, year } },
            create: { employeeId: emp.id, ...payload },
            update: payload,
        });
        records.push({ ...record, employeeName: emp.name, employeeCode: emp.code });
    }

    return NextResponse.json({ data: records, count: records.length });
}, { roles: ['giam_doc', 'ke_toan'] });
```

- [ ] **Step 2: Test GET (bảng trống tháng hiện tại)**

```bash
curl -s "http://localhost:3000/api/hr/office-payroll?month=4&year=2026" -H "Cookie: ..." | jq '.summary'
```

Expected: `{ "count": 0, "totalGross": 0, ... }`

- [ ] **Step 3: Commit**

```bash
git add app/api/hr/office-payroll/route.js
git commit -m "feat(api): GET + POST office payroll with commission auto-calc"
```

---

## Task 4: API PATCH `/api/hr/office-payroll/[id]`

**Files:**
- Create: `app/api/hr/office-payroll/[id]/route.js`

- [ ] **Step 1: Tạo file**

```javascript
// app/api/hr/office-payroll/[id]/route.js
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { officePayrollPatchSchema } from '@/lib/validations/officePayroll';

const BHXH_EMP  = 0.08;
const BHYT_EMP  = 0.015;
const BHTN_EMP  = 0.01;
const BHXH_COMP = 0.215;

export const PATCH = withAuth(async (request, { params }) => {
    const { id } = await params;
    const body = officePayrollPatchSchema.parse(await request.json());

    const record = await prisma.officePayrollRecord.findUnique({
        where: { id },
        include: { employee: { select: { salary: true, insuranceSalary: true } } },
    });
    if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const actualDays         = body.actualDays         ?? record.actualDays;
    const positionAllowance  = body.positionAllowance  ?? record.positionAllowance;
    const phoneAllowance     = body.phoneAllowance     ?? record.phoneAllowance;
    const transportAllowance = body.transportAllowance ?? record.transportAllowance;
    const diligenceAllowance = body.diligenceAllowance ?? record.diligenceAllowance;
    const bonus              = body.bonus              ?? record.bonus;
    const disciplinaryFine   = body.disciplinaryFine   ?? record.disciplinaryFine;
    const salaryAdvance      = body.salaryAdvance      ?? record.salaryAdvance;

    const insuranceSalary = record.employee.insuranceSalary || record.employee.salary || 0;
    const proratedSalary  = record.baseSalary * actualDays / record.standardDays;
    const grossIncome     = proratedSalary + positionAllowance + phoneAllowance
                          + transportAllowance + diligenceAllowance + record.commissionAmount + bonus;
    const bhxhEmployee    = insuranceSalary * BHXH_EMP;
    const bhytEmployee    = insuranceSalary * BHYT_EMP;
    const bhtnEmployee    = insuranceSalary * BHTN_EMP;
    const bhxhCompany     = insuranceSalary * BHXH_COMP;
    const totalDeductions  = bhxhEmployee + bhytEmployee + bhtnEmployee + disciplinaryFine + salaryAdvance;
    const totalCompanyPays = grossIncome + bhxhCompany;
    const netSalary        = grossIncome - totalDeductions;

    const updated = await prisma.officePayrollRecord.update({
        where: { id },
        data: {
            actualDays,
            proratedSalary:    Math.round(proratedSalary),
            positionAllowance, phoneAllowance, transportAllowance, diligenceAllowance,
            bonus, disciplinaryFine, salaryAdvance,
            grossIncome:       Math.round(grossIncome),
            bhxhEmployee:      Math.round(bhxhEmployee),
            bhytEmployee:      Math.round(bhytEmployee),
            bhtnEmployee:      Math.round(bhtnEmployee),
            bhxhCompany:       Math.round(bhxhCompany),
            totalDeductions:   Math.round(totalDeductions),
            totalCompanyPays:  Math.round(totalCompanyPays),
            netSalary:         Math.round(netSalary),
            notes:             body.notes ?? record.notes,
        },
    });

    return NextResponse.json(updated);
}, { roles: ['giam_doc', 'ke_toan'] });
```

- [ ] **Step 2: Commit**

```bash
git add app/api/hr/office-payroll/[id]/route.js
git commit -m "feat(api): PATCH office payroll record — inline edit with recalc"
```

---

## Task 5: UI `OfficePayrollTab` Component

**Files:**
- Create: `components/hr/OfficePayrollTab.js`

**Bối cảnh:** Dùng `apiFetch` từ `@/lib/fetchClient`. CSS vars: `var(--bg-primary)`, `var(--border)`, `var(--text-muted)`, `var(--status-success)`, `var(--status-danger)`. Class `.data-table` cho table. Class `.btn`, `.btn-primary`, `.btn-secondary`.

- [ ] **Step 1: Tạo component**

```javascript
// components/hr/OfficePayrollTab.js
'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));
const now = new Date();

export default function OfficePayrollTab() {
    const toast = useToast();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [records, setRecords] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [editing, setEditing] = useState({}); // { [id]: { field: value } }

    const load = async () => {
        setLoading(true);
        try {
            const res = await apiFetch(`/api/hr/office-payroll?month=${month}&year=${year}`);
            setRecords(res.data || []);
            setSummary(res.summary || null);
        } catch (e) { toast.error(e.message); }
        setLoading(false);
    };

    useEffect(() => { load(); }, [month, year]);

    const generate = async () => {
        setGenerating(true);
        try {
            const res = await apiFetch('/api/hr/office-payroll', { method: 'POST', body: { month, year } });
            toast.success(`Đã tạo bảng lương cho ${res.count} nhân viên`);
            load();
        } catch (e) { toast.error(e.message); }
        setGenerating(false);
    };

    const handleChange = (id, field, value) => {
        setEditing(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: value } }));
    };

    const handleSave = async (record) => {
        const changes = editing[record.id];
        if (!changes || Object.keys(changes).length === 0) return;
        try {
            // Convert string inputs to numbers
            const body = {};
            for (const [k, v] of Object.entries(changes)) {
                body[k] = k === 'notes' ? v : (parseFloat(v) || 0);
            }
            await apiFetch(`/api/hr/office-payroll/${record.id}`, { method: 'PATCH', body });
            toast.success('Đã lưu');
            setEditing(prev => { const n = { ...prev }; delete n[record.id]; return n; });
            load();
        } catch (e) { toast.error(e.message); }
    };

    const val = (record, field) => {
        const ov = editing[record.id];
        return ov?.[field] !== undefined ? ov[field] : record[field];
    };

    const hasChanges = (id) => editing[id] && Object.keys(editing[id]).length > 0;

    const EditCell = ({ record, field, width = 80 }) => (
        <td style={{ textAlign: 'right', padding: '4px 6px' }}>
            <input
                type="number"
                value={val(record, field)}
                onChange={e => handleChange(record.id, field, e.target.value)}
                style={{
                    width, textAlign: 'right', fontSize: 12, padding: '2px 4px',
                    border: '1px solid var(--border)', borderRadius: 4,
                    background: 'var(--bg-primary)', color: 'var(--text-primary)',
                }}
            />
        </td>
    );

    return (
        <div>
            {/* Header controls */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                <select className="form-select" style={{ width: 80 }} value={month} onChange={e => setMonth(Number(e.target.value))}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <option key={m} value={m}>T{m}</option>
                    ))}
                </select>
                <input className="form-input" type="number" value={year} onChange={e => setYear(Number(e.target.value))} style={{ width: 90 }} />
                <button className="btn btn-primary" onClick={generate} disabled={generating}>
                    {generating ? '⏳ Đang tạo...' : '⚙️ Tạo bảng lương'}
                </button>
                <button className="btn btn-secondary" onClick={() => window.open(`/api/hr/office-payroll/export?month=${month}&year=${year}`, '_blank')}>
                    📥 Export Excel
                </button>
            </div>

            {/* Summary cards */}
            {summary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 10, marginBottom: 16 }}>
                    {[
                        { label: 'Nhân viên', value: summary.count, unit: 'người' },
                        { label: 'Tổng gross', value: fmt(summary.totalGross), unit: 'đ' },
                        { label: 'Tổng net', value: fmt(summary.totalNet), unit: 'đ', color: 'var(--status-success)' },
                        { label: 'DN chi trả', value: fmt(summary.totalCompanyPays), unit: 'đ' },
                    ].map(k => (
                        <div key={k.label} className="card" style={{ padding: '10px 14px', textAlign: 'center' }}>
                            <div style={{ fontWeight: 700, fontSize: 16, color: k.color || 'var(--text-primary)' }}>{k.value} <span style={{ fontSize: 11 }}>{k.unit}</span></div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{k.label}</div>
                        </div>
                    ))}
                </div>
            )}

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
            ) : records.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    Chưa có bảng lương tháng {month}/{year}. Bấm <strong>Tạo bảng lương</strong> để bắt đầu.
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ fontSize: 12, minWidth: 1400 }}>
                        <thead>
                            <tr>
                                <th style={{ minWidth: 140 }}>Họ tên</th>
                                <th>Chức vụ</th>
                                <th style={{ textAlign: 'right' }}>Lương CB</th>
                                <th style={{ textAlign: 'right' }}>Ngày TT</th>
                                <th style={{ textAlign: 'right' }}>Lương ngày</th>
                                <th style={{ textAlign: 'right' }}>ĐT</th>
                                <th style={{ textAlign: 'right' }}>Xăng</th>
                                <th style={{ textAlign: 'right' }}>Chuyên cần</th>
                                <th style={{ textAlign: 'right' }}>Chức vụ PC</th>
                                <th style={{ textAlign: 'right' }}>HH KD</th>
                                <th style={{ textAlign: 'right' }}>Thưởng</th>
                                <th style={{ textAlign: 'right', fontWeight: 700 }}>Gross</th>
                                <th style={{ textAlign: 'right' }}>BHXH(8%)</th>
                                <th style={{ textAlign: 'right' }}>BHYT(1.5%)</th>
                                <th style={{ textAlign: 'right' }}>BHTN(1%)</th>
                                <th style={{ textAlign: 'right' }}>Phạt</th>
                                <th style={{ textAlign: 'right' }}>Tạm ứng</th>
                                <th style={{ textAlign: 'right', fontWeight: 700, color: 'var(--status-success)' }}>Còn lĩnh</th>
                                <th style={{ textAlign: 'right' }}>DN chi trả</th>
                                <th>Ghi chú</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map(r => (
                                <tr key={r.id} style={{ background: hasChanges(r.id) ? 'rgba(59,130,246,0.05)' : undefined }}>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{r.employee?.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.employee?.bankAccount} {r.employee?.bankName}</div>
                                    </td>
                                    <td style={{ color: 'var(--text-muted)' }}>{r.employee?.position || '—'}</td>
                                    <td style={{ textAlign: 'right' }}>{fmt(r.baseSalary)}</td>
                                    <EditCell record={r} field="actualDays" width={50} />
                                    <td style={{ textAlign: 'right' }}>{fmt(r.proratedSalary)}</td>
                                    <EditCell record={r} field="phoneAllowance" />
                                    <EditCell record={r} field="transportAllowance" />
                                    <EditCell record={r} field="diligenceAllowance" />
                                    <EditCell record={r} field="positionAllowance" />
                                    <td style={{ textAlign: 'right', color: r.commissionAmount > 0 ? 'var(--status-success)' : undefined }}>{fmt(r.commissionAmount)}</td>
                                    <EditCell record={r} field="bonus" />
                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(r.grossIncome)}</td>
                                    <td style={{ textAlign: 'right', color: 'var(--status-danger)' }}>{fmt(r.bhxhEmployee)}</td>
                                    <td style={{ textAlign: 'right', color: 'var(--status-danger)' }}>{fmt(r.bhytEmployee)}</td>
                                    <td style={{ textAlign: 'right', color: 'var(--status-danger)' }}>{fmt(r.bhtnEmployee)}</td>
                                    <EditCell record={r} field="disciplinaryFine" />
                                    <EditCell record={r} field="salaryAdvance" />
                                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--status-success)' }}>{fmt(r.netSalary)}</td>
                                    <td style={{ textAlign: 'right' }}>{fmt(r.totalCompanyPays)}</td>
                                    <td>
                                        <input
                                            value={val(r, 'notes') || ''}
                                            onChange={e => handleChange(r.id, 'notes', e.target.value)}
                                            style={{ width: 120, fontSize: 11, padding: '2px 4px', border: '1px solid var(--border)', borderRadius: 4, background: 'var(--bg-primary)' }}
                                            placeholder="Ghi chú..."
                                        />
                                    </td>
                                    <td>
                                        {hasChanges(r.id) && (
                                            <button className="btn btn-primary" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => handleSave(r)}>
                                                Lưu
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ fontWeight: 700, background: 'var(--bg-secondary)', borderTop: '2px solid var(--border)' }}>
                                <td colSpan={11} style={{ padding: '8px 12px' }}>TỔNG CỘNG</td>
                                <td style={{ textAlign: 'right', padding: '8px 6px' }}>{fmt(summary?.totalGross)}</td>
                                <td colSpan={4} />
                                <td />
                                <td style={{ textAlign: 'right', padding: '8px 6px', color: 'var(--status-success)' }}>{fmt(summary?.totalNet)}</td>
                                <td style={{ textAlign: 'right', padding: '8px 6px' }}>{fmt(summary?.totalCompanyPays)}</td>
                                <td colSpan={2} />
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/hr/OfficePayrollTab.js
git commit -m "feat(ui): OfficePayrollTab — spreadsheet with inline edit + summary"
```

---

## Task 6: Excel Export Route

**Files:**
- Create: `app/api/hr/office-payroll/export/route.js`

**Bối cảnh:** `xlsx` đã có trong package.json (`"xlsx": "^0.18.5"`). Import: `import * as XLSX from 'xlsx'`.

- [ ] **Step 1: Tạo export route**

```javascript
// app/api/hr/office-payroll/export/route.js
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

const fmt = (n) => Math.round(n || 0);

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || new Date().getMonth() + 1);
    const year  = parseInt(searchParams.get('year')  || new Date().getFullYear());

    const records = await prisma.officePayrollRecord.findMany({
        where: { month, year },
        include: {
            employee: {
                select: { name: true, code: true, position: true, bankAccount: true, bankName: true },
            },
        },
        orderBy: { employee: { name: 'asc' } },
    });

    const headers = [
        'STT', 'Họ tên', 'Tài khoản', 'Ngân hàng', 'Chức vụ',
        'Lương CB', 'Ngày TT', 'Lương ngày công',
        'PC Điện thoại', 'PC Xăng xe', 'PC Chuyên cần', 'PC Chức vụ',
        'Hoa hồng KD', 'Thưởng', 'TỔNG GROSS',
        'BHXH (8%)', 'BHYT (1.5%)', 'BHTN (1%)',
        'Phạt', 'Tạm ứng', 'Tổng khấu trừ',
        'BHXH CT (21.5%)', 'DN chi trả', 'LƯƠNG CÒN LĨNH', 'Ghi chú',
    ];

    const rows = records.map((r, i) => [
        i + 1,
        r.employee.name, r.employee.bankAccount, r.employee.bankName, r.employee.position,
        fmt(r.baseSalary), r.actualDays, fmt(r.proratedSalary),
        fmt(r.phoneAllowance), fmt(r.transportAllowance), fmt(r.diligenceAllowance), fmt(r.positionAllowance),
        fmt(r.commissionAmount), fmt(r.bonus), fmt(r.grossIncome),
        fmt(r.bhxhEmployee), fmt(r.bhytEmployee), fmt(r.bhtnEmployee),
        fmt(r.disciplinaryFine), fmt(r.salaryAdvance), fmt(r.totalDeductions),
        fmt(r.bhxhCompany), fmt(r.totalCompanyPays), fmt(r.netSalary), r.notes || '',
    ]);

    const totalRow = [
        '', 'TỔNG CỘNG', '', '', '',
        fmt(records.reduce((s, r) => s + r.baseSalary, 0)), '', '',
        '', '', '', '',
        '', '', fmt(records.reduce((s, r) => s + r.grossIncome, 0)),
        '', '', '',
        '', '', fmt(records.reduce((s, r) => s + r.totalDeductions, 0)),
        fmt(records.reduce((s, r) => s + r.bhxhCompany, 0)),
        fmt(records.reduce((s, r) => s + r.totalCompanyPays, 0)),
        fmt(records.reduce((s, r) => s + r.netSalary, 0)), '',
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
        [`BẢNG LƯƠNG VĂN PHÒNG THÁNG ${month}/${year}`],
        [],
        headers,
        ...rows,
        totalRow,
    ]);

    // Column widths
    ws['!cols'] = [
        { wch: 4 }, { wch: 22 }, { wch: 16 }, { wch: 10 }, { wch: 14 },
        { wch: 12 }, { wch: 7 }, { wch: 13 },
        { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
        { wch: 12 }, { wch: 10 }, { wch: 13 },
        { wch: 11 }, { wch: 11 }, { wch: 11 },
        { wch: 9 }, { wch: 10 }, { wch: 12 },
        { wch: 13 }, { wch: 12 }, { wch: 14 }, { wch: 20 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, `BL VP T${month}-${year}`);
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new Response(buf, {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="bang-luong-vp-T${month}-${year}.xlsx"`,
        },
    });
}, { roles: ['giam_doc', 'ke_toan'] });
```

- [ ] **Step 2: Commit**

```bash
git add app/api/hr/office-payroll/export/route.js
git commit -m "feat(api): Excel export for office payroll"
```

---

## Task 7: Tích hợp vào HR page

**Files:**
- Modify: `app/hr/page.js`

- [ ] **Step 1: Thêm import OfficePayrollTab**

Tìm dòng cuối cùng trong khối `dynamic import` (khoảng line 6-11), thêm:

```javascript
const OfficePayrollTab = dynamic(() => import('@/components/hr/OfficePayrollTab'), { ssr: false, loading: () => <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div> });
```

- [ ] **Step 2: Thêm tab vào TABS array**

Tìm nơi định nghĩa tab bar trong page (tìm `project-tabs` hoặc array tabs). Thêm tab mới:

```javascript
{ key: 'office_payroll', label: '💼 Lương Văn phòng' },
```

Đặt sau tab chấm công, trước các tab khác.

- [ ] **Step 3: Thêm render tab**

Trong phần render tab content, thêm:

```javascript
{tab === 'office_payroll' && <OfficePayrollTab />}
```

- [ ] **Step 4: Test thủ công**

1. Vào `/hr`, click tab "💼 Lương Văn phòng"
2. Chọn tháng/năm
3. Bấm "Tạo bảng lương" — phải thấy records cho nhân viên có `payrollType = 'office'`
4. Thử sửa ô "Thưởng" → bấm Lưu → số gross/net phải tự cập nhật
5. Bấm "Export Excel" → file `.xlsx` phải tải về

- [ ] **Step 5: Commit**

```bash
git add app/hr/page.js
git commit -m "feat(hr): add Office Payroll tab to HR page"
```

---

## Kiểm tra cuối Plan A

- [ ] Nhân viên chưa có `payrollType` sẽ default `'office'` — GET payroll phải trả về họ
- [ ] POST với tháng đã có record phải **upsert** (không tạo duplicate)
- [ ] Sửa `actualDays` trên PATCH phải recalc `proratedSalary`, `grossIncome`, `netSalary`
- [ ] Export Excel tải được và số khớp với bảng trên màn hình
- [ ] Employee không có `ContractCommission` → `commissionAmount = 0` (không lỗi)
