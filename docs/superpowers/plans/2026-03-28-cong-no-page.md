# Trang Công nợ (/cong-no) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tạo trang Công nợ riêng tại `/cong-no` với master-detail layout (danh sách NCC/thầu phụ bên trái, sổ cái chi tiết bên phải) và trang báo cáo kỳ tại `/cong-no/bao-cao`.

**Architecture:** 3 UI files mới (`app/cong-no/page.js`, `app/cong-no/bao-cao/page.js`, cập nhật `components/Sidebar.js` và `components/Header.js`) + 1 API mới (`app/api/debt/contractors/[id]/ledger/route.js`). Tất cả APIs khác đã có sẵn. Frontend self-fetch với `apiFetch`, CSS từ `app/globals.css`.

**Tech Stack:** Next.js 16 App Router, React 19, `apiFetch` từ `@/lib/fetchClient`, `fmtVND`/`fmtDate` từ `@/lib/financeUtils`, Lucide icons, Prisma 6.

---

## File Structure

| File | Action | Mục đích |
|------|--------|----------|
| `components/Sidebar.js` | Modify | Thêm mục "Công nợ" với icon Landmark sau /budget |
| `components/Header.js` | Modify | Thêm page titles cho /cong-no và /cong-no/bao-cao |
| `app/api/debt/contractors/[id]/ledger/route.js` | Create | Per-contractor chronological ledger API |
| `app/cong-no/page.js` | Create | Trang master-detail chính |
| `app/cong-no/bao-cao/page.js` | Create | Trang báo cáo công nợ theo kỳ |

---

## Task 1: Navigation — Sidebar + Header

**Files:**
- Modify: `components/Sidebar.js` (lines 6-14 imports, lines 48-53 Tài chính section)
- Modify: `components/Header.js` (lines 8-27 pageTitles)

### Context

`components/Sidebar.js` hiện tại có section Tài chính:
```javascript
{ href: '/finance', icon: Wallet, label: 'Tổng quan', roles: [...] },
{ href: '/accounting', icon: BookOpen, label: 'Sổ cái', roles: [...] },
{ href: '/cashflow-forecast', icon: Banknote, label: 'Dự báo dòng tiền', roles: [...] },
{ href: '/budget', icon: PiggyBank, label: 'Ngân sách', roles: [...] },
```

Import hiện tại từ lucide-react (dòng 6-14) chưa có `Landmark`.

`components/Header.js` có object `pageTitles` (dòng 8-27) chưa có `/cong-no`.

- [ ] **Step 1: Thêm Landmark vào Sidebar imports**

Trong `components/Sidebar.js`, sửa dòng imports lucide-react. Tìm dòng:
```javascript
    CheckCircle, BookOpen, HardHat, PiggyBank, CalendarDays
```
Thay bằng:
```javascript
    CheckCircle, BookOpen, HardHat, PiggyBank, CalendarDays, Landmark
```

- [ ] **Step 2: Thêm menu item Công nợ**

Trong `components/Sidebar.js`, tìm khối section Tài chính. Tìm dòng:
```javascript
            { href: '/budget', icon: PiggyBank, label: 'Ngân sách', roles: ['giam_doc', 'pho_gd', 'ke_toan', 'quan_ly_du_an'] },
```
Thêm sau dòng đó:
```javascript
            { href: '/cong-no', icon: Landmark, label: 'Công nợ', roles: ['giam_doc', 'pho_gd', 'ke_toan'] },
```

- [ ] **Step 3: Thêm page titles vào Header**

Trong `components/Header.js`, tìm dòng:
```javascript
    '/hr/payroll': 'Bảng lương',
```
Thêm sau dòng đó (trước dấu `}`):
```javascript
    '/cong-no': 'Công nợ',
    '/cong-no/bao-cao': 'Báo cáo công nợ',
```

