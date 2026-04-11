# Payroll Upgrade — Plan B: Workshop Payroll + Commission + Export + Employee Allowance Edit

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm bảng lương Nhà xưởng, quản lý hoa hồng KD, export Excel cho cả 2 bảng lương, và form chỉnh sửa loại NV + phụ cấp trong tab Nhân viên.

**Architecture:** Requires Plan A schema migration completed. API routes tách biệt cho workshop (`/api/hr/workshop-payroll`) và commission (`/api/hr/contract-commissions`). UI dạng spreadsheet giống `OfficePayrollTab`. Excel export dùng `xlsx` v0.18.5 (đã có trong project). Employee allowance edit thêm vào modal sửa nhân viên hiện có trong `app/hr/page.js`.

**Tech Stack:** Next.js App Router, Prisma 6, PostgreSQL, Zod 4, React 19, `xlsx` (already installed)

**Prerequisites:** Plan A phải được hoàn thành trước (schema migration đã chạy, `OfficePayrollRecord`, `WorkshopPayrollRecord`, `ContractCommission` models đã có trong DB).

---

## File Structure

| File | Action | Trách nhiệm |
|------|--------|-------------|
| `lib/validations/workshopPayroll.js` | Create | Zod schema cho workshop PATCH |
| `app/api/hr/workshop-payroll/route.js` | Create | GET + POST bảng lương xưởng |
| `app/api/hr/workshop-payroll/[id]/route.js` | Create | PATCH 1 record xưởng |
| `app/api/hr/workshop-payroll/export/route.js` | Create | GET export Excel xưởng |
| `app/api/hr/office-payroll/export/route.js` | Create | GET export Excel VP (cùng pattern) |
| `app/api/hr/contract-commissions/route.js` | Create | GET + POST hoa hồng |
| `app/api/hr/contract-commissions/[id]/route.js` | Create | DELETE hoa hồng |
| `components/hr/WorkshopPayrollTab.js` | Create | UI bảng lương xưởng |
| `components/hr/CommissionTab.js` | Create | UI quản lý hoa hồng KD |
| `app/hr/page.js` | Modify | Thêm 3 tab mới + employee allowance edit |

---

## Task 1: Validation schema cho Workshop Payroll

**Files:**
- Create: `lib/validations/workshopPayroll.js`

- [ ] **Step 1: Tạo file validation**

```javascript
// lib/validations/workshopPayroll.js
import { z } from 'zod';

export const workshopPayrollPatchSchema = z.object({
    overtimeHours:     z.number().min(0).optional(),
    mealAllowance:     z.number().min(0).optional(),
    phoneAllowance:    z.number().min(0).optional(),
    transportAllowance: z.number().min(0).optional(),
    diligenceAllowance: z.number().min(0).optional(),
    bonus:             z.number().min(0).optional(),
    disciplinaryFine:  z.number().min(0).optional(),
    salaryAdvance:     z.number().min(0).optional(),
    actualDays:        z.number().min(0).optional(),
    notes:             z.string().optional(),
});
```

- [ ] **Step 2: Commit**

```bash
git add lib/validations/workshopPayroll.js
git commit -m "feat(payroll): add workshop payroll validation schema"
```

---

## Task 2: API GET + POST Workshop Payroll

**Files:**
- Create: `app/api/hr/workshop-payroll/route.js`

Logic: POST tạo 1 `WorkshopPayrollRecord` cho mỗi employee có `payrollType = "workshop"`. Tính `basePay = dailyWage × actualDays`, `overtimePay = overtimeHours × (dailyWage/8) × 1.5`, `mealAllowance = actualDays × mealAllowanceRate`. Dùng upsert để không ghi đè bonus/fines đã nhập tay.

- [ ] **Step 1: Tạo route.js**

