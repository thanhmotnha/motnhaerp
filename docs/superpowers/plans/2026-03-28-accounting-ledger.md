# Accounting Ledger Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Biến module Kế toán thành Sổ cái tổng hợp read-only (merge từ ContractPayment + Transaction + ProjectExpense) và thu gọn sidebar Tài chính từ 6 xuống 4 mục.

**Architecture:** Tạo API mới `/api/accounting/ledger` query song song 3 bảng, normalize thành unified entry shape, trả về `{ entries[], summary{}, months[] }`. Frontend fetch 1 lần, filter client-side. Sidebar chỉ đổi config array — không động vào logic render.

**Tech Stack:** Next.js 16 App Router, React 19, Prisma 6, `withAuth` từ `@/lib/apiHandler`, `apiFetch` từ `@/lib/fetchClient`, `fmtVND`/`fmtDate` từ `@/lib/financeUtils`.

---

## Cấu trúc File

| File | Trạng thái | Trách nhiệm |
|------|-----------|-------------|
| `components/Sidebar.js` | Sửa | Xóa 2 mục, đổi label + icon Kế toán |
| `app/api/accounting/ledger/route.js` | Tạo mới | GET handler merge 3 nguồn, filter, trả summary + months |
| `app/accounting/page.js` | Rewrite | Sổ cái: 3 stat cards + bảng giao dịch + bảng tháng, không form nhập |

---

## Task 1: Sidebar — Thu gọn Tài chính

**Files:**
- Modify: `components/Sidebar.js`

Context: `menuItems` là array config. Section `'Tài chính'` có 6 items. Cần xóa 2 items và đổi label + icon 1 item. Không chạm gì ngoài array này.

- [ ] **Step 1: Đọc file để xác định vị trí chính xác**

Mở `components/Sidebar.js`, tìm block:
```javascript
{
    section: 'Tài chính', items: [
        { href: '/finance', icon: Wallet, label: 'Tổng quan', ... },
        { href: '/payment-schedule', icon: CalendarDays, label: 'Lịch Thu Chi', ... },
        { href: '/cashflow-forecast', icon: Banknote, label: 'Dự báo dòng tiền', ... },
        { href: '/expenses', icon: DollarSign, label: 'Chi phí DA', ... },
        { href: '/budget', icon: PiggyBank, label: 'Ngân sách', ... },
        { href: '/accounting', icon: Calculator, label: 'Kế toán', ... },
    ]
},
```

- [ ] **Step 2: Thay block Tài chính**

Thay toàn bộ block trên bằng:
```javascript
{
    section: 'Tài chính', items: [
        { href: '/finance', icon: Wallet, label: 'Tổng quan', roles: ['giam_doc', 'pho_gd', 'ke_toan'] },
        { href: '/accounting', icon: BookOpen, label: 'Sổ cái', roles: ['giam_doc', 'pho_gd', 'ke_toan'] },
        { href: '/cashflow-forecast', icon: Banknote, label: 'Dự báo dòng tiền', roles: ['giam_doc', 'pho_gd', 'ke_toan'] },
        { href: '/budget', icon: PiggyBank, label: 'Ngân sách', roles: ['giam_doc', 'pho_gd', 'ke_toan', 'quan_ly_du_an'] },
    ]
},
```

`BookOpen` đã có trong import list (`import { ..., BookOpen, ... } from 'lucide-react'`). Xóa `Calculator` và `DollarSign` khỏi import nếu không còn dùng ở đâu — chạy build để kiểm tra, nếu lỗi unused import thì xóa.

- [ ] **Step 3: Build verify**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | tail -5
```

Expected: `✓ Compiled successfully`

- [ ] **Step 4: Commit**

```bash
cd d:/Codeapp/motnha && git add components/Sidebar.js && git commit -m "feat(sidebar): thu gọn Tài chính 6→4 mục, đổi Kế toán → Sổ cái"
```

---

## Task 2: API `/api/accounting/ledger`

**Files:**
- Create: `app/api/accounting/ledger/route.js`

Context:
- `withAuth` từ `@/lib/apiHandler` — wraps handler, cung cấp auth check tự động
- `prisma` default import từ `@/lib/prisma`
- `ContractPayment` có field `paidDate` (nullable) — dùng làm ngày giao dịch Thu HĐ
- `ProjectExpense` chỉ lấy status `'Đã chi'` hoặc `'Hoàn thành'`, dùng `paidAmount` (không phải `amount`)
- `Transaction` lấy tất cả, dùng field `date`
- Fetch ALL entries (không filter theo tháng ở DB) — client filter. Với công ty 6 người, data nhỏ, an toàn.

- [ ] **Step 1: Tạo file `app/api/accounting/ledger/route.js`**

```javascript
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/apiHandler';
import prisma from '@/lib/prisma';

