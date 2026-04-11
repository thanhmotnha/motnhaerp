# Finance Module Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign phân hệ tài chính — Quick Entry bar, daily dashboard, công nợ 3 chiều (KH + NT + NCC), tách file page.js thành tab components.

**Architecture:** Shell `page.js` (~100 dòng) fetch summary 1 lần, truyền props xuống 4 tab component mới. Quick Entry bar nằm trong shell, luôn visible. 2 tab hiện có (ReceivablesTab, ExpensesTab) giữ nguyên, wrap vào shell mới. API `/api/finance` mở rộng thêm `upcomingPayments` (7 ngày tới) và `supplierDebt` (PO chưa thanh toán).

**Tech Stack:** Next.js 16 App Router, React 19, `apiFetch` từ `@/lib/fetchClient`, CSS variables từ `app/globals.css`, Prisma 6 (prisma từ `@/lib/prisma`), `withAuth` từ `@/lib/apiHandler`.

---

## Cấu trúc File

| File | Trạng thái | Trách nhiệm |
|------|-----------|-------------|
| `app/finance/page.js` | Sửa (~100 dòng) | Shell: fetch summary, Quick Entry bar, tab routing |
| `app/finance/tabs/OverviewTab.js` | Tạo mới (~150 dòng) | Daily dashboard: 4 stat cards, cảnh báo quá hạn, cần thu tuần này, 10 giao dịch gần nhất |
| `app/finance/tabs/CashflowTab.js` | Tạo mới (~180 dòng) | Biểu đồ SVG thu/chi, bảng tháng, danh sách giao dịch thủ công |
| `app/finance/tabs/DebtTab.js` | Tạo mới (~200 dòng) | Công nợ 3 section: AR + giữ lại BH + NCC chưa trả |
| `app/finance/tabs/ReportTab.js` | Tạo mới (~120 dòng) | Bảng báo cáo tháng (cashflow.months) |
| `app/api/finance/route.js` | Sửa | Thêm `upcomingPayments` + `supplierDebt` vào GET response |
| `__tests__/lib/financeUtils.test.js` | Tạo mới | Unit tests cho utility functions |
| `lib/financeUtils.js` | Tạo mới | `fmtVND`, `fmtDate`, `isOverdue` shared utilities |
| `components/finance/ReceivablesTab.js` | Giữ nguyên | — |
| `components/finance/ExpensesTab.js` | Giữ nguyên | — |

---

## Task 1: Utility functions + tests

**Files:**
- Create: `lib/financeUtils.js`
- Create: `__tests__/lib/financeUtils.test.js`

- [ ] **Step 1: Viết failing tests**

```javascript
// __tests__/lib/financeUtils.test.js
import { describe, it, expect } from 'vitest';
import { fmtVND, fmtDate, isOverdue, daysOverdue } from '@/lib/financeUtils';

describe('fmtVND', () => {
    it('formats number to VND', () => {
        expect(fmtVND(1000000)).toContain('1.000.000');
    });
    it('handles 0', () => {
        expect(fmtVND(0)).toContain('0');
    });
    it('handles null', () => {
        expect(fmtVND(null)).toContain('0');
    });
});

describe('fmtDate', () => {
    it('formats ISO date to vi-VN', () => {
        expect(fmtDate('2026-03-28T00:00:00Z')).toMatch(/\d+\/\d+\/\d+/);
    });
    it('returns — for null', () => {
        expect(fmtDate(null)).toBe('—');
    });
});

describe('daysOverdue', () => {
    it('returns positive number for past date', () => {
        const past = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
        expect(daysOverdue(past)).toBeGreaterThan(8);
    });
    it('returns 0 for future date', () => {
        const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
        expect(daysOverdue(future)).toBe(0);
    });
    it('returns 0 for null', () => {
        expect(daysOverdue(null)).toBe(0);
    });
});
```

- [ ] **Step 2: Chạy test — expect FAIL**

```bash
npm test -- financeUtils
```

Expected: FAIL với "Cannot find module '@/lib/financeUtils'"

- [ ] **Step 3: Implement `lib/financeUtils.js`**

```javascript
export const fmtVND = (n) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(n) || 0);

export const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString('vi-VN') : '—';

export const daysOverdue = (dueDate) => {
    if (!dueDate) return 0;
    const diff = Date.now() - new Date(dueDate).getTime();
    return diff > 0 ? Math.floor(diff / (1000 * 60 * 60 * 24)) : 0;
};

export const isOverdue = (dueDate) => daysOverdue(dueDate) > 0;
```

- [ ] **Step 4: Chạy test — expect PASS**

```bash
npm test -- financeUtils
```

Expected: 7 tests pass

- [ ] **Step 5: Commit**

```bash
git add lib/financeUtils.js __tests__/lib/financeUtils.test.js
git commit -m "feat(finance): add financeUtils — fmtVND, fmtDate, daysOverdue"
```

---

## Task 2: Mở rộng API `/api/finance` — thêm upcomingPayments + supplierDebt

**Files:**
- Modify: `app/api/finance/route.js`

Context: File hiện tại ở `app/api/finance/route.js`. GET handler dùng `withAuth`. Cần thêm 2 query vào Promise.all và trả về trong JSON response.