```javascript
// app/api/hr/workshop-payroll/route.js
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month'));
    const year = parseInt(searchParams.get('year'));
    if (!month || !year) return NextResponse.json({ error: 'month và year bắt buộc' }, { status: 400 });

    const records = await prisma.workshopPayrollRecord.findMany({
        where: { month, year },
        include: { employee: { select: { id: true, name: true, code: true, department: { select: { name: true } } } } },
        orderBy: { employee: { name: 'asc' } },
    });
    return NextResponse.json({ data: records });
});

export const POST = withAuth(async (request) => {
    const { month, year } = await request.json();
    if (!month || !year) return NextResponse.json({ error: 'month và year bắt buộc' }, { status: 400 });

    const employees = await prisma.employee.findMany({
        where: { payrollType: 'workshop', deletedAt: null },
        select: {
            id: true, salary: true, dailyWage: true,
            phoneAllowance: true, transportAllowance: true,
            diligenceAllowance: true, mealAllowanceRate: true,
        },
    });

    // Số ngày làm việc trong tháng (lấy từ bảng chấm công nếu có, fallback = 26)
    const attendances = await prisma.attendanceRecord.findMany({
        where: {
            month, year,
            employeeId: { in: employees.map(e => e.id) },
        },
        select: { employeeId: true, workDays: true },
    });
    const attMap = Object.fromEntries(attendances.map(a => [a.employeeId, a.workDays]));

    const records = [];
    for (const emp of employees) {
        const dailyWage = emp.dailyWage || Math.round((emp.salary || 0) / 26);
        const actualDays = attMap[emp.id] ?? 26;
        const basePay = dailyWage * actualDays;
        // Mặc định overtime = 0 (nhập tay sau)
        const overtimePay = 0;
        const mealAllowance = actualDays * (emp.mealAllowanceRate || 0);
        const phoneAllowance = emp.phoneAllowance || 0;
        const transportAllowance = emp.transportAllowance || 0;
        const diligenceAllowance = emp.diligenceAllowance || 0;

        // Upsert — giữ nguyên bonus/fines/notes đã nhập
        const existing = await prisma.workshopPayrollRecord.findUnique({
            where: { employeeId_month_year: { employeeId: emp.id, month, year } },
            select: { bonus: true, disciplinaryFine: true, salaryAdvance: true, notes: true, overtimeHours: true },
        });
        const overtimeHours = existing?.overtimeHours ?? 0;
        const overtimePayFinal = overtimeHours * (dailyWage / 8) * 1.5;
        const bonus = existing?.bonus ?? 0;
        const disciplinaryFine = existing?.disciplinaryFine ?? 0;
        const salaryAdvance = existing?.salaryAdvance ?? 0;

        const grossIncome = basePay + overtimePayFinal + mealAllowance + phoneAllowance + transportAllowance + diligenceAllowance + bonus;
        const totalDeductions = disciplinaryFine + salaryAdvance;
        const netSalary = grossIncome - totalDeductions;

        const data = {
            dailyWage, actualDays, basePay,
            overtimeHours,
            overtimePay: overtimePayFinal,
            mealAllowance,
            phoneAllowance, transportAllowance, diligenceAllowance,
            bonus,
            grossIncome,
            disciplinaryFine, salaryAdvance,
            totalDeductions,
            netSalary,
            notes: existing?.notes ?? null,
        };

        const record = await prisma.workshopPayrollRecord.upsert({
            where: { employeeId_month_year: { employeeId: emp.id, month, year } },
            update: {
                dailyWage: data.dailyWage,
                actualDays: data.actualDays,
                basePay: data.basePay,
                overtimePay: data.overtimePay,
                mealAllowance: data.mealAllowance,
                phoneAllowance: data.phoneAllowance,
                transportAllowance: data.transportAllowance,
                diligenceAllowance: data.diligenceAllowance,
                grossIncome: data.grossIncome,
                totalDeductions: data.totalDeductions,
                netSalary: data.netSalary,
                // NOT overwriting: overtimeHours, bonus, disciplinaryFine, salaryAdvance, notes
            },
            create: { employeeId: emp.id, month, year, ...data },
        });
        records.push(record);
    }

    return NextResponse.json({ data: records, count: records.length }, { status: 201 });
});
```

- [ ] **Step 2: Commit**

```bash
git add app/api/hr/workshop-payroll/route.js
git commit -m "feat(payroll): add workshop payroll GET+POST API"
```

---

## Task 3: API PATCH Workshop Payroll

**Files:**
- Create: `app/api/hr/workshop-payroll/[id]/route.js`

- [ ] **Step 1: Tạo [id]/route.js**

```javascript
// app/api/hr/workshop-payroll/[id]/route.js
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { workshopPayrollPatchSchema } from '@/lib/validations/workshopPayroll';

export const PATCH = withAuth(async (request, context) => {
    const { id } = context.params;
    const body = await request.json();
    const patch = workshopPayrollPatchSchema.parse(body);

    const existing = await prisma.workshopPayrollRecord.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy record' }, { status: 404 });

    const actualDays = patch.actualDays ?? existing.actualDays;
    const dailyWage = existing.dailyWage;
    const overtimeHours = patch.overtimeHours ?? existing.overtimeHours;
    const mealAllowance = patch.mealAllowance ?? existing.mealAllowance;
    const phoneAllowance = patch.phoneAllowance ?? existing.phoneAllowance;
    const transportAllowance = patch.transportAllowance ?? existing.transportAllowance;
    const diligenceAllowance = patch.diligenceAllowance ?? existing.diligenceAllowance;
    const bonus = patch.bonus ?? existing.bonus;
    const disciplinaryFine = patch.disciplinaryFine ?? existing.disciplinaryFine;
    const salaryAdvance = patch.salaryAdvance ?? existing.salaryAdvance;

    const basePay = dailyWage * actualDays;
    const overtimePay = overtimeHours * (dailyWage / 8) * 1.5;
    const grossIncome = basePay + overtimePay + mealAllowance + phoneAllowance + transportAllowance + diligenceAllowance + bonus;
    const totalDeductions = disciplinaryFine + salaryAdvance;
    const netSalary = grossIncome - totalDeductions;

    const updated = await prisma.workshopPayrollRecord.update({
        where: { id },
        data: {
            ...patch,
            basePay,
            overtimePay,
            grossIncome,
            totalDeductions,
            netSalary,
        },
        include: { employee: { select: { id: true, name: true, code: true } } },
    });

    return NextResponse.json(updated);
});
```