- [ ] **Step 4: Kiểm tra build**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | tail -20
```

Expected: Build thành công, không có lỗi liên quan đến Sidebar hoặc Header.

- [ ] **Step 5: Commit**

```bash
cd d:/Codeapp/motnha
git add components/Sidebar.js components/Header.js
git commit -m "feat(nav): add Công nợ link to sidebar with Landmark icon"
```

---

## Task 2: Contractor Ledger API

**Files:**
- Create: `app/api/debt/contractors/[id]/ledger/route.js`

### Context

API này tương tự `app/api/debt/ncc/[id]/ledger/route.js` nhưng cho thầu phụ.

Debt events đến từ `ContractorPayment` (quyết toán theo đợt). Payment events từ `ContractorPaymentLog`. Có thêm loại "Giải phóng BH" khi `retentionReleased = true`.

`ContractorPayment` fields: `id`, `contractorId`, `projectId`, `contractAmount`, `retentionAmount`, `retentionReleased`, `createdAt`, `updatedAt`, relation `project`.

`ContractorPaymentLog` fields: `id`, `code`, `contractorId`, `projectId`, `amount`, `date`, `notes`, relation `project`.

Response shape:
```json
{
  "contractor": { "id", "code", "name", "openingBalance" },
  "entries": [
    { "id", "date", "type", "ref", "description", "projectName", "debit", "credit", "balance" }
  ],
  "summary": { "openingBalance", "totalDebit", "totalCredit", "giuLai", "closingBalance" }
}
```

`type` values: `"debt"` (quyết toán phase), `"payment"` (thanh toán log), `"retention"` (giải phóng BH).

- [ ] **Step 1: Tạo thư mục và file**

```bash
mkdir -p d:/Codeapp/motnha/app/api/debt/contractors/\[id\]
```

Tạo file `app/api/debt/contractors/[id]/ledger/route.js`:

```javascript
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withAuth } from '@/lib/apiHandler';