- [ ] **Step 1: Đọc file hiện tại**

```bash
# Xem cấu trúc query hiện tại
head -70 app/api/finance/route.js
```

- [ ] **Step 2: Thêm 2 query vào Promise.all trong GET handler**

Tìm đoạn:
```javascript
const [receivables, payables, income, expense, expApproved, expPaid, expPending] = await Promise.all([
```

Thay bằng:
```javascript
const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

const [receivables, payables, income, expense, expApproved, expPaid, expPending, upcomingPayments, supplierDebt] = await Promise.all([
    prisma.contractPayment.aggregate({ where: { contract: { deletedAt: null } }, _sum: { amount: true, paidAmount: true } }),
    prisma.contractorPayment.aggregate({ _sum: { contractAmount: true, paidAmount: true } }),
    prisma.transaction.aggregate({ where: { type: 'Thu' }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { type: 'Chi' }, _sum: { amount: true } }),
    prisma.projectExpense.aggregate({ where: { status: { not: 'Từ chối' } }, _sum: { amount: true } }),
    prisma.projectExpense.aggregate({ where: { status: { in: ['Đã chi', 'Hoàn thành'] } }, _sum: { amount: true } }),
    prisma.projectExpense.aggregate({ where: { status: 'Chờ duyệt' }, _sum: { amount: true } }),
    prisma.contractPayment.findMany({
        where: {
            status: { not: 'Đã thu' },
            dueDate: { lte: sevenDaysFromNow },
            contract: { deletedAt: null },
        },
        include: {
            contract: {
                select: {
                    code: true,
                    project: { select: { name: true } },
                },
            },
        },
        orderBy: { dueDate: 'asc' },
        take: 20,
    }),
    prisma.purchaseOrder.findMany({
        where: {
            status: { not: 'Đã hủy' },
            totalAmount: { gt: 0 },
        },
        select: {
            id: true,
            code: true,
            supplier: true,
            totalAmount: true,
            paidAmount: true,
            orderDate: true,
            project: { select: { name: true } },
            supplierRel: { select: { name: true } },
        },
        orderBy: { orderDate: 'desc' },
        take: 100,
    }),
]);
```

- [ ] **Step 3: Thêm vào return JSON — sau `summary: {...}`**

Tìm dòng `return NextResponse.json({` và thêm 2 field mới:

```javascript
return NextResponse.json({
    transactions,
    summary: {
        totalReceivable: receivables._sum.amount || 0,
        totalReceived: receivables._sum.paidAmount || 0,
        receivableOutstanding: (receivables._sum.amount || 0) - (receivables._sum.paidAmount || 0),
        totalPayable: payables._sum.contractAmount || 0,
        totalPaid: payables._sum.paidAmount || 0,
        payableOutstanding: (payables._sum.contractAmount || 0) - (payables._sum.paidAmount || 0),
        totalExpenseApproved,
        totalExpensePaid,
        totalExpensePending,
        manualIncome: income._sum.amount || 0,
        manualExpense: expense._sum.amount || 0,
        netCashflow: (receivables._sum.paidAmount || 0) + (income._sum.amount || 0)
            - (payables._sum.paidAmount || 0) - totalExpensePaid - (expense._sum.amount || 0),
    },
    upcomingPayments,
    supplierDebt: supplierDebt.filter(po => (po.paidAmount || 0) < (po.totalAmount || 0)),
});
```

- [ ] **Step 4: Build để verify không lỗi**

```bash
npm run build 2>&1 | grep -E "error|Error|✓" | head -20
```

Expected: `✓ Compiled successfully`

- [ ] **Step 5: Commit**

```bash
git add app/api/finance/route.js
git commit -m "feat(finance): API thêm upcomingPayments + supplierDebt"
```

---

## Task 3: Shell `page.js` + Quick Entry bar

**Files:**
- Modify: `app/finance/page.js` (rewrite hoàn toàn)
- Create: `app/finance/tabs/` directory

Context: File hiện tại 432 dòng, tất cả logic nhét trong 1 file. Rewrite thành shell ~100 dòng. Quick Entry bar có 3 nút mở form inline. Dùng `apiFetch` từ `@/lib/fetchClient` thay vì raw `fetch`.

- [ ] **Step 1: Tạo thư mục tabs**

```bash
mkdir -p app/finance/tabs
```

- [ ] **Step 2: Viết lại `app/finance/page.js`**