- [ ] **Step 2: Commit**

```bash
git add app/api/hr/workshop-payroll/[id]/route.js
git commit -m "feat(payroll): add workshop payroll PATCH API"
```

---

## Task 4: API Contract Commissions (GET + POST + DELETE)

**Files:**
- Create: `app/api/hr/contract-commissions/route.js`
- Create: `app/api/hr/contract-commissions/[id]/route.js`

- [ ] **Step 1: Tạo route.js**

```javascript
// app/api/hr/contract-commissions/route.js
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const createSchema = z.object({
    employeeId: z.string().min(1),
    contractId: z.string().min(1),
    rate: z.number().min(0).max(100),
});

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const where = employeeId ? { employeeId } : {};

    const commissions = await prisma.contractCommission.findMany({
        where,
        include: {
            employee: { select: { id: true, name: true, code: true } },
            contract: { select: { id: true, contractNumber: true, contractValue: true, variationAmount: true, projectId: true, project: { select: { name: true, code: true } } } },
        },
        orderBy: { createdAt: 'desc' },
    });

    // Tính số tiền ước tính cho mỗi commission
    const data = commissions.map(c => ({
        ...c,
        estimatedAmount: Math.round(((c.contract.contractValue || 0) + (c.contract.variationAmount || 0)) * c.rate / 100),
    }));

    return NextResponse.json({ data });
});

export const POST = withAuth(async (request) => {
    const body = await request.json();
    const validated = createSchema.parse(body);

    const commission = await prisma.contractCommission.create({
        data: validated,
        include: {
            employee: { select: { id: true, name: true, code: true } },
            contract: { select: { id: true, contractNumber: true, contractValue: true, variationAmount: true } },
        },
    });

    return NextResponse.json(commission, { status: 201 });
});
```

- [ ] **Step 2: Tạo [id]/route.js**

```javascript
// app/api/hr/contract-commissions/[id]/route.js
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

export const DELETE = withAuth(async (request, context) => {
    const { id } = context.params;
    await prisma.contractCommission.delete({ where: { id } });
    return NextResponse.json({ success: true });
});
```

- [ ] **Step 3: Commit**

```bash
git add app/api/hr/contract-commissions/route.js app/api/hr/contract-commissions/[id]/route.js
git commit -m "feat(payroll): add contract commissions CRUD API"
```

---

## Task 5: WorkshopPayrollTab UI

**Files:**
- Create: `components/hr/WorkshopPayrollTab.js`

Cùng pattern với `OfficePayrollTab`. Cột: Tên | Lương/ngày | Ngày TT | OT giờ | OT tiền | Tiền ăn | ĐT | Xăng | CC | Thưởng | Gross | Phạt | TU | Còn lĩnh | Ghi chú

- [ ] **Step 1: Tạo component**