export const GET = withAuth(async (request, context, session) => {
    const { id } = await context.params;

    const contractor = await prisma.contractor.findUnique({
        where: { id },
        select: { id: true, code: true, name: true, openingBalance: true },
    });

    if (!contractor) {
        return NextResponse.json({ error: 'Không tìm thấy nhà thầu' }, { status: 404 });
    }

    // Debt events: ContractorPayment phases (quyết toán)
    const phases = await prisma.contractorPayment.findMany({
        where: { contractorId: id },
        include: { project: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
    });

    // Payment events: ContractorPaymentLog
    const paymentLogs = await prisma.contractorPaymentLog.findMany({
        where: { contractorId: id },
        include: { project: { select: { name: true } } },
        orderBy: { date: 'asc' },
    });

    // Build debt entries from phases (contractAmount - retentionAmount = net payable)
    const debtEntries = phases.map((phase) => ({
        id: `phase-${phase.id}`,
        date: phase.createdAt,
        type: 'debt',
        ref: `QT-${phase.id.slice(0, 6)}`,
        description: 'Quyết toán',
        projectName: phase.project?.name || '—',
        debit: phase.contractAmount - phase.retentionAmount,
        credit: 0,
    }));

    // Retention release entries (only for phases where retention was released)
    const retentionEntries = phases
        .filter((phase) => phase.retentionReleased && phase.retentionAmount > 0)
        .map((phase) => ({
            id: `retention-${phase.id}`,
            date: phase.updatedAt,
            type: 'retention',
            ref: `BH-${phase.id.slice(0, 6)}`,
            description: 'Giải phóng BH',
            projectName: phase.project?.name || '—',
            debit: 0,
            credit: phase.retentionAmount,
        }));

    // Payment entries
    const paymentEntries = paymentLogs.map((log) => ({
        id: `pay-${log.id}`,
        date: log.date,
        type: 'payment',
        ref: log.code,
        description: log.notes || 'Thanh toán',
        projectName: log.project?.name || '—',
        debit: 0,
        credit: log.amount,
    }));

    // Merge and sort by date ascending
    const merged = [...debtEntries, ...retentionEntries, ...paymentEntries].sort(
        (a, b) => new Date(a.date) - new Date(b.date)
    );

    // Running balance starting from openingBalance
    let balance = contractor.openingBalance;
    const entries = merged.map((entry) => {
        balance += entry.debit - entry.credit;
        return { ...entry, balance };
    });

    const totalDebit = entries.reduce((acc, e) => acc + e.debit, 0);
    const totalCredit = entries.reduce((acc, e) => acc + e.credit, 0);
    // giuLai = retention not yet released
    const giuLai = phases.reduce(
        (acc, p) => acc + (p.retentionReleased ? 0 : p.retentionAmount),
        0
    );
    const closingBalance = contractor.openingBalance + totalDebit - totalCredit;

    return NextResponse.json({
        contractor,
        entries,
        summary: {
            openingBalance: contractor.openingBalance,
            totalDebit,
            totalCredit,
            giuLai,
            closingBalance,
        },
    });
});
```

- [ ] **Step 2: Kiểm tra build**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | tail -20
```

Expected: Build thành công.

- [ ] **Step 3: Commit**

```bash
cd d:/Codeapp/motnha
git add app/api/debt/contractors/
git commit -m "feat(api): add contractor ledger endpoint GET /api/debt/contractors/[id]/ledger"
```

---

## Task 3: Trang `/cong-no` — Master-Detail

**Files:**
- Create: `app/cong-no/page.js`

### Context

**APIs đã có:**
- `GET /api/debt/ncc` → `{ suppliers: [{ id, code, name, openingBalance, phatSinh, daTra, soDu, payments }], totalSoDu }`
- `GET /api/debt/contractors` → `{ contractors: [{ id, code, name, openingBalance, phatSinh, giuLai, daTra, soDu, byProject, payments }], totalSoDu, totalGiuLai }`
- `GET /api/debt/ncc/[id]/ledger` → `{ supplier, entries: [{ id, date, type, ref, description, projectName, debit, credit, balance }], summary: { openingBalance, totalDebit, totalCredit, closingBalance } }`
- `GET /api/debt/contractors/[id]/ledger` → same shape + `summary.giuLai`
- `POST /api/debt/ncc` body: `{ supplierId, amount, date, notes }` → ghi nhận thanh toán NCC
- `POST /api/debt/contractors` body: `{ contractorId, amount, date, notes, projectId? }` → ghi nhận thanh toán thầu phụ
- `PATCH /api/debt/ncc` body: `{ supplierId, openingBalance }` → sửa đầu kỳ NCC
- `PATCH /api/debt/contractors` body: `{ contractorId, openingBalance }` → sửa đầu kỳ thầu phụ
- `GET /api/projects?limit=200` → `{ data: [{ id, name }] }` — dùng cho select dự án trong modal thanh toán thầu phụ

**CSS classes dùng:** `.tabs`, `.tab`, `.card`, `.card-header`, `.card-body`, `.stats-grid`, `.stat-card`, `.stat-value`, `.stat-label`, `.data-table`, `.table-container`, `.badge`, `.badge-warning`, `.badge-success`, `.form-input`, `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-sm`, `.modal-overlay`, `.modal`, `.modal-header`, `.modal-title`, `.modal-close`, `.modal-body`, `.modal-footer`

**CSS variables dùng:** `var(--bg-primary)`, `var(--bg-secondary)`, `var(--text-primary)`, `var(--text-muted)`, `var(--border)`, `var(--primary)`, `var(--status-danger)`, `var(--status-success)`, `var(--status-warning)`

- [ ] **Step 1: Tạo `app/cong-no/page.js`**

```javascript
'use client';
import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { fmtVND, fmtDate } from '@/lib/financeUtils';

export default function CongNoPage() {
    const [activeTab, setActiveTab] = useState('ncc'); // 'ncc' | 'contractor'
    const [nccList, setNccList] = useState([]);
    const [contractorList, setContractorList] = useState([]);
    const [loadingList, setLoadingList] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('con_no'); // 'con_no' | 'tat_ca'

    const [selectedId, setSelectedId] = useState(null);
    const [selectedType, setSelectedType] = useState(null); // 'ncc' | 'contractor'
    const [ledger, setLedger] = useState(null);
    const [loadingLedger, setLoadingLedger] = useState(false);

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showOpeningModal, setShowOpeningModal] = useState(false);
    const [paymentForm, setPaymentForm] = useState({
        amount: '', date: new Date().toISOString().slice(0, 10), notes: '', projectId: '',
    });
    const [openingForm, setOpeningForm] = useState({ openingBalance: '' });
    const [saving, setSaving] = useState(false);
    const [projects, setProjects] = useState([]);

    const loadLists = useCallback(async () => {
        setLoadingList(true);
        try {
            const [nccRes, contractorRes] = await Promise.all([
                apiFetch('/api/debt/ncc'),
                apiFetch('/api/debt/contractors'),
            ]);
            setNccList(nccRes.suppliers || []);
            setContractorList(contractorRes.contractors || []);
        } catch (err) {
            console.error('Failed to load debt lists:', err);
        }
        setLoadingList(false);
    }, []);

    useEffect(() => { loadLists(); }, [loadLists]);

    const loadLedger = useCallback(async (id, type) => {
        setLoadingLedger(true);
        setLedger(null);
        try {
            const endpoint = type === 'ncc'
                ? `/api/debt/ncc/${id}/ledger`
                : `/api/debt/contractors/${id}/ledger`;
            const res = await apiFetch(endpoint);
            setLedger(res);
        } catch (err) {
            console.error('Failed to load ledger:', err);
        }
        setLoadingLedger(false);
    }, []);

    const handleSelect = (id, type) => {
        setSelectedId(id);
        setSelectedType(type);
        loadLedger(id, type);
    };

    // Load projects when contractor tab active (for payment modal)
    useEffect(() => {
        if (activeTab === 'contractor' && projects.length === 0) {
            apiFetch('/api/projects?limit=200')
                .then(res => setProjects(res.data || []))
                .catch(() => {});
        }
    }, [activeTab, projects.length]);

    const visibleNcc = nccList.filter(s => {
        const matchSearch = !search
            || s.name.toLowerCase().includes(search.toLowerCase())
            || (s.code || '').toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === 'tat_ca' || s.soDu > 0;
        return matchSearch && matchFilter;
    });

    const visibleContractors = contractorList.filter(c => {
        const matchSearch = !search
            || c.name.toLowerCase().includes(search.toLowerCase())
            || (c.code || '').toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === 'tat_ca' || c.soDu > 0;
        return matchSearch && matchFilter;
    });

    const selectedEntity = selectedType === 'ncc'
        ? nccList.find(s => s.id === selectedId)
        : contractorList.find(c => c.id === selectedId);

    const savePayment = async () => {
        if (!paymentForm.amount || !paymentForm.date) {
            alert('Nhập đủ số tiền và ngày!');
            return;
        }
        setSaving(true);
        try {
            const endpoint = selectedType === 'ncc' ? '/api/debt/ncc' : '/api/debt/contractors';
            const body = selectedType === 'ncc'
                ? { supplierId: selectedId, amount: Number(paymentForm.amount), date: paymentForm.date, notes: paymentForm.notes }
                : { contractorId: selectedId, amount: Number(paymentForm.amount), date: paymentForm.date, notes: paymentForm.notes, projectId: paymentForm.projectId || undefined };
            await apiFetch(endpoint, { method: 'POST', body });
            setShowPaymentModal(false);
            setPaymentForm({ amount: '', date: new Date().toISOString().slice(0, 10), notes: '', projectId: '' });
            await Promise.all([loadLedger(selectedId, selectedType), loadLists()]);
        } catch (err) {
            console.error('Failed to save payment:', err);
        }
        setSaving(false);
    };

    const saveOpening = async () => {
        setSaving(true);
        try {
            const endpoint = selectedType === 'ncc' ? '/api/debt/ncc' : '/api/debt/contractors';
            const body = selectedType === 'ncc'
                ? { supplierId: selectedId, openingBalance: Number(openingForm.openingBalance) }
                : { contractorId: selectedId, openingBalance: Number(openingForm.openingBalance) };
            await apiFetch(endpoint, { method: 'PATCH', body });
            setShowOpeningModal(false);
            await Promise.all([loadLedger(selectedId, selectedType), loadLists()]);
        } catch (err) {
            console.error('Failed to save opening balance:', err);
        }
        setSaving(false);
    };

    const statCols = selectedType === 'contractor' ? 5 : 4;

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 120px)', gap: 0, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>

            {/* ── Left panel ─────────────────────────────────────── */}
            <div style={{ width: 280, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>

                {/* Tab bar */}
                <div className="tabs" style={{ padding: '8px 12px 0', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                    <button
                        className={`tab ${activeTab === 'ncc' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('ncc'); setSearch(''); setSelectedId(null); setSelectedType(null); setLedger(null); }}
                    >
                        Nhà cung cấp
                    </button>
                    <button
                        className={`tab ${activeTab === 'contractor' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('contractor'); setSearch(''); setSelectedId(null); setSelectedType(null); setLedger(null); }}
                    >
                        Nhà thầu phụ
                    </button>
                </div>

                {/* Search + filter */}
                <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                    <input
                        className="form-input"
                        placeholder="Tìm tên / mã..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ fontSize: 13 }}
                    />
                    <select
                        className="form-input"
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        style={{ fontSize: 13 }}
                    >
                        <option value="con_no">Còn nợ</option>
                        <option value="tat_ca">Tất cả</option>
                    </select>
                </div>

                {/* Entity list */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {loadingList ? (
                        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                            Đang tải...
                        </div>
                    ) : (
                        (activeTab === 'ncc' ? visibleNcc : visibleContractors).map(item => (
                            <button
                                key={item.id}
                                onClick={() => handleSelect(item.id, activeTab)}
                                style={{
                                    width: '100%', display: 'flex', justifyContent: 'space-between',
                                    alignItems: 'center', padding: '10px 14px', border: 'none',
                                    background: selectedId === item.id ? 'var(--bg-primary)' : 'transparent',
                                    borderLeft: selectedId === item.id ? '3px solid var(--primary)' : '3px solid transparent',
                                    cursor: 'pointer', textAlign: 'left',
                                }}
                            >
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {item.name}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.code}</div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                                    <div style={{ fontWeight: 700, fontSize: 12, color: item.soDu > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>
                                        {item.soDu > 0 ? '🔴' : '✅'} {fmtVND(item.soDu)}
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                    {!loadingList && (activeTab === 'ncc' ? visibleNcc : visibleContractors).length === 0 && (
                        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                            Không có kết quả
                        </div>
                    )}
                </div>
            </div>

            {/* ── Right panel ────────────────────────────────────── */}
            <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-primary)' }}>
                {!selectedId ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 14 }}>
                        Chọn một nhà cung cấp hoặc nhà thầu để xem sổ cái
                    </div>
                ) : loadingLedger ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 14 }}>
                        Đang tải sổ cái...
                    </div>
                ) : ledger ? (
                    <div style={{ padding: 24 }}>

                        {/* Header row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: 18 }}>{selectedEntity?.name}</h2>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{selectedEntity?.code}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => {
                                        setOpeningForm({ openingBalance: selectedEntity?.openingBalance ?? 0 });
                                        setShowOpeningModal(true);
                                    }}
                                >
                                    ✎ Sửa đầu kỳ
                                </button>
                                <button className="btn btn-primary btn-sm" onClick={() => setShowPaymentModal(true)}>
                                    💸 Ghi nhận thanh toán
                                </button>
                            </div>
                        </div>

                        {/* Stat cards */}
                        <div className="stats-grid" style={{ gridTemplateColumns: `repeat(${statCols}, 1fr)`, marginBottom: 20 }}>
                            <div className="stat-card">
                                <div className="stat-value">{fmtVND(ledger.summary.openingBalance)}</div>
                                <div className="stat-label">Đầu kỳ</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value" style={{ color: 'var(--status-danger)' }}>
                                    {fmtVND(ledger.summary.totalDebit)}
                                </div>
                                <div className="stat-label">Phát sinh</div>
                            </div>
                            {selectedType === 'contractor' && (
                                <div className="stat-card">
                                    <div className="stat-value" style={{ color: 'var(--status-warning)' }}>
                                        {fmtVND(ledger.summary.giuLai)}
                                    </div>
                                    <div className="stat-label">Giữ lại BH</div>
                                </div>
                            )}
                            <div className="stat-card">
                                <div className="stat-value" style={{ color: 'var(--status-success)' }}>
                                    {fmtVND(ledger.summary.totalCredit)}
                                </div>
                                <div className="stat-label">Đã trả</div>
                            </div>
                            <div className="stat-card">
                                <div
                                    className="stat-value"
                                    style={{ color: ledger.summary.closingBalance > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}
                                >
                                    {fmtVND(ledger.summary.closingBalance)}
                                </div>
                                <div className="stat-label">Số dư</div>
                            </div>
                        </div>

                        {/* Ledger table */}
                        <div className="card">
                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Ngày</th>
                                            <th>Loại</th>
                                            <th>Chứng từ</th>
                                            <th>Dự án</th>
                                            <th style={{ textAlign: 'right' }}>Phát sinh</th>
                                            <th style={{ textAlign: 'right' }}>Thanh toán</th>
                                            <th style={{ textAlign: 'right' }}>Số dư</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ledger.entries.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0' }}>
                                                    Chưa có giao dịch
                                                </td>
                                            </tr>
                                        ) : (
                                            ledger.entries.map(entry => (
                                                <tr key={entry.id}>
                                                    <td style={{ fontSize: 13 }}>{fmtDate(entry.date)}</td>
                                                    <td>
                                                        {entry.type === 'debt' && (
                                                            <span className="badge badge-warning">
                                                                {selectedType === 'ncc' ? 'Nhận hàng' : 'Quyết toán'}
                                                            </span>
                                                        )}
                                                        {entry.type === 'payment' && (
                                                            <span className="badge badge-success">Thanh toán</span>
                                                        )}
                                                        {entry.type === 'retention' && (
                                                            <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                                                                Giải phóng BH
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={{ fontSize: 13 }}>{entry.ref}</td>
                                                    <td style={{ fontSize: 13 }}>{entry.projectName}</td>
                                                    <td style={{ textAlign: 'right', color: 'var(--status-danger)', fontWeight: 600 }}>
                                                        {entry.debit > 0 ? fmtVND(entry.debit) : '—'}
                                                    </td>
                                                    <td style={{ textAlign: 'right', color: 'var(--status-success)', fontWeight: 600 }}>
                                                        {entry.credit > 0 ? fmtVND(entry.credit) : '—'}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 700, color: entry.balance > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>
                                                        {fmtVND(entry.balance)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>

            {/* ── Modal: Ghi nhận thanh toán ──────────────────────── */}
            {showPaymentModal && (
                <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Ghi nhận thanh toán</h3>
                            <button className="modal-close" onClick={() => setShowPaymentModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Số tiền *</label>
                                    <input
                                        className="form-input"
                                        type="number"
                                        placeholder="0"
                                        value={paymentForm.amount}
                                        onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Ngày *</label>
                                    <input
                                        className="form-input"
                                        type="date"
                                        value={paymentForm.date}
                                        onChange={e => setPaymentForm(f => ({ ...f, date: e.target.value }))}
                                    />
                                </div>
                                {selectedType === 'contractor' && (
                                    <div>
                                        <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Dự án</label>
                                        <select
                                            className="form-input"
                                            value={paymentForm.projectId}
                                            onChange={e => setPaymentForm(f => ({ ...f, projectId: e.target.value }))}
                                        >
                                            <option value="">— Không chọn —</option>
                                            {projects.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Ghi chú</label>
                                    <input
                                        className="form-input"
                                        placeholder="Nội dung thanh toán..."
                                        value={paymentForm.notes}
                                        onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowPaymentModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={savePayment} disabled={saving}>
                                {saving ? 'Đang lưu...' : 'Lưu'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: Sửa đầu kỳ ──────────────────────────────── */}
            {showOpeningModal && (
                <div className="modal-overlay" onClick={() => setShowOpeningModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Sửa số dư đầu kỳ</h3>
                            <button className="modal-close" onClick={() => setShowOpeningModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Số dư đầu kỳ</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    placeholder="0"
                                    value={openingForm.openingBalance}
                                    onChange={e => setOpeningForm({ openingBalance: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost" onClick={() => setShowOpeningModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={saveOpening} disabled={saving}>
                                {saving ? 'Đang lưu...' : 'Lưu'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Kiểm tra build**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | tail -20
```

Expected: Build thành công. Nếu có lỗi "Cannot find module '@/lib/financeUtils'", chạy:
```bash
ls d:/Codeapp/motnha/lib/financeUtils.js
```
File phải tồn tại (đã tạo trong sprint trước).

- [ ] **Step 3: Commit**

```bash
cd d:/Codeapp/motnha
git add app/cong-no/page.js
git commit -m "feat(cong-no): add master-detail /cong-no page with NCC and contractor ledger"
```

---

## Task 4: Trang `/cong-no/bao-cao` — Báo cáo kỳ

**Files:**
- Create: `app/cong-no/bao-cao/page.js`

### Context

**API đã có:**
`GET /api/debt/report?month=YYYY-MM` → trả về:
```json
{
  "month": "2026-03",
  "label": "Tháng 3/2026",
  "ncc": [{ "id", "code", "name", "openingBalance", "phatSinh", "daTra", "closingBalance" }],
  "contractors": [{ "id", "code", "name", "openingBalance", "phatSinh", "daTra", "closingBalance" }],
  "totals": {
    "nccOpening", "nccPhatSinh", "nccDaTra", "nccClosing",
    "contractorOpening", "contractorPhatSinh", "contractorDaTra", "contractorClosing",
    "grandTotal"
  }
}
```

- [ ] **Step 1: Tạo `app/cong-no/bao-cao/page.js`**

```javascript
'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/fetchClient';
import { fmtVND } from '@/lib/financeUtils';

export default function CongNoBaoCaoPage() {
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [month, setMonth] = useState(defaultMonth);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('ncc'); // 'ncc' | 'contractor'

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await apiFetch(`/api/debt/report?month=${month}`);
                setData(res);
            } catch (err) {
                console.error('Failed to load debt report:', err);
            }
            setLoading(false);
        };
        load();
    }, [month]);

    const list = activeTab === 'ncc' ? data?.ncc : data?.contractors;

    const totalsRow = activeTab === 'ncc'
        ? data && {
            opening: data.totals.nccOpening,
            phatSinh: data.totals.nccPhatSinh,
            daTra: data.totals.nccDaTra,
            closing: data.totals.nccClosing,
        }
        : data && {
            opening: data.totals.contractorOpening,
            phatSinh: data.totals.contractorPhatSinh,
            daTra: data.totals.contractorDaTra,
            closing: data.totals.contractorClosing,
        };

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ margin: 0 }}>Báo cáo công nợ theo kỳ</h2>
                <input
                    type="month"
                    className="form-input"
                    value={month}
                    onChange={e => setMonth(e.target.value)}
                    style={{ width: 160 }}
                />
            </div>

            {/* KPI cards */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--status-danger)' }}>
                        {fmtVND(data?.totals.nccClosing ?? 0)}
                    </div>
                    <div className="stat-label">Tổng nợ NCC</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--status-danger)' }}>
                        {fmtVND(data?.totals.contractorClosing ?? 0)}
                    </div>
                    <div className="stat-label">Tổng nợ Thầu phụ</div>
                </div>
                <div className="stat-card">
                    <div
                        className="stat-value"
                        style={{ color: (data?.totals.grandTotal ?? 0) > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}
                    >
                        {fmtVND(data?.totals.grandTotal ?? 0)}
                    </div>
                    <div className="stat-label">Grand Total</div>
                </div>
            </div>

            {/* Report table */}
            <div className="card">
                <div className="card-header">
                    <div className="tabs">
                        <button
                            className={`tab ${activeTab === 'ncc' ? 'active' : ''}`}
                            onClick={() => setActiveTab('ncc')}
                        >
                            Nhà cung cấp
                        </button>
                        <button
                            className={`tab ${activeTab === 'contractor' ? 'active' : ''}`}
                            onClick={() => setActiveTab('contractor')}
                        >
                            Nhà thầu phụ
                        </button>
                    </div>
                </div>
                <div className="card-body">
                    {loading ? (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                            Đang tải...
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>{activeTab === 'ncc' ? 'Nhà cung cấp' : 'Nhà thầu phụ'}</th>
                                        <th style={{ textAlign: 'right' }}>Đầu kỳ</th>
                                        <th style={{ textAlign: 'right' }}>Phát sinh</th>
                                        <th style={{ textAlign: 'right' }}>Đã trả</th>
                                        <th style={{ textAlign: 'right' }}>Cuối kỳ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(list || []).length === 0 ? (
                                        <tr>
                                            <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0' }}>
                                                Không có dữ liệu trong kỳ này
                                            </td>
                                        </tr>
                                    ) : (
                                        (list || []).map(item => (
                                            <tr key={item.id}>
                                                <td>
                                                    <div style={{ fontWeight: 500 }}>{item.name}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.code}</div>
                                                </td>
                                                <td style={{ textAlign: 'right' }}>{fmtVND(item.openingBalance)}</td>
                                                <td style={{ textAlign: 'right', color: 'var(--status-danger)', fontWeight: 600 }}>
                                                    {fmtVND(item.phatSinh)}
                                                </td>
                                                <td style={{ textAlign: 'right', color: 'var(--status-success)', fontWeight: 600 }}>
                                                    {fmtVND(item.daTra)}
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: 700, color: item.closingBalance > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>
                                                    {fmtVND(item.closingBalance)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                    {/* Footer totals row */}
                                    {totalsRow && (list || []).length > 0 && (
                                        <tr style={{ fontWeight: 700, background: 'var(--bg-secondary)', borderTop: '2px solid var(--border)' }}>
                                            <td>Tổng cộng</td>
                                            <td style={{ textAlign: 'right' }}>{fmtVND(totalsRow.opening)}</td>
                                            <td style={{ textAlign: 'right', color: 'var(--status-danger)' }}>
                                                {fmtVND(totalsRow.phatSinh)}
                                            </td>
                                            <td style={{ textAlign: 'right', color: 'var(--status-success)' }}>
                                                {fmtVND(totalsRow.daTra)}
                                            </td>
                                            <td style={{ textAlign: 'right', color: totalsRow.closing > 0 ? 'var(--status-danger)' : 'var(--status-success)' }}>
                                                {fmtVND(totalsRow.closing)}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Kiểm tra build**

```bash
cd d:/Codeapp/motnha && npm run build 2>&1 | tail -20
```

Expected: Build thành công, không có errors.

- [ ] **Step 3: Commit**

```bash
cd d:/Codeapp/motnha
git add app/cong-no/bao-cao/page.js
git commit -m "feat(cong-no): add /cong-no/bao-cao monthly report page"
```

---

## Tiêu chí hoàn thành

Sau khi hoàn tất tất cả tasks, kiểm tra:

- [ ] Sidebar có mục "Công nợ" → `/cong-no` với icon Landmark, chỉ hiện cho `giam_doc`, `pho_gd`, `ke_toan`
- [ ] `/cong-no` load được, hiện 2 panel trái/phải
- [ ] Tab NCC: danh sách NCC load từ `/api/debt/ncc`, search + filter "Còn nợ / Tất cả" hoạt động
- [ ] Tab Thầu phụ: danh sách contractors load từ `/api/debt/contractors`
- [ ] Click NCC → cột phải hiện stat cards (4 cards) + sổ cái với running balance
- [ ] Click Thầu phụ → cột phải hiện stat cards (5 cards gồm Giữ lại BH) + sổ cái
- [ ] Nút "Ghi nhận thanh toán" mở modal, submit → refresh sổ cái + danh sách
- [ ] Nút "Sửa đầu kỳ" mở modal, submit → refresh
- [ ] Thầu phụ payment modal có select Dự án (optional)
- [ ] `/cong-no/bao-cao` load được, month picker thay đổi dữ liệu, 3 KPI cards, 2 tab báo cáo, footer tổng cộng
- [ ] Không có lỗi console khi dùng bình thường