export const GET = withAuth(async () => {
    const [payments, transactions, expenses] = await Promise.all([
        prisma.contractPayment.findMany({
            where: { status: 'Đã thu' },
            include: {
                contract: {
                    select: {
                        code: true,
                        project: { select: { id: true, name: true } },
                    },
                },
            },
            orderBy: { paidDate: 'desc' },
        }),
        prisma.transaction.findMany({
            include: { project: { select: { id: true, name: true } } },
            orderBy: { date: 'desc' },
        }),
        prisma.projectExpense.findMany({
            where: { status: { in: ['Đã chi', 'Hoàn thành'] } },
            include: { project: { select: { id: true, name: true } } },
            orderBy: { date: 'desc' },
        }),
    ]);

    const entries = [
        ...payments.map(p => ({
            id: `cp-${p.id}`,
            date: p.paidDate || p.createdAt,
            type: 'Thu',
            source: 'contract',
            description: `Thu ${p.phase} — ${p.contract?.code || ''}`,
            projectName: p.contract?.project?.name || '—',
            projectId: p.contract?.project?.id || null,
            amount: p.paidAmount,
        })),
        ...transactions.map(t => ({
            id: `tx-${t.id}`,
            date: t.date,
            type: t.type,
            source: 'manual',
            description: t.description,
            projectName: t.project?.name || '—',
            projectId: t.projectId || null,
            amount: t.amount,
        })),
        ...expenses.map(e => ({
            id: `exp-${e.id}`,
            date: e.date,
            type: 'Chi',
            source: 'expense',
            description: e.description,
            projectName: e.project?.name || '—',
            projectId: e.projectId || null,
            amount: e.paidAmount || e.amount,
        })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    const totalThu = entries.filter(e => e.type === 'Thu').reduce((s, e) => s + e.amount, 0);
    const totalChi = entries.filter(e => e.type === 'Chi').reduce((s, e) => s + e.amount, 0);

    // Monthly breakdown
    const monthMap = {};
    entries.forEach(e => {
        const d = new Date(e.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthMap[key]) monthMap[key] = {
            key,
            label: `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`,
            totalThu: 0,
            totalChi: 0,
        };
        if (e.type === 'Thu') monthMap[key].totalThu += e.amount;
        else monthMap[key].totalChi += e.amount;
    });

    let running = 0;
    const months = Object.values(monthMap)
        .sort((a, b) => a.key.localeCompare(b.key))
        .map(m => {
            m.net = m.totalThu - m.totalChi;
            running += m.net;
            m.runningBalance = running;
            return m;
        });

    return NextResponse.json({
        entries,
        summary: { totalThu, totalChi, net: totalThu - totalChi },
        months,
    });
});
```

- [ ] **Step 2: Build verify**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | grep -E "ledger|error|Error|✓" | head -10
```

Expected: Không có lỗi liên quan `ledger`.

- [ ] **Step 3: Commit**

```bash
cd d:/Codeapp/motnha && git add app/api/accounting/ledger/route.js && git commit -m "feat(accounting): API /api/accounting/ledger — merge 3 nguồn thu/chi"
```

---

## Task 3: Rewrite `app/accounting/page.js` — Sổ cái

**Files:**
- Modify: `app/accounting/page.js` (rewrite hoàn toàn)

Context:
- File hiện tại 302 dòng, có form nhập `AccountEntry`, dùng raw `fetch`. Xóa toàn bộ, thay bằng Sổ cái.
- Dùng `apiFetch` từ `@/lib/fetchClient` (không raw fetch)
- Dùng `fmtVND`, `fmtDate` từ `@/lib/financeUtils`
- Filter client-side: type (Thu/Chi), month (YYYY-MM input[type=month]), projectId
- Không cần `Suspense` vì không dùng `useSearchParams`

- [ ] **Step 1: Rewrite `app/accounting/page.js`**

```javascript
'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { fmtVND, fmtDate } from '@/lib/financeUtils';

const SOURCE_LABELS = {
    contract: { label: 'HĐ', color: 'success' },
    expense:  { label: 'Chi DA', color: 'danger' },
    manual:   { label: 'Thủ công', color: 'muted' },
};

export default function AccountingPage() {
    const [data, setData] = useState({ entries: [], summary: {}, months: [] });
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [filterProject, setFilterProject] = useState('');
    const [projects, setProjects] = useState([]);

    useEffect(() => {
        apiFetch('/api/accounting/ledger')
            .then(setData)
            .finally(() => setLoading(false));
        apiFetch('/api/projects?limit=500')
            .then(d => setProjects(d.data || []));
    }, []);

    const filtered = data.entries.filter(e => {
        if (filterType && e.type !== filterType) return false;
        if (filterProject && e.projectId !== filterProject) return false;
        if (filterMonth) {
            const key = new Date(e.date).toISOString().slice(0, 7);
            if (key !== filterMonth) return false;
        }
        return true;
    });

    const { summary, months } = data;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* 3 stat cards */}
            <div className="stats-grid">
                {[
                    { label: 'Tổng thu', val: summary.totalThu, color: 'var(--status-success)' },
                    { label: 'Tổng chi', val: summary.totalChi, color: 'var(--status-danger)' },
                    { label: 'Số dư ròng', val: summary.net, color: (summary.net || 0) >= 0 ? 'var(--status-success)' : 'var(--status-danger)' },
                ].map(({ label, val, color }) => (
                    <div key={label} className="stat-card">
                        <div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                            <div style={{ fontSize: 22, fontWeight: 700, color }}>{fmtVND(val)}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Bảng giao dịch */}
            <div className="card" style={{ padding: 20 }}>
                <div className="card-header" style={{ marginBottom: 16 }}>
                    <span className="card-title">📒 Sổ cái giao dịch</span>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <select className="form-input" style={{ width: 120 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                            <option value="">Tất cả</option>
                            <option value="Thu">Thu</option>
                            <option value="Chi">Chi</option>
                        </select>
                        <input className="form-input" type="month" style={{ width: 150 }} value={filterMonth} onChange={e => setFilterMonth(e.target.value)} />
                        <select className="form-input" style={{ width: 180 }} value={filterProject} onChange={e => setFilterProject(e.target.value)}>
                            <option value="">Tất cả dự án</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                </div>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Đang tải...</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table" style={{ margin: 0 }}>
                            <thead>
                                <tr>
                                    <th>Ngày</th>
                                    <th>Nguồn</th>
                                    <th>Mô tả</th>
                                    <th>Dự án</th>
                                    <th style={{ textAlign: 'right' }}>Số tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>Chưa có giao dịch trong kỳ này</td></tr>
                                ) : filtered.map(e => {
                                    const src = SOURCE_LABELS[e.source] || SOURCE_LABELS.manual;
                                    return (
                                        <tr key={e.id}>
                                            <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(e.date)}</td>
                                            <td><span className={`badge ${src.color}`}>{src.label}</span></td>
                                            <td>{e.description}</td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{e.projectName}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap', color: e.type === 'Thu' ? 'var(--status-success)' : 'var(--status-danger)' }}>
                                                {e.type === 'Thu' ? '+' : '-'}{fmtVND(e.amount)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Bảng tổng hợp tháng */}
            <div className="card" style={{ padding: 20 }}>
                <div className="card-header" style={{ marginBottom: 16 }}>
                    <span className="card-title">📅 Tổng hợp theo tháng</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ margin: 0 }}>
                        <thead>
                            <tr>
                                <th>Tháng</th>
                                <th style={{ textAlign: 'right', color: 'var(--status-success)' }}>Tổng thu</th>
                                <th style={{ textAlign: 'right', color: 'var(--status-danger)' }}>Tổng chi</th>
                                <th style={{ textAlign: 'right' }}>Ròng</th>
                                <th style={{ textAlign: 'right' }}>Luỹ kế</th>
                            </tr>
                        </thead>
                        <tbody>
                            {months.length === 0 ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>Chưa có dữ liệu</td></tr>
                            ) : months.map(m => (
                                <tr key={m.key}>
                                    <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{m.label}</td>
                                    <td style={{ textAlign: 'right', color: 'var(--status-success)', fontWeight: 600 }}>{fmtVND(m.totalThu)}</td>
                                    <td style={{ textAlign: 'right', color: 'var(--status-danger)' }}>{fmtVND(m.totalChi)}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700, color: (m.net || 0) >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>
                                        {(m.net || 0) >= 0 ? '+' : ''}{fmtVND(m.net)}
                                    </td>
                                    <td style={{ textAlign: 'right', color: (m.runningBalance || 0) >= 0 ? 'var(--text-primary)' : 'var(--status-danger)' }}>
                                        {fmtVND(m.runningBalance)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Build verify**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | tail -8
```

Expected: `✓ Compiled successfully`, không có lỗi.

- [ ] **Step 3: Chạy tests**

```bash
cd d:/Codeapp/motnha && npm test 2>&1 | tail -5
```

Expected: Không có test mới thất bại (các test cũ pre-existing OK).

- [ ] **Step 4: Push**

```bash
cd d:/Codeapp/motnha && git add app/accounting/page.js && git commit -m "feat(accounting): rewrite → Sổ cái tổng hợp read-only (3 nguồn)"
git push origin main
```

---

## Checklist Spec

| Yêu cầu spec | Task |
|---|---|
| Sidebar Tài chính còn 4 mục | Task 1 |
| Label "Kế toán" → "Sổ cái", icon BookOpen | Task 1 |
| `/api/accounting/ledger` merge 3 nguồn | Task 2 |
| API trả `entries[]`, `summary{}`, `months[]` | Task 2 |
| 3 stat cards: totalThu, totalChi, net | Task 3 |
| Bảng giao dịch: lọc type/month/project | Task 3 |
| Badge nguồn: HĐ / Chi DA / Thủ công | Task 3 |
| Bảng tháng có luỹ kế | Task 3 |
| Không raw `fetch`, dùng `apiFetch` | Task 3 |
| Không form nhập mới | Task 3 |