```javascript
// components/hr/WorkshopPayrollTab.js
'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';

const fmt = v => new Intl.NumberFormat('vi-VN').format(Math.round(v || 0));
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const YEARS = [2024, 2025, 2026, 2027];

export default function WorkshopPayrollTab() {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [editing, setEditing] = useState({});
    const [saving, setSaving] = useState({});
    const toast = useToast();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiFetch(`/api/hr/workshop-payroll?month=${month}&year=${year}`);
            setRecords(res.data || []);
        } catch (e) { toast.error(e.message); }
        setLoading(false);
    }, [month, year]);

    useEffect(() => { load(); }, [load]);

    const generate = async () => {
        setGenerating(true);
        try {
            await apiFetch('/api/hr/workshop-payroll', { method: 'POST', body: JSON.stringify({ month, year }) });
            toast.success('Đã tạo bảng lương xưởng');
            await load();
        } catch (e) { toast.error(e.message); }
        setGenerating(false);
    };

    const handleEdit = (id, field, value) => {
        setEditing(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: value } }));
    };

    const save = async (rec) => {
        const patch = editing[rec.id];
        if (!patch) return;
        setSaving(prev => ({ ...prev, [rec.id]: true }));
        try {
            // Convert string inputs to numbers
            const numFields = ['overtimeHours', 'mealAllowance', 'phoneAllowance', 'transportAllowance', 'diligenceAllowance', 'bonus', 'disciplinaryFine', 'salaryAdvance', 'actualDays'];
            const body = {};
            for (const [k, v] of Object.entries(patch)) {
                body[k] = numFields.includes(k) ? parseFloat(v) || 0 : v;
            }
            await apiFetch(`/api/hr/workshop-payroll/${rec.id}`, { method: 'PATCH', body: JSON.stringify(body) });
            setEditing(prev => { const n = { ...prev }; delete n[rec.id]; return n; });
            await load();
            toast.success('Đã lưu');
        } catch (e) { toast.error(e.message); }
        setSaving(prev => ({ ...prev, [rec.id]: false }));
    };

    const exportExcel = () => {
        window.open(`/api/hr/workshop-payroll/export?month=${month}&year=${year}`, '_blank');
    };

    // Tính preview khi có edit
    const calcPreview = (rec) => {
        const patch = editing[rec.id] || {};
        const get = (field) => parseFloat(patch[field] ?? rec[field]) || 0;
        const actualDays = get('actualDays');
        const dailyWage = rec.dailyWage || 0;
        const basePay = dailyWage * actualDays;
        const overtimeHours = get('overtimeHours');
        const overtimePay = overtimeHours * (dailyWage / 8) * 1.5;
        const mealAllowance = get('mealAllowance');
        const phoneAllowance = get('phoneAllowance');
        const transportAllowance = get('transportAllowance');
        const diligenceAllowance = get('diligenceAllowance');
        const bonus = get('bonus');
        const disciplinaryFine = get('disciplinaryFine');
        const salaryAdvance = get('salaryAdvance');
        const gross = basePay + overtimePay + mealAllowance + phoneAllowance + transportAllowance + diligenceAllowance + bonus;
        const net = gross - disciplinaryFine - salaryAdvance;
        return { basePay, overtimePay, gross, net };
    };

    const totalGross = records.reduce((s, r) => s + (r.grossIncome || 0), 0);
    const totalNet = records.reduce((s, r) => s + (r.netSalary || 0), 0);

    const thStyle = { padding: '6px 8px', textAlign: 'right', fontWeight: 600, fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border)' };
    const thL = { ...thStyle, textAlign: 'left' };
    const tdStyle = { padding: '6px 8px', verticalAlign: 'middle', fontSize: 12 };
    const tdR = { ...tdStyle, textAlign: 'right', fontFamily: 'monospace' };

    const numInput = (rec, field, width = 70) => {
        const patch = editing[rec.id] || {};
        const val = patch[field] ?? rec[field] ?? 0;
        const isDirty = patch[field] !== undefined;
        return (
            <input
                type="number"
                step="0.5"
                value={val}
                onChange={e => handleEdit(rec.id, field, e.target.value)}
                style={{
                    width, padding: '3px 5px', border: `1px solid ${isDirty ? 'var(--accent-primary)' : 'var(--border)'}`,
                    borderRadius: 4, fontSize: 11, textAlign: 'right',
                    background: isDirty ? 'rgba(var(--accent-rgb),0.06)' : 'transparent',
                }}
            />
        );
    };

    return (
        <div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                <select className="form-select" style={{ width: 90 }} value={month} onChange={e => setMonth(Number(e.target.value))}>
                    {MONTHS.map(m => <option key={m} value={m}>Tháng {m}</option>)}
                </select>
                <select className="form-select" style={{ width: 90 }} value={year} onChange={e => setYear(Number(e.target.value))}>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <button className="btn btn-primary btn-sm" onClick={generate} disabled={generating}>
                    {generating ? 'Đang tạo...' : '⚡ Tạo bảng lương'}
                </button>
                {records.length > 0 && (
                    <>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{records.length} nhân viên</span>
                        <span style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--accent-primary)', fontSize: 14 }}>
                            Thực lĩnh: {fmt(totalNet)}đ
                        </span>
                        <button className="btn btn-ghost btn-sm" onClick={exportExcel}>📥 Excel</button>
                    </>
                )}
            </div>

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
            ) : records.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    Chưa có bảng lương. Nhấn "Tạo bảng lương" để bắt đầu.
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ fontSize: 12, minWidth: 1100 }}>
                        <thead>
                            <tr>
                                <th style={thL}>Nhân viên</th>
                                <th style={thStyle}>Lương/ngày</th>
                                <th style={thStyle}>Ngày TT</th>
                                <th style={thStyle}>OT giờ</th>
                                <th style={thStyle}>OT tiền</th>
                                <th style={thStyle}>Tiền ăn</th>
                                <th style={thStyle}>ĐT</th>
                                <th style={thStyle}>Xăng</th>
                                <th style={thStyle}>CC</th>
                                <th style={thStyle}>Thưởng</th>
                                <th style={{ ...thStyle, color: 'var(--accent-primary)' }}>Gross</th>
                                <th style={{ ...thStyle, color: 'var(--status-danger)' }}>Phạt</th>
                                <th style={{ ...thStyle, color: 'var(--status-danger)' }}>TU</th>
                                <th style={{ ...thStyle, color: 'var(--accent-primary)', fontWeight: 700 }}>Còn lĩnh</th>
                                <th style={thL}>Ghi chú</th>
                                <th style={thStyle}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map(rec => {
                                const isDirty = !!editing[rec.id];
                                const preview = isDirty ? calcPreview(rec) : null;
                                return (
                                    <tr key={rec.id} style={{ background: isDirty ? 'rgba(var(--accent-rgb),0.02)' : undefined }}>
                                        <td style={tdStyle}>
                                            <div style={{ fontWeight: 600 }}>{rec.employee.name}</div>
                                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{rec.employee.code}</div>
                                        </td>
                                        <td style={tdR}>{fmt(rec.dailyWage)}</td>
                                        <td style={{ ...tdR }}>{numInput(rec, 'actualDays', 55)}</td>
                                        <td style={tdR}>{numInput(rec, 'overtimeHours', 55)}</td>
                                        <td style={tdR}>{fmt(preview?.overtimePay ?? rec.overtimePay)}</td>
                                        <td style={tdR}>{numInput(rec, 'mealAllowance', 70)}</td>
                                        <td style={tdR}>{numInput(rec, 'phoneAllowance', 70)}</td>
                                        <td style={tdR}>{numInput(rec, 'transportAllowance', 70)}</td>
                                        <td style={tdR}>{numInput(rec, 'diligenceAllowance', 70)}</td>
                                        <td style={tdR}>{numInput(rec, 'bonus', 70)}</td>
                                        <td style={{ ...tdR, fontWeight: 600 }}>{fmt(preview?.gross ?? rec.grossIncome)}</td>
                                        <td style={{ ...tdR, color: 'var(--status-danger)' }}>{numInput(rec, 'disciplinaryFine', 70)}</td>
                                        <td style={{ ...tdR, color: 'var(--status-danger)' }}>{numInput(rec, 'salaryAdvance', 70)}</td>
                                        <td style={{ ...tdR, fontWeight: 700, color: 'var(--accent-primary)', fontSize: 13 }}>
                                            {fmt(preview?.net ?? rec.netSalary)}
                                        </td>
                                        <td style={tdStyle}>
                                            <input
                                                value={(editing[rec.id]?.notes) ?? (rec.notes || '')}
                                                onChange={e => handleEdit(rec.id, 'notes', e.target.value)}
                                                placeholder="Ghi chú..."
                                                style={{ width: 120, padding: '3px 5px', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11 }}
                                            />
                                        </td>
                                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                                            {isDirty && (
                                                <button className="btn btn-primary btn-sm" onClick={() => save(rec)} disabled={saving[rec.id]}>
                                                    {saving[rec.id] ? '...' : 'Lưu'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr style={{ background: 'var(--bg-secondary)', fontWeight: 700 }}>
                                <td colSpan={10} style={{ padding: '8px 8px', textAlign: 'right', fontSize: 12 }}>
                                    Tổng tháng {month}/{year}
                                </td>
                                <td style={{ ...tdR, fontWeight: 700 }}>{fmt(totalGross)}</td>
                                <td colSpan={2}></td>
                                <td style={{ ...tdR, fontWeight: 700, color: 'var(--accent-primary)' }}>{fmt(totalNet)}</td>
                                <td colSpan={2}></td>
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
git add components/hr/WorkshopPayrollTab.js
git commit -m "feat(payroll): add WorkshopPayrollTab spreadsheet UI"
```