```javascript
'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { apiFetch } from '@/lib/fetchClient';
import { fmtVND } from '@/lib/financeUtils';

const OverviewTab = dynamic(() => import('./tabs/OverviewTab'), { ssr: false });
const CashflowTab = dynamic(() => import('./tabs/CashflowTab'), { ssr: false });
const DebtTab = dynamic(() => import('./tabs/DebtTab'), { ssr: false });
const ReportTab = dynamic(() => import('./tabs/ReportTab'), { ssr: false });
const ReceivablesTab = dynamic(() => import('@/components/finance/ReceivablesTab'), { ssr: false });
const ExpensesTab = dynamic(() => import('@/components/finance/ExpensesTab'), { ssr: false });

const TABS = [
    { key: 'overview', label: '📊 Tổng quan' },
    { key: 'thu_tien', label: '💵 Thu tiền' },
    { key: 'chi_phi', label: '💸 Chi phí' },
    { key: 'dong_tien', label: '💧 Dòng tiền' },
    { key: 'cong_no', label: '📋 Công nợ' },
    { key: 'bao_cao', label: '📅 Báo cáo tháng' },
];

const QUICK_ENTRY_TYPES = ['Thu tiền', 'Chi phí', 'Giao dịch khác'];

export default function FinancePage() {
    return <Suspense><FinanceContent /></Suspense>;
}

function FinanceContent() {
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
    const [data, setData] = useState({ summary: {}, transactions: { data: [] }, upcomingPayments: [], supplierDebt: [] });
    const [loading, setLoading] = useState(true);
    const [cashflow, setCashflow] = useState(null);
    const [retentions, setRetentions] = useState([]);
    const [quickType, setQuickType] = useState(null); // null | 'Thu tiền' | 'Chi phí' | 'Giao dịch khác'
    const [qForm, setQForm] = useState({ type: 'Thu', description: '', amount: '', category: '', date: new Date().toISOString().slice(0, 10) });
    const [saving, setSaving] = useState(false);

    const load = () => {
        setLoading(true);
        apiFetch('/api/finance')
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    };

    const loadCashflow = () => {
        if (cashflow) return;
        apiFetch('/api/finance/cashflow').then(setCashflow);
    };

    const loadRetentions = () => {
        if (retentions.length) return;
        apiFetch('/api/contractor-payments?retentionOnly=1&limit=500')
            .then(d => setRetentions((d.data || []).filter(p => (p.retentionAmount || 0) > 0 && !p.retentionReleased)));
    };

    useEffect(load, []);

    const handleTabChange = (key) => {
        setActiveTab(key);
        setQuickType(null);
        if (key === 'dong_tien' || key === 'bao_cao') loadCashflow();
        if (key === 'cong_no') { loadRetentions(); }
    };

    const saveQuickEntry = async () => {
        if (!qForm.amount || !qForm.description) return alert('Nhập đủ mô tả và số tiền!');
        setSaving(true);
        const type = quickType === 'Thu tiền' ? 'Thu' : quickType === 'Chi phí' ? 'Chi' : qForm.type;
        await apiFetch('/api/finance', {
            method: 'POST',
            body: { ...qForm, type, amount: Number(qForm.amount), date: new Date(qForm.date) },
        });
        setSaving(false);
        setQuickType(null);
        setQForm({ type: 'Thu', description: '', amount: '', category: '', date: new Date().toISOString().slice(0, 10) });
        load();
    };

    const { summary, transactions, upcomingPayments, supplierDebt } = data;

    return (
        <div>
            {/* KPI Cards */}
            <div className="stats-grid">
                <div className="stat-card"><div className="stat-icon">📈</div><div><div className="stat-value" style={{ color: 'var(--status-success)' }}>{fmtVND(summary.totalReceived)}</div><div className="stat-label">Đã thu từ HĐ</div></div></div>
                <div className="stat-card"><div className="stat-icon">🔴</div><div><div className="stat-value" style={{ color: 'var(--status-danger)' }}>{fmtVND(summary.receivableOutstanding)}</div><div className="stat-label">Công nợ phải thu</div></div></div>
                <div className="stat-card"><div className="stat-icon">💸</div><div><div className="stat-value" style={{ color: 'var(--status-warning)' }}>{fmtVND(summary.totalExpensePaid)}</div><div className="stat-label">Đã chi (DA+CT)</div></div></div>
                <div className="stat-card"><div className="stat-icon">📉</div><div><div className="stat-value" style={{ color: 'var(--status-warning)' }}>{fmtVND(summary.payableOutstanding)}</div><div className="stat-label">Công nợ nhà thầu</div></div></div>
                <div className="stat-card"><div className="stat-icon">💵</div><div><div className="stat-value" style={{ color: (summary.netCashflow || 0) >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>{fmtVND(summary.netCashflow)}</div><div className="stat-label">Dòng tiền ròng</div></div></div>
            </div>

            {/* Quick Entry Bar */}
            <div style={{ display: 'flex', gap: 8, margin: '16px 0', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {QUICK_ENTRY_TYPES.map(t => (
                    <button key={t} className={`btn ${quickType === t ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                        onClick={() => setQuickType(quickType === t ? null : t)}>
                        {t === 'Thu tiền' ? '+ Thu tiền' : t === 'Chi phí' ? '+ Chi phí' : '+ Giao dịch khác'}
                    </button>
                ))}
            </div>
            {quickType && (
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                        {quickType === 'Giao dịch khác' && (
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loại</label>
                                <select className="form-input" value={qForm.type} onChange={e => setQForm({ ...qForm, type: e.target.value })}>
                                    <option>Thu</option><option>Chi</option>
                                </select>
                            </div>
                        )}
                        <div>
                            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Mô tả *</label>
                            <input className="form-input" placeholder="Nội dung giao dịch" value={qForm.description} onChange={e => setQForm({ ...qForm, description: e.target.value })} />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Số tiền *</label>
                            <input className="form-input" type="number" placeholder="0" value={qForm.amount} onChange={e => setQForm({ ...qForm, amount: e.target.value })} />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Danh mục</label>
                            <input className="form-input" placeholder="VD: Vật tư, Lương..." value={qForm.category} onChange={e => setQForm({ ...qForm, category: e.target.value })} />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ngày</label>
                            <input className="form-input" type="date" value={qForm.date} onChange={e => setQForm({ ...qForm, date: e.target.value })} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setQuickType(null)}>Hủy</button>
                        <button className="btn btn-primary btn-sm" onClick={saveQuickEntry} disabled={saving}>
                            {saving ? 'Đang lưu...' : 'Lưu'}
                        </button>
                    </div>
                </div>
            )}

            {/* Tab Bar */}
            <div className="card">
                <div className="card-header">
                    <div className="tab-bar">
                        {TABS.map(t => (
                            <button key={t.key} className={`tab-item ${activeTab === t.key ? 'active' : ''}`}
                                onClick={() => handleTabChange(t.key)}>{t.label}</button>
                        ))}
                    </div>
                </div>
                <div className="card-body" style={{ padding: activeTab === 'thu_tien' || activeTab === 'chi_phi' ? 0 : undefined }}>
                    {loading && activeTab === 'overview' ? (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
                    ) : (
                        <>
                            {activeTab === 'overview' && <OverviewTab summary={summary} upcomingPayments={upcomingPayments} transactions={transactions?.data || []} />}
                            {activeTab === 'thu_tien' && <div style={{ padding: 20 }}><ReceivablesTab /></div>}
                            {activeTab === 'chi_phi' && <div style={{ padding: 20 }}><ExpensesTab /></div>}
                            {activeTab === 'dong_tien' && <CashflowTab cashflow={cashflow} transactions={transactions?.data || []} onAddTx={() => setQuickType('Giao dịch khác')} />}
                            {activeTab === 'cong_no' && <DebtTab summary={summary} retentions={retentions} supplierDebt={supplierDebt} />}
                            {activeTab === 'bao_cao' && <ReportTab cashflow={cashflow} />}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Build để verify không lỗi**

```bash
npm run build 2>&1 | grep -E "error|Error|✓" | tail -5
```

Expected: Build thành công (các tab file chưa có nên sẽ có lỗi — OK, sẽ tạo trong task tiếp theo)

- [ ] **Step 4: Commit**

```bash
git add app/finance/page.js
git commit -m "refactor(finance): rewrite shell page.js + Quick Entry bar"
```

---

## Task 4: OverviewTab

**Files:**
- Create: `app/finance/tabs/OverviewTab.js`

Props nhận: `{ summary, upcomingPayments, transactions }`
- `summary`: object từ `/api/finance` (xem Task 2)
- `upcomingPayments`: array `ContractPayment` có `dueDate <= 7 ngày tới`, include `contract.project.name`
- `transactions`: array `Transaction` 10 gần nhất

- [ ] **Step 1: Tạo `app/finance/tabs/OverviewTab.js`**

```javascript
'use client';
import { fmtVND, fmtDate, daysOverdue } from '@/lib/financeUtils';

export default function OverviewTab({ summary, upcomingPayments, transactions }) {
    const overduePayments = (upcomingPayments || []).filter(p => daysOverdue(p.dueDate) > 7);
    const upcoming = (upcomingPayments || []).filter(p => daysOverdue(p.dueDate) <= 7);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Cảnh báo quá hạn */}
            {overduePayments.length > 0 && (
                <div style={{ background: 'var(--status-danger-bg, #fff0f0)', border: '1px solid var(--status-danger)', borderRadius: 8, padding: '12px 16px', color: 'var(--status-danger)' }}>
                    ⚠️ <strong>{overduePayments.length} đợt thu quá hạn hơn 7 ngày</strong> — tổng {fmtVND(overduePayments.reduce((s, p) => s + (p.amount - p.paidAmount), 0))}
                </div>
            )}

            {/* 4 stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                {[
                    { label: 'Tiền mặt ròng', val: summary.netCashflow, color: (summary.netCashflow || 0) >= 0 ? 'var(--status-success)' : 'var(--status-danger)' },
                    { label: 'Thu tháng này', val: summary.manualIncome, color: 'var(--status-success)' },
                    { label: 'Chi tháng này', val: summary.totalExpensePaid, color: 'var(--status-danger)' },
                    { label: 'Công nợ chưa thu', val: summary.receivableOutstanding, color: 'var(--status-warning)' },
                ].map(({ label, val, color }) => (
                    <div key={label} className="stat-card">
                        <div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                            <div style={{ fontSize: 20, fontWeight: 700, color }}>{fmtVND(val)}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Cần thu tuần này */}
            <div className="card" style={{ border: '1px solid var(--border)', padding: 16 }}>
                <div className="card-header" style={{ marginBottom: 12 }}>
                    <span className="card-title">📅 Cần thu trong 7 ngày tới</span>
                    <span className="badge warning">{upcoming.length} đợt</span>
                </div>
                {upcoming.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>Không có đợt thu sắp đến hạn</div>
                ) : (
                    <table className="data-table" style={{ margin: 0 }}>
                        <thead>
                            <tr><th>Dự án</th><th>Đợt</th><th>Số tiền</th><th>Đến hạn</th><th>Trạng thái</th></tr>
                        </thead>
                        <tbody>
                            {upcoming.map(p => (
                                <tr key={p.id}>
                                    <td style={{ fontWeight: 600 }}>{p.contract?.project?.name || '—'}</td>
                                    <td>{p.phase}</td>
                                    <td style={{ fontWeight: 700, color: 'var(--status-warning)' }}>{fmtVND(p.amount - (p.paidAmount || 0))}</td>
                                    <td style={{ color: daysOverdue(p.dueDate) > 0 ? 'var(--status-danger)' : 'var(--text-primary)' }}>{fmtDate(p.dueDate)}</td>
                                    <td><span className={`badge ${p.status === 'Đã thu' ? 'success' : daysOverdue(p.dueDate) > 0 ? 'danger' : 'warning'}`}>{p.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Giao dịch gần đây */}
            <div className="card" style={{ border: '1px solid var(--border)', padding: 16 }}>
                <div className="card-header" style={{ marginBottom: 12 }}>
                    <span className="card-title">💳 Giao dịch gần đây</span>
                </div>
                {transactions.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>Chưa có giao dịch</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {transactions.slice(0, 10).map(t => (
                            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 500 }}>{t.description}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(t.date)} · {t.category || 'Chưa phân loại'}</div>
                                </div>
                                <div style={{ fontWeight: 700, color: t.type === 'Thu' ? 'var(--status-success)' : 'var(--status-danger)', flexShrink: 0, marginLeft: 16 }}>
                                    {t.type === 'Thu' ? '+' : '-'}{fmtVND(t.amount)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Build verify**

```bash
npm run build 2>&1 | grep -E "OverviewTab|error" | head -10
```

Expected: Không có lỗi liên quan OverviewTab

- [ ] **Step 3: Commit**

```bash
git add app/finance/tabs/OverviewTab.js
git commit -m "feat(finance): OverviewTab — daily dashboard, cảnh báo quá hạn, cần thu tuần này"
```

---

## Task 5: CashflowTab

**Files:**
- Create: `app/finance/tabs/CashflowTab.js`

Props: `{ cashflow, transactions, onAddTx }`
- `cashflow`: object từ `/api/finance/cashflow` — có `totals: {inflow, outflow, net}` và `months: [{key, label, inflow, outflow, net, runningBalance}]`
- `transactions`: array Transaction
- `onAddTx`: callback để mở Quick Entry bar từ parent

- [ ] **Step 1: Tạo `app/finance/tabs/CashflowTab.js`**

```javascript
'use client';
import { useState } from 'react';
import { fmtVND, fmtDate } from '@/lib/financeUtils';

export default function CashflowTab({ cashflow, transactions, onAddTx }) {
    const [filterType, setFilterType] = useState('');

    if (!cashflow) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;

    const months = cashflow.months || [];
    const totals = cashflow.totals || {};
    const runningBalance = months.length > 0 ? months[months.length - 1].runningBalance : 0;

    // SVG chart (12 tháng gần nhất)
    const chartMonths = months.slice(-12);
    const maxVal = Math.max(...chartMonths.map(m => Math.max(m.inflow || 0, m.outflow || 0)), 1);
    const W = 760, H = 160, pad = { l: 8, r: 8, t: 12, b: 28 };
    const bw = (W - pad.l - pad.r) / Math.max(chartMonths.length, 1);
    const barW = Math.max(8, bw * 0.35);
    const yScale = v => pad.t + (H - pad.t - pad.b) * (1 - v / maxVal);
    const fmtShort = v => v >= 1e9 ? `${(v / 1e9).toFixed(1)}tỷ` : v >= 1e6 ? `${(v / 1e6).toFixed(0)}tr` : v > 0 ? `${(v / 1e3).toFixed(0)}k` : '';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                {[
                    { label: 'Số dư hiện tại', val: runningBalance, color: runningBalance >= 0 ? 'var(--status-success)' : 'var(--status-danger)' },
                    { label: 'Tổng thu', val: totals.inflow, color: 'var(--status-success)' },
                    { label: 'Tổng chi', val: totals.outflow, color: 'var(--status-danger)' },
                    { label: 'Dòng tiền ròng', val: totals.net, color: (totals.net || 0) >= 0 ? 'var(--status-success)' : 'var(--status-danger)' },
                ].map(({ label, val, color }) => (
                    <div key={label} className="stat-card">
                        <div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color }}>{fmtVND(val)}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Biểu đồ SVG */}
            {chartMonths.length > 0 && (
                <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 4px 4px', overflowX: 'auto' }}>
                    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}>
                        {[0.25, 0.5, 0.75, 1].map(f => (
                            <line key={f} x1={pad.l} x2={W - pad.r} y1={yScale(maxVal * f)} y2={yScale(maxVal * f)} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="4,4" />
                        ))}
                        {chartMonths.map((m, i) => {
                            const cx = pad.l + bw * i + bw / 2;
                            const iy = yScale(m.inflow || 0), oy = yScale(m.outflow || 0);
                            const baseY = H - pad.b;
                            return (
                                <g key={m.key}>
                                    <rect x={cx - barW - 1} y={iy} width={barW} height={Math.max(2, baseY - iy)} fill="var(--status-success)" opacity="0.85" rx="2" />
                                    <rect x={cx + 1} y={oy} width={barW} height={Math.max(2, baseY - oy)} fill="var(--status-danger)" opacity="0.75" rx="2" />
                                    <text x={cx} y={H - 8} textAnchor="middle" fontSize="9" fill="var(--text-muted)">{m.label}</text>
                                    {(m.inflow || 0) > 0 && <text x={cx - barW / 2 - 1} y={iy - 3} textAnchor="middle" fontSize="7" fill="var(--status-success)">{fmtShort(m.inflow)}</text>}
                                </g>
                            );
                        })}
                    </svg>
                    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                        <span><span style={{ color: 'var(--status-success)', fontWeight: 700 }}>▋</span> Thu vào</span>
                        <span><span style={{ color: 'var(--status-danger)', fontWeight: 700 }}>▋</span> Chi ra</span>
                    </div>
                </div>
            )}

            {/* Bảng tháng */}
            <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ margin: 0 }}>
                    <thead><tr><th>Tháng</th><th style={{ textAlign: 'right' }}>Thu vào</th><th style={{ textAlign: 'right' }}>Chi ra</th><th style={{ textAlign: 'right' }}>Ròng</th><th style={{ textAlign: 'right' }}>Luỹ kế</th></tr></thead>
                    <tbody>
                        {months.length === 0 ? (
                            <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>Chưa có dữ liệu</td></tr>
                        ) : months.map(m => (
                            <tr key={m.key}>
                                <td style={{ fontWeight: 600 }}>{m.label}</td>
                                <td style={{ textAlign: 'right', color: 'var(--status-success)', fontWeight: 600 }}>{fmtVND(m.inflow)}</td>
                                <td style={{ textAlign: 'right', color: 'var(--status-danger)' }}>{fmtVND(m.outflow)}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700, color: (m.net || 0) >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>{fmtVND(m.net)}</td>
                                <td style={{ textAlign: 'right', color: (m.runningBalance || 0) >= 0 ? 'var(--primary)' : 'var(--status-danger)' }}>{fmtVND(m.runningBalance)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Thu chi khác */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600 }}>💳 Thu chi thủ công</h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <select className="form-input" style={{ width: 120 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                            <option value="">Tất cả</option><option>Thu</option><option>Chi</option>
                        </select>
                        <button className="btn btn-primary btn-sm" onClick={onAddTx}>+ Thêm</button>
                    </div>
                </div>
                <table className="data-table" style={{ margin: 0 }}>
                    <thead><tr><th>Mã GD</th><th>Loại</th><th>Mô tả</th><th>Số tiền</th><th>Danh mục</th><th>Dự án</th><th>Ngày</th></tr></thead>
                    <tbody>
                        {transactions.filter(t => !filterType || t.type === filterType).length === 0 ? (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Chưa có giao dịch</td></tr>
                        ) : transactions.filter(t => !filterType || t.type === filterType).map(t => (
                            <tr key={t.id}>
                                <td className="accent">{t.code}</td>
                                <td><span className={`badge ${t.type === 'Thu' ? 'success' : 'danger'}`}>{t.type}</span></td>
                                <td>{t.description}</td>
                                <td style={{ fontWeight: 600, color: t.type === 'Thu' ? 'var(--status-success)' : 'var(--status-danger)' }}>{t.type === 'Thu' ? '+' : '-'}{fmtVND(t.amount)}</td>
                                <td><span className="badge muted">{t.category || '—'}</span></td>
                                <td>{t.project?.name || '—'}</td>
                                <td>{fmtDate(t.date)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Build verify**

```bash
npm run build 2>&1 | grep -E "CashflowTab|error" | head -5
```

- [ ] **Step 3: Commit**

```bash
git add app/finance/tabs/CashflowTab.js
git commit -m "feat(finance): CashflowTab — biểu đồ SVG, số dư hiện tại, bảng tháng"
```

---

## Task 6: DebtTab — Công nợ 3 section

**Files:**
- Create: `app/finance/tabs/DebtTab.js`

Props: `{ summary, retentions, supplierDebt }`
- `summary`: object từ `/api/finance` (totalReceivable, totalReceived, totalPayable, totalPaid)
- `retentions`: array `ContractorPayment` có `retentionAmount > 0` và `retentionReleased = false`
- `supplierDebt`: array `PurchaseOrder` có `paidAmount < totalAmount`, từ API mở rộng Task 2

- [ ] **Step 1: Tạo `app/finance/tabs/DebtTab.js`**

```javascript
'use client';
import { fmtVND, fmtDate, daysOverdue } from '@/lib/financeUtils';

export default function DebtTab({ summary, retentions, supplierDebt }) {
    const totalSupplierDebt = (supplierDebt || []).reduce((s, po) => s + (po.totalAmount - (po.paidAmount || 0)), 0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                <div className="stat-card"><div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Phải thu KH</div><div style={{ fontSize: 18, fontWeight: 700, color: 'var(--status-danger)' }}>{fmtVND(summary.receivableOutstanding)}</div></div></div>
                <div className="stat-card"><div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Phải trả NT</div><div style={{ fontSize: 18, fontWeight: 700, color: 'var(--status-warning)' }}>{fmtVND(summary.payableOutstanding)}</div></div></div>
                <div className="stat-card"><div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Nợ nhà CC</div><div style={{ fontSize: 18, fontWeight: 700, color: 'var(--status-warning)' }}>{fmtVND(totalSupplierDebt)}</div></div></div>
                <div className="stat-card"><div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Giữ lại BH</div><div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{fmtVND((retentions || []).reduce((s, r) => s + (r.retentionAmount || 0), 0))}</div></div></div>
            </div>

            {/* Section A: Khách hàng chưa trả */}
            <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>📈 A. Khách hàng chưa thanh toán</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div className="card" style={{ border: '1px solid var(--border)', padding: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span>Tổng phải thu</span><span style={{ fontWeight: 700 }}>{fmtVND(summary.totalReceivable)}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span>Đã thu</span><span style={{ fontWeight: 700, color: 'var(--status-success)' }}>{fmtVND(summary.totalReceived)}</span></div>
                        <div className="progress-bar" style={{ height: 6 }}><div className="progress-fill" style={{ width: `${summary.totalReceivable > 0 ? Math.round((summary.totalReceived || 0) / summary.totalReceivable * 100) : 0}%` }}></div></div>
                        <div style={{ marginTop: 8, fontWeight: 700, color: 'var(--status-danger)', display: 'flex', justifyContent: 'space-between' }}><span>Còn phải thu</span><span>{fmtVND(summary.receivableOutstanding)}</span></div>
                    </div>
                    <div className="card" style={{ border: '1px solid var(--border)', padding: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span>Tổng phải trả NT</span><span style={{ fontWeight: 700 }}>{fmtVND(summary.totalPayable)}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span>Đã trả</span><span style={{ fontWeight: 700, color: 'var(--status-success)' }}>{fmtVND(summary.totalPaid)}</span></div>
                        <div className="progress-bar" style={{ height: 6 }}><div className="progress-fill" style={{ width: `${summary.totalPayable > 0 ? Math.round((summary.totalPaid || 0) / summary.totalPayable * 100) : 0}%`, background: 'var(--status-warning)' }}></div></div>
                        <div style={{ marginTop: 8, fontWeight: 700, color: 'var(--status-warning)', display: 'flex', justifyContent: 'space-between' }}><span>Còn phải trả</span><span>{fmtVND(summary.payableOutstanding)}</span></div>
                    </div>
                </div>
            </div>

            {/* Section B: Giữ lại bảo hành */}
            <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>🔒 B. Giữ lại bảo hành (nhà thầu)</h3>
                {(retentions || []).length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Không có khoản giữ lại bảo hành</div>
                ) : (
                    <table className="data-table" style={{ margin: 0 }}>
                        <thead><tr><th>Nhà thầu</th><th>Dự án</th><th>Giai đoạn</th><th>HĐ NT</th><th>% Giữ lại</th><th>Số tiền GLL</th></tr></thead>
                        <tbody>{retentions.map(p => (
                            <tr key={p.id}>
                                <td style={{ fontWeight: 600 }}>{p.contractor?.name || '—'}</td>
                                <td>{p.project?.name || '—'}</td>
                                <td>{p.phase || '—'}</td>
                                <td style={{ textAlign: 'right' }}>{fmtVND(p.contractAmount)}</td>
                                <td style={{ textAlign: 'center' }}>{p.retentionRate}%</td>
                                <td style={{ fontWeight: 700, color: 'var(--status-warning)', textAlign: 'right' }}>{fmtVND(p.retentionAmount)}</td>
                            </tr>
                        ))}</tbody>
                        <tfoot><tr style={{ background: 'var(--bg-hover)', fontWeight: 700 }}>
                            <td colSpan={5}>Tổng giữ lại</td>
                            <td style={{ color: 'var(--status-warning)', textAlign: 'right' }}>{fmtVND(retentions.reduce((s, p) => s + (p.retentionAmount || 0), 0))}</td>
                        </tr></tfoot>
                    </table>
                )}
            </div>

            {/* Section C: Nhà cung cấp chưa thanh toán */}
            <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>🏪 C. Nhà cung cấp chưa thanh toán</h3>
                {(supplierDebt || []).length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Không có nợ nhà cung cấp</div>
                ) : (
                    <table className="data-table" style={{ margin: 0 }}>
                        <thead><tr><th>Mã PO</th><th>Nhà CC</th><th>Dự án</th><th>Tổng PO</th><th>Đã trả</th><th>Còn lại</th><th>Ngày đặt</th></tr></thead>
                        <tbody>{supplierDebt.map(po => (
                            <tr key={po.id}>
                                <td className="accent">{po.code}</td>
                                <td style={{ fontWeight: 600 }}>{po.supplierRel?.name || po.supplier || '—'}</td>
                                <td>{po.project?.name || '—'}</td>
                                <td style={{ textAlign: 'right' }}>{fmtVND(po.totalAmount)}</td>
                                <td style={{ textAlign: 'right', color: 'var(--status-success)' }}>{fmtVND(po.paidAmount)}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--status-warning)' }}>{fmtVND(po.totalAmount - (po.paidAmount || 0))}</td>
                                <td>{fmtDate(po.orderDate)}</td>
                            </tr>
                        ))}</tbody>
                        <tfoot><tr style={{ background: 'var(--bg-hover)', fontWeight: 700 }}>
                            <td colSpan={5}>Tổng còn nợ NCC</td>
                            <td style={{ color: 'var(--status-warning)', textAlign: 'right' }}>{fmtVND(totalSupplierDebt)}</td>
                            <td></td>
                        </tr></tfoot>
                    </table>
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Build verify**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add app/finance/tabs/DebtTab.js
git commit -m "feat(finance): DebtTab — công nợ 3 chiều: KH + NT giữ lại + NCC"
```

---

## Task 7: ReportTab

**Files:**
- Create: `app/finance/tabs/ReportTab.js`

Props: `{ cashflow }` — object từ `/api/finance/cashflow`

- [ ] **Step 1: Tạo `app/finance/tabs/ReportTab.js`**

```javascript
'use client';
import { fmtVND } from '@/lib/financeUtils';

export default function ReportTab({ cashflow }) {
    if (!cashflow) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>;

    const months = cashflow.months || [];
    const totalInflow = months.reduce((s, m) => s + (m.inflow || 0), 0);
    const totalOutflow = months.reduce((s, m) => s + (m.outflow || 0), 0);
    const totalNet = months.reduce((s, m) => s + (m.net || 0), 0);

    return (
        <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ margin: 0 }}>
                <thead>
                    <tr>
                        <th>Tháng</th>
                        <th style={{ textAlign: 'right', color: 'var(--status-success)' }}>Tổng thu</th>
                        <th style={{ textAlign: 'right', color: 'var(--status-danger)' }}>Tổng chi</th>
                        <th style={{ textAlign: 'right', fontWeight: 700 }}>Ròng tháng</th>
                        <th style={{ textAlign: 'right' }}>Số dư tích luỹ</th>
                    </tr>
                </thead>
                <tbody>
                    {months.length === 0 ? (
                        <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>Chưa có dữ liệu</td></tr>
                    ) : months.map(m => (
                        <tr key={m.key}>
                            <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{m.label}</td>
                            <td style={{ textAlign: 'right', color: 'var(--status-success)', fontWeight: 600 }}>{fmtVND(m.inflow)}</td>
                            <td style={{ textAlign: 'right', color: 'var(--status-danger)' }}>{fmtVND(m.outflow)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: (m.net || 0) >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>
                                {(m.net || 0) >= 0 ? '+' : ''}{fmtVND(m.net)}
                            </td>
                            <td style={{ textAlign: 'right', color: (m.runningBalance || 0) >= 0 ? 'var(--text-primary)' : 'var(--status-danger)' }}>
                                {fmtVND(m.runningBalance)}
                            </td>
                        </tr>
                    ))}
                </tbody>
                {months.length > 0 && (
                    <tfoot>
                        <tr style={{ background: 'var(--bg-hover)', fontWeight: 700 }}>
                            <td>Tổng cộng</td>
                            <td style={{ textAlign: 'right', color: 'var(--status-success)' }}>{fmtVND(totalInflow)}</td>
                            <td style={{ textAlign: 'right', color: 'var(--status-danger)' }}>{fmtVND(totalOutflow)}</td>
                            <td style={{ textAlign: 'right', color: totalNet >= 0 ? 'var(--status-success)' : 'var(--status-danger)' }}>
                                {totalNet >= 0 ? '+' : ''}{fmtVND(totalNet)}
                            </td>
                            <td></td>
                        </tr>
                    </tfoot>
                )}
            </table>
        </div>
    );
}
```

- [ ] **Step 2: Build toàn bộ — verify clean**

```bash
npm run build 2>&1 | tail -10
```

Expected: `✓ Compiled successfully`, không có error

- [ ] **Step 3: Chạy tests**

```bash
npm test 2>&1 | tail -8
```

Expected: 41+ tests pass (7 pre-existing failures không liên quan)

- [ ] **Step 4: Commit**

```bash
git add app/finance/tabs/ReportTab.js
git commit -m "feat(finance): ReportTab — báo cáo tháng sạch"
```

---

## Task 8: Dọn dẹp và push

- [ ] **Step 1: Verify page.js dưới 120 dòng**

```bash
wc -l app/finance/page.js
```

Expected: < 120

- [ ] **Step 2: Verify không còn raw `fetch` trong các file mới**

```bash
grep -rn "fetch(" app/finance/ | grep -v "apiFetch\|node_modules"
```

Expected: Không có kết quả (tất cả đã dùng `apiFetch`)

- [ ] **Step 3: Chạy build lần cuối**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ Compiled successfully`

- [ ] **Step 4: Push lên branch**

```bash
git push origin feature/finance-redesign
```

---

## Checklist Spec

| Yêu cầu spec | Task |
|---|---|
| `page.js` dưới 120 dòng | Task 3, Task 8 |
| Quick Entry bar hoạt động 3 loại | Task 3 |
| Tab Tổng quan: 4 số + cảnh báo + cần thu tuần này | Task 4 |
| Tab Công nợ: 3 section (AR + NT + NCC) | Task 6 |
| Tab Dòng tiền: số dư hiện tại | Task 5 |
| Không lỗi console | Task 8 |
| API trả upcomingPayments + supplierDebt | Task 2 |