---

## Task 6: CommissionTab UI

**Files:**
- Create: `components/hr/CommissionTab.js`

- [ ] **Step 1: Tạo component**

```javascript
// components/hr/CommissionTab.js
'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { useToast } from '@/components/ui/Toast';

const fmt = v => new Intl.NumberFormat('vi-VN').format(Math.round(v || 0));

export default function CommissionTab() {
    const [commissions, setCommissions] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ employeeId: '', contractId: '', rate: '' });
    const [saving, setSaving] = useState(false);
    const toast = useToast();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [comRes, empRes, conRes] = await Promise.all([
                apiFetch('/api/hr/contract-commissions'),
                apiFetch('/api/employees?limit=200'),
                apiFetch('/api/contracts?limit=200'),
            ]);
            setCommissions(comRes.data || []);
            setEmployees(empRes.data || []);
            setContracts(conRes.data || []);
        } catch (e) { toast.error(e.message); }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!form.employeeId || !form.contractId || !form.rate) return toast.error('Vui lòng điền đầy đủ');
        setSaving(true);
        try {
            await apiFetch('/api/hr/contract-commissions', {
                method: 'POST',
                body: JSON.stringify({ employeeId: form.employeeId, contractId: form.contractId, rate: parseFloat(form.rate) }),
            });
            toast.success('Đã thêm hoa hồng');
            setShowForm(false);
            setForm({ employeeId: '', contractId: '', rate: '' });
            await load();
        } catch (e) { toast.error(e.message); }
        setSaving(false);
    };

    const handleDelete = async (id) => {
        if (!confirm('Xóa gán hoa hồng này?')) return;
        try {
            await apiFetch(`/api/hr/contract-commissions/${id}`, { method: 'DELETE' });
            toast.success('Đã xóa');
            await load();
        } catch (e) { toast.error(e.message); }
    };

    const totalEstimated = commissions.reduce((s, c) => s + (c.estimatedAmount || 0), 0);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>Hoa hồng kinh doanh</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        Gán % hoa hồng cho nhân viên theo hợp đồng dự án
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-primary)' }}>
                        Tổng ước tính: {fmt(totalEstimated)}đ
                    </span>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
                        {showForm ? 'Ẩn form' : '+ Thêm hoa hồng'}
                    </button>
                </div>
            </div>

            {showForm && (
                <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                    <form onSubmit={handleAdd} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div className="form-group" style={{ margin: 0, minWidth: 180 }}>
                            <label className="form-label">Nhân viên *</label>
                            <select className="form-select" value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} required>
                                <option value="">-- Chọn --</option>
                                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.code})</option>)}
                            </select>
                        </div>
                        <div className="form-group" style={{ margin: 0, minWidth: 240 }}>
                            <label className="form-label">Hợp đồng *</label>
                            <select className="form-select" value={form.contractId} onChange={e => setForm({ ...form, contractId: e.target.value })} required>
                                <option value="">-- Chọn --</option>
                                {contracts.map(c => <option key={c.id} value={c.id}>{c.contractNumber} — {c.project?.name || 'N/A'}</option>)}
                            </select>
                        </div>
                        <div className="form-group" style={{ margin: 0, width: 100 }}>
                            <label className="form-label">% Hoa hồng *</label>
                            <input className="form-input" type="number" step="0.1" min="0" max="100"
                                value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })}
                                placeholder="VD: 2.5" required />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Đang lưu...' : 'Thêm'}
                        </button>
                    </form>
                </div>
            )}

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
            ) : (
                <div className="card" style={{ overflow: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Nhân viên</th>
                                <th>Hợp đồng</th>
                                <th>Dự án</th>
                                <th style={{ textAlign: 'right' }}>Giá trị HĐ</th>
                                <th style={{ textAlign: 'right' }}>% HH</th>
                                <th style={{ textAlign: 'right', color: 'var(--accent-primary)' }}>Ước tính</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {commissions.map(c => (
                                <tr key={c.id}>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{c.employee.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.employee.code}</div>
                                    </td>
                                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{c.contract.contractNumber}</td>
                                    <td>{c.contract.project?.name || '—'}</td>
                                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                                        {fmt((c.contract.contractValue || 0) + (c.contract.variationAmount || 0))}đ
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{c.rate}%</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                                        {fmt(c.estimatedAmount)}đ
                                    </td>
                                    <td>
                                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--status-danger)' }}
                                            onClick={() => handleDelete(c.id)}>Xóa</button>
                                    </td>
                                </tr>
                            ))}
                            {commissions.length === 0 && (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                                    Chưa có gán hoa hồng nào
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/hr/CommissionTab.js
git commit -m "feat(payroll): add CommissionTab UI"
```

---

## Task 7: Excel Export — Office Payroll

**Files:**
- Create: `app/api/hr/office-payroll/export/route.js`

Dùng thư viện `xlsx` (đã có trong `package.json`). 2 sheets: Sheet1 = chi tiết đầy đủ, Sheet2 = tổng hợp.

- [ ] **Step 1: Tạo export route**

```javascript
// app/api/hr/office-payroll/export/route.js
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month'));
    const year = parseInt(searchParams.get('year'));
    if (!month || !year) return NextResponse.json({ error: 'month và year bắt buộc' }, { status: 400 });

    const records = await prisma.officePayrollRecord.findMany({
        where: { month, year },
        include: { employee: { select: { name: true, code: true, department: { select: { name: true } } } } },
        orderBy: { employee: { name: 'asc' } },
    });

    // Sheet 1: Chi tiết
    const detail = records.map((r, i) => ({
        'STT': i + 1,
        'Mã NV': r.employee.code,
        'Họ tên': r.employee.name,
        'Phòng ban': r.employee.department?.name || '',
        'Lương CB': r.baseSalary,
        'Ngày chuẩn': r.standardDays,
        'Ngày TT': r.actualDays,
        'Lương ngày': r.actualDays > 0 ? Math.round(r.baseSalary / r.standardDays) : 0,
        'Lương tính ngày': r.proratedSalary,
        'PC Điện thoại': r.phoneAllowance,
        'PC Xăng xe': r.transportAllowance,
        'PC Chuyên cần': r.diligenceAllowance,
        'PC Chức vụ': r.positionAllowance,
        'Hoa hồng KD': r.commissionAmount,
        'Thưởng': r.bonus,
        'Gross': r.grossIncome,
        'BHXH NLĐ 8%': r.bhxhEmployee,
        'BHYT NLĐ 1.5%': r.bhytEmployee,
        'BHTN NLĐ 1%': r.bhtnEmployee,
        'Tổng BH NLĐ': r.bhxhEmployee + r.bhytEmployee + r.bhtnEmployee,
        'BHXH NSDLĐ 21.5%': r.bhxhCompany,
        'Phạt': r.disciplinaryFine,
        'Tạm ứng': r.salaryAdvance,
        'Tổng khấu trừ': r.totalDeductions,
        'Còn lĩnh': r.netSalary,
        'Ghi chú': r.notes || '',
    }));

    // Sheet 2: Tổng hợp
    const summary = records.map((r, i) => ({
        'STT': i + 1,
        'Họ tên': r.employee.name,
        'Gross': r.grossIncome,
        'BH NLĐ': r.bhxhEmployee + r.bhytEmployee + r.bhtnEmployee,
        'Còn lĩnh': r.netSalary,
        'BH NSDLĐ': r.bhxhCompany,
        'Chi phí công ty': r.totalCompanyPays,
    }));

    const wb = XLSX.utils.book_new();

    const ws1 = XLSX.utils.json_to_sheet(detail);
    // Header row
    XLSX.utils.sheet_add_aoa(ws1, [[`BẢNG LƯƠNG VĂN PHÒNG THÁNG ${month}/${year}`]], { origin: 'A1' });
    XLSX.utils.book_append_sheet(wb, ws1, 'Chi tiết');

    const ws2 = XLSX.utils.json_to_sheet(summary);
    XLSX.utils.book_append_sheet(wb, ws2, 'Tổng hợp');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
        status: 200,
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="bang-luong-VP-T${month}-${year}.xlsx"`,
        },
    });
});
```

- [ ] **Step 2: Commit**

```bash
git add app/api/hr/office-payroll/export/route.js
git commit -m "feat(payroll): add office payroll Excel export"
```

---

## Task 8: Excel Export — Workshop Payroll

**Files:**
- Create: `app/api/hr/workshop-payroll/export/route.js`

- [ ] **Step 1: Tạo export route**

```javascript
// app/api/hr/workshop-payroll/export/route.js
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

export const GET = withAuth(async (request) => {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month'));
    const year = parseInt(searchParams.get('year'));
    if (!month || !year) return NextResponse.json({ error: 'month và year bắt buộc' }, { status: 400 });

    const records = await prisma.workshopPayrollRecord.findMany({
        where: { month, year },
        include: { employee: { select: { name: true, code: true, department: { select: { name: true } } } } },
        orderBy: { employee: { name: 'asc' } },
    });

    const detail = records.map((r, i) => ({
        'STT': i + 1,
        'Mã NV': r.employee.code,
        'Họ tên': r.employee.name,
        'Phòng ban': r.employee.department?.name || '',
        'Lương/ngày': r.dailyWage,
        'Ngày TT': r.actualDays,
        'Lương ngày công': r.basePay,
        'OT (giờ)': r.overtimeHours,
        'Tiền OT': r.overtimePay,
        'Tiền ăn': r.mealAllowance,
        'PC Điện thoại': r.phoneAllowance,
        'PC Xăng xe': r.transportAllowance,
        'PC Chuyên cần': r.diligenceAllowance,
        'Thưởng': r.bonus,
        'Gross': r.grossIncome,
        'Phạt': r.disciplinaryFine,
        'Tạm ứng': r.salaryAdvance,
        'Tổng khấu trừ': r.totalDeductions,
        'Còn lĩnh': r.netSalary,
        'Ghi chú': r.notes || '',
    }));

    const summary = records.map((r, i) => ({
        'STT': i + 1,
        'Họ tên': r.employee.name,
        'Ngày công': r.actualDays,
        'OT (giờ)': r.overtimeHours,
        'Gross': r.grossIncome,
        'Còn lĩnh': r.netSalary,
    }));

    const wb = XLSX.utils.book_new();

    const ws1 = XLSX.utils.json_to_sheet(detail);
    XLSX.utils.sheet_add_aoa(ws1, [[`BẢNG LƯƠNG NHÀ XƯỞNG THÁNG ${month}/${year}`]], { origin: 'A1' });
    XLSX.utils.book_append_sheet(wb, ws1, 'Chi tiết');

    const ws2 = XLSX.utils.json_to_sheet(summary);
    XLSX.utils.book_append_sheet(wb, ws2, 'Tổng hợp');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
        status: 200,
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="bang-luong-xuong-T${month}-${year}.xlsx"`,
        },
    });
});
```

- [ ] **Step 2: Commit**

```bash
git add app/api/hr/workshop-payroll/export/route.js
git commit -m "feat(payroll): add workshop payroll Excel export"
```

---

## Task 9: Tích hợp HR Page — thêm 3 tab mới + employee allowance edit

**Files:**
- Modify: `app/hr/page.js`

Thêm 3 tab: `office-payroll` (Bảng lương VP), `workshop-payroll` (Bảng lương Xưởng), `commission` (Hoa hồng KD). Thêm edit field phụ cấp vào modal sửa nhân viên (`payrollType`, `phoneAllowance`, `transportAllowance`, `diligenceAllowance`, `positionAllowance`, `mealAllowanceRate`, `dailyWage`).

- [ ] **Step 1: Thêm dynamic imports ở đầu file** (sau dòng `EmployeeContractTab`)

Mở `app/hr/page.js`, tìm block các `const ... = dynamic(...)` ở đầu file (khoảng dòng 6-11). Thêm sau dòng cuối cùng của block:

```javascript
const OfficePayrollTab = dynamic(() => import('@/components/hr/OfficePayrollTab'), { ssr: false, loading: () => <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div> });
const WorkshopPayrollTab = dynamic(() => import('@/components/hr/WorkshopPayrollTab'), { ssr: false, loading: () => <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div> });
const CommissionTab = dynamic(() => import('@/components/hr/CommissionTab'), { ssr: false, loading: () => <div style={{ padding: 40, textAlign: 'center' }}>Đang tải...</div> });
```

- [ ] **Step 2: Thêm 3 tab vào tab switcher**

Tìm dòng `[{ key: 'employees', label: '👥 Nhân viên' }, ...` trong `app/hr/page.js` (khoảng dòng 570). Thêm 3 tab mới vào cuối mảng (trước dấu `]`):

```javascript
{ key: 'office-payroll', label: '💼 Lương VP' },
{ key: 'workshop-payroll', label: '🏭 Lương Xưởng' },
{ key: 'commission', label: '💰 Hoa hồng KD' },
```

- [ ] **Step 3: Thêm render cases**

Tìm đoạn `} : mainTab === 'contracts' ? (` trong `app/hr/page.js` (khoảng dòng 602). Thêm 3 case mới ngay trước đó:

```javascript
} : mainTab === 'office-payroll' ? (
    <div className="card" style={{ padding: 24 }}>
        <OfficePayrollTab />
    </div>
) : mainTab === 'workshop-payroll' ? (
    <div className="card" style={{ padding: 24 }}>
        <WorkshopPayrollTab />
    </div>
) : mainTab === 'commission' ? (
    <div className="card" style={{ padding: 24 }}>
        <CommissionTab />
    </div>
```

- [ ] **Step 4: Thêm allowance fields vào EmployeeForm**

Trong `app/hr/page.js`, tìm `EmployeeForm` component (hoặc inline form sửa nhân viên). Tìm chỗ có `insuranceSalary` field. Thêm sau nó:

```javascript
<div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Phân loại & Phụ cấp</div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="form-group">
            <label className="form-label">Loại nhân viên</label>
            <select className="form-select" value={form.payrollType || 'office'}
                onChange={e => setForm({ ...form, payrollType: e.target.value })}>
                <option value="office">Văn phòng</option>
                <option value="workshop">Nhà xưởng</option>
            </select>
        </div>
        <div className="form-group">
            <label className="form-label">PC Chức vụ (đ/tháng)</label>
            <input className="form-input" type="number" value={form.positionAllowance || 0}
                onChange={e => setForm({ ...form, positionAllowance: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="form-group">
            <label className="form-label">PC Điện thoại (đ/tháng)</label>
            <input className="form-input" type="number" value={form.phoneAllowance || 0}
                onChange={e => setForm({ ...form, phoneAllowance: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="form-group">
            <label className="form-label">PC Xăng xe (đ/tháng)</label>
            <input className="form-input" type="number" value={form.transportAllowance || 0}
                onChange={e => setForm({ ...form, transportAllowance: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="form-group">
            <label className="form-label">PC Chuyên cần (đ/tháng)</label>
            <input className="form-input" type="number" value={form.diligenceAllowance || 0}
                onChange={e => setForm({ ...form, diligenceAllowance: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="form-group">
            <label className="form-label">Tiền ăn/ngày (xưởng)</label>
            <input className="form-input" type="number" value={form.mealAllowanceRate || 0}
                onChange={e => setForm({ ...form, mealAllowanceRate: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="form-group">
            <label className="form-label">Lương ngày (xưởng)</label>
            <input className="form-input" type="number" value={form.dailyWage || 0}
                onChange={e => setForm({ ...form, dailyWage: parseInt(e.target.value) || 0 })} />
        </div>
    </div>
</div>
```

- [ ] **Step 5: Đảm bảo API employee PATCH nhận các field mới**

Mở `lib/validations/employee.js`. Thêm các field mới vào `employeeUpdateSchema`:

```javascript
payrollType:        z.enum(['office', 'workshop']).optional(),
positionAllowance:  z.number().int().min(0).optional(),
phoneAllowance:     z.number().int().min(0).optional(),
transportAllowance: z.number().int().min(0).optional(),
diligenceAllowance: z.number().int().min(0).optional(),
mealAllowanceRate:  z.number().int().min(0).optional(),
dailyWage:          z.number().int().min(0).optional(),
```

- [ ] **Step 6: Commit**

```bash
git add app/hr/page.js lib/validations/employee.js
git commit -m "feat(payroll): integrate 3 payroll tabs + employee allowance edit in HR page"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Workshop payroll API (GET+POST+PATCH) — Tasks 2, 3
- ✅ WorkshopPayrollTab UI với đầy đủ cột — Task 5
- ✅ ContractCommission API (GET+POST+DELETE) — Task 4
- ✅ CommissionTab UI với form thêm + bảng danh sách — Task 6
- ✅ Excel export VP — Task 7
- ✅ Excel export Xưởng — Task 8
- ✅ Tab tích hợp vào HR page — Task 9 Steps 1-3
- ✅ Employee allowance edit UI — Task 9 Steps 4-5
- ✅ Zod validation schema — Task 1

**Type consistency:**
- `WorkshopPayrollRecord` fields: `dailyWage`, `actualDays`, `basePay`, `overtimeHours`, `overtimePay`, `mealAllowance`, `phoneAllowance`, `transportAllowance`, `diligenceAllowance`, `bonus`, `grossIncome`, `disciplinaryFine`, `salaryAdvance`, `totalDeductions`, `netSalary`, `notes` — consistent across Task 2, 3, 5, 8
- `ContractCommission` fields: `employeeId`, `contractId`, `rate`, `estimatedAmount` (computed) — consistent across Task 4, 6
- API paths: `/api/hr/workshop-payroll`, `/api/hr/contract-commissions` — consistent across all tasks
